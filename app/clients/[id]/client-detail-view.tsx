'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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

interface ClientDetailViewProps {
  client: Client
  clientId: string
}

export default function ClientDetailView({ client, clientId }: ClientDetailViewProps) {
  const router = useRouter()
  const [error, setError] = useState('')

  async function deleteClient() {
    if (!confirm('Are you sure you want to delete this client?')) return
    
    try {
      // For now, just navigate back - delete functionality can be added later
      router.push('/clients')
    } catch (err) {
      console.error('Error deleting client:', err)
      setError('Failed to delete client')
    }
  }

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
        {error && (
          <div className="mb-4 p-4 bg-red-900/30 border border-red-800 rounded text-red-400">
            {error}
          </div>
        )}
        
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
              <p className="text-gray-400 text-sm">No workouts yet</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}