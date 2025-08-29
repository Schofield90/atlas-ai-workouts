import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/db/client-fixed'

export const runtime = 'nodejs'
export const maxDuration = 30 // 30 seconds max

export async function POST(request: NextRequest) {
  try {
    // Get chunk parameters from query string
    const searchParams = request.nextUrl.searchParams
    const startIndex = parseInt(searchParams.get('startIndex') || '0')
    const endIndex = parseInt(searchParams.get('endIndex') || '19')
    
    // Validate chunk parameters
    if (isNaN(startIndex) || isNaN(endIndex) || startIndex < 0 || endIndex < startIndex) {
      return NextResponse.json({
        success: false,
        error: 'Invalid chunk parameters. startIndex and endIndex must be valid numbers.',
        code: 'INVALID_PARAMS',
        processed: 0,
        successCount: 0,
        errors: []
      }, { status: 400 })
    }
    
    // Parse JSON body (pre-processed client data)
    let body
    try {
      body = await request.json()
    } catch (jsonError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid JSON in request body',
        code: 'INVALID_JSON',
        processed: 0,
        successCount: 0,
        errors: []
      }, { status: 400 })
    }
    
    const { clients } = body
    
    if (!clients || !Array.isArray(clients)) {
      return NextResponse.json({
        success: false,
        error: 'No clients data provided. Expected JSON body with clients array.',
        code: 'VALIDATION_ERROR',
        processed: 0,
        successCount: 0,
        errors: [{ error: 'No clients data provided', code: 'VALIDATION_ERROR' }]
      }, { status: 400 })
    }
    
    // Limit processing to max 20 clients per chunk
    const maxChunkSize = 20
    const actualEndIndex = Math.min(endIndex, startIndex + maxChunkSize - 1, clients.length - 1)
    const clientsToProcess = clients.slice(startIndex, actualEndIndex + 1)
    
    console.log(`Processing chunk: ${startIndex}-${actualEndIndex} (${clientsToProcess.length} clients)`)
    
    const supabase = createClient()
    const results = []
    const errors = []
    let successCount = 0
    
    // Process in smaller batches to avoid memory issues
    const batchSize = 5
    
    for (let i = 0; i < clientsToProcess.length; i += batchSize) {
      const batch = clientsToProcess.slice(i, i + batchSize)
      const batchIndex = Math.floor(i / batchSize)
      
      try {
        // Prepare batch for insertion
        const preparedBatch = batch.map((client: any) => ({
          full_name: client.full_name || client.name || 'Unknown Client',
          email: client.email || null,
          phone: client.phone || null,
          goals: client.goals || null,
          injuries: client.injuries || null,
          equipment: Array.isArray(client.equipment) ? client.equipment : [],
          notes: client.notes || null,
          user_id: 'default-user'
        }))
        
        // Validate required fields
        const validBatch = preparedBatch.filter(c => c.full_name && c.full_name !== 'Unknown Client')
        
        if (validBatch.length === 0) {
          errors.push({
            batchIndex,
            clientIndices: batch.map((_, idx) => startIndex + i + idx),
            error: 'No valid clients in batch (missing names)',
            code: 'VALIDATION_ERROR'
          })
          continue
        }
        
        // Insert batch to database
        const { data: newClients, error: dbError } = await supabase
          .from('workout_clients')
          .insert(validBatch)
          .select()
        
        if (dbError) {
          console.error(`Batch ${batchIndex} error:`, dbError)
          errors.push({
            batchIndex,
            clientIndices: batch.map((_, idx) => startIndex + i + idx),
            error: dbError.message,
            code: 'DATABASE_ERROR'
          })
        } else if (newClients) {
          results.push(...newClients)
          successCount += newClients.length
          console.log(`✓ Batch ${batchIndex}: Imported ${newClients.length} clients`)
        }
        
        // Small delay to avoid overwhelming the database
        if (i + batchSize < clientsToProcess.length) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
        
      } catch (batchError: any) {
        console.error(`Error processing batch ${batchIndex}:`, batchError)
        errors.push({
          batchIndex,
          clientIndices: batch.map((_, idx) => startIndex + i + idx),
          error: batchError.message || 'Unknown batch processing error',
          code: 'PROCESSING_ERROR'
        })
      }
    }
    
    // Return comprehensive response
    return NextResponse.json({
      success: successCount > 0,
      processed: clientsToProcess.length,
      successCount,
      errors: errors.length > 0 ? errors : undefined,
      chunk: {
        startIndex,
        endIndex: actualEndIndex,
        requestedCount: endIndex - startIndex + 1,
        actualCount: clientsToProcess.length
      },
      summary: {
        totalRequested: clients.length,
        chunkProcessed: clientsToProcess.length,
        successful: successCount,
        failed: clientsToProcess.length - successCount
      }
    })
    
  } catch (error: any) {
    console.error('Import large Excel error:', error)
    
    // Always return JSON, even for unexpected errors
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to process import request',
      code: 'SERVER_ERROR',
      processed: 0,
      successCount: 0,
      errors: [
        {
          error: error.message || 'Unknown server error',
          code: 'SERVER_ERROR',
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }
      ]
    }, { status: 500 })
  }
}