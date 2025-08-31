import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Check database for SOPs
    const supabaseUrl = 'https://lzlrojoaxrqvmhempnkn.supabase.co'
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0OTI1MzksImV4cCI6MjA2ODA2ODUzOX0.8rGsdaYcnwFIyWEhKKqz-W-KsOAP6WRTuEv8UrzkKuc'
    
    // Try to fetch from workout_sops table
    const dbResponse = await fetch(
      `${supabaseUrl}/rest/v1/workout_sops?select=*&order=created_at.desc`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        }
      }
    )
    
    let databaseSOPs = []
    let dbError = null
    
    if (dbResponse.ok) {
      databaseSOPs = await dbResponse.json()
    } else {
      dbError = `Database error: ${dbResponse.status} ${dbResponse.statusText}`
    }
    
    // Note: We can't check localStorage from the server, but we can provide instructions
    
    return NextResponse.json({
      diagnostic: {
        database: {
          status: dbError ? 'error' : 'connected',
          error: dbError,
          sopCount: databaseSOPs.length,
          sops: databaseSOPs.map((sop: any) => ({
            id: sop.id,
            title: sop.title,
            category: sop.category,
            contentLength: sop.content?.length || 0,
            created: sop.created_at
          }))
        },
        localStorage: {
          note: 'localStorage SOPs can only be checked in the browser',
          instructions: 'Open browser console and run: localStorage.getItem("workout-sops")'
        },
        context: {
          note: 'Context documents can be checked by running: localStorage.getItem("ai-workout-contexts")'
        },
        usage: {
          whereUsed: 'SOPs are loaded in /builder page and sent to /api/workouts/generate-simple',
          currentIssue: 'SOPs are stored in localStorage, not database',
          recommendation: 'Need to migrate SOPs from localStorage to database for persistence'
        }
      },
      summary: {
        totalDatabaseSOPs: databaseSOPs.length,
        categories: databaseSOPs.reduce((acc: any, sop: any) => {
          acc[sop.category] = (acc[sop.category] || 0) + 1
          return acc
        }, {}),
        status: databaseSOPs.length > 0 ? 'SOPs found in database' : 'No SOPs in database - check localStorage'
      }
    })
  } catch (error) {
    console.error('Error checking SOPs:', error)
    return NextResponse.json({
      error: 'Failed to check SOPs',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}