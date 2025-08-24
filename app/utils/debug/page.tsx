'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Bug, Copy, CheckCircle } from 'lucide-react'

export default function DebugPage() {
  const router = useRouter()
  const [storageData, setStorageData] = useState<Record<string, any>>({})
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadStorageData()
  }, [])

  function loadStorageData() {
    try {
      const data: Record<string, any> = {}
      
      // Get all localStorage keys
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key) {
          try {
            const value = localStorage.getItem(key)
            if (value) {
              // Try to parse as JSON
              try {
                data[key] = JSON.parse(value)
              } catch {
                // If not JSON, store as string
                data[key] = value
              }
            }
          } catch (err) {
            data[key] = `Error reading: ${err}`
          }
        }
      }
      
      setStorageData(data)
    } catch (err) {
      console.error('Error loading storage:', err)
      setError('Failed to load storage data')
    }
  }

  function copyToClipboard() {
    const debugInfo = {
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      localStorage: storageData,
      error: error
    }
    
    navigator.clipboard.writeText(JSON.stringify(debugInfo, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function validateData(key: string, data: any): { valid: boolean; issues: string[] } {
    const issues: string[] = []
    
    if (key === 'ai-workout-clients' || key === 'ai-workout-workouts') {
      if (!Array.isArray(data)) {
        issues.push('Data is not an array')
        return { valid: false, issues }
      }
      
      data.forEach((item: any, index: number) => {
        if (!item.id) issues.push(`Item ${index} missing id`)
        if (key === 'ai-workout-clients' && !item.full_name) {
          issues.push(`Client ${index} missing full_name`)
        }
        if (key === 'ai-workout-workouts' && !item.title) {
          issues.push(`Workout ${index} missing title`)
        }
      })
    }
    
    if (key === 'ai-workout-contexts') {
      if (!Array.isArray(data)) {
        issues.push('Data is not an array')
        return { valid: false, issues }
      }
      
      data.forEach((context: any, index: number) => {
        if (!context.id) issues.push(`Context ${index} missing id`)
        if (!context.name) issues.push(`Context ${index} missing name`)
        if (context.documents && !Array.isArray(context.documents)) {
          issues.push(`Context ${index} documents is not an array`)
        }
        if (context.textSections && !Array.isArray(context.textSections)) {
          issues.push(`Context ${index} textSections is not an array`)
        }
      })
    }
    
    return { valid: issues.length === 0, issues }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <Bug className="h-6 w-6 text-purple-600 mr-2" />
              <h1 className="text-xl font-semibold">Debug Information</h1>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={copyToClipboard}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center"
              >
                {copied ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Debug Info
                  </>
                )}
              </button>
              <button
                onClick={() => router.push('/utils/clear-storage')}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Clear Storage
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
          
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">
              {error}
            </div>
          )}
          
          <div className="space-y-6">
            {Object.entries(storageData).map(([key, value]) => {
              const validation = validateData(key, value)
              
              return (
                <div key={key} className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-100 px-4 py-2 flex items-center justify-between">
                    <h3 className="font-mono text-sm font-semibold">{key}</h3>
                    <div className="flex items-center space-x-2">
                      {validation.valid ? (
                        <span className="text-green-600 text-xs">✓ Valid</span>
                      ) : (
                        <span className="text-red-600 text-xs">✗ Issues found</span>
                      )}
                      {Array.isArray(value) && (
                        <span className="text-gray-500 text-xs">{value.length} items</span>
                      )}
                    </div>
                  </div>
                  
                  {!validation.valid && validation.issues.length > 0 && (
                    <div className="bg-red-50 px-4 py-2 border-b border-red-200">
                      <p className="text-xs text-red-700 font-semibold mb-1">Issues:</p>
                      <ul className="text-xs text-red-600 list-disc list-inside">
                        {validation.issues.map((issue, i) => (
                          <li key={i}>{issue}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  <div className="p-4">
                    <pre className="text-xs overflow-x-auto bg-gray-50 p-2 rounded">
                      {JSON.stringify(value, null, 2)}
                    </pre>
                  </div>
                </div>
              )
            })}
            
            {Object.keys(storageData).length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No data found in localStorage
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}