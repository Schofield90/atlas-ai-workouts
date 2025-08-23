import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const { clients, debug } = await request.json()
    
    if (!clients || !Array.isArray(clients)) {
      return NextResponse.json({ error: 'No clients data provided' }, { status: 400 })
    }

    // Add IDs and timestamps to clients
    const processedClients = clients.map((client: any) => ({
      id: `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      full_name: client.full_name,
      email: '',
      phone: '',
      goals: client.goals || '',
      injuries: client.injuries || '',
      equipment: '',
      notes: client.notes || '',
      created_at: new Date().toISOString()
    }))
    
    return NextResponse.json({
      success: true,
      clients: processedClients,
      message: `Successfully imported ${processedClients.length} clients`,
      debug: debug || {}
    })

  } catch (error) {
    console.error('Import error:', error)
    return NextResponse.json({ 
      error: 'Failed to process client data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}