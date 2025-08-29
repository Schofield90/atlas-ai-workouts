import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/db/client-fixed'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    // Parse JSON body instead of FormData for smaller payload
    const body = await request.json()
    const { clients } = body
    
    if (!clients || !Array.isArray(clients)) {
      return NextResponse.json({ error: 'No clients data provided' }, { status: 400 })
    }
    
    console.log(`Processing ${clients.length} clients`)
    
    // Process and save to Supabase
    const supabase = createClient()
    const results = []
    const errors = []
    
    // Insert in small batches
    const batchSize = 5
    
    for (let i = 0; i < clients.length; i += batchSize) {
      const batch = clients.slice(i, i + batchSize)
      
      try {
        // Prepare clients with default values
        const preparedBatch = batch.map((client: any) => ({
          full_name: client.name || client.full_name || 'Unknown',
          email: client.email || null,
          phone: client.phone || null,
          goals: client.goals || null,
          injuries: client.injuries || null,
          equipment: Array.isArray(client.equipment) ? client.equipment : [],
          notes: client.notes || null,
          // Remove user_id - let it be NULL in database
        }))
        
        const { data: newClients, error } = await supabase
          .from('workout_clients')
          .insert(preparedBatch)
          .select()
        
        if (!error && newClients) {
          results.push(...newClients)
        } else if (error) {
          console.error(`Batch error:`, error)
          errors.push({ batch: i/batchSize + 1, error: error.message })
        }
      } catch (e: any) {
        console.error(`Error inserting batch:`, e)
        errors.push({ batch: i/batchSize + 1, error: e.message })
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      imported: results.length,
      total: clients.length,
      errors: errors.length > 0 ? errors : undefined
    })
    
  } catch (error: any) {
    console.error('Import error:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to import clients' 
    }, { status: 500 })
  }
}