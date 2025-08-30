import { NextRequest, NextResponse } from 'next/server'
import { simpleClientService } from '@/lib/services/workout-data-simple'

export async function GET(request: NextRequest) {
  try {
    // Test client fetching
    const clients = await simpleClientService.getClients()
    
    return NextResponse.json({
      message: 'Client API test successful',
      timestamp: new Date().toISOString(),
      clientCount: clients.length,
      clients: clients.slice(0, 10), // Return first 10 for testing
      routes: [
        '/api/clients/import - CSV import',
        '/api/clients/import-excel - Excel import'
      ]
    })
  } catch (error) {
    console.error('Client API test error:', error)
    return NextResponse.json({
      message: 'Client API test failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}