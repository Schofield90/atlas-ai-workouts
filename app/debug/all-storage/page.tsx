'use client'

import { useState, useEffect } from 'react'

export default function AllStoragePage() {
  const [allStorage, setAllStorage] = useState<Record<string, any>>({})
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    scanAllStorage()
  }, [])

  function scanAllStorage() {
    const storage: Record<string, any> = {}
    
    // Get all localStorage keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key) {
        try {
          const value = localStorage.getItem(key)
          if (value) {
            // Try to parse as JSON, if it fails, store as string
            try {
              storage[key] = JSON.parse(value)
            } catch {
              storage[key] = value
            }
          }
        } catch (e) {
          console.error(`Error reading key ${key}:`, e)
        }
      }
    }
    
    setAllStorage(storage)
  }

  function exportData() {
    const dataStr = JSON.stringify(allStorage, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)
    
    const exportFileDefaultName = `localStorage-backup-${new Date().toISOString()}.json`
    
    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()
  }

  function importData(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string)
        
        if (confirm('This will overwrite existing localStorage data. Continue?')) {
          Object.entries(data).forEach(([key, value]) => {
            localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value))
          })
          scanAllStorage()
          alert('Data imported successfully!')
        }
      } catch (error) {
        alert('Error importing data: ' + error)
      }
    }
    reader.readAsText(file)
  }

  const filteredKeys = Object.keys(allStorage).filter(key => 
    key.toLowerCase().includes(searchTerm.toLowerCase()) ||
    JSON.stringify(allStorage[key]).toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Check specifically for workout-related keys
  const workoutKeys = filteredKeys.filter(key => 
    key.includes('workout') || 
    key.includes('client') || 
    key.includes('ai-workout') ||
    key.includes('fitness')
  )

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Complete localStorage Scanner</h1>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">
              All localStorage Keys ({Object.keys(allStorage).length} total)
            </h2>
            <div className="flex gap-2">
              <button
                onClick={exportData}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Export All Data
              </button>
              <label className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 cursor-pointer">
                Import Data
                <input
                  type="file"
                  accept=".json"
                  onChange={importData}
                  className="hidden"
                />
              </label>
              <button
                onClick={scanAllStorage}
                className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
              >
                Refresh
              </button>
            </div>
          </div>

          <input
            type="text"
            placeholder="Search keys or values..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-2 border rounded mb-4"
          />

          {workoutKeys.length > 0 && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded">
              <h3 className="font-semibold text-green-900 mb-2">
                🎯 Found Workout-Related Keys ({workoutKeys.length})
              </h3>
              <div className="space-y-2">
                {workoutKeys.map(key => (
                  <div key={key} className="bg-white p-2 rounded border border-green-300">
                    <p className="font-mono text-sm text-green-700">{key}</p>
                    <p className="text-xs text-gray-600">
                      Type: {typeof allStorage[key]} | 
                      Size: {JSON.stringify(allStorage[key]).length} chars
                      {Array.isArray(allStorage[key]) && ` | Items: ${allStorage[key].length}`}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-4">
            {filteredKeys.length === 0 ? (
              <p className="text-gray-500">No localStorage data found</p>
            ) : (
              filteredKeys.map(key => (
                <div key={key} className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-mono font-semibold text-blue-600">{key}</h3>
                    <button
                      onClick={() => {
                        if (confirm(`Delete localStorage key "${key}"?`)) {
                          localStorage.removeItem(key)
                          scanAllStorage()
                        }
                      }}
                      className="text-red-600 hover:underline text-sm"
                    >
                      Delete
                    </button>
                  </div>
                  
                  <div className="bg-white p-2 rounded">
                    {typeof allStorage[key] === 'object' ? (
                      <details>
                        <summary className="cursor-pointer text-gray-600 hover:text-gray-900">
                          {Array.isArray(allStorage[key]) 
                            ? `Array with ${allStorage[key].length} items`
                            : `Object with ${Object.keys(allStorage[key]).length} keys`
                          }
                        </summary>
                        <pre className="mt-2 text-xs overflow-x-auto">
                          {JSON.stringify(allStorage[key], null, 2)}
                        </pre>
                      </details>
                    ) : (
                      <p className="text-sm text-gray-700">
                        {String(allStorage[key]).substring(0, 200)}
                        {String(allStorage[key]).length > 200 && '...'}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-900 mb-2">📝 Notes</h3>
          <ul className="text-yellow-800 text-sm space-y-1">
            <li>• This page shows ALL localStorage keys in your browser</li>
            <li>• Expected workout app keys: <code>ai-workout-clients</code> and <code>ai-workout-workouts</code></li>
            <li>• You can export all data as a backup before making changes</li>
            <li>• If data was lost, check if it might be under different keys</li>
          </ul>
        </div>
      </div>
    </div>
  )
}