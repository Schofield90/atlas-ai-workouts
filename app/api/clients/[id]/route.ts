import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const clientId = params.id
    console.log('API: Fetching client with ID:', clientId)
    
    // Clean the ID - take only first 36 characters (UUID length)
    const cleanId = clientId.substring(0, 36)
    
    // Use direct fetch to Supabase REST API
    const supabaseUrl = 'https://lzlrojoaxrqvmhempnkn.supabase.co'
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0OTI1MzksImV4cCI6MjA2ODA2ODUzOX0.8rGsdaYcnwFIyWEhKKqz-W-KsOAP6WRTuEv8UrzkKuc'
    
    const response = await fetch(
      `${supabaseUrl}/rest/v1/workout_clients?id=eq.${cleanId}&select=*`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        }
      }
    )
    
    if (!response.ok) {
      console.error('Supabase error:', response.status, response.statusText)
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }
    
    const data = await response.json()
    
    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(data[0])
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}