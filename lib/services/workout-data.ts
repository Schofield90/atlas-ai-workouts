import { createClient } from '@/lib/db/client'

// Types
export interface WorkoutClient {
  id: string
  organization_id?: string
  user_id?: string
  full_name: string
  email?: string
  phone?: string
  age?: number
  sex?: string
  height_cm?: number
  weight_kg?: number
  goals?: string
  injuries?: string
  equipment?: any[]
  preferences?: any
  notes?: string
  created_at: string
  updated_at: string
}

export interface WorkoutSession {
  id: string
  client_id?: string
  user_id?: string
  title: string
  description?: string
  workout_type?: string
  duration_minutes?: number
  difficulty?: string
  exercises: any[]
  notes?: string
  ai_generated?: boolean
  ai_prompt?: string
  source?: string
  version?: number
  parent_id?: string
  created_at: string
  updated_at: string
  // Joined data
  client?: WorkoutClient
}

export interface WorkoutOrganization {
  id: string
  name: string
  slug: string
  settings?: any
  created_at: string
  updated_at: string
}

export interface WorkoutUser {
  id: string
  organization_id?: string
  role?: string
  full_name?: string
  email?: string
  preferences?: any
  created_at: string
  updated_at: string
}

// Client-side functions (for use in components)
export const clientService = {
  async getCurrentUser() {
    try {
      const supabase = createClient()
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error || !user) {
        // Return a default user for now to avoid auth issues
        return {
          id: 'default-user',
          email: 'user@example.com',
          organization_id: null
        }
      }

      // Get or create workout user profile
      const { data: workoutUser } = await supabase
        .from('workout_users')
        .select('*')
        .eq('id', user.id)
        .single()

      if (!workoutUser) {
        // Create user profile
        const { data: newUser } = await supabase
          .from('workout_users')
          .insert({
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || user.email?.split('@')[0]
          })
          .select()
          .single()
        
        return newUser || { id: user.id, email: user.email, organization_id: null }
      }

      return workoutUser
    } catch (error) {
      console.error('Error getting current user:', error)
      // Return a default user to avoid breaking the app
      return {
        id: 'default-user',
        email: 'user@example.com',
        organization_id: null
      }
    }
  },

  async getClients() {
    try {
      const supabase = createClient()
      const user = await this.getCurrentUser()
      if (!user) return []

      const { data, error } = await supabase
        .from('workout_clients')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching clients:', error)
        // If table doesn't exist or other error, return empty array
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error in getClients:', error)
      return []
    }
  },

  async getClient(id: string) {
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
  },

  async createClient(client: Partial<WorkoutClient>) {
    try {
      const supabase = createClient()
      const user = await this.getCurrentUser()
      if (!user) {
        console.warn('No authenticated user, using default')
      }

      const { data, error } = await supabase
        .from('workout_clients')
        .insert({
          ...client,
          user_id: user?.id || 'default-user',
          organization_id: user?.organization_id || null
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

  async updateClient(id: string, updates: Partial<WorkoutClient>) {
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
  },

  async deleteClient(id: string) {
    const supabase = createClient()
    const { error } = await supabase
      .from('workout_clients')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting client:', error)
      throw error
    }
  },

  async getWorkouts(clientId?: string) {
    const supabase = createClient()
    const user = await this.getCurrentUser()
    if (!user) return []

    let query = supabase
      .from('workout_sessions')
      .select(`
        *,
        client:workout_clients(full_name)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (clientId) {
      query = query.eq('client_id', clientId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching workouts:', error)
      return []
    }

    return data || []
  },

  async getWorkout(id: string) {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('workout_sessions')
      .select(`
        *,
        client:workout_clients(*)
      `)
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching workout:', error)
      return null
    }

    return data
  },

  async createWorkout(workout: Partial<WorkoutSession>) {
    const supabase = createClient()
    const user = await this.getCurrentUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('workout_sessions')
      .insert({
        ...workout,
        user_id: user.id
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating workout:', error)
      throw error
    }

    return data
  },

  async updateWorkout(id: string, updates: Partial<WorkoutSession>) {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('workout_sessions')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating workout:', error)
      throw error
    }

    return data
  },

  async deleteWorkout(id: string) {
    const supabase = createClient()
    const { error } = await supabase
      .from('workout_sessions')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting workout:', error)
      throw error
    }
  },

  // Migration helper - import from localStorage
  async importFromLocalStorage() {
    const user = await this.getCurrentUser()
    if (!user) throw new Error('Not authenticated')

    const results = {
      clients: { imported: 0, failed: 0 },
      workouts: { imported: 0, failed: 0 }
    }

    // Import clients
    try {
      const localClients = localStorage.getItem('ai-workout-clients')
      if (localClients) {
        const clients = JSON.parse(localClients)
        for (const client of clients) {
          try {
            await this.createClient({
              full_name: client.full_name,
              email: client.email,
              phone: client.phone,
              goals: client.goals,
              injuries: client.injuries,
              equipment: client.equipment || [],
              notes: client.notes
            })
            results.clients.imported++
          } catch (e) {
            results.clients.failed++
          }
        }
      }
    } catch (e) {
      console.error('Error importing clients:', e)
    }

    // Import workouts
    try {
      const localWorkouts = localStorage.getItem('ai-workout-workouts')
      if (localWorkouts) {
        const workouts = JSON.parse(localWorkouts)
        
        // Get all clients to map by name
        const clients = await this.getClients()
        const clientMap = new Map(clients.map((c: any) => [c.full_name, c.id]))

        for (const workout of workouts) {
          try {
            const clientId = workout.clientName ? clientMap.get(workout.clientName) : undefined
            
            await this.createWorkout({
              client_id: clientId as string | undefined,
              title: workout.title || 'Imported Workout',
              description: workout.description,
              workout_type: workout.type,
              duration_minutes: workout.duration,
              difficulty: workout.difficulty,
              exercises: workout.exercises || [],
              notes: workout.notes,
              ai_generated: workout.aiGenerated || false,
              ai_prompt: workout.prompt
            })
            results.workouts.imported++
          } catch (e) {
            results.workouts.failed++
          }
        }
      }
    } catch (e) {
      console.error('Error importing workouts:', e)
    }

    return results
  }
}

// Server-side functions will be in a separate file to avoid client/server mixing