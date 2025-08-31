import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Direct Supabase connection with hardcoded values for reliability
const supabaseUrl = 'https://lzlrojoaxrqvmhempnkn.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0OTI1MzksImV4cCI6MjA2ODA2ODUzOX0.8rGsdaYcnwFIyWEhKKqz-W-KsOAP6WRTuEv8UrzkKuc'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const clientId = params.id
    console.log('API: Fetching client with ID:', clientId)
    
    // Clean the ID - take only first 36 characters (UUID length)
    const cleanId = clientId.substring(0, 36)
    
    // Create direct Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Fetch the client
    const { data, error } = await supabase
      .from('workout_clients')
      .select('*')
      .eq('id', cleanId)
      .single()
    
    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Client not found', details: error.message },
        { status: 404 }
      )
    }
    
    if (!data) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}