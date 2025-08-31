import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Direct Supabase connection with hardcoded values for reliability
const supabaseUrl = 'https://lzlrojoaxrqvmhempnkn.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0OTI1MzksImV4cCI6MjA2ODA2ODUzOX0.8rGsdaYcnwFIyWEhKKqz-W-KsOAP6WRTuEv8UrzkKuc'

export async function GET(request: NextRequest) {
  try {
    console.log('API: Fetching all clients')
    
    // Create direct Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Fetch all clients
    const { data, error } = await supabase
      .from('workout_clients')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch clients', details: error.message },
        { status: 500 }
      )
    }
    
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