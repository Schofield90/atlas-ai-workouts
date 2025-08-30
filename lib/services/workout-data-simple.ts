import { createClient } from '@/lib/db/client-fixed'

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Helper to validate and clean UUIDs
function validateUUID(id: string): string {
  // Remove any extra characters and validate
  const cleanId = id.substring(0, 36)
  if (UUID_REGEX.test(cleanId)) {
    return cleanId
  }
  console.warn(`Invalid UUID detected: ${id}, cleaned to: ${cleanId}`)
  return cleanId
}

// Simplified client service without auth requirements
export const simpleClientService = {
  async getClients() {
    console.log('📊 simpleClientService.getClients() called')
    try {
      console.log('🔧 Creating Supabase client...')
      const supabase = createClient()
      
      if (!supabase || !supabase.from) {
        console.warn('⚠️ Supabase client not available - returning empty array')
        return []
      }
      
      console.log('📡 Querying workout_clients table...')
      // Just get all clients from workout_clients table
      const { data, error } = await supabase
        .from('workout_clients')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('❌ Database query error:', error)
        return []
      }

      console.log(`✅ Query successful: received ${data?.length || 0} clients`)
      
      // Clean any invalid UUIDs in the data
      const cleanedData = (data || []).map(client => ({
        ...client,
        id: validateUUID(client.id)
      }))
      
      return cleanedData
    } catch (error) {
      console.error('💥 Exception in getClients:', error)
      return []
    }
  },

  async createClient(client: any) {
    try {
      const supabase = createClient()
      
      if (!supabase || !supabase.from) {
        console.error('Supabase client not available')
        throw new Error('Database connection not available')
      }
      
      const { data, error } = await supabase
        .from('workout_clients')
        .insert({
          ...client,
          // Remove user_id - let it be NULL in database
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating client:', error)
        throw error
      }

      return data
    } catch (error) {
      console.error('Error in createClient:', error)
      throw error
    }
  },

  async updateClient(id: string, updates: any) {
    try {
      const supabase = createClient()
      
      const { data, error } = await supabase
        .from('workout_clients')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Error updating client:', error)
        throw error
      }

      return data
    } catch (error) {
      console.error('Error in updateClient:', error)
      throw error
    }
  },

  async deleteClient(id: string) {
    try {
      const supabase = createClient()
      
      const { error } = await supabase
        .from('workout_clients')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Error deleting client:', error)
        throw error
      }

      return true
    } catch (error) {
      console.error('Error in deleteClient:', error)
      throw error
    }
  },

  async getClient(id: string) {
    try {
      const supabase = createClient()
      
      // Clean the ID before querying
      const cleanId = validateUUID(id)
      
      const { data, error } = await supabase
        .from('workout_clients')
        .select('*')
        .eq('id', cleanId)
        .single()

      if (error) {
        console.error('Error fetching client:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error in getClient:', error)
      return null
    }
  }
}