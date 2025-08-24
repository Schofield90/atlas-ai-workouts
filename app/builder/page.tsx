'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, ChevronDown, ChevronUp, Dumbbell, Search, X, Users } from 'lucide-react'

export default function BuilderPage() {
  const router = useRouter()
  
  const [title, setTitle] = useState('')
  const [selectedClient, setSelectedClient] = useState<string>('')
  const [clients, setClients] = useState<any[]>([])
  const [clientSearch, setClientSearch] = useState('')
  const [showClientDropdown, setShowClientDropdown] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [duration, setDuration] = useState(60)
  const [intensity, setIntensity] = useState('moderate')
  const [focus, setFocus] = useState('')
  const [equipment, setEquipment] = useState('')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [selectedContext, setSelectedContext] = useState<any>(null)
  const [contexts, setContexts] = useState<any[]>([])
  
  const clientDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadClients()
    loadContexts()
  }, [])

  useEffect(() => {
    // Close dropdown when clicking outside
    function handleClickOutside(event: MouseEvent) {
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(event.target as Node)) {
        setShowClientDropdown(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function loadClients() {
    try {
      const saved = localStorage.getItem('ai-workout-clients')
      const savedClients = saved ? JSON.parse(saved) : []
      const validClients = Array.isArray(savedClients) ? savedClients : []
      setClients(validClients)
      // Select first client by default if exists
      if (validClients.length > 0 && !selectedClient) {
        setSelectedClient(validClients[0].id)
      }
    } catch (error) {
      console.error('Error loading clients:', error)
      setClients([])
    }
  }

  function loadContexts() {
    try {
      const saved = localStorage.getItem('ai-workout-contexts')
      const savedContexts = saved ? JSON.parse(saved) : []
      const validContexts = (Array.isArray(savedContexts) ? savedContexts : []).map((ctx: any) => ({
        ...ctx,
        documents: Array.isArray(ctx.documents) ? ctx.documents : [],
        textSections: Array.isArray(ctx.textSections) ? ctx.textSections : []
      }))
      setContexts(validContexts)
      // Select first context by default if exists
      if (validContexts.length > 0 && !selectedContext) {
        setSelectedContext(validContexts[0])
      }
    } catch (error) {
      console.error('Error loading contexts:', error)
      setContexts([])
      setSelectedContext(null)
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
            <div className="flex items-center">
              <a 
                href="/builder/bulk"
                className="px-4 py-2 text-sm bg-purple-600 text-white rounded hover:bg-purple-700"
              >
                <Users className="inline h-4 w-4 mr-2" />
                Bulk Create
              </a>
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

            {/* Client Selection - Searchable Dropdown */}
            <div className="relative" ref={clientDropdownRef}>
              <label htmlFor="client" className="block text-sm font-medium text-gray-700 mb-1">
                Select Client *
              </label>
              <div className="relative">
                <input
                  id="client"
                  type="text"
                  value={clientSearch}
                  onChange={(e) => {
                    setClientSearch(e.target.value)
                    setShowClientDropdown(true)
                  }}
                  onFocus={() => setShowClientDropdown(true)}
                  placeholder={
                    selectedClient 
                      ? clients.find(c => c.id === selectedClient)?.full_name 
                      : "Type to search clients..."
                  }
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={generating}
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                {selectedClient && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedClient('')
                      setClientSearch('')
                    }}
                    className="absolute inset-y-0 right-8 flex items-center pr-2"
                  >
                    <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                  </button>
                )}
              </div>
              
              {/* Dropdown List */}
              {showClientDropdown && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedClient('')
                      setClientSearch('')
                      setShowClientDropdown(false)
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-gray-50 border-b"
                  >
                    <span className="text-gray-600">Guest User (No client selected)</span>
                  </button>
                  {clients
                    .filter(client => 
                      client.full_name.toLowerCase().includes(clientSearch.toLowerCase()) ||
                      (client.email && client.email.toLowerCase().includes(clientSearch.toLowerCase()))
                    )
                    .map((client) => (
                      <button
                        key={client.id}
                        type="button"
                        onClick={() => {
                          setSelectedClient(client.id)
                          setClientSearch('')
                          setShowClientDropdown(false)
                        }}
                        className={`w-full px-3 py-2 text-left hover:bg-gray-50 ${
                          selectedClient === client.id ? 'bg-blue-50' : ''
                        }`}
                      >
                        <div className="font-medium">{client.full_name}</div>
                        {client.email && (
                          <div className="text-xs text-gray-500">{client.email}</div>
                        )}
                        {client.goals && (
                          <div className="text-xs text-gray-400 truncate">{client.goals}</div>
                        )}
                      </button>
                    ))}
                  {clients.filter(client => 
                    client.full_name.toLowerCase().includes(clientSearch.toLowerCase()) ||
                    (client.email && client.email.toLowerCase().includes(clientSearch.toLowerCase()))
                  ).length === 0 && (
                    <div className="px-3 py-2 text-gray-500 text-sm">
                      No clients found matching "{clientSearch}"
                    </div>
                  )}
                </div>
              )}
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