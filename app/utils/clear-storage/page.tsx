'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, AlertTriangle } from 'lucide-react'

export default function ClearStoragePage() {
  const router = useRouter()
  const [cleared, setCleared] = useState(false)
  const [error, setError] = useState('')

  function clearAllStorage() {
    try {
      // Clear all localStorage
      localStorage.clear()
      
      // Also clear sessionStorage just in case
      sessionStorage.clear()
      
      setCleared(true)
      setError('')
      
      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)
    } catch (err) {
      console.error('Error clearing storage:', err)
      setError('Failed to clear storage. Please try refreshing the page.')
    }
  }

  function clearSpecificItem(key: string) {
    try {
      localStorage.removeItem(key)
      window.location.reload()
    } catch (err) {
      console.error('Error clearing item:', err)
      setError(`Failed to clear ${key}`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center mb-4">
          <AlertTriangle className="h-8 w-8 text-yellow-500 mr-3" />
          <h1 className="text-xl font-semibold">Storage Utility</h1>
        </div>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">
            {error}
          </div>
        )}
        
        {cleared ? (
          <div className="text-center py-8">
            <div className="mb-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Storage Cleared!</h2>
            <p className="text-gray-600">All local data has been cleared. Redirecting to dashboard...</p>
          </div>
        ) : (
          <>
            <p className="text-gray-600 mb-6">
              If you're experiencing issues with the app, clearing your browser's local storage might help. 
              This will remove all saved clients, workouts, and contexts.
            </p>
            
            <div className="space-y-3">
              <button
                onClick={clearAllStorage}
                className="w-full py-3 px-4 bg-red-600 text-white font-medium rounded-md hover:bg-red-700 transition-colors flex items-center justify-center"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear All Storage
              </button>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Or clear specific items</span>
                </div>
              </div>
              
              <button
                onClick={() => clearSpecificItem('ai-workout-clients')}
                className="w-full py-2 px-4 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                Clear Clients Only
              </button>
              
              <button
                onClick={() => clearSpecificItem('ai-workout-workouts')}
                className="w-full py-2 px-4 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                Clear Workouts Only
              </button>
              
              <button
                onClick={() => clearSpecificItem('ai-workout-contexts')}
                className="w-full py-2 px-4 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                Clear Contexts Only
              </button>
            </div>
            
            <div className="mt-6 pt-6 border-t">
              <button
                onClick={() => router.push('/dashboard')}
                className="w-full py-2 px-4 text-gray-600 hover:text-gray-900 transition-colors"
              >
                Back to Dashboard
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}