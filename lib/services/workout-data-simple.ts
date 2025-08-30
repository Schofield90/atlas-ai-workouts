import { createClient } from '@/lib/db/client-fixed'

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
      return data || []
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
      
      const { data, error } = await supabase
        .from('workout_clients')
        .select('*')
        .eq('id', id)
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