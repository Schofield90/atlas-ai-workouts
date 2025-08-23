import { NextRequest, NextResponse } from 'next/server'
import { parse } from 'csv-parse/sync'

export const runtime = 'nodejs'
export const maxDuration = 30

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
      skip_records_with_error: true,
      bom: true // Handle files with BOM
    })

    console.log('Parsed records:', records.length)
    console.log('First record columns:', records[0] ? Object.keys(records[0]) : 'No records')
    
    // Map CSV columns to client objects
    const clients = records.map((record: any, index: number) => {
      // Get all column names (case-insensitive)
      const columns = Object.keys(record)
      const getValue = (possibleNames: string[]) => {
        for (const name of possibleNames) {
          // Check exact match first
          if (record[name]) return record[name]
          // Then check case-insensitive
          const col = columns.find(c => c.toLowerCase() === name.toLowerCase())
          if (col && record[col]) return record[col]
        }
        return ''
      }

      // Try different column name variations
      const name = getValue(['Name', 'name', 'Full Name', 'full_name', 'Client Name', 'client_name', 'Customer', 'Member']) || `Client ${index + 1}`
      const email = getValue(['Email', 'email', 'Email Address', 'email_address', 'E-mail', 'Mail'])
      const phone = getValue(['Phone', 'phone', 'Phone Number', 'phone_number', 'Mobile', 'mobile', 'Cell', 'Tel', 'Telephone'])
      const goals = getValue(['Goals', 'goals', 'Training Goals', 'training_goals', 'Fitness Goals', 'fitness_goals', 'Objective', 'Target'])
      const injuries = getValue(['Injuries', 'injuries', 'Limitations', 'limitations', 'Medical', 'medical', 'Health', 'Conditions'])
      const equipment = getValue(['Equipment', 'equipment', 'Available Equipment', 'available_equipment', 'Gear', 'Tools'])
      const notes = getValue(['Notes', 'notes', 'Comments', 'comments', 'Additional Info', 'Info', 'Description'])

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

    // Return debug info along with clients
    return NextResponse.json({
      success: true,
      clients,
      message: `Successfully imported ${clients.length} clients`,
      debug: {
        totalRecords: records.length,
        sampleColumns: records[0] ? Object.keys(records[0]) : [],
        sampleRecord: records[0] || null
      }
    })

  } catch (error) {
    console.error('CSV import error:', error)
    return NextResponse.json({ 
      error: 'Failed to parse CSV file. Make sure it\'s properly formatted.',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}