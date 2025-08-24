'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Save, User } from 'lucide-react'

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

export default function EditClientPage() {
  const params = useParams()
  const router = useRouter()
  const clientId = params.id as string
  
  const [client, setClient] = useState<Client | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadClient()
  }, [clientId])

  function loadClient() {
    try {
      const saved = localStorage.getItem('ai-workout-clients')
      const clients = saved ? JSON.parse(saved) : []
      const foundClient = clients.find((c: Client) => c.id === clientId)
      
      if (foundClient) {
        setClient(foundClient)
      } else {
        setError('Client not found')
      }
    } catch (error) {
      console.error('Error loading client:', error)
      setError('Failed to load client data')
    }
  }

  function saveClient() {
    if (!client) return
    
    setSaving(true)
    
    try {
      const saved = localStorage.getItem('ai-workout-clients')
      const clients = saved ? JSON.parse(saved) : []
      const updatedClients = clients.map((c: Client) => 
        c.id === clientId ? client : c
      )
      
      localStorage.setItem('ai-workout-clients', JSON.stringify(updatedClients))
      
      // Navigate back to clients page
      router.push('/clients')
    } catch (error) {
      console.error('Save error:', error)
      setError('Failed to save changes')
      setSaving(false)
    }
  }

  if (error && !client) {
    return (
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <a href="/clients" className="text-gray-500 hover:text-gray-700 mr-4">
                  <ArrowLeft className="h-5 w-5" />
                </a>
                <h1 className="text-xl font-semibold">Edit Client</h1>
              </div>
            </div>
          </div>
        </nav>
        <main className="max-w-2xl mx-auto px-4 py-12">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-700">{error}</p>
            <a href="/clients" className="text-blue-600 hover:underline mt-4 inline-block">
              Back to Clients
            </a>
          </div>
        </main>
      </div>
    )
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div>Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/clients')}
                className="text-gray-500 hover:text-gray-700 mr-4"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <h1 className="text-xl font-semibold">Edit Client</h1>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-6">
            <div className="bg-blue-100 rounded-full p-3 mr-3">
              <User className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Edit Client Details</h2>
              <p className="text-sm text-gray-500">Client ID: {client.id}</p>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Full Name *
              </label>
              <input
                id="name"
                type="text"
                value={client.full_name}
                onChange={(e) => setClient({ ...client, full_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={client.email || ''}
                onChange={(e) => setClient({ ...client, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <input
                id="phone"
                type="tel"
                value={client.phone || ''}
                onChange={(e) => setClient({ ...client, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="goals" className="block text-sm font-medium text-gray-700 mb-1">
                Fitness Goals
              </label>
              <textarea
                id="goals"
                value={client.goals || ''}
                onChange={(e) => setClient({ ...client, goals: e.target.value })}
                rows={3}
                placeholder="e.g., Build muscle, lose weight, improve endurance"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="injuries" className="block text-sm font-medium text-gray-700 mb-1">
                Injuries or Limitations
              </label>
              <textarea
                id="injuries"
                value={client.injuries || ''}
                onChange={(e) => setClient({ ...client, injuries: e.target.value })}
                rows={2}
                placeholder="e.g., Lower back pain, knee injury, shoulder impingement"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="equipment" className="block text-sm font-medium text-gray-700 mb-1">
                Available Equipment
              </label>
              <textarea
                id="equipment"
                value={client.equipment || ''}
                onChange={(e) => setClient({ ...client, equipment: e.target.value })}
                rows={2}
                placeholder="e.g., Dumbbells, barbell, pull-up bar, resistance bands"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                Additional Notes
              </label>
              <textarea
                id="notes"
                value={client.notes || ''}
                onChange={(e) => setClient({ ...client, notes: e.target.value })}
                rows={3}
                placeholder="Any other relevant information..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="text-sm text-gray-500">
              Created: {new Date(client.created_at).toLocaleDateString()}
            </div>
          </div>

          <div className="mt-6 flex space-x-3">
            <button
              onClick={saveClient}
              disabled={saving || !client.full_name.trim()}
              className="flex-1 py-2 px-4 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            
            <button
              onClick={() => router.push('/clients')}
              className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 font-medium rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}