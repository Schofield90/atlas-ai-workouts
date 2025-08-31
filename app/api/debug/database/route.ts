import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    // Check environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    const envCheck = {
      hasUrl: !!supabaseUrl,
      urlPrefix: supabaseUrl ? supabaseUrl.substring(0, 30) : 'MISSING',
      hasAnonKey: !!supabaseAnonKey,
      anonKeyPrefix: supabaseAnonKey ? supabaseAnonKey.substring(0, 20) : 'MISSING',
      hasServiceKey: !!supabaseServiceKey,
      serviceKeyPrefix: supabaseServiceKey ? supabaseServiceKey.substring(0, 20) : 'MISSING'
    }
    
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({
        error: 'Missing Supabase configuration',
        envCheck,
        message: 'Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables'
      }, { status: 500 })
    }
    
    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    
    // Test connection by checking tables
    const { data: tables, error: tablesError } = await supabase
      .from('workout_sessions')
      .select('id')
      .limit(1)
    
    let tableExists = !tablesError
    let tableError = tablesError?.message || null
    
    // Try to count workouts
    let workoutCount = 0
    if (tableExists) {
      const { count, error: countError } = await supabase
        .from('workout_sessions')
        .select('*', { count: 'exact', head: true })
      
      if (!countError && count !== null) {
        workoutCount = count
      }
    }
    
    // Try to fetch recent workouts
    let recentWorkouts: any[] = []
    if (tableExists) {
      const { data, error } = await supabase
        .from('workout_sessions')
        .select('id, title, created_at')
        .order('created_at', { ascending: false })
        .limit(5)
      
      if (!error && data) {
        recentWorkouts = data
      }
    }
    
    // Check if we can access workout_clients table
    const { error: clientsError } = await supabase
      .from('workout_clients')
      .select('id')
      .limit(1)
    
    let clientsTableExists = !clientsError
    
    return NextResponse.json({
      status: 'Database diagnostic report',
      timestamp: new Date().toISOString(),
      environment: {
        nodeEnv: process.env.NODE_ENV,
        vercel: !!process.env.VERCEL,
        ...envCheck
      },
      database: {
        connected: tableExists || clientsTableExists,
        tables: {
          workout_sessions: {
            exists: tableExists,
            error: tableError,
            count: workoutCount,
            recentWorkouts
          },
          workout_clients: {
            exists: clientsTableExists,
            error: clientsError?.message || null
          }
        }
      },
      recommendations: [
        !tableExists && 'The workout_sessions table does not exist. You may need to run migrations.',
        !clientsTableExists && 'The workout_clients table does not exist. You may need to run migrations.',
        workoutCount === 0 && tableExists && 'The workout_sessions table exists but is empty.',
        !supabaseServiceKey && 'Consider adding SUPABASE_SERVICE_ROLE_KEY for admin operations.'
      ].filter(Boolean)
    })
  } catch (error: any) {
    return NextResponse.json({
      error: 'Database diagnostic failed',
      message: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}