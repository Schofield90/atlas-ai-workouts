'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft, 
  Edit2, 
  User, 
  Mail, 
  Phone, 
  Target, 
  AlertTriangle,
  Dumbbell,
  FileText,
  Calendar,
  ChevronRight
} from 'lucide-react'
import { createClient } from '@/lib/db/client-fixed'
import { validateAndCleanUUID, monitorUUIDIssue } from '@/lib/utils/uuid-validator'

interface Client {
  id: string
  full_name: string
  organization_id?: string
  user_id?: string
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

interface Workout {
  id: string
  client_id?: string
  title: string
  description?: string
  workout_type?: string
  difficulty?: string
  created_at: string
  client?: { full_name: string }
}

export default function ClientPage() {
  const params = useParams()
  const router = useRouter()
  const clientId = params.id as string
  
  const [client, setClient] = useState<Client | null>(null)
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadClientData()
  }, [clientId])

  async function loadClientData() {
    try {
      setLoading(true)
      setError('')
      
      // Validate and clean the client ID
      const validation = validateAndCleanUUID(clientId)
      if (!validation.isValid || !validation.cleanedId) {
        monitorUUIDIssue('ClientPage.loadClientData', clientId, validation)
        setError('Invalid client ID format')
        return
      }
      
      const cleanClientId = validation.cleanedId
      console.log('Loading client with ID:', cleanClientId, 'Original:', clientId)
      
      // Load client from Supabase
      const supabase = createClient()
      const { data: foundClient, error: clientError } = await supabase
        .from('workout_clients')
        .select('*')
        .eq('id', cleanClientId)
        .single()
      
      if (clientError) {
        console.error('Error loading client:', clientError)
        setError('Client not found')
        return
      }
      
      if (foundClient) {
        setClient(foundClient)
        
        // Load workouts for this client from Supabase
        const { data: clientWorkouts, error: workoutsError } = await supabase
          .from('workout_sessions')
          .select('id, title, description, workout_type, difficulty, created_at, client_id')
          .eq('client_id', cleanClientId)
          .order('created_at', { ascending: false })
        
        if (workoutsError) {
          console.error('Error loading workouts:', workoutsError)
        } else {
          setWorkouts(clientWorkouts || [])
        }
      } else {
        setError('Client not found')
      }
    } catch (err) {
      console.error('Error loading client data:', err)
      setError('Failed to load client data')
    } finally {
      setLoading(false)
    }
  }

  async function deleteClient() {
    if (!client || !confirm('Are you sure you want to delete this client?')) return
    
    try {
      // Validate and clean the client ID
      const validation = validateAndCleanUUID(clientId)
      if (!validation.isValid || !validation.cleanedId) {
        setError('Invalid client ID')
        return
      }
      
      const cleanClientId = validation.cleanedId
      
      const supabase = createClient()
      const { error } = await supabase
        .from('workout_clients')
        .delete()
        .eq('id', cleanClientId)

      if (error) {
        console.error('Error deleting client:', error)
        setError('Failed to delete client')
        return
      }

      router.push('/clients')
    } catch (err) {
      console.error('Error deleting client:', err)
      setError('Failed to delete client')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-gray-100">Loading client...</div>
      </div>
    )
  }

  if (error && !client) {
    return (
      <div className="min-h-screen bg-gray-900">
        <nav className="bg-gray-800 shadow-sm border-b border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <Link href="/clients" className="text-gray-400 hover:text-gray-100 mr-4">
                  <ArrowLeft className="h-5 w-5" />
                </Link>
                <h1 className="text-xl font-semibold">Client Details</h1>
              </div>
            </div>
          </div>
        </nav>
        <main className="max-w-2xl mx-auto px-4 py-12">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-700 mb-4">{error}</p>
            <Link href="/clients" className="text-blue-600 hover:underline">
              Back to Clients
            </Link>
          </div>
        </main>
      </div>
    )
  }

  if (!client) return null

  return (
    <div className="min-h-screen bg-gray-900">
      <nav className="bg-gray-800 shadow-sm border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/clients" className="text-gray-400 hover:text-gray-100 mr-4">
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <h1 className="text-xl font-semibold text-gray-100">Client Profile</h1>
            </div>
            <div className="flex items-center space-x-2">
              <Link
                href={`/clients/${clientId}/edit`}
                className="px-3 py-1 text-sm border border-gray-600 text-gray-300 rounded hover:bg-gray-700"
              >
                <Edit2 className="h-4 w-4 inline mr-1" />
                Edit
              </Link>
              <button
                onClick={deleteClient}
                className="px-3 py-1 text-sm border border-red-800 text-red-400 rounded hover:bg-red-900/30"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Client Info */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center">
                  <div className="bg-blue-900/30 rounded-full p-3 mr-4">
                    <User className="h-8 w-8 text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-100">{client.full_name}</h2>
                    <p className="text-sm text-gray-400">Client ID: {client.id}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {client.email && (
                  <div className="flex items-start">
                    <Mail className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                    <div>
                      <div className="text-sm text-gray-400">Email</div>
                      <div className="font-medium text-gray-100">{client.email}</div>
                    </div>
                  </div>
                )}

                {client.phone && (
                  <div className="flex items-start">
                    <Phone className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                    <div>
                      <div className="text-sm text-gray-400">Phone</div>
                      <div className="font-medium text-gray-100">{client.phone}</div>
                    </div>
                  </div>
                )}

                <div className="flex items-start">
                  <Calendar className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                  <div>
                    <div className="text-sm text-gray-400">Member Since</div>
                    <div className="font-medium text-gray-100">
                      {new Date(client.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Goals */}
            {client.goals && (
              <div className="bg-gray-800 rounded-lg shadow p-6">
                <div className="flex items-center mb-4">
                  <Target className="h-5 w-5 text-green-600 mr-2" />
                  <h3 className="text-lg font-semibold text-gray-100">Fitness Goals</h3>
                </div>
                <p className="text-gray-300 whitespace-pre-wrap">{client.goals}</p>
              </div>
            )}

            {/* Injuries */}
            {client.injuries && (
              <div className="bg-gray-800 rounded-lg shadow p-6">
                <div className="flex items-center mb-4">
                  <AlertTriangle className="h-5 w-5 text-orange-600 mr-2" />
                  <h3 className="text-lg font-semibold text-gray-100">Injuries & Limitations</h3>
                </div>
                <p className="text-gray-300 whitespace-pre-wrap">{client.injuries}</p>
              </div>
            )}

            {/* Equipment */}
            {client.equipment && client.equipment.length > 0 && (
              <div className="bg-gray-800 rounded-lg shadow p-6">
                <div className="flex items-center mb-4">
                  <Dumbbell className="h-5 w-5 text-purple-600 mr-2" />
                  <h3 className="text-lg font-semibold text-gray-100">Available Equipment</h3>
                </div>
                <div className="text-gray-300">
                  {Array.isArray(client.equipment) 
                    ? client.equipment.join(', ')
                    : client.equipment
                  }
                </div>
              </div>
            )}

            {/* Notes */}
            {client.notes && (
              <div className="bg-gray-800 rounded-lg shadow p-6">
                <div className="flex items-center mb-4">
                  <FileText className="h-5 w-5 text-blue-600 mr-2" />
                  <h3 className="text-lg font-semibold text-gray-100">Additional Notes</h3>
                </div>
                <p className="text-gray-300 whitespace-pre-wrap">{client.notes}</p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-100 mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <Link
                  href={`/builder?client=${clientId}`}
                  className="w-full py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-500 flex items-center justify-center"
                >
                  <Dumbbell className="h-4 w-4 mr-2" />
                  Create Workout
                </Link>
                <Link
                  href={`/clients/${clientId}/edit`}
                  className="w-full py-2 px-4 border border-gray-600 text-gray-300 rounded hover:bg-gray-700 flex items-center justify-center"
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit Profile
                </Link>
              </div>
            </div>

            {/* Recent Workouts */}
            <div className="bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-100 mb-4">Recent Workouts</h3>
              {workouts && workouts.length > 0 ? (
                <ul className="space-y-3">
                  {workouts.slice(0, 5).map((workout) => (
                    <li key={workout.id}>
                      <Link
                        href={`/workouts/${workout.id}`}
                        className="flex items-center justify-between hover:bg-gray-700 p-2 rounded group"
                      >
                        <div className="flex-1">
                          <div className="font-medium text-sm text-gray-100">{workout.title}</div>
                          <div className="text-xs text-gray-400">
                            {new Date(workout.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-gray-500 group-hover:text-gray-300" />
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-400 text-sm">No workouts yet</p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}