import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Client API routes are working',
    timestamp: new Date().toISOString(),
    routes: [
      '/api/clients/import - CSV import',
      '/api/clients/import-excel - Excel import'
    ]
  })
}