import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    
    const clients = []
    const skippedSheets = []
    
    // Process each sheet as a client
    for (const sheetName of workbook.SheetNames) {
      // Skip master/template sheets
      if (sheetName.toLowerCase().includes('master') || 
          sheetName.toLowerCase().includes('copy') ||
          sheetName.toLowerCase().includes('template')) {
        skippedSheets.push(sheetName)
        continue
      }
      
      const sheet = workbook.Sheets[sheetName]
      const data = XLSX.utils.sheet_to_json(sheet, { 
        header: 1,
        defval: '',
        blankrows: false 
      }) as any[][]
      
      if (!data || data.length === 0) {
        continue
      }
      
      // Extract client information from specific cells
      // A1: Injuries/limitations
      // C1: Goals  
      // D1: Membership type
      // E1: Additional info (if exists)
      
      const injuries = data[0]?.[0]?.toString() || '' // A1
      const goals = data[0]?.[2]?.toString() || '' // C1
      const membership = data[0]?.[3]?.toString() || '' // D1
      const additionalInfo = data[0]?.[4]?.toString() || '' // E1
      
      // Extract workout history (rows 2 onwards)
      const workoutHistory = []
      for (let i = 1; i < Math.min(data.length, 20); i++) { // Limit to first 20 rows for notes
        const row = data[i]
        if (row && row[0]) { // Check if date column exists
          const date = row[0]
          const workout = row[1]
          if (date && workout) {
            workoutHistory.push(`${date}: ${workout}`)
          }
        }
      }
      
      // Clean up the extracted data
      const cleanedInjuries = injuries.replace(/injuries?:?/gi, '').trim()
      const cleanedGoals = goals.replace(/goals?:?/gi, '').trim()
      
      // Build notes from workout history
      let notes = ''
      if (membership) {
        notes += `Membership: ${membership}\n`
      }
      if (additionalInfo) {
        notes += `${additionalInfo}\n`
      }
      if (workoutHistory.length > 0) {
        notes += `\nRecent Workouts:\n${workoutHistory.slice(0, 5).join('\n')}`
      }
      
      const client = {
        id: `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        full_name: sheetName.trim(),
        email: '', // Not in the spreadsheet
        phone: '', // Not in the spreadsheet
        goals: cleanedGoals,
        injuries: cleanedInjuries,
        equipment: '', // Could be extracted from workout descriptions
        notes: notes.trim(),
        created_at: new Date().toISOString()
      }
      
      // Only add if we have a valid name
      if (client.full_name && !client.full_name.toLowerCase().includes('sheet')) {
        clients.push(client)
      }
    }
    
    if (clients.length === 0) {
      return NextResponse.json({ 
        error: 'No valid client sheets found in Excel file',
        details: `Processed ${workbook.SheetNames.length} sheets, skipped: ${skippedSheets.join(', ')}`
      }, { status: 400 })
    }
    
    return NextResponse.json({
      success: true,
      clients,
      message: `Successfully imported ${clients.length} clients from Excel`,
      debug: {
        totalSheets: workbook.SheetNames.length,
        processedClients: clients.length,
        skippedSheets: skippedSheets,
        sheetNames: workbook.SheetNames
      }
    })

  } catch (error) {
    console.error('Excel import error:', error)
    return NextResponse.json({ 
      error: 'Failed to parse Excel file',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}