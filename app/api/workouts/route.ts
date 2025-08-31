import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/db/client-fixed'

// GET - Fetch all workouts
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('workout_sessions')
      .select(`
        *,
        workout_clients (
          id,
          full_name,
          email
        )
      `)
      .order('created_at', { ascending: false })
      .limit(100)
    
    if (error) {
      console.error('Database error fetching workouts:', error)
      return NextResponse.json({ 
        error: 'Failed to fetch workouts', 
        details: error.message 
      }, { status: 500 })
    }
    
    return NextResponse.json({ 
      success: true, 
      workouts: data || [],
      count: data?.length || 0
    })
  } catch (error: any) {
    console.error('Error fetching workouts:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch workouts',
      message: error.message 
    }, { status: 500 })
  }
}

// POST - Save a new workout
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, title, plan, client_id, source = 'ai', version = 1 } = body
    
    if (!id || !title || !plan) {
      return NextResponse.json({ 
        error: 'Missing required fields: id, title, plan' 
      }, { status: 400 })
    }
    
    const supabase = createClient()
    
    // First check if workout already exists
    const { data: existing } = await supabase
      .from('workout_sessions')
      .select('id')
      .eq('id', id)
      .single()
    
    if (existing) {
      // Update existing workout
      const { data, error } = await supabase
        .from('workout_sessions')
        .update({
          title,
          plan,
          client_id,
          source,
          version,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()
      
      if (error) {
        console.error('Error updating workout:', error)
        return NextResponse.json({ 
          error: 'Failed to update workout', 
          details: error.message 
        }, { status: 500 })
      }
      
      return NextResponse.json({ 
        success: true, 
        workout: data,
        action: 'updated'
      })
    } else {
      // Insert new workout
      const { data, error } = await supabase
        .from('workout_sessions')
        .insert({
          id,
          title,
          plan,
          client_id,
          source,
          version,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()
      
      if (error) {
        console.error('Error saving workout:', error)
        return NextResponse.json({ 
          error: 'Failed to save workout', 
          details: error.message 
        }, { status: 500 })
      }
      
      return NextResponse.json({ 
        success: true, 
        workout: data,
        action: 'created'
      })
    }
  } catch (error: any) {
    console.error('Error in POST /api/workouts:', error)
    return NextResponse.json({ 
      error: 'Failed to save workout',
      message: error.message 
    }, { status: 500 })
  }
}