import { NextResponse } from 'next/server'
import { simpleClientService } from '@/lib/services/workout-data-simple'

export async function GET() {
  try {
    console.log('🔬 DEBUG: Testing simpleClientService directly...')
    const clients = await simpleClientService.getClients()
    
    return NextResponse.json({
      success: true,
      message: `Debug endpoint - simpleClientService returned ${clients?.length || 0} clients`,
      clientCount: clients?.length || 0,
      dataType: typeof clients,
      isArray: Array.isArray(clients),
      sampleClient: clients?.[0] || null,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('🔬 DEBUG ERROR:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}