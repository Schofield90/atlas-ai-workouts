import { NextRequest, NextResponse } from 'next/server'
import { parse } from 'csv-parse/sync'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const text = await file.text()
    
    // Parse CSV with headers
    const records = parse(text, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
      skip_records_with_error: true
    })

    // Map CSV columns to client objects
    const clients = records.map((record: any, index: number) => {
      // Try different column name variations
      const name = record['Name'] || record['name'] || record['Full Name'] || record['full_name'] || `Client ${index + 1}`
      const email = record['Email'] || record['email'] || record['Email Address'] || ''
      const phone = record['Phone'] || record['phone'] || record['Phone Number'] || record['Mobile'] || ''
      const goals = record['Goals'] || record['goals'] || record['Training Goals'] || record['Fitness Goals'] || ''
      const injuries = record['Injuries'] || record['injuries'] || record['Limitations'] || record['Medical'] || ''
      const equipment = record['Equipment'] || record['equipment'] || record['Available Equipment'] || ''
      const notes = record['Notes'] || record['notes'] || record['Comments'] || ''

      return {
        id: `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        full_name: name,
        email: email || undefined,
        phone: phone || undefined,
        goals: goals || undefined,
        injuries: injuries || undefined,
        equipment: equipment || undefined,
        notes: notes || undefined,
        created_at: new Date().toISOString()
      }
    }).filter((client: any) => client.full_name && client.full_name !== '')

    if (clients.length === 0) {
      return NextResponse.json({ 
        error: 'No valid clients found in CSV. Make sure it has a "Name" column.' 
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      clients,
      message: `Successfully imported ${clients.length} clients`
    })

  } catch (error) {
    console.error('CSV import error:', error)
    return NextResponse.json({ 
      error: 'Failed to parse CSV file. Make sure it\'s properly formatted.',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}