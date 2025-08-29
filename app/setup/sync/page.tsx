'use client'

import { useState, useEffect } from 'react'
import { clientService } from '@/lib/services/workout-data'
import { createClient } from '@/lib/db/client'
import Link from 'next/link'

export default function SyncPage() {
  const [status, setStatus] = useState<'checking' | 'ready' | 'syncing' | 'complete' | 'error'>('checking')
  const [message, setMessage] = useState('')
  const [localData, setLocalData] = useState({ clients: 0, workouts: 0 })
  const [cloudData, setCloudData] = useState({ clients: 0, workouts: 0 })
  const [syncResults, setSyncResults] = useState<any>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    checkStatus()
  }, [])

  async function checkStatus() {
    setStatus('checking')
    setMessage('Checking authentication and data...')

    // Check authentication
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    setIsAuthenticated(!!user)

    if (!user) {
      setStatus('error')
      setMessage('Please sign in first to sync your data')
      return
    }

    // Check local storage
    try {
      const localClients = localStorage.getItem('ai-workout-clients')
      const localWorkouts = localStorage.getItem('ai-workout-workouts')
      
      const clientCount = localClients ? JSON.parse(localClients).length : 0
      const workoutCount = localWorkouts ? JSON.parse(localWorkouts).length : 0
      
      setLocalData({ clients: clientCount, workouts: workoutCount })

      // Check cloud data
      const cloudClients = await clientService.getClients()
      const cloudWorkouts = await clientService.getWorkouts()
      
      setCloudData({ 
        clients: cloudClients.length, 
        workouts: cloudWorkouts.length 
      })

      setStatus('ready')
      setMessage('Ready to sync your data to the cloud')
    } catch (error) {
      console.error('Error checking data:', error)
      setStatus('error')
      setMessage('Error checking data status')
    }
  }

  async function performSync() {
    setStatus('syncing')
    setMessage('Syncing data to Supabase...')

    try {
      const results = await clientService.importFromLocalStorage()
      setSyncResults(results)
      
      // Refresh cloud data count
      const cloudClients = await clientService.getClients()
      const cloudWorkouts = await clientService.getWorkouts()
      setCloudData({ 
        clients: cloudClients.length, 
        workouts: cloudWorkouts.length 
      })

      setStatus('complete')
      setMessage('Sync complete!')
    } catch (error) {
      console.error('Sync error:', error)
      setStatus('error')
      setMessage('Error during sync: ' + (error as Error).message)
    }
  }

  async function clearLocalStorage() {
    if (confirm('This will clear all local data. Make sure you have synced to the cloud first. Continue?')) {
      localStorage.removeItem('ai-workout-clients')
      localStorage.removeItem('ai-workout-workouts')
      setLocalData({ clients: 0, workouts: 0 })
      alert('Local storage cleared!')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Data Sync & Migration</h1>

        {!isAuthenticated && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <p className="text-yellow-800">
              You need to sign in to sync your data to the cloud.
            </p>
            <Link 
              href="/login" 
              className="inline-block mt-2 bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700"
            >
              Sign In
            </Link>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">📱 Local Storage</h2>
            <div className="space-y-2">
              <p className="text-gray-600">Data stored on this device only:</p>
              <div className="bg-gray-50 p-3 rounded">
                <p>Clients: <span className="font-semibold">{localData.clients}</span></p>
                <p>Workouts: <span className="font-semibold">{localData.workouts}</span></p>
              </div>
              {localData.clients > 0 || localData.workouts > 0 ? (
                <p className="text-sm text-orange-600">⚠️ This data is not backed up</p>
              ) : (
                <p className="text-sm text-gray-500">No local data found</p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">☁️ Cloud Storage</h2>
            <div className="space-y-2">
              <p className="text-gray-600">Data synced to Supabase:</p>
              <div className="bg-gray-50 p-3 rounded">
                <p>Clients: <span className="font-semibold">{cloudData.clients}</span></p>
                <p>Workouts: <span className="font-semibold">{cloudData.workouts}</span></p>
              </div>
              {cloudData.clients > 0 || cloudData.workouts > 0 ? (
                <p className="text-sm text-green-600">✓ Accessible from any device</p>
              ) : (
                <p className="text-sm text-gray-500">No cloud data yet</p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Sync Status</h2>
          
          {status === 'checking' && (
            <div className="text-blue-600">
              <span className="inline-block animate-spin mr-2">⏳</span>
              {message}
            </div>
          )}

          {status === 'ready' && (
            <div>
              <p className="text-gray-600 mb-4">{message}</p>
              {(localData.clients > 0 || localData.workouts > 0) && (
                <button
                  onClick={performSync}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
                >
                  Sync Local Data to Cloud
                </button>
              )}
              {localData.clients === 0 && localData.workouts === 0 && (
                <p className="text-gray-500">No local data to sync</p>
              )}
            </div>
          )}

          {status === 'syncing' && (
            <div className="text-blue-600">
              <span className="inline-block animate-spin mr-2">🔄</span>
              {message}
            </div>
          )}

          {status === 'complete' && (
            <div className="text-green-600">
              <p className="font-semibold mb-4">✅ {message}</p>
              {syncResults && (
                <div className="bg-green-50 p-4 rounded">
                  <p>Clients imported: {syncResults.clients.imported}</p>
                  <p>Workouts imported: {syncResults.workouts.imported}</p>
                  {(syncResults.clients.failed > 0 || syncResults.workouts.failed > 0) && (
                    <p className="text-orange-600 mt-2">
                      Some items failed to import (Clients: {syncResults.clients.failed}, Workouts: {syncResults.workouts.failed})
                    </p>
                  )}
                </div>
              )}
              <div className="mt-4 space-x-4">
                <Link 
                  href="/dashboard" 
                  className="inline-block bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
                >
                  Go to Dashboard
                </Link>
                {localData.clients > 0 || localData.workouts > 0 ? (
                  <button
                    onClick={clearLocalStorage}
                    className="text-red-600 hover:underline"
                  >
                    Clear Local Storage
                  </button>
                ) : null}
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="text-red-600">
              <p className="font-semibold">❌ {message}</p>
              <button
                onClick={checkStatus}
                className="mt-4 text-blue-600 hover:underline"
              >
                Try Again
              </button>
            </div>
          )}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">ℹ️ About Cloud Sync</h3>
          <ul className="text-blue-800 space-y-1 text-sm">
            <li>• Your data will be stored securely in Supabase</li>
            <li>• Access your workouts and clients from any device</li>
            <li>• Automatic backups and data protection</li>
            <li>• Real-time sync across all your devices</li>
            <li>• Your data remains private and secure</li>
          </ul>
        </div>
      </div>
    </div>
  )
}