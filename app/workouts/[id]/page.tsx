'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import WorkoutViewer from './workout-viewer'
import { createClient } from '@/lib/db/client-fixed'

export default function WorkoutPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = use(params)
  const router = useRouter()
  const [workout, setWorkout] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadWorkout() {
      try {
        setLoading(true)
        
        // First try to load from localStorage
        const localWorkouts = JSON.parse(localStorage.getItem('ai-workout-workouts') || '[]')
        const localWorkout = localWorkouts.find((w: any) => w.id === id)
        
        if (localWorkout) {
          setWorkout(localWorkout)
          setLoading(false)
          return
        }
        
        // If not in localStorage, try Supabase
        const supabase = createClient()
        const { data: foundWorkout, error } = await supabase
          .from('workout_sessions')
          .select(`
            *,
            workout_clients (
              id,
              full_name,
              email,
              goals,
              injuries
            )
          `)
          .eq('id', id)
          .single()
        
        if (error || !foundWorkout) {
          console.error('Workout not found in localStorage or database:', id, error)
          router.push('/dashboard')
          return
        }
        
        // Ensure workout has proper structure
        const formattedWorkout = {
          ...foundWorkout,
          plan: foundWorkout.plan || foundWorkout,
          clients: foundWorkout.workout_clients || { full_name: 'Guest User' }
        }
        setWorkout(formattedWorkout)
      } catch (error) {
        console.error('Error loading workout:', error)
        router.push('/dashboard')
      } finally {
        setLoading(false)
      }
    }
    
    loadWorkout()
  }, [id, router])

  if (loading || !workout) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
      </div>
    )
  }

  return <WorkoutViewer workout={workout} />
}