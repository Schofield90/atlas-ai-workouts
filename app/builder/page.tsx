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
  const [feedbackData, setFeedbackData] = useState<any>(null)
  
  const clientDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadClients()
    loadContexts()
    
    // Check for regeneration with feedback
    const params = new URLSearchParams(window.location.search)
    const regenerateId = params.get('regenerate')
    const clientId = params.get('client')
    
    if (regenerateId) {
      const storedFeedback = sessionStorage.getItem('regenerate-with-feedback')
      if (storedFeedback) {
        const feedback = JSON.parse(storedFeedback)
        setFeedbackData(feedback)
        setTitle(feedback.workoutTitle + ' (Improved)')
        if (clientId) {
          setSelectedClient(clientId)
        }
        // Clear the session storage
        sessionStorage.removeItem('regenerate-with-feedback')
      }
    }
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

  async function loadClients() {
    try {
      const { createClient } = await import('@/lib/db/client-fixed')
      const supabase = createClient()
      
      const { data, error } = await supabase
        .from('workout_clients')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching clients:', error)
        setClients([])
        return
      }

      const validClients = Array.isArray(data) ? data : []
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

  async function loadContexts() {
    try {
      // First try to load SOPs from API
      const response = await fetch('/api/sops')
      if (response.ok) {
        const data = await response.json()
        if (data.sops && data.sops.length > 0) {
          // Convert SOPs to context format - put in both documents AND textSections
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
              category: 'sop'
            })),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
          setContexts([sopContext])
          setSelectedContext(sopContext)
          return
        }
      }
    } catch (error) {
      console.error('Error loading SOPs from API:', error)
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
          feedback: feedbackData || null, // Include feedback data if regenerating
        }),
      })

      const data = await response.json()
      
      if (!response.ok) {
        console.error('Workout generation failed:', data)
        throw new Error(data.error || 'Failed to generate workout')
      }

      console.log('Workout generated successfully:', data.workoutId)
      
      // Check if we got a fallback workout
      if (data.workout?.source === 'fallback') {
        console.warn('⚠️ Using fallback workout - AI generation may have failed')
      }

      // Save workout to database via API
      try {
        const saveResponse = await fetch('/api/workouts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: data.workoutId,
            title: title || 'Untitled Workout',
            plan: data.workout.plan,
            client_id: selectedClient || null,
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

      // Navigate to the created workout
      setGenerating(false)
      router.push(`/workouts/${data.workoutId}`)
    } catch (err: any) {
      console.error('Error generating workout:', err)
      setError(err.message || 'Failed to generate workout')
      setGenerating(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <nav className="bg-gray-800 shadow-sm border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <a href="/dashboard" className="text-gray-400 hover:text-gray-100 mr-4">
                ← Back
              </a>
              <h1 className="text-xl font-semibold text-gray-100">Workout Builder</h1>
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
        <div className="bg-gray-800 rounded-lg shadow-xl p-8">
          <div className="flex items-center mb-6">
            <Dumbbell className="h-8 w-8 text-blue-600 mr-3" />
            <h2 className="text-2xl font-bold text-gray-100">Create AI Workout</h2>
          </div>

          {feedbackData && (
            <div className="mb-4 p-4 bg-purple-900/20 border border-purple-600 rounded-lg">
              <h3 className="font-semibold text-purple-300 mb-2">🔄 Regenerating with Feedback</h3>
              <p className="text-sm text-gray-300">
                <strong>Previous Rating:</strong> {feedbackData.rating}/5 ({feedbackData.rating === 1 ? 'Too Easy' : feedbackData.rating === 2 ? 'Easy' : feedbackData.rating === 3 ? 'Just Right' : feedbackData.rating === 4 ? 'Challenging' : 'Too Hard'})
              </p>
              <p className="text-sm text-gray-300 mt-1">
                <strong>Feedback:</strong> "{feedbackData.feedback}"
              </p>
              <p className="text-xs text-gray-400 mt-2">
                The AI will use this feedback to create an improved version of the workout.
              </p>
            </div>
          )}

          {error && (
            <div 
              role="alert" 
              className="mb-4 p-3 bg-red-900/20 border border-red-600 text-red-300 rounded"
              aria-live="polite"
            >
              {error}
            </div>
          )}

          <div className="space-y-4">
            {/* Workout Title - Required */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-1">
                Workout Name *
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Upper Body Strength, HIIT Cardio, Full Body"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white placeholder-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={generating}
                autoFocus
              />
            </div>

            {/* Client Selection - Searchable Dropdown */}
            <div className="relative" ref={clientDropdownRef}>
              <label htmlFor="client" className="block text-sm font-medium text-gray-300 mb-1">
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
                  className="w-full px-3 py-2 pr-10 bg-gray-700 border border-gray-600 text-white placeholder-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={generating}
                  aria-required="true"
                  aria-describedby="client-hint"
                  role="combobox"
                  aria-expanded={showClientDropdown}
                  aria-haspopup="listbox"
                  aria-autocomplete="list"
                />
                <div id="client-hint" className="sr-only">Search for a client by name or email, or select Guest User for no specific client</div>
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
                    <X className="h-4 w-4 text-gray-400 hover:text-gray-200" />
                  </button>
                )}
              </div>
              
              {/* Dropdown List */}
              {showClientDropdown && (
                <ul 
                  className="absolute z-10 mt-1 w-full bg-gray-700 border border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto"
                  role="listbox"
                  aria-labelledby="client"
                >
                  <li role="option" aria-selected={!selectedClient}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedClient('')
                        setClientSearch('')
                        setShowClientDropdown(false)
                      }}
                      className="w-full px-3 py-2 text-left text-gray-300 hover:bg-gray-600 border-b border-gray-600"
                    >
                      <span className="text-gray-300">Guest User (No client selected)</span>
                    </button>
                  </li>
                  {clients
                    .filter(client => 
                      client.full_name.toLowerCase().includes(clientSearch.toLowerCase()) ||
                      (client.email && client.email.toLowerCase().includes(clientSearch.toLowerCase()))
                    )
                    .map((client) => (
                      <li key={client.id} role="option" aria-selected={selectedClient === client.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedClient(client.id)
                            setClientSearch('')
                            setShowClientDropdown(false)
                          }}
                          className={`w-full px-3 py-2 text-left text-gray-100 hover:bg-gray-600 ${
                            selectedClient === client.id ? 'bg-gray-600' : ''
                          }`}
                        >
                        <div className="font-medium text-gray-100">{client.full_name}</div>
                        {client.email && (
                          <div className="text-xs text-gray-400">{client.email}</div>
                        )}
                        {client.goals && (
                          <div className="text-xs text-gray-500 truncate">{client.goals}</div>
                        )}
                        </button>
                      </li>
                    ))}
                  {clients.filter(client => 
                    client.full_name.toLowerCase().includes(clientSearch.toLowerCase()) ||
                    (client.email && client.email.toLowerCase().includes(clientSearch.toLowerCase()))
                  ).length === 0 && (
                    <li role="option" aria-disabled="true">
                      <div className="px-3 py-2 text-gray-400 text-sm">
                        No clients found matching "{clientSearch}"
                      </div>
                    </li>
                  )}
                </ul>
              )}
            </div>

            {/* Context Selection */}
            <div>
              <label htmlFor="context" className="block text-sm font-medium text-gray-300 mb-1">
                Training Context (optional)
              </label>
              <select
                id="context"
                value={selectedContext?.id || ''}
                onChange={(e) => {
                  const context = contexts.find(c => c.id === e.target.value)
                  setSelectedContext(context || null)
                }}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                <p className="text-xs text-gray-400 mt-1">
                  <a href="/context" className="text-blue-400 hover:text-blue-300 hover:underline">
                    Add context
                  </a> to provide training philosophy, equipment lists, or reference materials
                </p>
              )}
            </div>

            {/* Advanced Options */}
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center text-sm text-gray-400 hover:text-gray-100"
              aria-expanded={showAdvanced}
              aria-controls="advanced-options"
              aria-describedby="advanced-options-hint"
            >
              {showAdvanced ? <ChevronUp className="h-4 w-4 mr-1" /> : <ChevronDown className="h-4 w-4 mr-1" />}
              Advanced Options
            </button>
            <div id="advanced-options-hint" className="sr-only">Toggle to show additional workout customization options</div>

            {showAdvanced && (
              <div id="advanced-options" className="space-y-4 p-4 bg-gray-700 rounded-md" role="region" aria-label="Advanced workout options">
                <div>
                  <label htmlFor="duration" className="block text-sm font-medium text-gray-300 mb-1">
                    Duration (minutes)
                  </label>
                  <input
                    id="duration"
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(parseInt(e.target.value) || 60)}
                    min="15"
                    max="120"
                    className="w-full px-3 py-2 bg-gray-600 border border-gray-500 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={generating}
                  />
                </div>

                <div>
                  <label htmlFor="intensity" className="block text-sm font-medium text-gray-300 mb-1">
                    Intensity Level
                  </label>
                  <select
                    id="intensity"
                    value={intensity}
                    onChange={(e) => setIntensity(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-600 border border-gray-500 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={generating}
                  >
                    <option value="light">Light</option>
                    <option value="moderate">Moderate</option>
                    <option value="intense">Intense</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="focus" className="block text-sm font-medium text-gray-300 mb-1">
                    Focus Area (optional)
                  </label>
                  <input
                    id="focus"
                    type="text"
                    value={focus}
                    onChange={(e) => setFocus(e.target.value)}
                    placeholder="e.g., legs, chest and triceps, cardio endurance"
                    className="w-full px-3 py-2 bg-gray-600 border border-gray-500 text-white placeholder-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={generating}
                  />
                </div>

                <div>
                  <label htmlFor="equipment" className="block text-sm font-medium text-gray-300 mb-1">
                    Available Equipment Today (optional)
                  </label>
                  <input
                    id="equipment"
                    type="text"
                    value={equipment}
                    onChange={(e) => setEquipment(e.target.value)}
                    placeholder="e.g., dumbbells, barbell, pull-up bar"
                    className="w-full px-3 py-2 bg-gray-600 border border-gray-500 text-white placeholder-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={generating}
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Leave blank to use client's default equipment
                  </p>
                </div>
              </div>
            )}

            {/* Generate Button */}
            <button
              type="button"
              onClick={generateWorkout}
              disabled={generating || !title.trim()}
              className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              aria-describedby={generating ? 'generate-status' : 'generate-requirements'}
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
            <div id="generate-requirements" className="sr-only">
              {!title.trim() ? 'Please enter a workout name to generate' : 'Click to generate a personalized workout'}
            </div>
            {generating && (
              <div id="generate-status" className="sr-only" aria-live="polite">
                AI is analyzing client history and creating your workout, please wait
              </div>
            )}
          </div>

          {generating && (
            <div className="mt-6 p-4 bg-blue-900/20 border border-blue-600 rounded-md">
              <p className="text-sm text-blue-300">
                AI is analyzing client history, preferences, and recent feedback to create the perfect workout...
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}