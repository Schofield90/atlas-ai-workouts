import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Force dynamic to avoid caching
export const dynamic = 'force-dynamic'
export const maxDuration = 30 // 30 seconds max for Vercel

// Client type definition
type Client = {
  full_name: string
  goals?: string | null
  injuries?: string | null
  email?: string | null
  phone?: string | null
  equipment?: string[]
  notes?: string | null
  sheetName?: string | null
}

// Database client type (snake_case)
type DBClient = {
  full_name: string
  goals: string | null
  injuries: string | null
  email: string | null
  phone: string | null
  equipment: string[]
  notes: string | null
  sheet_name?: string | null
  organization_id?: string
  user_id?: string | null
}

// Environment configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const USE_UPSERT = process.env.USE_CLIENT_UPSERT === 'true' // Set to 'true' to enable upsert

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing Supabase credentials')
}

// Initialize Supabase client with service role (bypasses RLS)
const supabase = createClient(
  SUPABASE_URL!,
  SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  }
)

// Default organization ID to use when no user context
const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000000'

/**
 * Sanitize and validate a string value
 */
function sanitizeString(value: any): string | null {
  if (value === null || value === undefined) return null
  const str = String(value).trim()
  return str === '' ? null : str
}

/**
 * Sanitize equipment array
 */
function sanitizeEquipment(equipment: any): string[] {
  if (!equipment) return []
  if (!Array.isArray(equipment)) {
    // If it's a string, split by comma
    const str = String(equipment).trim()
    if (str === '') return []
    return str.split(',').map(e => e.trim()).filter(e => e !== '')
  }
  // If it's an array, ensure all items are non-empty strings
  return equipment
    .map(e => String(e).trim())
    .filter(e => e !== '')
}

/**
 * Transform client from request format to database format
 */
function transformClient(client: Client): DBClient {
  const transformed: DBClient = {
    full_name: sanitizeString(client.full_name) || '', // Required field
    goals: sanitizeString(client.goals),
    injuries: sanitizeString(client.injuries),
    email: sanitizeString(client.email),
    phone: sanitizeString(client.phone),
    equipment: sanitizeEquipment(client.equipment),
    notes: sanitizeString(client.notes),
    organization_id: DEFAULT_ORG_ID,  // Always use default org for import
    user_id: null  // No user association for bulk imports
  }

  // Only add sheet_name if it exists in the client object
  if ('sheetName' in client) {
    transformed.sheet_name = sanitizeString(client.sheetName)
  }

  return transformed
}

/**
 * Validate client has required fields
 */
function validateClient(client: any, index: number): string | null {
  if (!client || typeof client !== 'object') {
    return `Client at index ${index} is not a valid object`
  }
  
  if (!client.full_name || sanitizeString(client.full_name) === null) {
    return `Client at index ${index} missing required field: full_name`
  }
  
  return null
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Ensure default organization exists first
    console.log('[import-large-excel] Ensuring default organization exists...')
    const { data: orgCheck, error: orgError } = await supabase
      .from('workout_organizations')
      .select('id')
      .eq('id', DEFAULT_ORG_ID)
      .single()
    
    if (orgError || !orgCheck) {
      console.log('[import-large-excel] Creating default organization...')
      const { error: createOrgError } = await supabase
        .from('workout_organizations')
        .insert([{
          id: DEFAULT_ORG_ID,
          name: 'Default Organization',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
      
      if (createOrgError && !createOrgError.message?.includes('duplicate')) {
        console.error('Failed to create default organization:', createOrgError)
      }
    }
    
    // Parse query params for logging only - NOT for slicing!
    const searchParams = request.nextUrl.searchParams
    const startIndex = searchParams.get('startIndex')
    const endIndex = searchParams.get('endIndex')
    
    console.log(`[import-large-excel] Chunk metadata: startIndex=${startIndex}, endIndex=${endIndex}`)
    
    // Parse request body
    let body: { clients?: any }
    try {
      body = await request.json()
    } catch (e) {
      console.error('Failed to parse request body:', e)
      return NextResponse.json(
        { 
          successCount: 0, 
          errors: [{ index: -1, message: 'Invalid JSON in request body' }] 
        },
        { status: 400 }
      )
    }
    
    // Validate clients array exists
    if (!body.clients || !Array.isArray(body.clients)) {
      console.error('Missing or invalid clients array')
      return NextResponse.json(
        { 
          successCount: 0, 
          errors: [{ index: -1, message: 'Request body must contain a "clients" array' }] 
        },
        { status: 400 }
      )
    }
    
    // CRITICAL: Use the clients array directly from the request body
    // Do NOT re-slice based on startIndex/endIndex
    const clients = body.clients
    
    // Validate array size (safety limit)
    if (clients.length > 100) {
      console.error(`Client array too large: ${clients.length}`)
      return NextResponse.json(
        { 
          successCount: 0, 
          errors: [{ index: -1, message: `Too many clients in single request: ${clients.length}. Maximum is 100.` }] 
        },
        { status: 400 }
      )
    }
    
    if (clients.length === 0) {
      console.log('Empty clients array, returning success')
      return NextResponse.json({ successCount: 0, errors: [] })
    }
    
    console.log(`[import-large-excel] Processing ${clients.length} clients from request body`)
    
    // Validate and transform all clients
    const errors: Array<{ index: number; message: string }> = []
    const validClients: DBClient[] = []
    
    clients.forEach((client, index) => {
      const validationError = validateClient(client, index)
      if (validationError) {
        errors.push({ index, message: validationError })
        return
      }
      
      try {
        const transformed = transformClient(client)
        validClients.push(transformed)
      } catch (e) {
        console.error(`Error transforming client at index ${index}:`, e)
        errors.push({ 
          index, 
          message: `Failed to transform client: ${e instanceof Error ? e.message : 'Unknown error'}` 
        })
      }
    })
    
    // If no valid clients, return early
    if (validClients.length === 0) {
      console.log('No valid clients to insert')
      return NextResponse.json({ 
        successCount: 0, 
        errors 
      })
    }
    
    console.log(`[import-large-excel] Inserting ${validClients.length} valid clients to Supabase`)
    
    // Insert or upsert to Supabase
    let result
    let successCount = 0
    
    try {
      if (USE_UPSERT) {
        // Upsert mode - handle duplicates gracefully
        console.log('Using UPSERT mode with onConflict: full_name')
        result = await supabase
          .from('workout_clients')
          .upsert(validClients, { 
            onConflict: 'full_name',
            ignoreDuplicates: false // We want to update existing records
          })
          .select() // Get minimal data back
        
        if (result.error) {
          throw result.error
        }
        
        // With minimal returning, we assume all were successful
        successCount = validClients.length
        console.log(`✓ Upserted ${successCount} clients`)
        
      } else {
        // Insert mode - may fail on duplicates
        console.log('Using INSERT mode')
        result = await supabase
          .from('workout_clients')
          .insert(validClients)
          .select() // Get data back
        
        if (result.error) {
          // Check if it's a unique constraint violation
          if (result.error.message?.includes('duplicate') || 
              result.error.message?.includes('unique') ||
              result.error.code === '23505') {
            
            console.log('Duplicate key error, attempting individual inserts')
            
            // Fall back to individual inserts to identify specific failures
            const insertPromises = validClients.map(async (client, validIndex) => {
              // Find the original index in the request array
              const originalIndex = clients.findIndex(c => 
                sanitizeString(c.full_name) === client.full_name
              )
              
              try {
                const { error } = await supabase
                  .from('workout_clients')
                  .insert([client])
                
                if (error) {
                  if (error.message?.includes('duplicate') || 
                      error.message?.includes('unique')) {
                    errors.push({ 
                      index: originalIndex >= 0 ? originalIndex : validIndex, 
                      message: `Duplicate client: ${client.full_name}` 
                    })
                  } else {
                    errors.push({ 
                      index: originalIndex >= 0 ? originalIndex : validIndex, 
                      message: error.message || 'Insert failed' 
                    })
                  }
                  return false
                }
                return true
              } catch (e) {
                console.error(`Individual insert failed for ${client.full_name}:`, e)
                errors.push({ 
                  index: originalIndex >= 0 ? originalIndex : validIndex, 
                  message: e instanceof Error ? e.message : 'Unknown error' 
                })
                return false
              }
            })
            
            // Process with concurrency limit of 5
            const results: boolean[] = []
            for (let i = 0; i < insertPromises.length; i += 5) {
              const batch = insertPromises.slice(i, i + 5)
              const batchResults = await Promise.all(batch)
              results.push(...batchResults)
            }
            
            successCount = results.filter(r => r).length
            console.log(`✓ Inserted ${successCount} clients (${validClients.length - successCount} failed)`)
            
          } else {
            // Other database error
            throw result.error
          }
        } else {
          // Success - all inserted
          successCount = validClients.length
          console.log(`✓ Inserted ${successCount} clients`)
        }
      }
      
    } catch (error) {
      console.error('Supabase operation failed:', error)
      
      // Try to provide specific error information
      if (error && typeof error === 'object' && 'message' in error) {
        const errorMessage = String(error.message)
        
        // Add error for all clients if it's a general failure
        validClients.forEach((_, index) => {
          if (!errors.some(e => e.index === index)) {
            errors.push({ 
              index, 
              message: errorMessage.slice(0, 200) // Truncate long messages
            })
          }
        })
      } else {
        // Generic error for all
        validClients.forEach((_, index) => {
          if (!errors.some(e => e.index === index)) {
            errors.push({ 
              index, 
              message: 'Database operation failed' 
            })
          }
        })
      }
      
      successCount = 0
    }
    
    const duration = Date.now() - startTime
    console.log(`[import-large-excel] Completed in ${duration}ms. Success: ${successCount}/${clients.length}, Errors: ${errors.length}`)
    
    return NextResponse.json({
      successCount,
      errors
    })
    
  } catch (error) {
    console.error('Unexpected error in import handler:', error)
    return NextResponse.json(
      { 
        successCount: 0, 
        errors: [{ 
          index: -1, 
          message: error instanceof Error ? error.message : 'Internal server error' 
        }] 
      },
      { status: 500 }
    )
  }
}

// Reject non-POST methods
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST.' },
    { status: 405 }
  )
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST.' },
    { status: 405 }
  )
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST.' },
    { status: 405 }
  )
}