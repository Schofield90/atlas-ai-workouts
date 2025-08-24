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

interface Client {
  id: string
  full_name: string
  email?: string
  phone?: string
  goals?: string
  injuries?: string
  equipment?: string
  notes?: string
  created_at: string
}

interface Workout {
  id: string
  title: string
  clients?: { full_name: string }
  created_at: string
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

  function loadClientData() {
    try {
      // Load client
      const savedClients = localStorage.getItem('ai-workout-clients')
      const clients = savedClients ? JSON.parse(savedClients) : []
      const foundClient = Array.isArray(clients) ? 
        clients.find((c: Client) => c.id === clientId) : null
      
      if (foundClient) {
        setClient(foundClient)
        
        // Load workouts for this client
        const savedWorkouts = localStorage.getItem('ai-workout-workouts')
        const allWorkouts = savedWorkouts ? JSON.parse(savedWorkouts) : []
        const clientWorkouts = Array.isArray(allWorkouts) ?
          allWorkouts.filter((w: any) => 
            w.clients?.full_name === foundClient.full_name ||
            w.clientId === clientId
          ) : []
        setWorkouts(clientWorkouts)
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

  function deleteClient() {
    if (!client || !confirm('Are you sure you want to delete this client?')) return
    
    try {
      const saved = localStorage.getItem('ai-workout-clients')
      const clients = saved ? JSON.parse(saved) : []
      const updatedClients = clients.filter((c: Client) => c.id !== clientId)
      localStorage.setItem('ai-workout-clients', JSON.stringify(updatedClients))
      router.push('/clients')
    } catch (err) {
      console.error('Error deleting client:', err)
      setError('Failed to delete client')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div>Loading client...</div>
      </div>
    )
  }

  if (error && !client) {
    return (
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <Link href="/clients" className="text-gray-500 hover:text-gray-700 mr-4">
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
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/clients" className="text-gray-500 hover:text-gray-700 mr-4">
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <h1 className="text-xl font-semibold">Client Profile</h1>
            </div>
            <div className="flex items-center space-x-2">
              <Link
                href={`/clients/${clientId}/edit`}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
              >
                <Edit2 className="h-4 w-4 inline mr-1" />
                Edit
              </Link>
              <button
                onClick={deleteClient}
                className="px-3 py-1 text-sm border border-red-300 text-red-600 rounded hover:bg-red-50"
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
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center">
                  <div className="bg-blue-100 rounded-full p-3 mr-4">
                    <User className="h-8 w-8 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">{client.full_name}</h2>
                    <p className="text-sm text-gray-500">Client ID: {client.id}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {client.email && (
                  <div className="flex items-start">
                    <Mail className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                    <div>
                      <div className="text-sm text-gray-500">Email</div>
                      <div className="font-medium">{client.email}</div>
                    </div>
                  </div>
                )}

                {client.phone && (
                  <div className="flex items-start">
                    <Phone className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                    <div>
                      <div className="text-sm text-gray-500">Phone</div>
                      <div className="font-medium">{client.phone}</div>
                    </div>
                  </div>
                )}

                <div className="flex items-start">
                  <Calendar className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                  <div>
                    <div className="text-sm text-gray-500">Member Since</div>
                    <div className="font-medium">
                      {new Date(client.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Goals */}
            {client.goals && (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center mb-4">
                  <Target className="h-5 w-5 text-green-600 mr-2" />
                  <h3 className="text-lg font-semibold">Fitness Goals</h3>
                </div>
                <p className="text-gray-700 whitespace-pre-wrap">{client.goals}</p>
              </div>
            )}

            {/* Injuries */}
            {client.injuries && (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center mb-4">
                  <AlertTriangle className="h-5 w-5 text-orange-600 mr-2" />
                  <h3 className="text-lg font-semibold">Injuries & Limitations</h3>
                </div>
                <p className="text-gray-700 whitespace-pre-wrap">{client.injuries}</p>
              </div>
            )}

            {/* Equipment */}
            {client.equipment && (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center mb-4">
                  <Dumbbell className="h-5 w-5 text-purple-600 mr-2" />
                  <h3 className="text-lg font-semibold">Available Equipment</h3>
                </div>
                <p className="text-gray-700 whitespace-pre-wrap">{client.equipment}</p>
              </div>
            )}

            {/* Notes */}
            {client.notes && (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center mb-4">
                  <FileText className="h-5 w-5 text-blue-600 mr-2" />
                  <h3 className="text-lg font-semibold">Additional Notes</h3>
                </div>
                <p className="text-gray-700 whitespace-pre-wrap">{client.notes}</p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <Link
                  href={`/builder?client=${clientId}`}
                  className="w-full py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center justify-center"
                >
                  <Dumbbell className="h-4 w-4 mr-2" />
                  Create Workout
                </Link>
                <Link
                  href={`/clients/${clientId}/edit`}
                  className="w-full py-2 px-4 border border-gray-300 rounded hover:bg-gray-50 flex items-center justify-center"
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit Profile
                </Link>
              </div>
            </div>

            {/* Recent Workouts */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Recent Workouts</h3>
              {workouts && workouts.length > 0 ? (
                <ul className="space-y-3">
                  {workouts.slice(0, 5).map((workout) => (
                    <li key={workout.id}>
                      <Link
                        href={`/workouts/${workout.id}`}
                        className="flex items-center justify-between hover:bg-gray-50 p-2 rounded group"
                      >
                        <div className="flex-1">
                          <div className="font-medium text-sm">{workout.title}</div>
                          <div className="text-xs text-gray-500">
                            {new Date(workout.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 text-sm">No workouts yet</p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}