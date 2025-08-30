import { NextRequest } from 'next/server'
import { createServerClient, createServiceClient } from '@/lib/db/server'
import { createErrorResponse, handleApiError } from '@/lib/utils/error-response'
import { sanitizeStringValue, sanitizeNumberValue } from '@/lib/utils/file-validation'

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
  user_id: string
  organization_id: string
}

interface ClientsDataRequest {
  clients: WorkoutClient[]
}

export async function POST(request: NextRequest) {
  try {
    const body: ClientsDataRequest = await request.json()
    
    console.log('Received client data request with', body.clients?.length, 'clients')
    
    if (!body.clients || !Array.isArray(body.clients) || body.clients.length === 0) {
      console.error('No client data in request body')
      return createErrorResponse('No client data provided', 400)
    }
    
    console.log('First client sample:', body.clients[0])

    // Use service client for all operations to bypass RLS
    const serviceSupabase = await createServiceClient()
    
    // Try to get authenticated user context, but don't fail if not available
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    let organizationId = '00000000-0000-0000-0000-000000000000' // Default organization
    let userId = 'default-user'
    
    if (!authError && user) {
      userId = user.id
      
      // Try to get user's organization using service client
      const { data: workoutUser, error: userError } = await serviceSupabase
        .from('workout_users')
        .select('organization_id')
        .eq('id', user.id)
        .single()
      
      if (!userError && workoutUser?.organization_id) {
        organizationId = workoutUser.organization_id
        console.log('Using user organization:', organizationId)
      } else {
        console.log('User organization not found, using default organization')
      }
    } else {
      console.log('No authenticated user, using default user and organization')
    }
    
    console.log('Processing clients for organization:', organizationId, 'user:', userId)

    // Validate and sanitize client data
    const sanitizedClients: WorkoutClient[] = body.clients.map((client, index) => {
      if (!client.full_name) {
        throw new Error(`Client at index ${index} missing required field: full_name`)
      }

      return {
        full_name: sanitizeStringValue(client.full_name),
        email: client.email ? sanitizeStringValue(client.email) : undefined,
        phone: client.phone ? sanitizeStringValue(client.phone) : undefined,
        age: client.age ? sanitizeNumberValue(client.age) : undefined,
        sex: client.sex ? sanitizeStringValue(client.sex) : undefined,
        height_cm: client.height_cm ? sanitizeNumberValue(client.height_cm) : undefined,
        weight_kg: client.weight_kg ? sanitizeNumberValue(client.weight_kg) : undefined,
        goals: client.goals ? sanitizeStringValue(client.goals) : undefined,
        injuries: client.injuries ? sanitizeStringValue(client.injuries) : undefined,
        equipment: Array.isArray(client.equipment) ? client.equipment.map(e => sanitizeStringValue(e)).filter(Boolean) : undefined,
        preferences: client.preferences || undefined,
        notes: client.notes ? sanitizeStringValue(client.notes) : undefined,
        user_id: client.user_id || userId,
        organization_id: client.organization_id || organizationId
      }
    })

    // Save to database with batch processing using service role
    const results = {
      successful: 0,
      failed: 0,
      errors: [] as Array<{ row: number; error: string }>
    }

    // Process in smaller batches for Supabase (10 per batch)
    const BATCH_SIZE = 10
    for (let i = 0; i < sanitizedClients.length; i += BATCH_SIZE) {
      const batch = sanitizedClients.slice(i, i + BATCH_SIZE)
      
      try {
        console.log(`Processing batch ${i / BATCH_SIZE + 1} with ${batch.length} clients`)
        const { data, error } = await serviceSupabase
          .from('workout_clients')
          .insert(batch)
          .select()
        
        if (error) {
          console.error(`Batch ${i / BATCH_SIZE + 1} insert error:`, {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          })
          results.failed += batch.length
          results.errors.push({
            row: i + 1,
            error: `Batch ${i / BATCH_SIZE + 1} failed: ${error.message} (${error.code})`
          })
        } else {
          results.successful += (data?.length || 0)
          console.log(`Batch ${i / BATCH_SIZE + 1} successful:`, data?.length, 'clients inserted')
        }
      } catch (error) {
        console.error(`Batch ${i / BATCH_SIZE + 1} processing error:`, error)
        results.failed += batch.length
        results.errors.push({
          row: i + 1,
          error: `Batch ${i / BATCH_SIZE + 1} processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        })
      }
    }

    console.log('Import completed:', {
      successful: results.successful,
      failed: results.failed,
      total: sanitizedClients.length,
      errorCount: results.errors.length
    })

    return Response.json({
      success: results.successful > 0,
      imported: results.successful,
      failed: results.failed,
      total: sanitizedClients.length,
      errors: results.errors
    })
    
  } catch (error) {
    console.error('API route error:', error)
    return handleApiError(error)
  }
}