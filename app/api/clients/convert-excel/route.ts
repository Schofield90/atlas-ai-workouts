import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/db/client-fixed'

export const runtime = 'nodejs'

// Simple CSV parser that always works
function parseCSV(text: string) {
  const lines = text.split('\n').filter(line => line.trim())
  if (lines.length < 2) {
    return { headers: [], data: [] }
  }
  
  // Parse headers
  const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''))
  
  // Parse data rows
  const data = []
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/^["']|["']$/g, ''))
    const row: any = {}
    headers.forEach((header, index) => {
      row[header] = values[index] || ''
    })
    data.push(row)
  }
  
  return { headers, data }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const action = formData.get('action') as string // 'analyze' or 'import'
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    console.log(`Processing file: ${file.name}, Action: ${action}`)
    
    // Read file as text
    const text = await file.text()
    
    // Check if it's CSV
    const isCSV = file.name.toLowerCase().endsWith('.csv')
    
    if (!isCSV) {
      // Try to load XLSX library
      try {
        const XLSX = require('xlsx')
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)
        const workbook = XLSX.read(buffer, { type: 'buffer', WTF: true })
        
        // Convert to CSV
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const csvText = XLSX.utils.sheet_to_csv(worksheet)
        
        // Parse the CSV
        const { headers, data } = parseCSV(csvText)
        
        if (action === 'analyze') {
          return NextResponse.json({
            success: true,
            format: 'Excel converted to CSV',
            headers,
            rowCount: data.length,
            sampleData: data.slice(0, 5)
          })
        }
        
        // Import to database
        if (action === 'import') {
          const supabase = createClient()
          const results = []
          
          for (const row of data) {
            // Find name field
            let name = row['Name'] || row['Full Name'] || row['Client Name'] || 
                      row['First Name'] || row['Customer'] || Object.values(row)[0]
            
            if (!name || !String(name).trim()) continue
            
            const client = {
              full_name: String(name).trim(),
              email: row['Email'] || row['Email Address'] || null,
              phone: row['Phone'] || row['Phone Number'] || row['Mobile'] || null,
              goals: row['Goals'] || row['Fitness Goals'] || null,
              injuries: row['Injuries'] || row['Medical'] || null,
              equipment: row['Equipment'] ? String(row['Equipment']).split(/[,;]/).filter(Boolean) : [],
              notes: row['Notes'] || row['Comments'] || null,
              user_id: 'default-user'
            }
            
            try {
              const { data: newClient, error } = await supabase
                .from('workout_clients')
                .insert(client)
                .select()
                .single()
              
              if (newClient) results.push(newClient)
            } catch (e) {
              console.error('Failed to insert client:', e)
            }
          }
          
          return NextResponse.json({
            success: true,
            imported: results.length,
            total: data.length
          })
        }
        
      } catch (xlsxError) {
        return NextResponse.json({
          error: 'Cannot process Excel file. Please save as CSV and try again.',
          details: 'Excel processing library unavailable',
          suggestion: 'Open your Excel file and save as CSV format (File > Save As > CSV)'
        }, { status: 400 })
      }
    } else {
      // Process as CSV
      const { headers, data } = parseCSV(text)
      
      if (action === 'analyze') {
        return NextResponse.json({
          success: true,
          format: 'CSV',
          headers,
          rowCount: data.length,
          sampleData: data.slice(0, 5)
        })
      }
      
      // Import to database
      if (action === 'import') {
        const supabase = createClient()
        const results = []
        
        for (const row of data) {
          // Find name field - be very flexible
          let name = row['Name'] || row['Full Name'] || row['Client Name'] || 
                    row['First Name'] || row['Customer'] || 
                    Object.values(row).find(v => v && String(v).trim() && !String(v).includes('@'))
          
          if (!name || !String(name).trim()) continue
          
          const client = {
            full_name: String(name).trim(),
            email: row['Email'] || row['Email Address'] || null,
            phone: row['Phone'] || row['Phone Number'] || row['Mobile'] || null,
            goals: row['Goals'] || row['Fitness Goals'] || null,
            injuries: row['Injuries'] || row['Medical'] || null,
            equipment: row['Equipment'] ? String(row['Equipment']).split(/[,;]/).filter(Boolean) : [],
            notes: row['Notes'] || row['Comments'] || null,
            user_id: 'default-user'
          }
          
          try {
            const { data: newClient, error } = await supabase
              .from('workout_clients')
              .insert(client)
              .select()
              .single()
            
            if (newClient) results.push(newClient)
          } catch (e) {
            console.error('Failed to insert client:', e)
          }
        }
        
        return NextResponse.json({
          success: true,
          imported: results.length,
          total: data.length
        })
      }
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    
  } catch (error: any) {
    console.error('Convert/import error:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to process file',
      suggestion: 'Try saving your file as CSV format'
    }, { status: 500 })
  }
}