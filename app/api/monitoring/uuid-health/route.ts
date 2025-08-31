import { NextResponse } from 'next/server'
import { createClient } from '@/lib/db/client-fixed'

export async function GET() {
  try {
    const supabase = createClient()
    
    // Check for invalid UUIDs in workout_clients
    const { data: invalidClients, error: clientError } = await supabase
      .rpc('check_invalid_uuids', {
        table_name: 'workout_clients',
        id_column: 'id'
      })
      .single()
    
    if (clientError) {
      // RPC doesn't exist, run manual check
      const { data: clients, error } = await supabase
        .from('workout_clients')
        .select('id, full_name')
      
      if (error) {
        return NextResponse.json({
          status: 'error',
          message: 'Failed to check UUID health',
          error: error.message
        }, { status: 500 })
      }
      
      const invalidIds = (clients || []).filter((c: any) => {
        return c.id.length !== 36 || 
               !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(c.id)
      })
      
      const { data: sessions } = await supabase
        .from('workout_sessions')
        .select('id, client_id')
      
      const invalidSessionIds = (sessions || []).filter((s: any) => {
        if (!s.client_id) return false
        return s.client_id.length !== 36 || 
               !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s.client_id)
      })
      
      return NextResponse.json({
        status: invalidIds.length > 0 || invalidSessionIds.length > 0 ? 'warning' : 'healthy',
        timestamp: new Date().toISOString(),
        issues: {
          workout_clients: {
            total: clients?.length || 0,
            invalid: invalidIds.length,
            invalidIds: invalidIds.map((c: any) => ({
              id: c.id,
              name: c.full_name,
              length: c.id.length
            }))
          },
          workout_sessions: {
            total: sessions?.length || 0,
            invalid: invalidSessionIds.length,
            invalidIds: invalidSessionIds.map((s: any) => ({
              id: s.id,
              client_id: s.client_id,
              length: s.client_id?.length
            }))
          }
        },
        recommendations: invalidIds.length > 0 || invalidSessionIds.length > 0 ? [
          'Run the emergency-uuid-fix.sql script in Supabase SQL Editor',
          'Deploy the latest application code with UUID validation',
          'Clear any caches (CDN, browser, etc.)'
        ] : ['All UUIDs are valid']
      })
    }
    
    // If RPC exists, use its results
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      message: 'UUID health check completed',
      data: invalidClients
    })
    
  } catch (error) {
    console.error('UUID health check error:', error)
    return NextResponse.json({
      status: 'error',
      message: 'UUID health check failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}