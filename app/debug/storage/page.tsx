'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function StorageDebugPage() {
  const [localData, setLocalData] = useState<any>({})
  const [hasData, setHasData] = useState(false)
  const router = useRouter()

  useEffect(() => {
    checkStorage()
  }, [])

  function checkStorage() {
    const clients = localStorage.getItem('ai-workout-clients')
    const workouts = localStorage.getItem('ai-workout-workouts')
    
    const data = {
      clients: clients ? JSON.parse(clients) : [],
      workouts: workouts ? JSON.parse(workouts) : [],
      clientsRaw: clients,
      workoutsRaw: workouts
    }
    
    setLocalData(data)
    setHasData((data.clients.length > 0) || (data.workouts.length > 0))
  }

  function addSampleData() {
    // Add sample clients
    const sampleClients = [
      {
        id: crypto.randomUUID(),
        full_name: "John Smith",
        email: "john@example.com",
        phone: "+1234567890",
        goals: "Build muscle, increase strength",
        injuries: "Previous shoulder injury (recovered)",
        equipment: ["dumbbells", "barbell", "resistance bands"],
        notes: "Prefers morning workouts",
        created_at: new Date().toISOString()
      },
      {
        id: crypto.randomUUID(),
        full_name: "Sarah Johnson",
        email: "sarah@example.com",
        phone: "+0987654321",
        goals: "Weight loss, improve cardio",
        injuries: "None",
        equipment: ["treadmill", "dumbbells", "yoga mat"],
        notes: "Training for 5K",
        created_at: new Date().toISOString()
      },
      {
        id: crypto.randomUUID(),
        full_name: "Mike Wilson",
        email: "mike@example.com",
        goals: "General fitness, flexibility",
        injuries: "Lower back - avoid heavy deadlifts",
        equipment: ["full gym access"],
        notes: "Intermediate level",
        created_at: new Date().toISOString()
      }
    ]

    // Add sample workouts
    const sampleWorkouts = [
      {
        id: crypto.randomUUID(),
        clientName: "John Smith",
        title: "Upper Body Strength",
        type: "strength",
        duration: 45,
        difficulty: "intermediate",
        exercises: [
          {
            name: "Bench Press",
            sets: 4,
            reps: "8-10",
            rest: "90s",
            notes: "Progressive overload"
          },
          {
            name: "Pull-ups",
            sets: 3,
            reps: "6-8",
            rest: "60s",
            notes: "Use assistance if needed"
          },
          {
            name: "Shoulder Press",
            sets: 3,
            reps: "10-12",
            rest: "60s"
          },
          {
            name: "Barbell Rows",
            sets: 4,
            reps: "10-12",
            rest: "60s"
          }
        ],
        notes: "Focus on form over weight",
        aiGenerated: true,
        prompt: "Upper body workout for muscle building",
        created_at: new Date().toISOString()
      },
      {
        id: crypto.randomUUID(),
        clientName: "Sarah Johnson",
        title: "HIIT Cardio Circuit",
        type: "cardio",
        duration: 30,
        difficulty: "beginner",
        exercises: [
          {
            name: "Jumping Jacks",
            duration: "30s",
            rest: "15s",
            rounds: 3
          },
          {
            name: "Mountain Climbers",
            duration: "30s",
            rest: "15s",
            rounds: 3
          },
          {
            name: "Burpees",
            duration: "20s",
            rest: "20s",
            rounds: 3
          },
          {
            name: "High Knees",
            duration: "30s",
            rest: "15s",
            rounds: 3
          }
        ],
        notes: "5 min warmup, 5 min cooldown",
        aiGenerated: true,
        created_at: new Date().toISOString()
      },
      {
        id: crypto.randomUUID(),
        clientName: "Mike Wilson",
        title: "Full Body Flexibility",
        type: "flexibility",
        duration: 40,
        difficulty: "beginner",
        exercises: [
          {
            name: "Dynamic Stretching",
            duration: "5 minutes",
            notes: "Arm circles, leg swings, torso twists"
          },
          {
            name: "Yoga Flow",
            duration: "20 minutes",
            notes: "Sun salutation sequence"
          },
          {
            name: "Static Stretching",
            duration: "15 minutes",
            notes: "Hold each stretch for 30s"
          }
        ],
        notes: "Focus on breathing",
        created_at: new Date().toISOString()
      }
    ]

    localStorage.setItem('ai-workout-clients', JSON.stringify(sampleClients))
    localStorage.setItem('ai-workout-workouts', JSON.stringify(sampleWorkouts))
    
    checkStorage()
    alert('Sample data added! Redirecting to sync page...')
    setTimeout(() => router.push('/setup/sync'), 1000)
  }

  function clearStorage() {
    if (confirm('Are you sure you want to clear all localStorage data?')) {
      localStorage.removeItem('ai-workout-clients')
      localStorage.removeItem('ai-workout-workouts')
      checkStorage()
      alert('Storage cleared!')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Storage Debug Tool</h1>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Current localStorage Status</h2>
          
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="font-semibold text-lg mb-2">Clients ({localData.clients?.length || 0})</h3>
              {localData.clients?.length > 0 ? (
                <div className="bg-gray-50 p-3 rounded max-h-60 overflow-y-auto">
                  {localData.clients.map((client: any, idx: number) => (
                    <div key={idx} className="mb-2 p-2 bg-white rounded border">
                      <p className="font-medium">{client.full_name}</p>
                      <p className="text-sm text-gray-600">{client.email}</p>
                      <p className="text-xs text-gray-500">Goals: {client.goals}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No clients found in localStorage</p>
              )}
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-2">Workouts ({localData.workouts?.length || 0})</h3>
              {localData.workouts?.length > 0 ? (
                <div className="bg-gray-50 p-3 rounded max-h-60 overflow-y-auto">
                  {localData.workouts.map((workout: any, idx: number) => (
                    <div key={idx} className="mb-2 p-2 bg-white rounded border">
                      <p className="font-medium">{workout.title}</p>
                      <p className="text-sm text-gray-600">For: {workout.clientName || 'General'}</p>
                      <p className="text-xs text-gray-500">
                        {workout.duration}min | {workout.exercises?.length || 0} exercises
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No workouts found in localStorage</p>
              )}
            </div>
          </div>

          <div className="flex gap-4">
            {!hasData && (
              <button
                onClick={addSampleData}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
              >
                Add Sample Data
              </button>
            )}
            
            {hasData && (
              <>
                <button
                  onClick={() => router.push('/setup/sync')}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                >
                  Go to Sync Page
                </button>
                <button
                  onClick={clearStorage}
                  className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700"
                >
                  Clear Storage
                </button>
              </>
            )}
            
            <button
              onClick={checkStorage}
              className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700"
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-yellow-900 mb-2">ℹ️ localStorage Keys Used</h3>
          <ul className="text-yellow-800 text-sm space-y-1">
            <li><code className="bg-yellow-100 px-1">ai-workout-clients</code> - Stores client information</li>
            <li><code className="bg-yellow-100 px-1">ai-workout-workouts</code> - Stores workout templates</li>
          </ul>
        </div>

        {(localData.clientsRaw || localData.workoutsRaw) && (
          <div className="bg-gray-100 rounded-lg p-4">
            <h3 className="font-semibold mb-2">Raw Data (for debugging)</h3>
            <details className="mb-2">
              <summary className="cursor-pointer text-blue-600 hover:underline">
                Clients Raw JSON ({localData.clientsRaw?.length || 0} characters)
              </summary>
              <pre className="mt-2 bg-white p-2 rounded text-xs overflow-x-auto">
                {localData.clientsRaw || 'null'}
              </pre>
            </details>
            <details>
              <summary className="cursor-pointer text-blue-600 hover:underline">
                Workouts Raw JSON ({localData.workoutsRaw?.length || 0} characters)
              </summary>
              <pre className="mt-2 bg-white p-2 rounded text-xs overflow-x-auto">
                {localData.workoutsRaw || 'null'}
              </pre>
            </details>
          </div>
        )}
      </div>
    </div>
  )
}