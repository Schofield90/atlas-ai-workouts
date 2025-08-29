'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Users, Dumbbell, ChartBar, Settings, Brain, Cloud } from 'lucide-react'
import { simpleClientService as clientService } from '@/lib/services/workout-data-simple'

export default function DashboardPage() {
  const [clients, setClients] = useState<any[]>([])
  const [workouts, setWorkouts] = useState<any[]>([])
  const [stats, setStats] = useState({ clients: 0, workouts: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      // Load clients from Supabase
      const cloudClients = await clientService.getClients()
      // For now, workouts are empty until we implement workout service
      const cloudWorkouts: any[] = []
      
      setClients(cloudClients.slice(0, 5))
      setWorkouts(cloudWorkouts.slice(0, 5))
      setStats({
        clients: cloudClients.length,
        workouts: cloudWorkouts.length
      })
    } catch (error) {
      console.error('Error loading dashboard data:', error)
      setClients([])
      setWorkouts([])
      setStats({ clients: 0, workouts: 0 })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <nav className="bg-gray-800 shadow-sm border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-100">
                Workout Platform
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-300 flex items-center gap-1">
                <Cloud className="w-4 h-4 text-green-500" />
                AI Workout Generator (Cloud)
              </span>
              <Link href="/settings" className="text-gray-400 hover:text-gray-100">
                <Settings className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-100 mb-2">Welcome Back</h2>
          <p className="text-gray-400">All data synced to cloud storage</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <Users className="w-8 h-8 text-blue-500" />
              <span className="text-2xl font-bold text-gray-100">{loading ? '...' : stats.clients}</span>
            </div>
            <h3 className="text-gray-400 text-sm">Total Clients</h3>
          </div>

          <div className="bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <Dumbbell className="w-8 h-8 text-green-500" />
              <span className="text-2xl font-bold text-gray-100">{loading ? '...' : stats.workouts}</span>
            </div>
            <h3 className="text-gray-400 text-sm">Total Workouts</h3>
          </div>

          <div className="bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <Brain className="w-8 h-8 text-purple-500" />
              <span className="text-2xl font-bold text-gray-100">AI</span>
            </div>
            <h3 className="text-gray-400 text-sm">Powered by AI</h3>
          </div>

          <div className="bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <ChartBar className="w-8 h-8 text-orange-500" />
              <span className="text-2xl font-bold text-gray-100">100%</span>
            </div>
            <h3 className="text-gray-400 text-sm">Cloud Synced</h3>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-gray-800 rounded-lg shadow-lg">
            <div className="p-6 border-b border-gray-700">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-100">Recent Clients</h3>
                <Link href="/clients" className="text-blue-400 hover:text-blue-300 text-sm">
                  View All →
                </Link>
              </div>
            </div>
            <div className="p-6">
              {loading ? (
                <p className="text-gray-400">Loading...</p>
              ) : clients.length > 0 ? (
                <div className="space-y-3">
                  {clients.map((client) => (
                    <Link
                      key={client.id}
                      href={`/clients/${client.id}`}
                      className="block p-3 bg-gray-700 rounded hover:bg-gray-600 transition-colors"
                    >
                      <p className="font-medium text-gray-100">{client.full_name}</p>
                      {client.email && (
                        <p className="text-sm text-gray-400">{client.email}</p>
                      )}
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400 mb-4">No clients yet</p>
                  <Link
                    href="/clients/new"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add First Client
                  </Link>
                </div>
              )}
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg shadow-lg">
            <div className="p-6 border-b border-gray-700">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-100">Recent Workouts</h3>
                <Link href="/workouts" className="text-blue-400 hover:text-blue-300 text-sm">
                  View All →
                </Link>
              </div>
            </div>
            <div className="p-6">
              {loading ? (
                <p className="text-gray-400">Loading...</p>
              ) : workouts.length > 0 ? (
                <div className="space-y-3">
                  {workouts.map((workout) => (
                    <Link
                      key={workout.id}
                      href={`/workouts/${workout.id}`}
                      className="block p-3 bg-gray-700 rounded hover:bg-gray-600 transition-colors"
                    >
                      <p className="font-medium text-gray-100">{workout.title}</p>
                      <p className="text-sm text-gray-400">
                        {workout.duration_minutes} min • {workout.exercises?.length || 0} exercises
                      </p>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Dumbbell className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400 mb-4">No workouts yet</p>
                  <Link
                    href="/builder"
                    className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Workout
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-2 md:grid-cols-5 gap-4">
          <Link
            href="/clients/new"
            className="p-4 bg-gray-800 rounded-lg shadow-lg hover:shadow-xl transition-shadow text-center"
          >
            <Plus className="w-6 h-6 text-blue-500 mx-auto mb-2" />
            <span className="text-sm text-gray-300">Add Client</span>
          </Link>
          
          <Link
            href="/builder"
            className="p-4 bg-gray-800 rounded-lg shadow-lg hover:shadow-xl transition-shadow text-center"
          >
            <Brain className="w-6 h-6 text-green-500 mx-auto mb-2" />
            <span className="text-sm text-gray-300">AI Workout</span>
          </Link>
          
          <Link
            href="/clients"
            className="p-4 bg-gray-800 rounded-lg shadow-lg hover:shadow-xl transition-shadow text-center"
          >
            <Users className="w-6 h-6 text-purple-500 mx-auto mb-2" />
            <span className="text-sm text-gray-300">All Clients</span>
          </Link>
          
          <Link
            href="/workouts"
            className="p-4 bg-gray-800 rounded-lg shadow-lg hover:shadow-xl transition-shadow text-center"
          >
            <Dumbbell className="w-6 h-6 text-orange-500 mx-auto mb-2" />
            <span className="text-sm text-gray-300">All Workouts</span>
          </Link>
          
          <Link
            href="/context"
            className="p-4 bg-gray-800 rounded-lg shadow-lg hover:shadow-xl transition-shadow text-center border-2 border-purple-600"
          >
            <Brain className="w-6 h-6 text-purple-500 mx-auto mb-2" />
            <span className="text-sm text-gray-300 font-semibold">SOPs & Context</span>
          </Link>
        </div>
      </main>
    </div>
  )
}