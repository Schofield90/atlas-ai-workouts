import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    console.log('API: Fetching all clients')
    
    // Use direct fetch to Supabase REST API
    const supabaseUrl = 'https://lzlrojoaxrqvmhempnkn.supabase.co'
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0OTI1MzksImV4cCI6MjA2ODA2ODUzOX0.8rGsdaYcnwFIyWEhKKqz-W-KsOAP6WRTuEv8UrzkKuc'
    
    const response = await fetch(
      `${supabaseUrl}/rest/v1/workout_clients?select=*&order=created_at.desc`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        }
      }
    )
    
    if (!response.ok) {
      console.error('Supabase error:', response.status, response.statusText)
      return NextResponse.json(
        { error: 'Failed to fetch clients', details: response.statusText },
        { status: 500 }
      )
    }
    
    const data = await response.json()
    
    return NextResponse.json({
      clients: data || [],
      count: data?.length || 0
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}