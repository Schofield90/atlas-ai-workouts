'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import WorkoutViewer from './workout-viewer'

export default function WorkoutPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = use(params)
  const router = useRouter()
  const [workout, setWorkout] = useState<any>(null)

  useEffect(() => {
    try {
      // Load workout from localStorage
      const saved = localStorage.getItem('ai-workout-workouts')
      const workouts = saved ? JSON.parse(saved) : []
      const validWorkouts = Array.isArray(workouts) ? workouts : []
      const foundWorkout = validWorkouts.find((w: any) => w.id === id || w.workoutId === id)
      
      if (foundWorkout) {
        // Ensure workout has proper structure
        const formattedWorkout = {
          ...foundWorkout,
          plan: foundWorkout.plan || foundWorkout,
          clients: foundWorkout.client || foundWorkout.clients || { full_name: 'Guest User' }
        }
        setWorkout(formattedWorkout)
      } else {
        // Redirect if workout not found
        console.error('Workout not found:', id)
        router.push('/dashboard')
      }
    } catch (error) {
      console.error('Error loading workout:', error)
      router.push('/dashboard')
    }
  }, [id, router])

  if (!workout) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return <WorkoutViewer workout={workout} />
}