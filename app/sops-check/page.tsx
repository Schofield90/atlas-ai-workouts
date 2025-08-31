'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Database, HardDrive, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

export default function SOPsCheckPage() {
  const [diagnostic, setDiagnostic] = useState<any>(null)
  const [localSOPs, setLocalSOPs] = useState<any[]>([])
  const [localContexts, setLocalContexts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkSOPsStatus()
  }, [])

  async function checkSOPsStatus() {
    setLoading(true)
    
    // Check API/Database
    try {
      const response = await fetch('/api/sops/check')
      if (response.ok) {
        const data = await response.json()
        setDiagnostic(data)
      }
    } catch (error) {
      console.error('Error checking SOPs:', error)
    }
    
    // Check localStorage
    try {
      const localSOPsData = localStorage.getItem('workout-sops')
      if (localSOPsData) {
        setLocalSOPs(JSON.parse(localSOPsData))
      }
      
      const localContextData = localStorage.getItem('ai-workout-contexts')
      if (localContextData) {
        setLocalContexts(JSON.parse(localContextData))
      }
    } catch (error) {
      console.error('Error reading localStorage:', error)
    }
    
    setLoading(false)
  }

  async function migrateToDatabase() {
    if (localSOPs.length === 0) {
      alert('No local SOPs to migrate')
      return
    }
    
    let migrated = 0
    let failed = 0
    
    for (const sop of localSOPs) {
      try {
        const response = await fetch('/api/sops', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: sop.title,
            content: sop.content,
            category: sop.category || 'general'
          })
        })
        
        if (response.ok) {
          migrated++
        } else {
          failed++
        }
      } catch (error) {
        failed++
      }
    }
    
    alert(`Migration complete: ${migrated} SOPs migrated, ${failed} failed`)
    checkSOPsStatus()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-gray-100">Checking SOPs status...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <nav className="bg-gray-800 shadow-sm border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/dashboard" className="text-gray-400 hover:text-gray-100 mr-4">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <h1 className="text-xl font-semibold text-gray-100">SOPs Status Check</h1>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Database Status */}
          <div className="bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center mb-4">
              <Database className="h-5 w-5 text-blue-400 mr-2" />
              <h2 className="text-lg font-semibold text-gray-100">Database SOPs</h2>
            </div>
            
            {diagnostic?.diagnostic?.database?.status === 'error' ? (
              <div className="space-y-3">
                <div className="flex items-center text-red-400">
                  <XCircle className="h-5 w-5 mr-2" />
                  <span>Database table not available</span>
                </div>
                <div className="text-sm text-gray-400">
                  {diagnostic?.diagnostic?.database?.error}
                </div>
                <div className="p-3 bg-yellow-900/20 rounded text-yellow-400 text-sm">
                  <AlertCircle className="h-4 w-4 inline mr-1" />
                  The workout_sops table needs to be created in Supabase
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center text-green-400">
                  <CheckCircle className="h-5 w-5 mr-2" />
                  <span>Database connected</span>
                </div>
                <div className="text-gray-300">
                  SOPs in database: <span className="font-bold text-gray-100">{diagnostic?.summary?.totalDatabaseSOPs || 0}</span>
                </div>
                {diagnostic?.diagnostic?.database?.sops?.map((sop: any) => (
                  <div key={sop.id} className="p-2 bg-gray-700 rounded text-sm">
                    <div className="font-medium text-gray-100">{sop.title}</div>
                    <div className="text-gray-400">
                      {sop.category} • {sop.contentLength} chars
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* LocalStorage Status */}
          <div className="bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center mb-4">
              <HardDrive className="h-5 w-5 text-purple-400 mr-2" />
              <h2 className="text-lg font-semibold text-gray-100">Local Storage SOPs</h2>
            </div>
            
            <div className="space-y-3">
              <div className="text-gray-300">
                SOPs in localStorage: <span className="font-bold text-gray-100">{localSOPs.length}</span>
              </div>
              {localSOPs.map((sop, index) => (
                <div key={index} className="p-2 bg-gray-700 rounded text-sm">
                  <div className="font-medium text-gray-100">{sop.title}</div>
                  <div className="text-gray-400">
                    {sop.category || 'general'} • {sop.content?.length || 0} chars
                  </div>
                </div>
              ))}
              
              {localSOPs.length > 0 && (
                <button
                  onClick={migrateToDatabase}
                  className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Migrate Local SOPs to Database
                </button>
              )}
            </div>
          </div>

          {/* Contexts Status */}
          <div className="bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center mb-4">
              <AlertCircle className="h-5 w-5 text-orange-400 mr-2" />
              <h2 className="text-lg font-semibold text-gray-100">Context Documents</h2>
            </div>
            
            <div className="space-y-3">
              <div className="text-gray-300">
                Contexts in localStorage: <span className="font-bold text-gray-100">{localContexts.length}</span>
              </div>
              {localContexts.map((context, index) => (
                <div key={index} className="p-2 bg-gray-700 rounded text-sm">
                  <div className="font-medium text-gray-100">{context.name || 'Unnamed Context'}</div>
                  <div className="text-gray-400">
                    {context.documents?.length || 0} documents • {context.textSections?.length || 0} text sections
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Usage Info */}
          <div className="bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center mb-4">
              <AlertCircle className="h-5 w-5 text-yellow-400 mr-2" />
              <h2 className="text-lg font-semibold text-gray-100">How SOPs are Used</h2>
            </div>
            
            <div className="space-y-3 text-sm text-gray-300">
              <div>
                <div className="font-medium text-gray-100 mb-1">Current Flow:</div>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>SOPs are added in /context page</li>
                  <li>They're loaded in /builder page</li>
                  <li>Selected context is sent to workout generation API</li>
                  <li>AI uses SOPs to customize workouts</li>
                </ol>
              </div>
              
              <div>
                <div className="font-medium text-gray-100 mb-1">Status:</div>
                <div className="p-2 bg-gray-700 rounded">
                  {diagnostic?.summary?.status || 'Checking...'}
                </div>
              </div>
              
              <div className="p-3 bg-blue-900/20 rounded text-blue-400">
                <strong>To add SOPs:</strong> Go to <Link href="/context" className="underline">Context page</Link> and add your training methods
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}