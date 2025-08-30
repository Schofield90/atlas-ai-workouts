import { NextRequest } from 'next/server'
import { createServerClient } from '@/lib/db/server'
import { sanitizeStringValue, sanitizeNumberValue, sanitizeArrayValue } from '@/lib/utils/file-validation'
import { createErrorResponse, handleApiError } from '@/lib/utils/error-response'

export const maxDuration = 300

interface ChunkData {
  sessionId: string
  chunkIndex: number
  totalChunks: number
  clients: Array<{
    full_name: string
    email?: string
    phone?: string
    age?: number
    sex?: string
    height_cm?: number
    weight_kg?: number
    goals?: string
    injuries?: string
    equipment?: string[]
    preferences?: any
    notes?: string
    sheetName?: string // For multi-sheet processing
    workoutData?: any[] // For workout history
  }>
  isLastChunk: boolean
  isMultiSheet?: boolean
  totalExpectedClients?: number
}

// Use a Map with automatic cleanup after 15 minutes
const sessions = new Map<string, {
  processedChunks: Set<number>
  totalProcessed: number
  errors: Array<{ chunk: number; error: string }>
  createdAt: number
}>()

// Cleanup old sessions every 5 minutes
setInterval(() => {
  const now = Date.now()
  const FIFTEEN_MINUTES = 15 * 60 * 1000
  
  for (const [sessionId, session] of sessions.entries()) {
    if (now - session.createdAt > FIFTEEN_MINUTES) {
      sessions.delete(sessionId)
    }
  }
}, 5 * 60 * 1000)

export async function POST(request: NextRequest) {
  try {
    const data: ChunkData = await request.json()
    
    // Validate request
    if (!data.sessionId || !Array.isArray(data.clients)) {
      return createErrorResponse('Invalid request format', 400)
    }
    
    // Validate session ID format to prevent injection
    if (!/^[a-zA-Z0-9\-_]{10,50}$/.test(data.sessionId)) {
      return createErrorResponse('Invalid session ID format', 400)
    }
    
    // Get or create session
    let session = sessions.get(data.sessionId)
    if (!session) {
      session = {
        processedChunks: new Set(),
        totalProcessed: 0,
        errors: [],
        createdAt: Date.now()
      }
      sessions.set(data.sessionId, session)
    }
    
    // Check if chunk was already processed (idempotency)
    if (session.processedChunks.has(data.chunkIndex)) {
      return Response.json({
        success: true,
        message: 'Chunk already processed',
        chunkIndex: data.chunkIndex,
        totalProcessed: session.totalProcessed
      })
    }
    
    // Sanitize and validate client data
    const sanitizedClients = data.clients
      .filter(client => client.full_name) // Must have a name
      .map(client => ({
        full_name: sanitizeStringValue(client.full_name),
        email: client.email ? sanitizeStringValue(client.email) : undefined,
        phone: client.phone ? sanitizeStringValue(client.phone) : undefined,
        age: sanitizeNumberValue(client.age),
        sex: client.sex ? sanitizeStringValue(client.sex) : undefined,
        height_cm: sanitizeNumberValue(client.height_cm),
        weight_kg: sanitizeNumberValue(client.weight_kg),
        goals: client.goals ? sanitizeStringValue(client.goals) : undefined,
        injuries: client.injuries ? sanitizeStringValue(client.injuries) : undefined,
        equipment: client.equipment ? sanitizeArrayValue(client.equipment) : undefined,
        preferences: client.preferences || {},
        notes: client.notes ? sanitizeStringValue(client.notes) : undefined,
        user_id: 'default-user' // TODO: Get from auth context
      }))
    
    if (sanitizedClients.length === 0) {
      return Response.json({
        success: true,
        message: 'No valid clients in chunk',
        chunkIndex: data.chunkIndex,
        totalProcessed: session.totalProcessed
      })
    }
    
    // Optimized database insert with retry logic for cloud storage
    const insertResult = await insertClientsWithRetry(sanitizedClients, data.chunkIndex)
    
    if (!insertResult.success) {
      session.errors.push({
        chunk: data.chunkIndex,
        error: insertResult.error || 'Unknown database error'
      })
      
      return createErrorResponse(
        `Failed to insert chunk ${data.chunkIndex}`,
        500,
        'DB_INSERT_ERROR',
        'Try reducing chunk size or check data format'
      )
    }
    
    const insertedClients = insertResult.data
    
    // Update session
    session.processedChunks.add(data.chunkIndex)
    session.totalProcessed += insertedClients?.length || 0
    
    // If last chunk, clean up session and return summary
    if (data.isLastChunk) {
      const summary = {
        success: true,
        sessionId: data.sessionId,
        totalChunks: data.totalChunks,
        processedChunks: session.processedChunks.size,
        totalImported: session.totalProcessed,
        errors: session.errors,
        complete: true
      }
      
      // Clean up session
      sessions.delete(data.sessionId)
      
      return Response.json(summary)
    }
    
    // Return progress update
    return Response.json({
      success: true,
      chunkIndex: data.chunkIndex,
      processed: insertedClients?.length || 0,
      totalProcessed: session.totalProcessed,
      progress: Math.round((session.processedChunks.size / data.totalChunks) * 100)
    })
    
  } catch (error) {
    return handleApiError(error)
  }
}

// GET endpoint to check session status
// Optimized database insert function with retry logic
async function insertClientsWithRetry(
  clients: any[],
  chunkIndex: number,
  maxRetries = 3
): Promise<{ success: boolean; data?: any; error?: string }> {
  const supabase = await createServerClient()
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Use smaller sub-batches for better reliability
      const SUB_BATCH_SIZE = 3
      const allInserted = []
      
      for (let i = 0; i < clients.length; i += SUB_BATCH_SIZE) {
        const subBatch = clients.slice(i, i + SUB_BATCH_SIZE)
        
        const { data, error } = await supabase
          .from('workout_clients')
          .insert(subBatch)
          .select()
        
        if (error) {
          throw new Error(`Sub-batch ${Math.floor(i / SUB_BATCH_SIZE) + 1} failed: ${error.message}`)
        }
        
        if (data) {
          allInserted.push(...data)
        }
        
        // Small delay between sub-batches for rate limiting
        if (i + SUB_BATCH_SIZE < clients.length) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }
      
      return { success: true, data: allInserted }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      if (attempt < maxRetries) {
        // Exponential backoff
        const delayMs = Math.pow(2, attempt) * 1000
        console.warn(`Chunk ${chunkIndex} attempt ${attempt} failed, retrying in ${delayMs}ms: ${errorMessage}`)
        await new Promise(resolve => setTimeout(resolve, delayMs))
      } else {
        return { success: false, error: `Failed after ${maxRetries} attempts: ${errorMessage}` }
      }
    }
  }
  
  return { success: false, error: 'Max retries exceeded' }
}

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get('sessionId')
    
    if (!sessionId) {
      return createErrorResponse('Session ID required', 400)
    }
    
    const session = sessions.get(sessionId)
    
    if (!session) {
      return Response.json({
        exists: false,
        message: 'Session not found or expired'
      })
    }
    
    return Response.json({
      exists: true,
      processedChunks: session.processedChunks.size,
      totalProcessed: session.totalProcessed,
      errors: session.errors,
      age: Date.now() - session.createdAt
    })
    
  } catch (error) {
    return handleApiError(error)
  }
}