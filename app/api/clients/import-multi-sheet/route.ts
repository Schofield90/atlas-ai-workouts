import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/db/client-fixed'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    console.log('Processing multi-sheet Excel file:', file.name)
    
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    
    // Import xlsx
    const XLSX = require('xlsx')
    
    // Read workbook with all sheets
    const workbook = XLSX.read(buffer, { 
      type: 'buffer',
      cellDates: true,
      cellFormula: false,
      cellHTML: false,
      cellNF: false,
      cellStyles: false,
      cellText: false,
      raw: false,
      dense: false,
      WTF: true
    })
    
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return NextResponse.json({ error: 'No sheets found in Excel file' }, { status: 400 })
    }
    
    console.log(`Found ${workbook.SheetNames.length} sheets (potential clients)`)
    
    const supabase = createClient()
    const results = []
    const errors = []
    
    // Process each sheet as a separate client
    for (const sheetName of workbook.SheetNames) {
      try {
        // Skip sheets that might not be clients
        if (sheetName.toLowerCase().includes('template') || 
            sheetName.toLowerCase().includes('example') ||
            sheetName.toLowerCase().includes('instructions')) {
          console.log(`Skipping non-client sheet: ${sheetName}`)
          continue
        }
        
        const worksheet = workbook.Sheets[sheetName]
        
        if (!worksheet) {
          console.log(`Empty sheet: ${sheetName}`)
          continue
        }
        
        // The client name is the sheet name
        const clientName = sheetName.trim()
        
        // Extract data from specific cell positions
        // Based on your description: top left has injuries, followed by goals
        
        // Function to get cell value
        const getCellValue = (address: string) => {
          const cell = worksheet[address]
          if (!cell) return null
          return cell.v ? String(cell.v).trim() : null
        }
        
        // Function to find a value by searching for a label
        const findValueAfterLabel = (label: string) => {
          const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:Z100')
          
          for (let row = range.s.r; row <= Math.min(range.e.r, 20); row++) {
            for (let col = range.s.c; col <= Math.min(range.e.c, 10); col++) {
              const cellAddress = XLSX.utils.encode_cell({ r: row, c: col })
              const cell = worksheet[cellAddress]
              
              if (cell && cell.v) {
                const cellValue = String(cell.v).toLowerCase()
                if (cellValue.includes(label.toLowerCase())) {
                  // Check the cell to the right or below for the value
                  const rightAddress = XLSX.utils.encode_cell({ r: row, c: col + 1 })
                  const belowAddress = XLSX.utils.encode_cell({ r: row + 1, c: col })
                  
                  const rightCell = worksheet[rightAddress]
                  const belowCell = worksheet[belowAddress]
                  
                  if (rightCell && rightCell.v) {
                    return String(rightCell.v).trim()
                  } else if (belowCell && belowCell.v) {
                    return String(belowCell.v).trim()
                  }
                }
              }
            }
          }
          return null
        }
        
        // Try to extract injuries and goals
        let injuries = null
        let goals = null
        
        // Common positions for injuries and goals
        // Try specific cells first (adjust based on your layout)
        injuries = getCellValue('B1') || getCellValue('A2') || findValueAfterLabel('injur')
        goals = getCellValue('B2') || getCellValue('A3') || findValueAfterLabel('goal')
        
        // If not found, try to parse the sheet more thoroughly
        if (!injuries || !goals) {
          // Get all data from the sheet as JSON
          const sheetData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' })
          
          // Look in first few rows for injuries/goals
          for (let i = 0; i < Math.min(sheetData.length, 10); i++) {
            const row = sheetData[i] as any[]
            if (!row) continue
            
            for (let j = 0; j < row.length; j++) {
              const cellValue = String(row[j]).toLowerCase()
              
              if (cellValue.includes('injur') && j + 1 < row.length) {
                injuries = injuries || String(row[j + 1]).trim()
              } else if (cellValue.includes('injur') && i + 1 < sheetData.length) {
                const nextRow = sheetData[i + 1] as any[]
                injuries = injuries || (nextRow[j] ? String(nextRow[j]).trim() : null)
              }
              
              if (cellValue.includes('goal') && j + 1 < row.length) {
                goals = goals || String(row[j + 1]).trim()
              } else if (cellValue.includes('goal') && i + 1 < sheetData.length) {
                const nextRow = sheetData[i + 1] as any[]
                goals = goals || (nextRow[j] ? String(nextRow[j]).trim() : null)
              }
            }
          }
        }
        
        // Create client object
        const client = {
          full_name: clientName,
          email: null, // Not available in this format
          phone: null, // Not available in this format
          goals: goals || 'No goals specified',
          injuries: injuries || 'No injuries reported',
          equipment: [],
          notes: `Imported from sheet: ${sheetName}`,
          user_id: 'default-user'
        }
        
        console.log(`Processing client: ${clientName}`)
        console.log(`  Injuries: ${injuries || 'Not found'}`)
        console.log(`  Goals: ${goals || 'Not found'}`)
        
        // Insert to database
        const { data: newClient, error } = await supabase
          .from('workout_clients')
          .insert(client)
          .select()
          .single()
        
        if (error) {
          console.error(`Failed to insert ${clientName}:`, error)
          errors.push({ client: clientName, error: error.message })
        } else if (newClient) {
          results.push(newClient)
          console.log(`✓ Imported ${clientName}`)
        }
        
      } catch (sheetError: any) {
        console.error(`Error processing sheet ${sheetName}:`, sheetError)
        errors.push({ sheet: sheetName, error: sheetError.message })
      }
    }
    
    return NextResponse.json({
      success: true,
      imported: results.length,
      total: workbook.SheetNames.length,
      clients: results.map(c => c.full_name),
      errors: errors.length > 0 ? errors : undefined,
      message: `Imported ${results.length} clients from ${workbook.SheetNames.length} sheets`
    })
    
  } catch (error: any) {
    console.error('Import error:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to import multi-sheet file',
      suggestion: 'Ensure each sheet/tab represents a client with injuries and goals in the top cells'
    }, { status: 500 })
  }
}