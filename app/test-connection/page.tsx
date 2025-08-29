'use client'

import { useState, useEffect } from 'react'

export default function TestConnectionPage() {
  const [status, setStatus] = useState<any>({})
  
  useEffect(() => {
    checkConnection()
  }, [])
  
  async function checkConnection() {
    const results: any = {}
    
    // Check environment variables
    results.supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing'
    results.supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'
    
    // Show actual URL (partial)
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      results.urlPreview = process.env.NEXT_PUBLIC_SUPABASE_URL.substring(0, 30) + '...'
    }
    
    // Try to create client
    try {
      const { createClient } = await import('@/lib/db/client')
      const supabase = createClient()
      results.clientCreated = '✅ Success'
      
      // Try to query
      try {
        const { data, error } = await supabase
          .from('workout_clients')
          .select('count')
          .limit(1)
        
        if (error) {
          results.queryStatus = `❌ Query failed: ${error.message}`
        } else {
          results.queryStatus = '✅ Query successful'
        }
      } catch (e: any) {
        results.queryStatus = `❌ Query error: ${e.message}`
      }
    } catch (e: any) {
      results.clientCreated = `❌ Failed: ${e.message}`
    }
    
    setStatus(results)
  }
  
  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Supabase Connection Test</h1>
      
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <div className="space-y-2">
          <h2 className="font-semibold text-lg">Environment Variables</h2>
          <p>NEXT_PUBLIC_SUPABASE_URL: {status.supabaseUrl}</p>
          <p>NEXT_PUBLIC_SUPABASE_ANON_KEY: {status.supabaseKey}</p>
          {status.urlPreview && (
            <p className="text-sm text-gray-600">URL: {status.urlPreview}</p>
          )}
        </div>
        
        <div className="space-y-2">
          <h2 className="font-semibold text-lg">Client Creation</h2>
          <p>{status.clientCreated}</p>
        </div>
        
        <div className="space-y-2">
          <h2 className="font-semibold text-lg">Database Query</h2>
          <p>{status.queryStatus}</p>
        </div>
        
        <button 
          onClick={checkConnection}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry Connection Test
        </button>
      </div>
    </div>
  )
}