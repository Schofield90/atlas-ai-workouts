import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/db/client-fixed'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    
    // Import xlsx on server side
    const XLSX = require('xlsx')
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const data = XLSX.utils.sheet_to_json(worksheet)
    
    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'No data found in Excel file' }, { status: 400 })
    }
    
    // Process and save to Supabase
    const supabase = createClient()
    const results = []
    
    for (const row of data) {
      const rowData = row as any
      const name = rowData['Name'] || rowData['Full Name'] || rowData['Client Name'] || ''
      
      if (!name) continue
      
      const client = {
        full_name: name,
        email: rowData['Email'] || rowData['Email Address'] || null,
        phone: rowData['Phone'] || rowData['Phone Number'] || null,
        goals: rowData['Goals'] || rowData['Fitness Goals'] || null,
        injuries: rowData['Injuries'] || rowData['Medical History'] || null,
        equipment: rowData['Equipment'] 
          ? String(rowData['Equipment']).split(/[,;]/).map(e => e.trim())
          : [],
        notes: rowData['Notes'] || rowData['Comments'] || null,
        user_id: 'default-user'
      }
      
      try {
        const { data: newClient, error } = await supabase
          .from('workout_clients')
          .insert(client)
          .select()
          .single()
        
        if (!error && newClient) {
          results.push(newClient)
        }
      } catch (e) {
        console.error('Error inserting client:', name, e)
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      imported: results.length,
      total: data.length 
    })
    
  } catch (error: any) {
    console.error('Import error:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to import file' 
    }, { status: 500 })
  }
}