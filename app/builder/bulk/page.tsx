'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Loader2, 
  Plus, 
  Trash2, 
  Copy, 
  Users, 
  ChevronDown, 
  ChevronUp,
  Dumbbell,
  CheckCircle,
  AlertCircle
} from 'lucide-react'

interface Client {
  id: string
  full_name: string
  email?: string
  goals?: string
  injuries?: string
  equipment?: string
}

interface WorkoutConfig {
  clientId: string
  client?: Client
  title: string
  duration: number
  intensity: string
  focus: string
  equipment: string
  contextId?: string
}

export default function BulkBuilderPage() {
  const router = useRouter()
  
  const [clients, setClients] = useState<Client[]>([])
  const [contexts, setContexts] = useState<any[]>([])
  const [workoutConfigs, setWorkoutConfigs] = useState<WorkoutConfig[]>([])
  const [defaultSettings, setDefaultSettings] = useState({
    duration: 60,
    intensity: 'moderate',
    focus: '',
    equipment: '',
    contextId: ''
  })
  const [generating, setGenerating] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [results, setResults] = useState<any[]>([])
  const [showResults, setShowResults] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadClients()
    loadContexts()
  }, [])

  function loadClients() {
    try {
      const saved = localStorage.getItem('ai-workout-clients')
      const savedClients = saved ? JSON.parse(saved) : []
      const validClients = Array.isArray(savedClients) ? savedClients : []
      setClients(validClients)
    } catch (error) {
      console.error('Error loading clients:', error)
      setClients([])
    }
  }

  function loadContexts() {
    try {
      const saved = localStorage.getItem('ai-workout-contexts')
      const savedContexts = saved ? JSON.parse(saved) : []
      const validContexts = Array.isArray(savedContexts) ? savedContexts : []
      setContexts(validContexts)
    } catch (error) {
      console.error('Error loading contexts:', error)
      setContexts([])
    }
  }

  function addClient(clientId: string) {
    const client = clients.find(c => c.id === clientId)
    if (!client) return

    const newConfig: WorkoutConfig = {
      clientId,
      client,
      title: `${client.full_name.split(' ')[0]}'s Workout`,
      duration: defaultSettings.duration,
      intensity: defaultSettings.intensity,
      focus: defaultSettings.focus || client.goals || '',
      equipment: defaultSettings.equipment || client.equipment || '',
      contextId: defaultSettings.contextId
    }

    setWorkoutConfigs([...workoutConfigs, newConfig])
  }

  function removeConfig(index: number) {
    setWorkoutConfigs(workoutConfigs.filter((_, i) => i !== index))
  }

  function updateConfig(index: number, updates: Partial<WorkoutConfig>) {
    const updated = [...workoutConfigs]
    updated[index] = { ...updated[index], ...updates }
    setWorkoutConfigs(updated)
  }

  function duplicateConfig(index: number) {
    const config = workoutConfigs[index]
    const duplicate = { ...config, title: `${config.title} (Copy)` }
    setWorkoutConfigs([...workoutConfigs, duplicate])
  }

  function applyToAll(field: keyof WorkoutConfig, value: any) {
    const updated = workoutConfigs.map(config => ({
      ...config,
      [field]: value
    }))
    setWorkoutConfigs(updated)
  }

  async function generateWorkouts() {
    if (workoutConfigs.length === 0) {
      setError('Please add at least one client')
      return
    }

    setGenerating(true)
    setError('')
    setResults([])
    setProgress({ current: 0, total: workoutConfigs.length })

    const generatedWorkouts = []

    for (let i = 0; i < workoutConfigs.length; i++) {
      const config = workoutConfigs[i]
      setProgress({ current: i + 1, total: workoutConfigs.length })

      try {
        const response = await fetch('/api/workouts/generate-simple', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: config.title,
            clientId: config.clientId,
            client: config.client,
            duration: config.duration,
            intensity: config.intensity,
            focus: config.focus,
            equipment: config.equipment ? config.equipment.split(',').map(e => e.trim()) : [],
            context: contexts.find(c => c.id === config.contextId) || null,
          }),
        })

        const data = await response.json()
        
        if (response.ok) {
          // Save workout to localStorage
          const existingWorkouts = JSON.parse(localStorage.getItem('ai-workout-workouts') || '[]')
          existingWorkouts.push(data.workout)
          localStorage.setItem('ai-workout-workouts', JSON.stringify(existingWorkouts))
          
          generatedWorkouts.push({
            success: true,
            client: config.client?.full_name,
            workoutId: data.workoutId,
            title: config.title
          })
        } else {
          generatedWorkouts.push({
            success: false,
            client: config.client?.full_name,
            error: data.error || 'Failed to generate workout'
          })
        }
      } catch (err) {
        generatedWorkouts.push({
          success: false,
          client: config.client?.full_name,
          error: 'Network error'
        })
      }

      // Add a small delay between requests to avoid rate limiting
      if (i < workoutConfigs.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }

    setResults(generatedWorkouts)
    setShowResults(true)
    setGenerating(false)
  }

  const availableClients = clients.filter(
    client => !workoutConfigs.some(config => config.clientId === client.id)
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <a href="/dashboard" className="text-gray-500 hover:text-gray-700 mr-4">
                ← Back
              </a>
              <h1 className="text-xl font-semibold">Bulk Workout Builder</h1>
            </div>
            <div className="flex items-center space-x-2">
              <a 
                href="/builder"
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
              >
                Single Workout
              </a>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Default Settings */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <Dumbbell className="h-5 w-5 mr-2 text-blue-600" />
            Default Settings (Applied to new clients)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Duration (min)
              </label>
              <input
                type="number"
                value={defaultSettings.duration}
                onChange={(e) => setDefaultSettings({
                  ...defaultSettings,
                  duration: parseInt(e.target.value) || 60
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                min="15"
                max="120"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Intensity
              </label>
              <select
                value={defaultSettings.intensity}
                onChange={(e) => setDefaultSettings({
                  ...defaultSettings,
                  intensity: e.target.value
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="light">Light</option>
                <option value="moderate">Moderate</option>
                <option value="intense">Intense</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Focus Area
              </label>
              <input
                type="text"
                value={defaultSettings.focus}
                onChange={(e) => setDefaultSettings({
                  ...defaultSettings,
                  focus: e.target.value
                })}
                placeholder="e.g., upper body, cardio"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Context
              </label>
              <select
                value={defaultSettings.contextId}
                onChange={(e) => setDefaultSettings({
                  ...defaultSettings,
                  contextId: e.target.value
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">No context</option>
                {contexts.map(context => (
                  <option key={context.id} value={context.id}>
                    {context.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Add Clients */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center">
              <Users className="h-5 w-5 mr-2 text-green-600" />
              Select Clients ({workoutConfigs.length} selected)
            </h2>
            {workoutConfigs.length > 0 && (
              <button
                onClick={() => setWorkoutConfigs([])}
                className="text-sm text-red-600 hover:text-red-700"
              >
                Clear All
              </button>
            )}
          </div>
          
          {availableClients.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {availableClients.map(client => (
                <button
                  key={client.id}
                  onClick={() => addClient(client.id)}
                  className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
                >
                  <div className="font-medium">{client.full_name}</div>
                  {client.goals && (
                    <div className="text-xs text-gray-500 truncate">{client.goals}</div>
                  )}
                  <Plus className="h-4 w-4 text-blue-600 mt-2" />
                </button>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">
              {clients.length === 0 
                ? 'No clients available. Add clients first.'
                : 'All clients have been selected.'}
            </p>
          )}
        </div>

        {/* Workout Configurations */}
        {workoutConfigs.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">
              Workout Configurations
            </h2>
            <div className="space-y-4">
              {workoutConfigs.map((config, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-medium text-lg">
                      {config.client?.full_name}
                    </h3>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => duplicateConfig(index)}
                        title="Duplicate"
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        <Copy className="h-4 w-4 text-gray-500" />
                      </button>
                      <button
                        onClick={() => removeConfig(index)}
                        title="Remove"
                        className="p-1 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Workout Title
                      </label>
                      <input
                        type="text"
                        value={config.title}
                        onChange={(e) => updateConfig(index, { title: e.target.value })}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Duration (min)
                      </label>
                      <input
                        type="number"
                        value={config.duration}
                        onChange={(e) => updateConfig(index, { 
                          duration: parseInt(e.target.value) || 60 
                        })}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                        min="15"
                        max="120"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Intensity
                      </label>
                      <select
                        value={config.intensity}
                        onChange={(e) => updateConfig(index, { intensity: e.target.value })}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                      >
                        <option value="light">Light</option>
                        <option value="moderate">Moderate</option>
                        <option value="intense">Intense</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Focus Area
                      </label>
                      <input
                        type="text"
                        value={config.focus}
                        onChange={(e) => updateConfig(index, { focus: e.target.value })}
                        placeholder="e.g., upper body"
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Equipment
                      </label>
                      <input
                        type="text"
                        value={config.equipment}
                        onChange={(e) => updateConfig(index, { equipment: e.target.value })}
                        placeholder="e.g., dumbbells, barbell"
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Context
                      </label>
                      <select
                        value={config.contextId || ''}
                        onChange={(e) => updateConfig(index, { contextId: e.target.value })}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                      >
                        <option value="">No context</option>
                        {contexts.map(context => (
                          <option key={context.id} value={context.id}>
                            {context.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Apply to All Buttons */}
            {workoutConfigs.length > 1 && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-gray-600 mb-2">Apply to all workouts:</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      const value = prompt('Enter duration (minutes):')
                      if (value) applyToAll('duration', parseInt(value) || 60)
                    }}
                    className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                  >
                    Same Duration
                  </button>
                  <button
                    onClick={() => applyToAll('intensity', defaultSettings.intensity)}
                    className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                  >
                    Same Intensity
                  </button>
                  <button
                    onClick={() => applyToAll('contextId', defaultSettings.contextId)}
                    className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                  >
                    Same Context
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Generate Button */}
        {workoutConfigs.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">
                {error}
              </div>
            )}
            
            <button
              onClick={generateWorkouts}
              disabled={generating}
              className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
            >
              {generating ? (
                <>
                  <Loader2 className="inline h-5 w-5 mr-2 animate-spin" />
                  Generating {progress.current} of {progress.total}...
                </>
              ) : (
                <>
                  <Dumbbell className="inline h-5 w-5 mr-2" />
                  Generate {workoutConfigs.length} Workouts
                </>
              )}
            </button>

            {generating && (
              <div className="mt-4">
                <div className="bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Results */}
        {showResults && results.length > 0 && (
          <div className="mt-6 bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Generation Results</h2>
            <div className="space-y-2">
              {results.map((result, index) => (
                <div 
                  key={index}
                  className={`flex items-center justify-between p-3 rounded ${
                    result.success ? 'bg-green-50' : 'bg-red-50'
                  }`}
                >
                  <div className="flex items-center">
                    {result.success ? (
                      <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                    )}
                    <span className="font-medium">{result.client}</span>
                    {result.success && (
                      <span className="ml-2 text-sm text-gray-600">- {result.title}</span>
                    )}
                  </div>
                  {result.success ? (
                    <a
                      href={`/workouts/${result.workoutId}`}
                      className="text-blue-600 hover:underline text-sm"
                    >
                      View Workout →
                    </a>
                  ) : (
                    <span className="text-red-600 text-sm">{result.error}</span>
                  )}
                </div>
              ))}
            </div>
            
            <div className="mt-4 flex space-x-3">
              <button
                onClick={() => router.push('/workouts')}
                className="flex-1 py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                View All Workouts
              </button>
              <button
                onClick={() => {
                  setWorkoutConfigs([])
                  setResults([])
                  setShowResults(false)
                }}
                className="flex-1 py-2 px-4 border border-gray-300 rounded hover:bg-gray-50"
              >
                Create More
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}