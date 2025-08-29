import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/db/client-fixed'

export const runtime = 'nodejs'
export const maxDuration = 60 // 60 seconds timeout

export async function POST(request: NextRequest) {
  try {
    // Check content length
    const contentLength = request.headers.get('content-length')
    if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) { // 10MB limit
      return NextResponse.json({ error: 'File too large. Maximum size is 10MB' }, { status: 413 })
    }
    
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    console.log('Processing Excel file:', file.name, 'Size:', file.size)
    
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
    const clientsToInsert = []
    
    // First, prepare all clients
    for (const row of data) {
      const rowData = row as any
      const name = rowData['Name'] || rowData['Full Name'] || rowData['Client Name'] || ''
      
      if (!name || !name.trim()) continue
      
      const client = {
        full_name: name.trim(),
        email: rowData['Email'] || rowData['Email Address'] || null,
        phone: rowData['Phone'] || rowData['Phone Number'] || null,
        goals: rowData['Goals'] || rowData['Fitness Goals'] || null,
        injuries: rowData['Injuries'] || rowData['Medical History'] || null,
        equipment: rowData['Equipment'] 
          ? String(rowData['Equipment']).split(/[,;]/).map(e => e.trim()).filter(Boolean)
          : [],
        notes: rowData['Notes'] || rowData['Comments'] || null,
        user_id: 'default-user'
      }
      
      clientsToInsert.push(client)
    }
    
    console.log(`Prepared ${clientsToInsert.length} clients for import`)
    
    // Insert in batches of 10 to avoid timeouts
    const results = []
    const batchSize = 10
    
    for (let i = 0; i < clientsToInsert.length; i += batchSize) {
      const batch = clientsToInsert.slice(i, i + batchSize)
      
      try {
        const { data: newClients, error } = await supabase
          .from('workout_clients')
          .insert(batch)
          .select()
        
        if (!error && newClients) {
          results.push(...newClients)
        } else if (error) {
          console.error(`Batch ${i/batchSize + 1} error:`, error)
        }
      } catch (e) {
        console.error(`Error inserting batch ${i/batchSize + 1}:`, e)
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