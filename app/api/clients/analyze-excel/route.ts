import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    console.log('Analyzing Excel file:', file.name, 'Size:', file.size)
    
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    
    // Import xlsx
    const XLSX = require('xlsx')
    
    // Try to read with maximum permissiveness
    let workbook
    try {
      workbook = XLSX.read(buffer, { 
        type: 'buffer',
        cellDates: true,
        cellFormula: false,
        cellHTML: false,
        cellNF: false,
        cellStyles: false,
        cellText: false,
        raw: true,
        dense: false,
        WTF: true
      })
    } catch (error: any) {
      return NextResponse.json({ 
        error: 'Failed to parse Excel file',
        details: error.message,
        suggestion: 'Please ensure the file is a valid Excel file (.xlsx or .xls)'
      }, { status: 400 })
    }
    
    const analysis: any = {
      fileName: file.name,
      fileSize: file.size,
      sheets: [],
      totalRows: 0,
      totalCells: 0
    }
    
    // Analyze each sheet
    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName]
      const sheetAnalysis: any = {
        name: sheetName,
        rows: [],
        headers: [],
        sampleData: [],
        range: null,
        rowCount: 0,
        columnCount: 0
      }
      
      if (worksheet['!ref']) {
        const range = XLSX.utils.decode_range(worksheet['!ref'])
        sheetAnalysis.range = {
          start: { row: range.s.r, col: range.s.c },
          end: { row: range.e.r, col: range.e.c }
        }
        sheetAnalysis.rowCount = range.e.r - range.s.r + 1
        sheetAnalysis.columnCount = range.e.c - range.s.c + 1
        
        // Get headers (first row)
        const headers = []
        for (let col = range.s.c; col <= range.e.c; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: range.s.r, c: col })
          const cell = worksheet[cellAddress]
          headers.push({
            column: XLSX.utils.encode_col(col),
            value: cell ? cell.v : null,
            type: cell ? cell.t : null
          })
        }
        sheetAnalysis.headers = headers
        
        // Get sample data (first 5 rows)
        for (let row = range.s.r; row <= Math.min(range.s.r + 4, range.e.r); row++) {
          const rowData: any = {
            rowNumber: row + 1,
            cells: []
          }
          
          for (let col = range.s.c; col <= range.e.c; col++) {
            const cellAddress = XLSX.utils.encode_cell({ r: row, c: col })
            const cell = worksheet[cellAddress]
            rowData.cells.push({
              column: XLSX.utils.encode_col(col),
              address: cellAddress,
              value: cell ? cell.v : null,
              type: cell ? cell.t : null,
              formula: cell ? cell.f : null
            })
          }
          
          sheetAnalysis.sampleData.push(rowData)
        }
      }
      
      // Try parsing as JSON
      try {
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: false })
        sheetAnalysis.jsonRowCount = jsonData.length
        sheetAnalysis.jsonSample = jsonData.slice(0, 3)
        
        // If we got JSON data, analyze the keys
        if (jsonData.length > 0) {
          sheetAnalysis.jsonKeys = Object.keys(jsonData[0])
        }
      } catch (e) {
        sheetAnalysis.jsonError = 'Failed to parse as JSON'
      }
      
      // Try with raw values
      try {
        const rawData = XLSX.utils.sheet_to_json(worksheet, { raw: true, defval: '' })
        sheetAnalysis.rawRowCount = rawData.length
        sheetAnalysis.rawSample = rawData.slice(0, 3)
        
        if (rawData.length > 0) {
          sheetAnalysis.rawKeys = Object.keys(rawData[0])
        }
      } catch (e) {
        sheetAnalysis.rawError = 'Failed to parse raw data'
      }
      
      // Try CSV export to see structure
      try {
        const csv = XLSX.utils.sheet_to_csv(worksheet)
        const csvLines = csv.split('\n').slice(0, 5)
        sheetAnalysis.csvSample = csvLines
      } catch (e) {
        sheetAnalysis.csvError = 'Failed to export as CSV'
      }
      
      analysis.sheets.push(sheetAnalysis)
      analysis.totalRows += sheetAnalysis.rowCount
      analysis.totalCells += sheetAnalysis.rowCount * sheetAnalysis.columnCount
    }
    
    // Create a detailed report
    const report = {
      success: true,
      analysis,
      recommendations: [] as string[]
    }
    
    // Add recommendations based on analysis
    if (analysis.sheets.length === 0) {
      report.recommendations.push('No sheets found in the Excel file')
    } else {
      const firstSheet = analysis.sheets[0]
      
      if (firstSheet.rowCount === 0) {
        report.recommendations.push('The Excel file appears to be empty')
      } else if (firstSheet.rowCount === 1) {
        report.recommendations.push('Only headers found, no data rows')
      } else {
        report.recommendations.push(`Found ${firstSheet.rowCount} rows and ${firstSheet.columnCount} columns`)
        
        // Check for name columns
        const possibleNameColumns = firstSheet.headers.filter((h: any) => {
          const val = String(h.value || '').toLowerCase()
          return val.includes('name') || val.includes('client') || val.includes('customer')
        })
        
        if (possibleNameColumns.length > 0) {
          report.recommendations.push(`Possible name columns found: ${possibleNameColumns.map((c: any) => c.value).join(', ')}`)
        } else {
          report.recommendations.push('No obvious name column found - first column will be used')
        }
      }
    }
    
    return NextResponse.json(report)
    
  } catch (error: any) {
    console.error('Analysis error:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to analyze file',
      stack: error.stack
    }, { status: 500 })
  }
}