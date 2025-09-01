'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft, 
  Users, 
  Dumbbell, 
  Clock, 
  Target, 
  Edit2,
  CheckCircle,
  AlertCircle,
  Download,
  Printer,
  ChevronDown,
  ChevronUp
} from 'lucide-react'

interface Exercise {
  name: string
  sets: number
  reps?: string
  time_seconds?: number
  rest_seconds: number
  instruction?: string
}

interface WorkoutBlock {
  title: string
  exercises: Exercise[]
}

interface WorkoutData {
  id: string
  title: string
  client_name: string
  client_id: string
  blocks?: WorkoutBlock[]
  plan?: any
  created_at: string
  isGroupWorkout?: boolean
  training_goals?: string[]
  constraints?: string[]
  equipment_assigned?: string[]
}

function BulkReviewContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [workouts, setWorkouts] = useState<WorkoutData[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedWorkouts, setExpandedWorkouts] = useState<Set<string>>(new Set())
  const [groupNotes, setGroupNotes] = useState<string>('')
  const [sharedRehab, setSharedRehab] = useState<Exercise[]>([])

  useEffect(() => {
    const workoutIds = searchParams.get('ids')?.split(',') || []
    if (workoutIds.length > 0) {
      loadWorkouts(workoutIds)
    } else {
      setLoading(false)
    }
  }, [searchParams])

  async function loadWorkouts(ids: string[]) {
    console.log('Loading workouts with IDs:', ids)
    try {
      const promises = ids.map(id => 
        fetch(`/api/workouts?id=${id}`)
          .then(res => {
            if (!res.ok) {
              console.error(`Failed to fetch workout ${id}:`, res.status)
            }
            return res.json()
          })
          .catch(err => {
            console.error(`Error fetching workout ${id}:`, err)
            return { success: false, error: err.message }
          })
      )
      
      const results = await Promise.all(promises)
      console.log('Fetched workout results:', results)
      
      const loadedWorkouts = results
        .filter(r => {
          if (!r.success || !r.workout) {
            console.warn('Skipping invalid workout result:', r)
            return false
          }
          return true
        })
        .map(r => {
          const workout = {
            ...r.workout,
            client_name: r.workout.workout_clients?.full_name || r.workout.client_name || 'Unknown',
            blocks: r.workout.plan?.blocks || [],
            training_goals: r.workout.plan?.training_goals || [],
            constraints: r.workout.plan?.constraints || [],
            equipment_assigned: r.workout.plan?.equipment_assigned || [],
            isGroupWorkout: r.workout.source === 'group-ai' || r.workout.plan?.group_title ? true : false
          }
          console.log('Processed workout:', workout.id, workout.client_name)
          return workout
        })
      
      console.log(`Loaded ${loadedWorkouts.length} workouts successfully`)
      setWorkouts(loadedWorkouts)
      
      // Extract shared rehab exercises if it's a group workout
      if (loadedWorkouts.length > 0 && loadedWorkouts[0].plan?.shared_rehab_exercises) {
        setSharedRehab(loadedWorkouts[0].plan.shared_rehab_exercises)
        console.log('Found shared rehab exercises:', loadedWorkouts[0].plan.shared_rehab_exercises)
      }
      
      // Extract group notes if available
      if (loadedWorkouts.length > 0 && loadedWorkouts[0].plan?.group_notes) {
        setGroupNotes(loadedWorkouts[0].plan.group_notes)
        console.log('Found group notes:', loadedWorkouts[0].plan.group_notes)
      }
    } catch (error) {
      console.error('Error loading workouts:', error)
    } finally {
      setLoading(false)
    }
  }

  function toggleWorkout(id: string) {
    const newExpanded = new Set(expandedWorkouts)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedWorkouts(newExpanded)
  }

  function expandAll() {
    setExpandedWorkouts(new Set(workouts.map(w => w.id)))
  }

  function collapseAll() {
    setExpandedWorkouts(new Set())
  }

  async function exportAllAsPDF() {
    // TODO: Implement PDF export for all workouts
    alert('PDF export coming soon!')
  }

  const isGroupSession = workouts.some(w => w.isGroupWorkout)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Dumbbell className="h-12 w-12 text-blue-500 animate-pulse mx-auto mb-4" />
          <p className="text-gray-400">Loading workouts...</p>
        </div>
      </div>
    )
  }

  if (workouts.length === 0) {
    return (
      <div className="min-h-screen bg-gray-900">
        <nav className="bg-gray-800 shadow-sm border-b border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center space-x-4">
                <Link href="/builder/bulk" className="text-gray-400 hover:text-gray-100">
                  <ArrowLeft className="w-5 h-5" />
                </Link>
                <h1 className="text-xl font-semibold text-gray-100">Bulk Workout Review</h1>
              </div>
            </div>
          </div>
        </nav>
        
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-gray-800 rounded-lg shadow-lg p-12 text-center">
            <AlertCircle className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-100 mb-2">No Workouts Found</h2>
            <p className="text-gray-400 mb-6">No workout IDs were provided to review.</p>
            <Link
              href="/builder/bulk"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Bulk Builder
            </Link>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <nav className="bg-gray-800 shadow-sm border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link href="/builder/bulk" className="text-gray-400 hover:text-gray-100">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center space-x-2">
                {isGroupSession ? (
                  <Users className="w-5 h-5 text-purple-500" />
                ) : (
                  <Dumbbell className="w-5 h-5 text-blue-500" />
                )}
                <h1 className="text-xl font-semibold text-gray-100">
                  {isGroupSession ? 'Group Training Session Review' : 'Bulk Workout Review'}
                </h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={exportAllAsPDF}
                className="px-3 py-2 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export All
              </button>
              <button
                onClick={() => window.print()}
                className="px-3 py-2 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                Print
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Section */}
        <div className="bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-100 mb-2">
                {isGroupSession ? 'Group Training Overview' : 'Workout Summary'}
              </h2>
              <p className="text-gray-400">
                {workouts.length} {workouts.length === 1 ? 'workout' : 'workouts'} generated • 
                {new Date().toLocaleDateString()}
              </p>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={expandAll}
                className="px-3 py-1 text-sm bg-gray-700 text-gray-300 rounded hover:bg-gray-600"
              >
                Expand All
              </button>
              <button
                onClick={collapseAll}
                className="px-3 py-1 text-sm bg-gray-700 text-gray-300 rounded hover:bg-gray-600"
              >
                Collapse All
              </button>
            </div>
          </div>

          {/* Group Session Info */}
          {isGroupSession && (
            <div className="border-t border-gray-700 pt-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-gray-500 text-sm">Participants</p>
                  <p className="text-gray-100 font-medium">{workouts.length} clients</p>
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Session Type</p>
                  <p className="text-gray-100 font-medium">Group Training</p>
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Equipment Conflicts</p>
                  <p className="text-green-400 font-medium">✓ Prevented</p>
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Shared Exercises</p>
                  <p className="text-purple-400 font-medium">{sharedRehab.length} rehab exercises</p>
                </div>
              </div>
              
              {groupNotes && (
                <div className="mt-4 p-3 bg-gray-700 rounded">
                  <p className="text-sm text-gray-400 mb-1">Session Notes:</p>
                  <p className="text-gray-300">{groupNotes}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Shared Rehab Exercises (for group workouts) */}
        {isGroupSession && sharedRehab.length > 0 && (
          <div className="bg-purple-900/30 border border-purple-700 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-purple-400 mb-4 flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Shared Group Exercises (Everyone does these together)
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              {sharedRehab.map((exercise, index) => (
                <div key={index} className="bg-gray-800 rounded p-4">
                  <h4 className="font-medium text-gray-100 mb-2">{exercise.name}</h4>
                  <div className="text-sm text-gray-400">
                    <p>Sets: {exercise.sets} • Reps: {exercise.reps}</p>
                    <p>Rest: {exercise.rest_seconds}s</p>
                    {exercise.instruction && (
                      <p className="mt-1 text-purple-300">{exercise.instruction}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Individual Workouts */}
        <div className="space-y-4">
          {workouts.map((workout) => (
            <div key={workout.id} className="bg-gray-800 rounded-lg shadow-lg overflow-hidden">
              {/* Workout Header */}
              <div 
                className="p-6 cursor-pointer hover:bg-gray-750 transition-colors"
                onClick={() => toggleWorkout(workout.id)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold text-gray-100">
                        {workout.client_name}
                      </h3>
                      {workout.isGroupWorkout && (
                        <span className="text-xs bg-purple-600 text-white px-2 py-1 rounded-full">
                          GROUP MEMBER
                        </span>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                      {workout.training_goals && workout.training_goals.length > 0 && (
                        <div className="flex items-center gap-1">
                          <Target className="w-4 h-4" />
                          {workout.training_goals.join(', ')}
                        </div>
                      )}
                      {workout.equipment_assigned && workout.equipment_assigned.length > 0 && (
                        <div className="flex items-center gap-1">
                          <Dumbbell className="w-4 h-4" />
                          {workout.equipment_assigned.join(', ')}
                        </div>
                      )}
                      {workout.constraints && workout.constraints.length > 0 && (
                        <div className="flex items-center gap-1">
                          <AlertCircle className="w-4 h-4 text-yellow-500" />
                          {workout.constraints.join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/workouts/${workout.id}`}
                      className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-500 flex items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Edit2 className="w-4 h-4" />
                      Edit
                    </Link>
                    {expandedWorkouts.has(workout.id) ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </div>
              </div>

              {/* Workout Content */}
              {expandedWorkouts.has(workout.id) && (
                <div className="px-6 pb-6 border-t border-gray-700">
                  {workout.blocks && workout.blocks.map((block, blockIndex) => (
                    <div key={blockIndex} className="mt-4">
                      <h4 className="font-medium text-gray-300 mb-3">{block.title}</h4>
                      <div className="space-y-2">
                        {block.exercises.map((exercise, exIndex) => (
                          <div 
                            key={exIndex}
                            className="flex justify-between items-center p-3 bg-gray-700 rounded"
                          >
                            <div className="flex-1">
                              <p className="text-gray-100 font-medium">{exercise.name}</p>
                              {exercise.instruction && (
                                <p className="text-sm text-gray-400 mt-1">{exercise.instruction}</p>
                              )}
                            </div>
                            <div className="text-sm text-gray-400 text-right">
                              <p>{exercise.sets} sets × {exercise.reps || `${exercise.time_seconds}s`}</p>
                              <p>Rest: {exercise.rest_seconds}s</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4">
          <button
            onClick={() => router.push('/workouts')}
            className="flex-1 py-3 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-500 flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-5 h-5" />
            Save & View in Workouts
          </button>
          
          <button
            onClick={() => router.push('/builder/bulk')}
            className="flex-1 py-3 px-4 border border-gray-600 text-gray-300 font-medium rounded-lg hover:bg-gray-800 flex items-center justify-center gap-2"
          >
            <Dumbbell className="w-5 h-5" />
            Generate More Workouts
          </button>
        </div>
      </main>
    </div>
  )
}

export default function BulkReviewPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Dumbbell className="h-12 w-12 text-blue-500 animate-pulse mx-auto mb-4" />
          <p className="text-gray-400">Loading bulk review...</p>
        </div>
      </div>
    }>
      <BulkReviewContent />
    </Suspense>
  )
}