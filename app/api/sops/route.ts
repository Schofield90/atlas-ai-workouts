import { NextRequest, NextResponse } from 'next/server'

const supabaseUrl = 'https://lzlrojoaxrqvmhempnkn.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0OTI1MzksImV4cCI6MjA2ODA2ODUzOX0.8rGsdaYcnwFIyWEhKKqz-W-KsOAP6WRTuEv8UrzkKuc'

export async function GET(request: NextRequest) {
  try {
    // First, try to get SOPs from database
    const response = await fetch(
      `${supabaseUrl}/rest/v1/workout_sops?select=*&order=created_at.desc`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        }
      }
    )
    
    if (!response.ok) {
      // If table doesn't exist, return empty array
      if (response.status === 404 || response.status === 400) {
        return NextResponse.json({ sops: [] })
      }
      throw new Error(`Failed to fetch SOPs: ${response.statusText}`)
    }
    
    const data = await response.json()
    return NextResponse.json({ sops: data || [] })
  } catch (error) {
    console.error('Error fetching SOPs:', error)
    return NextResponse.json({ sops: [] })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, content, category = 'general' } = body
    
    if (!title || !content) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      )
    }
    
    // Insert new SOP
    const response = await fetch(
      `${supabaseUrl}/rest/v1/workout_sops`,
      {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          title,
          content,
          category,
          organization_id: '00000000-0000-0000-0000-000000000000'
        })
      }
    )
    
    if (!response.ok) {
      // If table doesn't exist, store in localStorage as fallback
      if (response.status === 404 || response.status === 400) {
        return NextResponse.json({
          success: false,
          message: 'Database table not ready, please try again later',
          fallback: true
        })
      }
      throw new Error(`Failed to create SOP: ${response.statusText}`)
    }
    
    const data = await response.json()
    return NextResponse.json({
      success: true,
      sop: data[0]
    })
  } catch (error) {
    console.error('Error creating SOP:', error)
    return NextResponse.json(
      { error: 'Failed to create SOP' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID is required' },
        { status: 400 }
      )
    }
    
    const response = await fetch(
      `${supabaseUrl}/rest/v1/workout_sops?id=eq.${id}`,
      {
        method: 'DELETE',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        }
      }
    )
    
    if (!response.ok) {
      throw new Error(`Failed to delete SOP: ${response.statusText}`)
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting SOP:', error)
    return NextResponse.json(
      { error: 'Failed to delete SOP' },
      { status: 500 }
    )
  }
}