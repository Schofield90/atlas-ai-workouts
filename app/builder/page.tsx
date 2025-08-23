'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, ChevronDown, ChevronUp, Dumbbell } from 'lucide-react'

export default function BuilderPage() {
  const router = useRouter()
  
  const [title, setTitle] = useState('')
  const [selectedClient, setSelectedClient] = useState<string>('')
  const [clients, setClients] = useState<any[]>([])
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [duration, setDuration] = useState(60)
  const [intensity, setIntensity] = useState('moderate')
  const [focus, setFocus] = useState('')
  const [equipment, setEquipment] = useState('')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [selectedContext, setSelectedContext] = useState<any>(null)
  const [contexts, setContexts] = useState<any[]>([])

  useEffect(() => {
    loadClients()
    loadContexts()
  }, [])

  function loadClients() {
    const savedClients = JSON.parse(localStorage.getItem('ai-workout-clients') || '[]')
    setClients(savedClients)
    // Select first client by default if exists
    if (savedClients.length > 0 && !selectedClient) {
      setSelectedClient(savedClients[0].id)
    }
  }

  function loadContexts() {
    const savedContexts = JSON.parse(localStorage.getItem('ai-workout-contexts') || '[]')
    setContexts(savedContexts)
    // Select first context by default if exists
    if (savedContexts.length > 0 && !selectedContext) {
      setSelectedContext(savedContexts[0])
    }
  }

  async function generateWorkout() {
    if (!title.trim()) {
      setError('Please enter a workout name')
      return
    }

    setGenerating(true)
    setError('')

    try {
      // Get selected client data
      const client = selectedClient ? 
        clients.find(c => c.id === selectedClient) : 
        { full_name: 'Guest User', goals: 'General fitness' }

      const response = await fetch('/api/workouts/generate-simple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          clientId: selectedClient || 'guest',
          client,
          duration,
          intensity,
          focus: focus || undefined,
          equipment: equipment ? equipment.split(',').map(e => e.trim()) : [],
          context: selectedContext || null,
        }),
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate workout')
      }

      // Save workout to localStorage
      const existingWorkouts = JSON.parse(localStorage.getItem('ai-workout-workouts') || '[]')
      existingWorkouts.push(data.workout)
      localStorage.setItem('ai-workout-workouts', JSON.stringify(existingWorkouts))

      // Navigate to the created workout
      router.push(`/workouts/${data.workoutId}`)
    } catch (err: any) {
      setError(err.message || 'Failed to generate workout')
      setGenerating(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <a href="/dashboard" className="text-gray-500 hover:text-gray-700 mr-4">
                ← Back
              </a>
              <h1 className="text-xl font-semibold">Workout Builder</h1>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <div className="flex items-center mb-6">
            <Dumbbell className="h-8 w-8 text-blue-600 mr-3" />
            <h2 className="text-2xl font-bold">Create AI Workout</h2>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {/* Workout Title - Required */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                Workout Name *
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Upper Body Strength, HIIT Cardio, Full Body"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={generating}
                autoFocus
              />
            </div>

            {/* Client Selection */}
            <div>
              <label htmlFor="client" className="block text-sm font-medium text-gray-700 mb-1">
                Select Client *
              </label>
              <select
                id="client"
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={generating}
              >
                <option value="">Guest User (No client selected)</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.full_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Context Selection */}
            <div>
              <label htmlFor="context" className="block text-sm font-medium text-gray-700 mb-1">
                Training Context (optional)
              </label>
              <select
                id="context"
                value={selectedContext?.id || ''}
                onChange={(e) => {
                  const context = contexts.find(c => c.id === e.target.value)
                  setSelectedContext(context || null)
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={generating}
              >
                <option value="">No context selected</option>
                {contexts.map((context) => (
                  <option key={context.id} value={context.id}>
                    {context.name} {context.documents ? `(${context.documents.length} docs)` : ''}
                  </option>
                ))}
              </select>
              {contexts.length === 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  <a href="/context" className="text-blue-600 hover:underline">
                    Add context
                  </a> to provide training philosophy, equipment lists, or reference materials
                </p>
              )}
            </div>

            {/* Advanced Options */}
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center text-sm text-gray-600 hover:text-gray-900"
            >
              {showAdvanced ? <ChevronUp className="h-4 w-4 mr-1" /> : <ChevronDown className="h-4 w-4 mr-1" />}
              Advanced Options
            </button>

            {showAdvanced && (
              <div className="space-y-4 p-4 bg-gray-50 rounded-md">
                <div>
                  <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-1">
                    Duration (minutes)
                  </label>
                  <input
                    id="duration"
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(parseInt(e.target.value) || 60)}
                    min="15"
                    max="120"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={generating}
                  />
                </div>

                <div>
                  <label htmlFor="intensity" className="block text-sm font-medium text-gray-700 mb-1">
                    Intensity Level
                  </label>
                  <select
                    id="intensity"
                    value={intensity}
                    onChange={(e) => setIntensity(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={generating}
                  >
                    <option value="light">Light</option>
                    <option value="moderate">Moderate</option>
                    <option value="intense">Intense</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="focus" className="block text-sm font-medium text-gray-700 mb-1">
                    Focus Area (optional)
                  </label>
                  <input
                    id="focus"
                    type="text"
                    value={focus}
                    onChange={(e) => setFocus(e.target.value)}
                    placeholder="e.g., legs, chest and triceps, cardio endurance"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={generating}
                  />
                </div>

                <div>
                  <label htmlFor="equipment" className="block text-sm font-medium text-gray-700 mb-1">
                    Available Equipment Today (optional)
                  </label>
                  <input
                    id="equipment"
                    type="text"
                    value={equipment}
                    onChange={(e) => setEquipment(e.target.value)}
                    placeholder="e.g., dumbbells, barbell, pull-up bar"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={generating}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Leave blank to use client's default equipment
                  </p>
                </div>
              </div>
            )}

            {/* Generate Button */}
            <button
              onClick={generateWorkout}
              disabled={generating || !title.trim()}
              className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {generating ? (
                <>
                  <Loader2 className="inline h-4 w-4 mr-2 animate-spin" />
                  Generating Personalized Workout...
                </>
              ) : (
                'Generate Workout'
              )}
            </button>
          </div>

          {generating && (
            <div className="mt-6 p-4 bg-blue-50 rounded-md">
              <p className="text-sm text-blue-700">
                AI is analyzing client history, preferences, and recent feedback to create the perfect workout...
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}