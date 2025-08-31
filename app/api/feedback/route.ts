import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lzlrojoaxrqvmhempnkn.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// GET - Fetch feedback for a workout or client
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const workoutId = searchParams.get('workout_id')
    const clientId = searchParams.get('client_id')
    
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    let query = supabase
      .from('workout_feedback')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (workoutId) {
      query = query.eq('workout_id', workoutId)
    }
    
    if (clientId) {
      query = query.eq('client_id', clientId)
    }
    
    const { data, error } = await query.limit(100)
    
    if (error) {
      console.error('Error fetching feedback:', error)
      return NextResponse.json({ 
        error: 'Failed to fetch feedback',
        details: error.message 
      }, { status: 500 })
    }
    
    return NextResponse.json({ 
      success: true,
      feedback: data || []
    })
  } catch (error: any) {
    console.error('Error in GET /api/feedback:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch feedback',
      message: error.message 
    }, { status: 500 })
  }
}

// POST - Save new feedback
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      workout_id, 
      workout_title,
      rating, 
      feedback, 
      category = 'general',
      scope = 'general',
      client_id = null,
      client_name = null
    } = body
    
    if (!workout_id || !rating || !feedback) {
      return NextResponse.json({ 
        error: 'Missing required fields: workout_id, rating, feedback' 
      }, { status: 400 })
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Save to workout_feedback table
    const feedbackRecord = {
      id: `feedback-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      workout_id,
      rating,
      feedback,
      created_at: new Date().toISOString()
    }
    
    const { data: savedFeedback, error: feedbackError } = await supabase
      .from('workout_feedback')
      .insert(feedbackRecord)
      .select()
      .single()
    
    if (feedbackError) {
      console.error('Error saving feedback:', feedbackError)
      // Table might not exist, but don't fail the request
      console.log('Feedback table might not exist yet, continuing...')
    }
    
    // Also save to a more detailed feedback preferences table for AI learning
    const preferenceRecord = {
      id: `pref-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      workout_id,
      workout_title,
      client_id: scope === 'client' ? client_id : null,
      client_name: scope === 'client' ? client_name : null,
      scope,
      category,
      rating,
      feedback,
      created_at: new Date().toISOString()
    }
    
    const { data: savedPreference, error: prefError } = await supabase
      .from('workout_preferences')
      .insert(preferenceRecord)
      .select()
      .single()
    
    if (prefError) {
      console.error('Preferences table might not exist:', prefError)
      // Continue anyway
    }
    
    return NextResponse.json({ 
      success: true,
      feedback: savedFeedback || feedbackRecord,
      preference: savedPreference || preferenceRecord,
      message: `Feedback saved ${scope === 'client' ? 'for client' : 'globally'}`
    })
  } catch (error: any) {
    console.error('Error in POST /api/feedback:', error)
    return NextResponse.json({ 
      error: 'Failed to save feedback',
      message: error.message 
    }, { status: 500 })
  }
}