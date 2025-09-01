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
  AlertCircle,
  Search
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
  const [clientSearch, setClientSearch] = useState('')
  const [contexts, setContexts] = useState<any[]>([])
  const [workoutConfigs, setWorkoutConfigs] = useState<WorkoutConfig[]>([])
  const [defaultSettings, setDefaultSettings] = useState({
    duration: 60,
    intensity: 'moderate',
    focus: '',
    equipment: '',
    contextId: ''
  })
  const [groupMode, setGroupMode] = useState(false)
  const [gymEquipment, setGymEquipment] = useState('')
  const [generating, setGenerating] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [progressMessage, setProgressMessage] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [showResults, setShowResults] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadClients()
    loadContexts()
  }, [])

  // Helper to check if selected context contains equipment information
  const hasEquipmentContext = () => {
    const selectedContext = contexts.find(c => c.id === defaultSettings.contextId)
    
    if (!selectedContext || !selectedContext.textSections) return false
    
    return selectedContext.textSections.some((section: any) => 
      section.category === 'equipment'
    )
  }

  async function loadClients() {
    try {
      // Load from Supabase database
      const { createClient } = await import('@/lib/db/client-fixed')
      const supabase = createClient()
      
      const { data, error } = await supabase
        .from('workout_clients')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching clients from database:', error)
        setClients([])
        return
      }

      const validClients = Array.isArray(data) ? data : []
      setClients(validClients)
    } catch (error) {
      console.error('Error loading clients:', error)
      setClients([])
    }
  }

  async function loadContexts() {
    try {
      // First try to load SOPs from API
      const response = await fetch('/api/sops')
      if (response.ok) {
        const data = await response.json()
        if (data.sops && data.sops.length > 0) {
          // Convert SOPs to context format for the bulk builder
          const sopContext = {
            id: 'sops-context',
            name: 'SOPs & Training Methods',
            documents: data.sops.map((sop: any) => ({
              id: sop.id,
              name: sop.title,
              content: sop.content,
              category: sop.category
            })),
            textSections: data.sops.map((sop: any) => ({
              id: sop.id,
              title: sop.title,
              content: sop.content,
              category: sop.category || 'sop'
            })),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
          setContexts([sopContext])
          setDefaultSettings(prev => ({
            ...prev,
            contextId: sopContext.id
          }))
          return
        }
      }
    } catch (error) {
      console.error('Error loading SOPs from API:', error)
      setContexts([])
    }
  }

  function addClient(clientId: string) {
    const client = clients.find(c => c.id === clientId)
    if (!client) return

    const newConfig: WorkoutConfig = {
      clientId,
      client,
      title: '', // Empty by default, user will fill in
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

    if (groupMode && workoutConfigs.length > 5) {
      setError('Group mode supports maximum 5 clients')
      return
    }

    setGenerating(true)
    setError('')
    setResults([])
    setProgress({ current: 0, total: groupMode ? 1 : workoutConfigs.length })

    let generatedWorkouts: any[] = []

    if (groupMode) {
      // GROUP WORKOUT GENERATION
      try {
        setProgress({ current: 1, total: 1 })
        setProgressMessage('🤖 AI is analyzing group requirements and equipment...')
        
        const clientsData = workoutConfigs.map(config => ({
          id: config.clientId,
          full_name: config.client?.full_name || 'Unknown',
          goals: config.client?.goals,
          injuries: config.client?.injuries,
          equipment: config.equipment && typeof config.equipment === 'string' ? config.equipment.split(',').map(e => e.trim()) : []
        }))

        generatedWorkouts = await generateGroupWorkouts(clientsData)
      } catch (err: any) {
        console.error('Group workout generation error:', err)
        setError('Group workout generation failed. Switching to individual mode...')
        // Fallback to individual generation
        generatedWorkouts = await generateIndividualWorkouts()
      }
    } else {
      // INDIVIDUAL WORKOUT GENERATION
      generatedWorkouts = await generateIndividualWorkouts()
    }

    setResults(generatedWorkouts)
    setShowResults(true)
    setGenerating(false)
    setProgressMessage('')
  }

  async function generateGroupWorkouts(clientsData: any[]) {
    const generatedWorkouts: any[] = []
    
    // Create abort controller for timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => {
      console.log('Aborting group workout request due to timeout')
      controller.abort()
    }, 30000) // 30 second timeout
    
    try {
      const response = await fetch('/api/workouts/generate-group', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clients: clientsData,
          duration: defaultSettings.duration,
          intensity: defaultSettings.intensity,
          focus: defaultSettings.focus,
          gymEquipment: gymEquipment ? gymEquipment.split(',').map(e => e.trim()) : [],
          context: contexts.find(c => c.id === defaultSettings.contextId) || null,
          title: `Group Training - ${new Date().toLocaleDateString()}`
        }),
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      setProgressMessage('✅ AI generated group workout! Saving to database...')

      const data = await response.json()
      
      if (!response.ok || !data.groupWorkout) {
        throw new Error('Group workout generation failed')
      }
      
      // Save individual workouts for each client
      for (const individualWorkout of data.groupWorkout.individual_workouts) {
        try {
          const saveResponse = await fetch('/api/workouts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: `group-workout-${Date.now()}-${individualWorkout.client_id}`,
              title: `Group Training - ${individualWorkout.client_name}`,
              plan: {
                blocks: individualWorkout.blocks,
                training_goals: individualWorkout.training_goals,
                constraints: individualWorkout.constraints,
                intensity_target: defaultSettings.intensity,
                total_time_minutes: defaultSettings.duration,
                equipment_assigned: individualWorkout.equipment_assigned,
                shared_rehab: data.groupWorkout.shared_rehab_exercises,
                group_notes: data.groupWorkout.group_notes
              },
              client_id: individualWorkout.client_id,
              source: 'group-ai',
              version: 1
            })
          })
          
          const saveResult = await saveResponse.json()
          
          if (saveResponse.ok && saveResult.workout) {
            generatedWorkouts.push({
              success: true,
              client: individualWorkout.client_name,
              workoutId: saveResult.workout.id || `group-workout-${Date.now()}-${individualWorkout.client_id}`,
              title: `Group Training - ${individualWorkout.client_name}`,
              isGroupWorkout: true
            })
          } else {
            generatedWorkouts.push({
              success: false,
              client: individualWorkout.client_name,
              error: 'Failed to save group workout'
            })
          }
        } catch (saveErr) {
          generatedWorkouts.push({
            success: false,
            client: individualWorkout.client_name,
            error: 'Failed to save workout to database'
          })
        }
      }
      
      return generatedWorkouts
      
    } catch (fetchErr: any) {
      clearTimeout(timeoutId)
      
      if (fetchErr.name === 'AbortError') {
        console.warn('Group workout generation timed out')
        setError('AI took too long (>30s). Switching to individual mode...')
        setProgressMessage('⚠️ Timeout - switching to individual workouts...')
      } else {
        console.error('Group workout fetch error:', fetchErr)
        setError('Network error during group generation. Switching to individual mode...')
        setProgressMessage('⚠️ Network error - switching to individual workouts...')
      }
      
      throw fetchErr
    }
  }

  async function generateIndividualWorkouts() {
    const generatedWorkouts: any[] = []
    
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
            equipment: config.equipment && typeof config.equipment === 'string' ? config.equipment.split(',').map(e => e.trim()) : [],
            context: contexts.find(c => c.id === config.contextId) || null,
          }),
        })

        const data = await response.json()
        
        if (response.ok) {
          // Save workout to database
          try {
            const saveResponse = await fetch('/api/workouts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id: data.workoutId,
                title: config.title || 'Untitled Workout',
                plan: data.workout.plan,
                client_id: config.clientId || null,
                source: data.workout.source || 'ai',
                version: data.workout.version || 1
              })
            })
            
            const saveResult = await saveResponse.json()
            
            if (!saveResponse.ok) {
              console.error('Error saving workout to database:', saveResult)
            } else {
              console.log('Workout saved to database:', saveResult)
            }
          } catch (saveErr) {
            console.error('Failed to save workout to database:', saveErr)
          }
          
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
    
    return generatedWorkouts
  }

  const availableClients = clients.filter(
    client => !workoutConfigs.some(config => config.clientId === client.id)
  )

  return (
    <div className="min-h-screen bg-gray-900">
      <nav className="bg-gray-800 shadow-sm border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <a href="/dashboard" className="text-gray-400 hover:text-gray-100 mr-4">
                ← Back
              </a>
              <h1 className="text-xl font-semibold text-gray-100">Bulk Workout Builder</h1>
            </div>
            <div className="flex items-center space-x-2">
              <a 
                href="/builder"
                className="px-3 py-1 text-sm border border-gray-600 text-gray-300 rounded hover:bg-gray-700"
              >
                Single Workout
              </a>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Default Settings */}
        <div className="bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-100 mb-4 flex items-center">
            <Dumbbell className="h-5 w-5 mr-2 text-blue-500" />
            Default Settings (Applied to new clients)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Duration (min)
              </label>
              <input
                type="number"
                value={defaultSettings.duration}
                onChange={(e) => setDefaultSettings({
                  ...defaultSettings,
                  duration: parseInt(e.target.value) || 60
                })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-gray-100 rounded-md focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                min="15"
                max="120"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Intensity
              </label>
              <select
                value={defaultSettings.intensity}
                onChange={(e) => setDefaultSettings({
                  ...defaultSettings,
                  intensity: e.target.value
                })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-gray-100 rounded-md focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              >
                <option value="light">Light</option>
                <option value="moderate">Moderate</option>
                <option value="intense">Intense</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
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
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-gray-100 rounded-md placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Context
              </label>
              <select
                value={defaultSettings.contextId}
                onChange={(e) => setDefaultSettings({
                  ...defaultSettings,
                  contextId: e.target.value
                })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-gray-100 rounded-md focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
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

        {/* Group Mode Settings */}
        <div className="bg-gray-800 rounded-lg shadow-lg p-6 mb-6 border-2 border-purple-600">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-100 flex items-center">
              <Users className="h-5 w-5 mr-2 text-purple-500" />
              Group Training Mode
              <span className="ml-2 text-xs bg-purple-600 text-white px-2 py-1 rounded-full">NEW</span>
            </h2>
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={groupMode}
                onChange={(e) => setGroupMode(e.target.checked)}
                className="sr-only"
              />
              <div className={`w-12 h-6 rounded-full p-1 transition-colors ${
                groupMode ? 'bg-purple-600' : 'bg-gray-600'
              }`}>
                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  groupMode ? 'translate-x-6' : 'translate-x-0'
                }`} />
              </div>
              <span className="ml-3 text-gray-300">{groupMode ? 'Enabled' : 'Disabled'}</span>
            </label>
          </div>
          
          {groupMode && (
            <div className="space-y-4 border-t border-gray-700 pt-4">
              <div className="bg-purple-900/30 border border-purple-600 rounded-lg p-4">
                <h3 className="font-medium text-purple-300 mb-2">Group Training Features:</h3>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>• Up to 5 clients train together simultaneously</li>
                  <li>• Equipment overlap prevention - no equipment conflicts</li>
                  <li>• 2 shared rehab exercises (1 upper, 1 lower) for the whole group</li>
                  <li>• Structured: 2 compound → 2 compound → isolation exercises</li>
                  <li>• Individual modifications for injuries/limitations</li>
                </ul>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Available Gym Equipment
                  {!hasEquipmentContext() && <span className="text-purple-400 ml-1">*</span>}
                  {hasEquipmentContext() && (
                    <span className="text-green-400 ml-2 text-xs">✓ Equipment from selected SOPs</span>
                  )}
                </label>
                <input
                  type="text"
                  value={gymEquipment}
                  onChange={(e) => setGymEquipment(e.target.value)}
                  placeholder={hasEquipmentContext() 
                    ? "Optional: Add additional equipment not listed in SOPs"
                    : "e.g., dumbbells, barbell, resistance bands, pull-up bar, squat rack"
                  }
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-gray-100 rounded-md placeholder-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
                />
                <p className="text-xs text-gray-400 mt-1">
                  {hasEquipmentContext() 
                    ? "Equipment will be automatically detected from your selected SOPs. You can add additional equipment here if needed."
                    : "List all equipment available in the gym. This prevents equipment conflicts during group training. Or add equipment information to your SOPs context."
                  }
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Add Clients */}
        <div className="bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-100 flex items-center">
              <Users className="h-5 w-5 mr-2 text-green-500" />
              Select Clients ({workoutConfigs.length} selected)
            </h2>
            {workoutConfigs.length > 0 && (
              <button
                onClick={() => setWorkoutConfigs([])}
                className="text-sm text-red-400 hover:text-red-300"
              >
                Clear All
              </button>
            )}
          </div>
          
          {/* Search Bar */}
          <div className="mb-4 relative">
            <input
              type="text"
              value={clientSearch}
              onChange={(e) => setClientSearch(e.target.value)}
              placeholder="Search clients by name, email, or goals..."
              className="w-full px-3 py-2 pl-10 bg-gray-700 border border-gray-600 text-gray-100 rounded-md placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            {clientSearch && (
              <button
                onClick={() => setClientSearch('')}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-200"
              >
                ×
              </button>
            )}
          </div>
          
          {availableClients.filter(client => 
            client.full_name.toLowerCase().includes(clientSearch.toLowerCase()) ||
            (client.email && client.email.toLowerCase().includes(clientSearch.toLowerCase())) ||
            (client.goals && client.goals.toLowerCase().includes(clientSearch.toLowerCase()))
          ).length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {availableClients
                .filter(client => 
                  client.full_name.toLowerCase().includes(clientSearch.toLowerCase()) ||
                  (client.email && client.email.toLowerCase().includes(clientSearch.toLowerCase())) ||
                  (client.goals && client.goals.toLowerCase().includes(clientSearch.toLowerCase()))
                )
                .map(client => (
                  <button
                    key={client.id}
                    onClick={() => addClient(client.id)}
                    className="p-3 border border-gray-600 rounded-lg hover:bg-gray-700 text-left transition-colors"
                  >
                    <div className="font-medium text-gray-100">{client.full_name}</div>
                    {client.goals && (
                      <div className="text-xs text-gray-400 truncate">{client.goals}</div>
                    )}
                    <Plus className="h-4 w-4 text-blue-500 mt-2" />
                  </button>
                ))}
            </div>
          ) : (
            <p className="text-gray-400">
              {clientSearch 
                ? `No clients found matching "${clientSearch}"`
                : clients.length === 0 
                  ? 'No clients available. Add clients first.'
                  : 'All clients have been selected.'}
            </p>
          )}
        </div>

        {/* Workout Configurations */}
        {workoutConfigs.length > 0 && (
          <div className="bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-100 mb-4">
              Workout Configurations
            </h2>
            <div className="space-y-4">
              {workoutConfigs.map((config, index) => (
                <div key={index} className="border border-gray-600 rounded-lg p-4 bg-gray-700">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-medium text-lg text-gray-100">
                      {config.client?.full_name}
                    </h3>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => duplicateConfig(index)}
                        title="Duplicate"
                        className="p-1 hover:bg-gray-600 rounded"
                      >
                        <Copy className="h-4 w-4 text-gray-400" />
                      </button>
                      <button
                        onClick={() => removeConfig(index)}
                        title="Remove"
                        className="p-1 hover:bg-red-900/30 rounded"
                      >
                        <Trash2 className="h-4 w-4 text-red-400" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-3">
                    {/* Workout Title - Full Width and Emphasized */}
                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1">
                        Workout Title * (e.g., "Biceps and Chest" or "Shoulders and Quads")
                      </label>
                      <input
                        type="text"
                        value={config.title}
                        onChange={(e) => updateConfig(index, { title: e.target.value })}
                        placeholder="Enter workout focus areas (e.g., Back and Biceps, Legs and Core)"
                        className="w-full px-3 py-2 text-sm bg-gray-600 border border-gray-500 text-gray-100 rounded-md placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">
                        Duration (min)
                      </label>
                      <input
                        type="number"
                        value={config.duration}
                        onChange={(e) => updateConfig(index, { 
                          duration: parseInt(e.target.value) || 60 
                        })}
                        className="w-full px-2 py-1 text-sm bg-gray-600 border border-gray-500 text-gray-100 rounded"
                        min="15"
                        max="120"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">
                        Intensity
                      </label>
                      <select
                        value={config.intensity}
                        onChange={(e) => updateConfig(index, { intensity: e.target.value })}
                        className="w-full px-2 py-1 text-sm bg-gray-600 border border-gray-500 text-gray-100 rounded"
                      >
                        <option value="light">Light</option>
                        <option value="moderate">Moderate</option>
                        <option value="intense">Intense</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">
                        Focus Area
                      </label>
                      <input
                        type="text"
                        value={config.focus}
                        onChange={(e) => updateConfig(index, { focus: e.target.value })}
                        placeholder="e.g., upper body"
                        className="w-full px-2 py-1 text-sm bg-gray-600 border border-gray-500 text-gray-100 rounded placeholder-gray-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">
                        Equipment
                      </label>
                      <input
                        type="text"
                        value={config.equipment}
                        onChange={(e) => updateConfig(index, { equipment: e.target.value })}
                        placeholder="e.g., dumbbells, barbell"
                        className="w-full px-2 py-1 text-sm bg-gray-600 border border-gray-500 text-gray-100 rounded placeholder-gray-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">
                        Context
                      </label>
                      <select
                        value={config.contextId || ''}
                        onChange={(e) => updateConfig(index, { contextId: e.target.value })}
                        className="w-full px-2 py-1 text-sm bg-gray-600 border border-gray-500 text-gray-100 rounded"
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
                </div>
              ))}
            </div>

            {/* Apply to All Buttons */}
            {workoutConfigs.length > 1 && (
              <div className="mt-4 pt-4 border-t border-gray-600">
                <p className="text-sm text-gray-400 mb-2">Apply to all workouts:</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      const value = prompt('Enter duration (minutes):')
                      if (value) applyToAll('duration', parseInt(value) || 60)
                    }}
                    className="px-3 py-1 text-xs bg-gray-600 text-gray-100 hover:bg-gray-500 rounded"
                  >
                    Same Duration
                  </button>
                  <button
                    onClick={() => applyToAll('intensity', defaultSettings.intensity)}
                    className="px-3 py-1 text-xs bg-gray-600 text-gray-100 hover:bg-gray-500 rounded"
                  >
                    Same Intensity
                  </button>
                  <button
                    onClick={() => applyToAll('contextId', defaultSettings.contextId)}
                    className="px-3 py-1 text-xs bg-gray-600 text-gray-100 hover:bg-gray-500 rounded"
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
          <div className="bg-gray-800 rounded-lg shadow-lg p-6">
            {error && (
              <div className="mb-4 p-3 bg-red-900/30 border border-red-800 text-red-400 rounded">
                {error}
              </div>
            )}
            
            <button
              onClick={generateWorkouts}
              disabled={generating}
              className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-500 disabled:bg-gray-600 transition-colors"
            >
              {generating ? (
                <>
                  <Loader2 className="inline h-5 w-5 mr-2 animate-spin" />
                  {groupMode ? (
                    <>
                      {progressMessage || 'Generating AI Group Workout (this may take 15-20 seconds)...'}
                    </>
                  ) : (
                    <>Generating {progress.current} of {progress.total}...</>
                  )}
                </>
              ) : (
                <>
                  {groupMode ? (
                    <>
                      <Users className="inline h-5 w-5 mr-2" />
                      Generate Group Training for {workoutConfigs.length} Clients
                    </>
                  ) : (
                    <>
                      <Dumbbell className="inline h-5 w-5 mr-2" />
                      Generate {workoutConfigs.length} Individual Workouts
                    </>
                  )}
                </>
              )}
            </button>

            {generating && (
              <div className="mt-4">
                <div className="bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Results */}
        {showResults && results.length > 0 && (
          <div className="mt-6 bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-100 mb-4 flex items-center">
              {groupMode ? (
                <>
                  <Users className="h-5 w-5 mr-2 text-purple-500" />
                  Group Training Results
                </>
              ) : (
                <>
                  Generation Results
                </>
              )}
            </h2>
            {groupMode && (
              <div className="mb-4 p-3 bg-purple-900/30 border border-purple-600 rounded-lg">
                <p className="text-sm text-purple-300">
                  ✨ Group training session created with equipment conflict prevention and shared rehab exercises
                </p>
              </div>
            )}
            <div className="space-y-2">
              {results.map((result, index) => (
                <div 
                  key={index}
                  className={`flex items-center justify-between p-3 rounded ${
                    result.success ? 'bg-green-900/30' : 'bg-red-900/30'
                  }`}
                >
                  <div className="flex items-center">
                    {result.success ? (
                      <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                    )}
                    <span className="font-medium text-gray-100">{result.client}</span>
                    {result.success && (
                      <span className="ml-2 text-sm text-gray-400">- {result.title}</span>
                    )}
                    {result.success && result.isGroupWorkout && (
                      <span className="ml-2 text-xs bg-purple-600 text-white px-2 py-1 rounded-full">
                        GROUP
                      </span>
                    )}
                  </div>
                  {result.success ? (
                    <a
                      href={`/workouts/${result.workoutId}`}
                      className="text-blue-400 hover:underline text-sm"
                    >
                      View Workout →
                    </a>
                  ) : (
                    <span className="text-red-400 text-sm">{result.error}</span>
                  )}
                </div>
              ))}
            </div>
            
            <div className="mt-4 flex space-x-3">
              <button
                onClick={() => {
                  console.log('Review button clicked, results:', results)
                  const successfulWorkouts = results.filter(w => w.success && w.workoutId)
                  console.log('Successful workouts:', successfulWorkouts)
                  if (successfulWorkouts.length > 0) {
                    const workoutIds = successfulWorkouts.map(w => w.workoutId).join(',')
                    console.log('Navigating to bulk review with IDs:', workoutIds)
                    router.push(`/workouts/bulk-review?ids=${workoutIds}`)
                  } else {
                    alert('No successful workouts to review. Please check individual workout links above.')
                  }
                }}
                className="flex-1 py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-500"
                disabled={!results.some(r => r.success && r.workoutId)}
              >
                Review All Together →
              </button>
              <button
                onClick={() => {
                  setWorkoutConfigs([])
                  setResults([])
                  setShowResults(false)
                }}
                className="flex-1 py-2 px-4 border border-gray-600 text-gray-300 rounded hover:bg-gray-700"
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