import { NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/db/service'
import { createErrorResponse } from '@/lib/utils/error-response'

export const maxDuration = 120

interface WorkoutClient {
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
  user_id?: string
  organization_id?: string
}

interface ClientsDataRequest {
  clients: WorkoutClient[]
}

export async function POST(request: NextRequest) {
  try {
    console.log('Bypass import endpoint called')
    
    const body: ClientsDataRequest = await request.json()
    
    console.log('Received bypass import request with', body.clients?.length, 'clients')
    
    if (!body.clients || !Array.isArray(body.clients) || body.clients.length === 0) {
      console.error('No client data in request body')
      return createErrorResponse('No client data provided', 400)
    }

    // Use service client to completely bypass authentication and RLS
    const serviceSupabase = createServiceClient()
    
    // Default values for bypass import
    const defaultUserId = null // Use NULL instead of fake UUID since it references auth.users
    const defaultOrgId = '00000000-0000-0000-0000-000000000000'
    
    // Ensure default organization exists
    console.log('Ensuring default organization exists...')
    const { data: orgCheck, error: orgError } = await serviceSupabase
      .from('workout_organizations')
      .select('id')
      .eq('id', defaultOrgId)
      .single()
    
    if (orgError || !orgCheck) {
      console.log('Creating default organization...')
      const { error: createOrgError } = await serviceSupabase
        .from('workout_organizations')
        .insert([{
          id: defaultOrgId,
          name: 'Default Organization',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
      
      if (createOrgError) {
        console.error('Failed to create default organization:', createOrgError)
        // Try to continue anyway - might be a duplicate key error
      } else {
        console.log('Default organization created successfully')
      }
    } else {
      console.log('Default organization already exists')
    }
    
    console.log('Using bypass defaults - user:', defaultUserId, 'org:', defaultOrgId)

    // Prepare client data with minimal validation and default values
    const clientsToInsert = body.clients.map((client, index) => {
      if (!client.full_name) {
        throw new Error(`Client at index ${index} missing required field: full_name`)
      }

      // Sanitize and prepare data with robust type handling for Excel data
      const sanitizeString = (value: any): string | null => {
        if (value === null || value === undefined || value === '') return null
        const str = String(value).trim()
        return str === '' ? null : str
      }
      
      const sanitizeNumber = (value: any): number | null => {
        if (value === null || value === undefined || value === '') return null
        const num = Number(value)
        return isNaN(num) ? null : num
      }
      
      return {
        full_name: String(client.full_name).trim(),
        email: sanitizeString(client.email),
        phone: sanitizeString(client.phone),
        age: sanitizeNumber(client.age),
        sex: sanitizeString(client.sex),
        height_cm: sanitizeNumber(client.height_cm),
        weight_kg: sanitizeNumber(client.weight_kg),
        goals: sanitizeString(client.goals),
        injuries: sanitizeString(client.injuries),
        equipment: Array.isArray(client.equipment) 
          ? client.equipment.filter(e => e && String(e).trim()).map(e => String(e).trim())
          : null,
        preferences: client.preferences || null,
        notes: sanitizeString(client.notes),
        user_id: client.user_id || defaultUserId,
        organization_id: client.organization_id || defaultOrgId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    })

    console.log('Prepared', clientsToInsert.length, 'clients for direct insertion')
    console.log('Sample client:', clientsToInsert[0])

    // Results tracking
    const results = {
      successful: 0,
      failed: 0,
      errors: [] as Array<{ row: number; error: string }>
    }

    // Insert in batches of 50 for performance
    const BATCH_SIZE = 50
    const totalBatches = Math.ceil(clientsToInsert.length / BATCH_SIZE)
    
    for (let i = 0; i < clientsToInsert.length; i += BATCH_SIZE) {
      const batch = clientsToInsert.slice(i, i + BATCH_SIZE)
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1
      
      try {
        console.log(`Processing batch ${batchNumber}/${totalBatches} with ${batch.length} clients`)
        
        // Direct insert with service role (bypasses all RLS policies)
        const { data, error } = await serviceSupabase
          .from('workout_clients')
          .insert(batch)
          .select('id, full_name')
        
        if (error) {
          console.error(`Batch ${batchNumber} insert error:`, {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          })
          
          // Try individual inserts for this batch to isolate problematic records
          for (let j = 0; j < batch.length; j++) {
            const singleClient = batch[j]
            try {
              const { data: singleData, error: singleError } = await serviceSupabase
                .from('workout_clients')
                .insert([singleClient])
                .select('id')
              
              if (singleError) {
                console.error(`Individual insert failed for client ${singleClient.full_name}:`, singleError.message)
                results.failed++
                results.errors.push({
                  row: i + j + 1,
                  error: `${singleClient.full_name}: ${singleError.message}`
                })
              } else {
                results.successful++
                console.log(`Individual insert succeeded for client ${singleClient.full_name}`)
              }
            } catch (individualError) {
              console.error(`Individual insert exception for client ${singleClient.full_name}:`, individualError)
              results.failed++
              results.errors.push({
                row: i + j + 1,
                error: `${singleClient.full_name}: ${individualError instanceof Error ? individualError.message : 'Unknown error'}`
              })
            }
          }
        } else {
          results.successful += (data?.length || 0)
          console.log(`Batch ${batchNumber} successful:`, data?.length, 'clients inserted')
        }
        
      } catch (batchError) {
        console.error(`Batch ${batchNumber} processing error:`, batchError)
        results.failed += batch.length
        results.errors.push({
          row: i + 1,
          error: `Batch ${batchNumber} processing failed: ${batchError instanceof Error ? batchError.message : 'Unknown error'}`
        })
      }
    }

    const finalResults = {
      successful: results.successful,
      failed: results.failed,
      total: clientsToInsert.length,
      errorCount: results.errors.length,
      successRate: `${Math.round((results.successful / clientsToInsert.length) * 100)}%`
    }
    
    console.log('Bypass import completed:', finalResults)
    
    if (results.errors.length > 0) {
      console.log('Import errors:', results.errors.slice(0, 5))
    }

    return Response.json({
      success: results.successful > 0,
      imported: results.successful,
      failed: results.failed,
      total: clientsToInsert.length,
      errors: results.errors,
      message: `Bypass import completed: ${results.successful} successful, ${results.failed} failed`
    })
    
  } catch (error) {
    console.error('Bypass import API route error:', error)
    return createErrorResponse(
      `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      500
    )
  }
}