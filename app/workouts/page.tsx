'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Clock, ChevronRight, Dumbbell } from 'lucide-react'

export default function WorkoutsPage() {
  const [workouts, setWorkouts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadWorkouts()
  }, [])

  async function loadWorkouts() {
    try {
      const response = await fetch('/api/workouts')
      const data = await response.json()
      
      if (!response.ok) {
        console.error('Error loading workouts:', data.error)
        setWorkouts([])
      } else {
        console.log(`Loaded ${data.count} workouts from database`)
        setWorkouts(data.workouts || [])
      }
    } catch (error) {
      console.error('Error loading workouts:', error)
      setWorkouts([])
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-gray-400">Loading workouts...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <nav className="bg-gray-800 shadow-sm border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/dashboard" className="text-gray-400 hover:text-gray-200 mr-4">
                ← Back
              </Link>
              <h1 className="text-xl font-semibold text-gray-100">All Workouts</h1>
            </div>
            <div className="flex items-center">
              <Link
                href="/builder"
                className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Workout
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {workouts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workouts.map((workout) => (
              <Link
                key={workout.id}
                href={`/workouts/${workout.id}`}
                className="bg-gray-800 rounded-lg shadow-lg hover:shadow-xl transition-shadow border border-gray-700"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <Dumbbell className="h-8 w-8 text-purple-400" />
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2 text-gray-100">{workout.title}</h3>
                  <p className="text-sm text-gray-400 mb-3">
                    {workout.clients?.full_name || 'Guest User'}
                  </p>
                  <div className="flex items-center text-xs text-gray-500">
                    <Clock className="h-3 w-3 mr-1" />
                    {new Date(workout.created_at).toLocaleDateString()}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Dumbbell className="h-12 w-12 text-gray-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-300 mb-2">No workouts yet</h2>
            <p className="text-gray-400 mb-6">Create your first AI-powered workout to get started</p>
            <Link
              href="/builder"
              className="inline-flex items-center px-6 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700"
            >
              <Plus className="h-5 w-5 mr-2" />
              Create First Workout
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}