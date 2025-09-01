'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Clock, 
  Edit2, 
  Save, 
  X, 
  Download, 
  Copy,
  ChevronDown,
  ChevronUp,
  Timer,
  Activity,
  Target,
  AlertCircle
} from 'lucide-react'
import type { WorkoutPlan, WorkoutBlock } from '@/lib/ai/schema'
import WorkoutFeedback from '@/app/components/WorkoutFeedback'

interface WorkoutViewerProps {
  workout: {
    id: string
    title: string
    plan: WorkoutPlan
    source: string
    version: number
    created_at: string
    clients: {
      full_name: string
      email?: string
      goals?: string
      injuries?: string
      equipment?: any
    }
  }
}

export default function WorkoutViewer({ workout }: WorkoutViewerProps) {
  const router = useRouter()
  
  // Ensure workout has required structure
  if (!workout || !workout.plan) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-300 mb-4">Invalid workout data</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }
  
  const [isEditing, setIsEditing] = useState(false)
  const [editedPlan, setEditedPlan] = useState<WorkoutPlan>(workout.plan || {
    blocks: [],
    training_goals: [],
    constraints: [],
    total_time_minutes: 0,
    intensity_target: 'Moderate',
    client_id: '',
    program_phase: 'General Training'
  })
  const [expandedBlocks, setExpandedBlocks] = useState<Set<number>>(new Set([0]))
  const [saving, setSaving] = useState(false)

  const toggleBlock = (index: number) => {
    const newExpanded = new Set(expandedBlocks)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedBlocks(newExpanded)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await fetch(`/api/workouts/${workout.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: editedPlan }),
      })

      if (response.ok) {
        setIsEditing(false)
        router.refresh()
      }
    } catch (error) {
      console.error('Failed to save workout:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleExport = () => {
    const dataStr = JSON.stringify(workout.plan, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr)
    
    const exportFileDefaultName = `${workout.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`
    
    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()
  }

  const handleDuplicate = async () => {
    try {
      const response = await fetch('/api/workouts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `${workout.title} (Copy)`,
          clientId: workout.plan.client_id,
          basePlan: workout.plan,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        router.push(`/workouts/${data.workoutId}`)
      }
    } catch (error) {
      console.error('Failed to duplicate workout:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <nav className="bg-gray-800 shadow-sm border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <a href="/dashboard" className="text-gray-500 hover:text-gray-300 mr-4">
                ← Back
              </a>
              <h1 className="text-xl font-semibold text-gray-100">{workout.title}</h1>
              {workout.source === 'ai' && (
                <span className="ml-3 px-2 py-1 text-xs bg-purple-900/30 text-purple-400 rounded">
                  AI Generated
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2">
              {!isEditing ? (
                <>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-3 py-1 text-sm border border-gray-600 rounded hover:bg-gray-900"
                  >
                    <Edit2 className="h-4 w-4 inline mr-1" />
                    Edit
                  </button>
                  <button
                    onClick={handleDuplicate}
                    className="px-3 py-1 text-sm border border-gray-600 rounded hover:bg-gray-900"
                  >
                    <Copy className="h-4 w-4 inline mr-1" />
                    Duplicate
                  </button>
                  <button
                    onClick={handleExport}
                    className="px-3 py-1 text-sm border border-gray-600 rounded hover:bg-gray-900"
                  >
                    <Download className="h-4 w-4 inline mr-1" />
                    Export
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    <Save className="h-4 w-4 inline mr-1" />
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => {
                      setEditedPlan(workout.plan)
                      setIsEditing(false)
                    }}
                    className="px-3 py-1 text-sm border border-gray-600 rounded hover:bg-gray-900"
                  >
                    <X className="h-4 w-4 inline mr-1" />
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Workout Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Workout Summary */}
            <div className="bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-100 mb-4">Workout Overview</h2>
              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-center">
                  <Timer className="h-5 w-5 text-gray-500 mr-2" />
                  <div>
                    <div className="text-sm text-gray-500">Duration</div>
                    <div className="font-medium text-gray-100">{editedPlan.total_time_minutes} min</div>
                  </div>
                </div>
                <div className="flex items-center">
                  <Activity className="h-5 w-5 text-gray-500 mr-2" />
                  <div>
                    <div className="text-sm text-gray-500">Intensity</div>
                    <div className="font-medium text-gray-100">{editedPlan.intensity_target || 'Moderate'}</div>
                  </div>
                </div>
                <div className="flex items-center">
                  <Target className="h-5 w-5 text-gray-500 mr-2" />
                  <div>
                    <div className="text-sm text-gray-500">Blocks</div>
                    <div className="font-medium text-gray-100">{editedPlan.blocks?.length || 0}</div>
                  </div>
                </div>
              </div>
              
              {editedPlan.training_goals && editedPlan.training_goals.length > 0 && (
                <div className="mt-4">
                  <div className="text-sm text-gray-500 mb-1">Training Goals</div>
                  <div className="flex flex-wrap gap-2">
                    {editedPlan.training_goals.map((goal, i) => (
                      <span key={i} className="px-2 py-1 bg-blue-900/30 text-blue-400 text-sm rounded">
                        {goal}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {editedPlan.constraints && editedPlan.constraints.length > 0 && (
                <div className="mt-4">
                  <div className="flex items-center text-sm text-gray-500 mb-1">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    Constraints
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {editedPlan.constraints.map((constraint, i) => (
                      <span key={i} className="px-2 py-1 bg-yellow-900/30 text-yellow-400 text-sm rounded">
                        {constraint}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Workout Blocks */}
            {editedPlan.blocks && Array.isArray(editedPlan.blocks) && editedPlan.blocks.map((block, blockIndex) => (
              <div key={blockIndex} className="bg-gray-800 rounded-lg shadow">
                <button
                  onClick={() => toggleBlock(blockIndex)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-900 transition-colors"
                >
                  <h3 className="text-lg font-semibold text-gray-100">{block.title}</h3>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">
                      {block.exercises?.length || 0} exercises
                    </span>
                    {expandedBlocks.has(blockIndex) ? (
                      <ChevronUp className="h-5 w-5 text-gray-500" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-500" />
                    )}
                  </div>
                </button>

                {expandedBlocks.has(blockIndex) && (
                  <div className="px-6 pb-6">
                    <div className="space-y-4">
                      {block.exercises && Array.isArray(block.exercises) && block.exercises.map((exercise, exIndex) => (
                        <div key={exIndex} className="border-l-4 border-blue-500 pl-4 py-2">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-100">
                                {exercise.name}
                              </h4>
                              
                              <div className="mt-1 flex flex-wrap gap-3 text-sm text-gray-300">
                                {/* Handle both old and new exercise formats */}
                                {exercise.sets && (
                                  <span>{exercise.sets} sets</span>
                                )}
                                {exercise.reps && (
                                  <span>× {typeof exercise.reps === 'number' ? `${exercise.reps} sets` : exercise.reps}</span>
                                )}
                                {exercise.duration && (
                                  <span>
                                    <Clock className="h-3 w-3 inline mr-1" />
                                    {exercise.duration}
                                  </span>
                                )}
                                {exercise.time_seconds && (
                                  <span>
                                    <Clock className="h-3 w-3 inline mr-1" />
                                    {exercise.time_seconds}s
                                  </span>
                                )}
                                {exercise.rest && (
                                  <span>Rest: {exercise.rest}</span>
                                )}
                                {exercise.rest_seconds && (
                                  <span>Rest: {exercise.rest_seconds}s</span>
                                )}
                                {exercise.load && (
                                  <span className="font-medium">{exercise.load}</span>
                                )}
                                {exercise.tempo && (
                                  <span>Tempo: {exercise.tempo}</span>
                                )}
                              </div>

                              {exercise.notes && exercise.notes.length > 0 && (
                                <div className="mt-2">
                                  <div className="text-xs text-gray-500 uppercase tracking-wide">Notes</div>
                                  <ul className="mt-1 text-sm text-gray-300 list-disc list-inside">
                                    {exercise.notes.map((note, i) => (
                                      <li key={i}>{note}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {exercise.substitutions && exercise.substitutions.length > 0 && (
                                <div className="mt-2">
                                  <div className="text-xs text-gray-500 uppercase tracking-wide">Alternatives</div>
                                  <div className="mt-1 flex flex-wrap gap-2">
                                    {exercise.substitutions.map((sub, i) => (
                                      <span key={i} className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded">
                                        {sub}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>

                            {isEditing && (
                              <button className="ml-4 text-gray-500 hover:text-gray-300">
                                <Edit2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Feedback is now handled by FeedbackChat component */}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Client Info */}
            <div className="bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-100 mb-4">Client Details</h3>
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-gray-500">Name</div>
                  <div className="font-medium text-gray-100">{workout.clients.full_name}</div>
                </div>
                {workout.clients.email && (
                  <div>
                    <div className="text-sm text-gray-500">Email</div>
                    <div className="font-medium text-sm text-gray-300">{workout.clients.email}</div>
                  </div>
                )}
                {workout.clients.goals && (
                  <div>
                    <div className="text-sm text-gray-500">Goals</div>
                    <div className="text-sm text-gray-300">{workout.clients.goals}</div>
                  </div>
                )}
                {workout.clients.injuries && (
                  <div>
                    <div className="text-sm text-gray-500">Injuries/Limitations</div>
                    <div className="text-sm text-orange-400">{workout.clients.injuries}</div>
                  </div>
                )}
                {workout.clients.equipment && workout.clients.equipment.length > 0 && (
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Available Equipment</div>
                    <div className="flex flex-wrap gap-1">
                      {workout.clients.equipment.map((item: string, i: number) => (
                        <span key={i} className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Workout Metadata */}
            <div className="bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-100 mb-4">Workout Info</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <div className="text-gray-500">Version</div>
                  <div className="font-medium text-gray-100">{workout.version}</div>
                </div>
                <div>
                  <div className="text-gray-500">Created</div>
                  <div className="font-medium text-gray-100">
                    {new Date(workout.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500">Program Phase</div>
                  <div className="font-medium text-gray-100">
                    {workout.plan.program_phase || 'General Training'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      {/* Workout Feedback Component */}
      <WorkoutFeedback 
        workoutId={workout.id}
        workoutTitle={workout.title}
        clientId={workout.plan.client_id}
        clientName={workout.clients?.full_name}
      />
    </div>
  )
}