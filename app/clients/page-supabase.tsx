'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  Users, 
  Plus, 
  Trash2, 
  Edit, 
  User,
  Cloud,
  CloudOff
} from 'lucide-react'
import { clientService, WorkoutClient } from '@/lib/services/workout-data'
import { createClient } from '@/lib/db/client'

export default function ClientsPageSupabase() {
  const [clients, setClients] = useState<WorkoutClient[]>([])
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set())

  useEffect(() => {
    checkAuthAndLoadClients()
  }, [])

  async function checkAuthAndLoadClients() {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      setIsAuthenticated(true)
      await loadClients()
    } else {
      setIsAuthenticated(false)
      setLoading(false)
    }
  }

  async function loadClients() {
    try {
      const data = await clientService.getClients()
      setClients(data)
    } catch (error) {
      console.error('Error loading clients:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this client?')) return
    
    try {
      await clientService.deleteClient(id)
      await loadClients()
    } catch (error) {
      console.error('Error deleting client:', error)
      alert('Failed to delete client')
    }
  }

  async function handleBulkDelete() {
    if (!confirm(`Delete ${selectedClients.size} selected clients?`)) return
    
    try {
      for (const id of selectedClients) {
        await clientService.deleteClient(id)
      }
      setSelectedClients(new Set())
      await loadClients()
    } catch (error) {
      console.error('Error deleting clients:', error)
      alert('Failed to delete some clients')
    }
  }

  const filteredClients = clients.filter(client =>
    client.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading clients...</div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow p-8 max-w-md w-full text-center">
          <CloudOff className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-4">Sign In Required</h2>
          <p className="text-gray-600 mb-6">
            Please sign in to access your clients in the cloud
          </p>
          <Link
            href="/login"
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 inline-block"
          >
            Sign In
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/dashboard" className="text-gray-500 hover:text-gray-700 mr-4">
                ← Back
              </Link>
              <h1 className="text-xl font-semibold flex items-center gap-2">
                <Users className="w-5 h-5" />
                Clients
                <span className="text-sm text-green-600 flex items-center gap-1">
                  <Cloud className="w-4 h-4" />
                  Cloud Synced
                </span>
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/clients/new"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Client
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <div className="flex justify-between items-center mb-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search clients..."
                  className="w-full max-w-md px-4 py-2 border rounded-lg"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              {selectedClients.size > 0 && (
                <button
                  onClick={handleBulkDelete}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Selected ({selectedClients.size})
                </button>
              )}
            </div>
          </div>

          {filteredClients.length === 0 ? (
            <div className="p-12 text-center">
              <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {searchTerm ? 'No clients found' : 'No clients yet'}
              </h3>
              <p className="text-gray-500 mb-6">
                {searchTerm 
                  ? 'Try adjusting your search' 
                  : 'Get started by adding your first client'}
              </p>
              {!searchTerm && (
                <Link
                  href="/clients/new"
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 inline-flex items-center"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Client
                </Link>
              )}
            </div>
          ) : (
            <div className="divide-y">
              {filteredClients.map((client) => (
                <div key={client.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start">
                      <input
                        type="checkbox"
                        className="mt-1 mr-4"
                        checked={selectedClients.has(client.id)}
                        onChange={(e) => {
                          const newSelected = new Set(selectedClients)
                          if (e.target.checked) {
                            newSelected.add(client.id)
                          } else {
                            newSelected.delete(client.id)
                          }
                          setSelectedClients(newSelected)
                        }}
                      />
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {client.full_name}
                        </h3>
                        {client.email && (
                          <p className="text-sm text-gray-600">{client.email}</p>
                        )}
                        {client.phone && (
                          <p className="text-sm text-gray-600">{client.phone}</p>
                        )}
                        {client.goals && (
                          <p className="text-sm text-gray-500 mt-1">
                            Goals: {client.goals}
                          </p>
                        )}
                        {client.injuries && (
                          <p className="text-sm text-orange-600 mt-1">
                            ⚠️ Injuries: {client.injuries}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Link
                        href={`/clients/${client.id}`}
                        className="text-blue-600 hover:text-blue-700 p-2"
                      >
                        <Edit className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => handleDelete(client.id)}
                        className="text-red-600 hover:text-red-700 p-2"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}