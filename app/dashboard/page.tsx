'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Users, Dumbbell, ChartBar, Settings, Brain } from 'lucide-react'

export default function DashboardPage() {
  const [clients, setClients] = useState<any[]>([])
  const [workouts, setWorkouts] = useState<any[]>([])
  const [stats, setStats] = useState({ clients: 0, workouts: 0 })

  useEffect(() => {
    // Load data from localStorage
    const savedClients = JSON.parse(localStorage.getItem('ai-workout-clients') || '[]')
    const savedWorkouts = JSON.parse(localStorage.getItem('ai-workout-workouts') || '[]')
    
    setClients(savedClients.slice(0, 5))
    setWorkouts(savedWorkouts.slice(0, 5))
    setStats({
      clients: savedClients.length,
      workouts: savedWorkouts.length
    })
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold">
                Workout Platform
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                AI Workout Generator
              </span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Link
            href="/builder"
            className="flex items-center justify-center p-6 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-5 w-5 mr-2" />
            <span className="font-medium">Create Workout</span>
          </Link>
          
          <Link
            href="/clients"
            className="flex items-center justify-center p-6 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Users className="h-5 w-5 mr-2" />
            <span className="font-medium">Manage Clients</span>
          </Link>
          
          <Link
            href="/context"
            className="flex items-center justify-center p-6 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Brain className="h-5 w-5 mr-2" />
            <span className="font-medium">Manage Context</span>
          </Link>
          
          <Link
            href="/workouts"
            className="flex items-center justify-center p-6 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Dumbbell className="h-5 w-5 mr-2" />
            <span className="font-medium">View Workouts</span>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-2xl font-bold text-gray-900">{stats.clients}</div>
            <div className="text-sm text-gray-500">Total Clients</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-2xl font-bold text-gray-900">{stats.workouts}</div>
            <div className="text-sm text-gray-500">Workouts Created</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-2xl font-bold text-gray-900">0</div>
            <div className="text-sm text-gray-500">This Week</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-2xl font-bold text-gray-900">0%</div>
            <div className="text-sm text-gray-500">Completion Rate</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Clients */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">Recent Clients</h2>
            </div>
            <div className="p-6">
              {clients && clients.length > 0 ? (
                <ul className="space-y-3">
                  {clients.map((client) => (
                    <li key={client.id}>
                      <Link
                        href={`/clients/${client.id}`}
                        className="flex items-center justify-between hover:bg-gray-50 p-2 rounded"
                      >
                        <div>
                          <div className="font-medium">{client.full_name}</div>
                          <div className="text-sm text-gray-500">{client.email}</div>
                        </div>
                        <ChartBar className="h-4 w-4 text-gray-400" />
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500">No clients yet. Add your first client to get started!</p>
              )}
            </div>
          </div>

          {/* Recent Workouts */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">Recent Workouts</h2>
            </div>
            <div className="p-6">
              {workouts && workouts.length > 0 ? (
                <ul className="space-y-3">
                  {workouts.map((workout) => (
                    <li key={workout.id}>
                      <Link
                        href={`/workouts/${workout.id}`}
                        className="flex items-center justify-between hover:bg-gray-50 p-2 rounded"
                      >
                        <div>
                          <div className="font-medium">{workout.title}</div>
                          <div className="text-sm text-gray-500">
                            {workout.clients?.full_name}
                          </div>
                        </div>
                        <span className="text-xs text-gray-400">
                          {new Date(workout.created_at).toLocaleDateString()}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500">No workouts yet. Create your first AI-powered workout!</p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}