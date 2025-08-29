import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/db/client-fixed'

export const runtime = 'nodejs'

// Robust CSV parser that handles various formats
function parseCSV(text: string) {
  // Try to detect delimiter (comma, semicolon, tab)
  const firstLine = text.split('\n')[0] || ''
  let delimiter = ','
  if (firstLine.includes('\t')) delimiter = '\t'
  else if (firstLine.includes(';')) delimiter = ';'
  
  // Split lines and filter empty ones
  const lines = text.split(/\r?\n/).filter(line => line.trim())
  if (lines.length < 2) {
    return { headers: [], data: [] }
  }
  
  // Function to parse a CSV line properly (handles quoted values)
  function parseCSVLine(line: string, delim: string) {
    const result = []
    let current = ''
    let inQuotes = false
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      const nextChar = line[i + 1]
      
      if (char === '"' || char === "'") {
        if (inQuotes && nextChar === char) {
          // Escaped quote
          current += char
          i++
        } else {
          // Toggle quote state
          inQuotes = !inQuotes
        }
      } else if (char === delim && !inQuotes) {
        // End of field
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    
    // Add last field
    result.push(current.trim())
    
    return result.map(v => v.replace(/^["']|["']$/g, '').trim())
  }
  
  // Parse headers
  const headers = parseCSVLine(lines[0], delimiter)
  console.log('CSV Headers found:', headers)
  
  // Parse data rows
  const data = []
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i], delimiter)
    
    // Skip empty rows
    if (values.every(v => !v)) continue
    
    const row: any = {}
    headers.forEach((header, index) => {
      row[header] = values[index] || ''
    })
    data.push(row)
  }
  
  console.log(`Parsed ${data.length} rows from CSV`)
  if (data.length > 0) {
    console.log('First row:', data[0])
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
        // Analyze the data to find potential issues
        const analysis: any = {
          success: true,
          format: 'CSV',
          headers,
          rowCount: data.length,
          sampleData: data.slice(0, 5),
          issues: []
        }
        
        // Check if we can find name columns
        const hasNameColumn = headers.some(h => 
          h.toLowerCase().includes('name') || 
          h.toLowerCase() === 'client' || 
          h.toLowerCase() === 'customer'
        )
        
        if (!hasNameColumn) {
          analysis.issues.push('No obvious name column found. Will use first non-empty column.')
          if (headers.length > 0) {
            analysis.issues.push(`Available columns: ${headers.join(', ')}`)
          }
        }
        
        // Check if data exists
        if (data.length === 0) {
          analysis.issues.push('No data rows found in CSV')
        } else {
          // Check how many rows have valid names
          let validNames = 0
          for (const row of data) {
            const name = Object.values(row).find(v => v && String(v).trim() && !String(v).includes('@'))
            if (name) validNames++
          }
          analysis.validNamesFound = validNames
          
          if (validNames === 0) {
            analysis.issues.push('No valid names found in any rows')
          }
        }
        
        return NextResponse.json(analysis)
      }
      
      // Import to database
      if (action === 'import') {
        const supabase = createClient()
        const results = []
        
        for (const row of data) {
          // Find name field - check all possible variations
          const nameVariations = ['Name', 'Full Name', 'Client Name', 'First Name', 'Customer', 'Member', 'Person']
          let name = null
          
          // Try exact matches first
          for (const variation of nameVariations) {
            if (row[variation] && String(row[variation]).trim()) {
              name = row[variation]
              break
            }
          }
          
          // Try case-insensitive matches
          if (!name) {
            const rowKeys = Object.keys(row)
            for (const key of rowKeys) {
              const keyLower = key.toLowerCase()
              if (keyLower.includes('name') || keyLower === 'client' || keyLower === 'customer' || keyLower === 'member') {
                if (row[key] && String(row[key]).trim()) {
                  name = row[key]
                  break
                }
              }
            }
          }
          
          // Last resort - use first non-empty column that doesn't look like an email
          if (!name) {
            const firstValue = Object.values(row).find(v => 
              v && String(v).trim() && 
              !String(v).includes('@') && 
              !String(v).match(/^\d+$/) // Not just numbers
            )
            if (firstValue) {
              name = firstValue
              console.log('Using first non-empty column as name:', name)
            }
          }
          
          if (!name || !String(name).trim()) {
            console.log('Skipping row - no name found:', row)
            continue
          }
          
          // Find other fields with flexible matching
          const findField = (variations: string[]) => {
            for (const variation of variations) {
              if (row[variation]) return row[variation]
            }
            // Case-insensitive fallback
            const rowKeys = Object.keys(row)
            for (const key of rowKeys) {
              const keyLower = key.toLowerCase()
              for (const variation of variations) {
                if (keyLower.includes(variation.toLowerCase())) {
                  return row[key]
                }
              }
            }
            return null
          }
          
          const client = {
            full_name: String(name).trim(),
            email: findField(['Email', 'Email Address', 'E-mail', 'Mail']) || null,
            phone: findField(['Phone', 'Phone Number', 'Mobile', 'Cell', 'Tel']) || null,
            goals: findField(['Goals', 'Fitness Goals', 'Goal', 'Objective']) || null,
            injuries: findField(['Injuries', 'Medical', 'Health', 'Condition']) || null,
            equipment: row['Equipment'] ? String(row['Equipment']).split(/[,;]/).filter(Boolean) : [],
            notes: findField(['Notes', 'Comments', 'Note', 'Additional']) || null,
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