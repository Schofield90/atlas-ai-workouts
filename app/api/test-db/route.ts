import { NextResponse } from 'next/server'
import { createClient } from '@/lib/db/client-fixed'

export async function GET() {
  try {
    const supabase = createClient()
    
    // Test 1: Check if we can connect
    const { data: testConnection, error: connectionError } = await supabase
      .from('workout_clients')
      .select('count')
      .limit(1)
    
    if (connectionError) {
      // Check if it's a table not found error
      if (connectionError.message.includes('relation') && connectionError.message.includes('does not exist')) {
        return NextResponse.json({
          connected: false,
          error: 'Table workout_clients does not exist',
          message: 'Please run the database migration first',
          migrationUrl: '/setup/migrate'
        }, { status: 503 })
      }
      
      return NextResponse.json({
        connected: false,
        error: connectionError.message,
        details: connectionError
      }, { status: 500 })
    }
    
    // Test 2: Try to count existing clients
    const { count, error: countError } = await supabase
      .from('workout_clients')
      .select('*', { count: 'exact', head: true })
    
    // Test 3: Try to insert a test client and then delete it
    const testClient = {
      full_name: 'Test Client - Delete Me',
      email: 'test@example.com',
      goals: 'Testing database connection',
      injuries: 'None',
      user_id: 'default-user'
    }
    
    const { data: insertTest, error: insertError } = await supabase
      .from('workout_clients')
      .insert(testClient)
      .select()
      .single()
    
    let canInsert = !insertError
    let canDelete = false
    
    if (insertTest) {
      // Try to delete the test client
      const { error: deleteError } = await supabase
        .from('workout_clients')
        .delete()
        .eq('id', insertTest.id)
      
      canDelete = !deleteError
    }
    
    return NextResponse.json({
      success: true,
      database: {
        connected: true,
        tableExists: true,
        canRead: true,
        canInsert,
        canDelete,
        currentClients: count || 0
      },
      supabase: {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      },
      message: 'Database connection successful',
      operations: {
        insert: canInsert ? 'Working' : 'Failed',
        delete: canDelete ? 'Working' : 'Not tested',
        read: 'Working'
      }
    })
    
  } catch (error: any) {
    console.error('Database test error:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}