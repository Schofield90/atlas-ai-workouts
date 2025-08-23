import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import mammoth from 'mammoth'
import pdfParse from 'pdf-parse'
import { parse } from 'csv-parse/sync'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const fileType = file.type || file.name.split('.').pop()?.toLowerCase() || ''
    const buffer = Buffer.from(await file.arrayBuffer())
    
    let content = ''
    
    // Handle different file types
    if (fileType.includes('spreadsheet') || fileType.includes('excel') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      // Excel files
      const workbook = XLSX.read(buffer, { type: 'buffer' })
      const sheets = workbook.SheetNames.map(sheetName => {
        const sheet = workbook.Sheets[sheetName]
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 })
        return `Sheet: ${sheetName}\n${JSON.stringify(data, null, 2)}`
      })
      content = sheets.join('\n\n')
      
    } else if (fileType.includes('csv') || file.name.endsWith('.csv')) {
      // CSV files
      const text = buffer.toString('utf-8')
      const records = parse(text, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      })
      content = JSON.stringify(records, null, 2)
      
    } else if (fileType.includes('word') || file.name.endsWith('.docx') || file.name.endsWith('.doc')) {
      // Word documents
      try {
        const result = await mammoth.extractRawText({ buffer })
        content = result.value
      } catch (error) {
        // Fallback for older .doc files
        content = buffer.toString('utf-8').replace(/[^\x20-\x7E\n\r\t]/g, '')
      }
      
    } else if (fileType.includes('pdf') || file.name.endsWith('.pdf')) {
      // PDF files
      try {
        const data = await pdfParse(buffer)
        content = data.text
      } catch (error) {
        return NextResponse.json({ 
          error: 'Failed to parse PDF. Make sure it contains text (not just images).' 
        }, { status: 400 })
      }
      
    } else if (file.name.endsWith('.json')) {
      // JSON files
      try {
        const text = buffer.toString('utf-8')
        const json = JSON.parse(text)
        content = JSON.stringify(json, null, 2)
      } catch (error) {
        content = buffer.toString('utf-8')
      }
      
    } else {
      // Plain text files or unknown types
      content = buffer.toString('utf-8')
    }

    // Clean up content
    content = content
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .trim()

    // Limit content size (500KB of text)
    if (content.length > 500000) {
      content = content.substring(0, 500000) + '\n\n[Content truncated due to size limits]'
    }

    return NextResponse.json({
      success: true,
      content,
      fileName: file.name,
      fileType,
      contentLength: content.length
    })

  } catch (error) {
    console.error('File extraction error:', error)
    return NextResponse.json({ 
      error: 'Failed to extract content from file',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}