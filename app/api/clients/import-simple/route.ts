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
    const workbook = XLSX.read(buffer, { 
      type: 'buffer',
      cellDates: true,
      cellFormula: false,
      cellHTML: false,
      cellNF: false,
      cellStyles: false,
      cellText: false,
      WTF: true // Ignore errors and be more permissive
    })
    
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return NextResponse.json({ error: 'No sheets found in Excel file' }, { status: 400 })
    }
    
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    
    if (!worksheet) {
      return NextResponse.json({ error: 'Unable to read worksheet' }, { status: 400 })
    }
    
    // Try multiple parsing strategies
    let data = XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: false })
    
    // If no data, try raw values
    if (!data || data.length === 0) {
      data = XLSX.utils.sheet_to_json(worksheet, { raw: true, defval: '' })
    }
    
    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'No data found in Excel file' }, { status: 400 })
    }
    
    // Process and save to Supabase
    const supabase = createClient()
    const clientsToInsert = []
    
    // First, prepare all clients with flexible column matching
    for (let i = 0; i < data.length; i++) {
      const rowData = data[i] as any
      
      // Log first few rows for debugging
      if (i < 3) {
        console.log(`Row ${i}:`, Object.keys(rowData), rowData)
      }
      
      // Flexible column name matching
      const findValue = (keys: string[]) => {
        for (const key of keys) {
          if (rowData[key] !== undefined && rowData[key] !== null && rowData[key] !== '') {
            return String(rowData[key]).trim()
          }
          // Case-insensitive matching
          const found = Object.keys(rowData).find(k => {
            const normalizedK = k.toLowerCase().replace(/[^a-z0-9]/g, '')
            const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '')
            return normalizedK === normalizedKey || normalizedK.includes(normalizedKey)
          })
          if (found && rowData[found] !== undefined && rowData[found] !== null && rowData[found] !== '') {
            return String(rowData[found]).trim()
          }
        }
        return null
      }
      
      const name = findValue(['Name', 'Full Name', 'Client Name', 'Client', 'Customer', 'Member', 'First Name', 'Person'])
      const email = findValue(['Email', 'Email Address', 'E-mail', 'Mail', 'EmailAddress'])
      const phone = findValue(['Phone', 'Phone Number', 'Mobile', 'Cell', 'Contact', 'Tel', 'Telephone'])
      const goals = findValue(['Goals', 'Fitness Goals', 'Goal', 'Objectives', 'Training Goals'])
      const injuries = findValue(['Injuries', 'Medical History', 'Medical', 'Health Issues', 'Health'])
      const equipment = findValue(['Equipment', 'Available Equipment', 'Gear', 'Tools'])
      const notes = findValue(['Notes', 'Comments', 'Additional Info', 'Info', 'Remarks'])
      
      // Handle separate first/last name columns
      let finalName = name
      if (!finalName) {
        const firstName = findValue(['First Name', 'FirstName', 'First'])
        const lastName = findValue(['Last Name', 'LastName', 'Last', 'Surname'])
        if (firstName || lastName) {
          finalName = [firstName, lastName].filter(Boolean).join(' ')
        }
      }
      
      // Skip if no valid name or if it's a header row
      if (!finalName || finalName === 'Name' || finalName === 'Full Name') continue
      
      const client = {
        full_name: finalName,
        email: email || null,
        phone: phone || null,
        goals: goals || null,
        injuries: injuries || null,
        equipment: equipment 
          ? String(equipment).split(/[,;|]/).map(e => e.trim()).filter(Boolean)
          : [],
        notes: notes || null,
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