import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Basic file info
    const fileInfo = {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified
    }
    
    // Read file as text to see if it's CSV
    const text = await file.text()
    const isCSV = file.name.toLowerCase().endsWith('.csv') || text.includes(',')
    
    if (isCSV) {
      // Process as CSV
      const lines = text.split('\n').filter(line => line.trim())
      const headers = lines[0]?.split(',').map(h => h.trim())
      
      return NextResponse.json({
        success: true,
        fileInfo,
        format: 'CSV',
        headers,
        rowCount: lines.length - 1,
        sampleRows: lines.slice(0, 5)
      })
    }
    
    // Try to process as Excel
    try {
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      
      // Check if xlsx is available
      let XLSX
      try {
        XLSX = require('xlsx')
      } catch (e) {
        return NextResponse.json({
          error: 'XLSX library not available',
          fileInfo,
          suggestion: 'Please convert your Excel file to CSV format and try again'
        }, { status: 500 })
      }
      
      // Try to read the Excel file
      const workbook = XLSX.read(buffer, { 
        type: 'buffer',
        raw: true,
        WTF: true
      })
      
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      
      // Get basic info
      const range = worksheet['!ref'] ? XLSX.utils.decode_range(worksheet['!ref']) : null
      
      // Try to get CSV representation
      const csv = XLSX.utils.sheet_to_csv(worksheet)
      const csvLines = csv.split('\n').slice(0, 10)
      
      return NextResponse.json({
        success: true,
        fileInfo,
        format: 'Excel',
        sheetName,
        range,
        csvPreview: csvLines,
        sheetNames: workbook.SheetNames
      })
      
    } catch (xlsxError: any) {
      // If Excel parsing fails, show the raw content
      const preview = text.substring(0, 1000)
      
      return NextResponse.json({
        error: 'Failed to parse as Excel',
        fileInfo,
        xlsxError: xlsxError.message,
        rawPreview: preview,
        suggestion: 'File may be corrupted or in an unsupported format. Try saving as CSV.'
      }, { status: 400 })
    }
    
  } catch (error: any) {
    return NextResponse.json({ 
      error: 'Server error',
      message: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}