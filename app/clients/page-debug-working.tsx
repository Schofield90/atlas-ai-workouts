'use client'

import { useState, useEffect } from 'react'
import { Users, Loader2, AlertCircle, CheckCircle } from 'lucide-react'

interface WorkoutClient {
  id: string
  full_name: string
  email?: string
  phone?: string
  age?: number
  sex?: string
  height_cm?: number
  weight_kg?: number
  goals?: string
  injuries?: string
  equipment?: any[]
  preferences?: any
  notes?: string
  created_at: string
  updated_at: string
}

export default function ClientsDebugPage() {
  const [clients, setClients] = useState<WorkoutClient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [debugLog, setDebugLog] = useState<string[]>([])

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    const logEntry = `[${timestamp}] ${message}`
    console.log(logEntry)
    setDebugLog(prev => [...prev, logEntry])
  }

  useEffect(() => {
    addLog('🚀 Debug page useEffect triggered')
    testClientConnection()
  }, [])

  async function testClientConnection() {
    addLog('🔍 Starting client connection test...')
    setLoading(true)
    setError(null)

    try {
      // Test 1: Check environment variables
      addLog('1️⃣ Checking environment variables...')
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      
      addLog(`   SUPABASE_URL: ${supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'MISSING'}`)
      addLog(`   SUPABASE_ANON_KEY: ${supabaseKey ? supabaseKey.substring(0, 20) + '...' : 'MISSING'}`)

      // Test 2: Test API endpoint
      addLog('2️⃣ Testing API endpoint...')
      const response = await fetch('/api/clients/test')
      const apiResult = await response.json()
      
      if (response.ok) {
        addLog(`   ✅ API test successful: ${apiResult.clientCount} clients found`)
        if (apiResult.clients && apiResult.clients.length > 0) {
          setClients(apiResult.clients)
          addLog(`   📋 Sample client: ${apiResult.clients[0].full_name}`)
        }
      } else {
        addLog(`   ❌ API test failed: ${apiResult.error || 'Unknown error'}`)
        setError('API endpoint failed')
      }

      // Test 3: Direct service call
      addLog('3️⃣ Testing direct service call...')
      try {
        const { simpleClientService } = await import('@/lib/services/workout-data-simple')
        const directResult = await simpleClientService.getClients()
        addLog(`   📊 Direct service result: ${directResult.length} clients`)
        
        if (directResult.length > 0) {
          setClients(directResult)
        } else if (apiResult.clientCount > 0) {
          // Use API result if direct service failed
          addLog('   🔄 Using API result as fallback')
          setClients(apiResult.clients || [])
        }
      } catch (serviceError) {
        addLog(`   ❌ Direct service failed: ${serviceError}`)
        // Still use API result if available
        if (apiResult.clients) {
          setClients(apiResult.clients)
        }
      }

    } catch (error) {
      addLog(`💥 Test failed: ${error}`)
      setError(error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setLoading(false)
      addLog('✅ Test completed')
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-gradient-to-r from-purple-900 to-indigo-900 text-white p-8 rounded-xl mb-6 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-8 h-8" />
              <h1 className="text-3xl font-bold">Client Debug Page</h1>
            </div>
            <p className="text-purple-100">
              Debugging client data fetching and display issues
            </p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold">{clients.length}</div>
            <div className="text-purple-200">Clients Found</div>
          </div>
        </div>
      </div>

      {/* Debug Log */}
      <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          Debug Log
        </h2>
        <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm max-h-64 overflow-y-auto">
          {debugLog.map((log, index) => (
            <div key={index} className="text-gray-300">{log}</div>
          ))}
          {loading && (
            <div className="flex items-center gap-2 text-blue-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Running tests...</span>
            </div>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-900/30 border border-red-800 rounded-xl p-6 mb-6">
          <div className="flex items-center gap-2 text-red-400 mb-2">
            <AlertCircle className="w-5 h-5" />
            <h3 className="font-semibold">Error Detected</h3>
          </div>
          <p className="text-red-300">{error}</p>
          <button
            onClick={testClientConnection}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500"
          >
            Retry Tests
          </button>
        </div>
      )}

      {/* Success Display */}
      {!loading && !error && clients.length > 0 && (
        <div className="bg-green-900/30 border border-green-800 rounded-xl p-6 mb-6">
          <div className="flex items-center gap-2 text-green-400 mb-2">
            <CheckCircle className="w-5 h-5" />
            <h3 className="font-semibold">Connection Successful</h3>
          </div>
          <p className="text-green-300">Successfully loaded {clients.length} clients from the database.</p>
        </div>
      )}

      {/* Client List Preview */}
      {clients.length > 0 && (
        <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 p-6">
          <h2 className="text-xl font-semibold mb-4">Client List Preview (First 10)</h2>
          <div className="space-y-2">
            {clients.slice(0, 10).map(client => (
              <div key={client.id} className="flex items-center gap-4 p-3 bg-gray-700 rounded-lg">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-100">{client.full_name}</h3>
                  <p className="text-sm text-gray-400">ID: {client.id}</p>
                  {client.email && <p className="text-sm text-gray-500">Email: {client.email}</p>}
                </div>
              </div>
            ))}
            {clients.length > 10 && (
              <p className="text-center text-gray-500 pt-4">... and {clients.length - 10} more clients</p>
            )}
          </div>
        </div>
      )}

      {/* No clients message */}
      {!loading && !error && clients.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p>No clients found. This might indicate a connection issue.</p>
        </div>
      )}
    </div>
  )
}