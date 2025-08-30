import { NextRequest } from 'next/server'
import * as XLSX from 'xlsx'
import { validateExcelFile } from '@/lib/utils/file-validation'
import { createErrorResponse, handleApiError } from '@/lib/utils/error-response'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    // Validate file
    const validation = await validateExcelFile(request)
    if (!validation.isValid || !validation.file) {
      return createErrorResponse(validation.error || 'Invalid file', 400)
    }

    const file = validation.file
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Parse Excel file
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    
    // Analyze structure - each sheet represents a client with workout data
    const sheets = workbook.SheetNames.map(sheetName => {
        const worksheet = workbook.Sheets[sheetName]
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]
        
        // For client-per-sheet format, sheet name is the client name
        const clientName = sheetName.trim()
        
        // Look for header area in first few rows for client metadata
        let metadataRows = 0
        let dataStartRow = 0
        
        // Find where actual workout data starts (look for "Date" column)
        for (let i = 0; i < Math.min(10, data.length); i++) {
          const row = data[i] || []
          if (row.some(cell => String(cell).toLowerCase().includes('date') || 
                                String(cell).toLowerCase().includes('workout'))) {
            dataStartRow = i
            metadataRows = i
            break
          }
        }
        
        // Extract metadata from header area
        const metadata: Record<string, any> = {}
        for (let i = 0; i < metadataRows; i++) {
          const row = data[i] || []
          if (row.length >= 2 && row[0] && row[1]) {
            const key = String(row[0]).toLowerCase().trim()
            if (key.includes('membership') || key.includes('goal') || key.includes('type')) {
              metadata[key] = String(row[1]).trim()
            }
          }
        }
        
        // Get workout data headers and content
        const headers = data[dataStartRow] || []
        const workoutRows = data.slice(dataStartRow + 1)
        const dataRowCount = workoutRows.length
        
        // Sample workout data (first 3 rows)
        const sampleData = workoutRows.slice(0, 3).map(row => {
          const record: Record<string, any> = {}
          headers.forEach((header, index) => {
            if (header) {
              record[String(header)] = row[index]
            }
          })
          return record
        })
        
        // Detect column types for workout data
        const columnTypes: Record<string, string> = {}
        headers.forEach((header, index) => {
          if (!header) return
          
          let hasNumbers = false
          let hasText = false
          
          for (let i = 0; i < Math.min(10, dataRowCount); i++) {
            const value = workoutRows[i]?.[index]
            if (value !== null && value !== undefined && value !== '') {
              if (typeof value === 'number') {
                hasNumbers = true
              } else {
                hasText = true
              }
            }
          }
          
          columnTypes[String(header)] = hasNumbers && !hasText ? 'number' : 'text'
        })
        
        return {
          name: sheetName,
          clientName,
          clientMetadata: {
            membershipType: metadata['membership type'] || metadata['membership'],
            goals: metadata['goal'] || metadata['transformation goal'] || metadata['goals']
          },
          workoutData: workoutRows,
          headers,
          columnTypes,
          rowCount: dataRowCount,
          sampleData,
          recommendedMapping: suggestWorkoutFieldMapping(headers),
          isClientSheet: true,
          workoutCount: dataRowCount
        }
      })
    
    const analysis = {
      fileName: file.name,
      fileSize: file.size,
      sheets,
      recommendations: {
        importMethod: file.size > 5 * 1024 * 1024 ? 'chunked' : 'direct',
        estimatedProcessingTime: Math.ceil(file.size / (1024 * 1024)) * 2, // Rough estimate: 2s per MB
        hasMultipleSheets: workbook.SheetNames.length > 1,
        isClientPerSheet: true, // This format assumes each sheet is a client
        totalClientsEstimated: workbook.SheetNames.length,
        clientSheets: workbook.SheetNames.length,
        totalWorkouts: sheets.reduce((acc, sheet) => acc + sheet.rowCount, 0)
      }
    }
    
    return Response.json(analysis)
  } catch (error) {
    return handleApiError(error)
  }
}

function suggestWorkoutFieldMapping(headers: any[]): Record<string, string> {
  const mapping: Record<string, string> = {}
  
  // Map workout data field names
  const workoutFieldMappings = {
    date: ['date', 'workout date', 'session date', 'day'],
    workout_completed: ['workout completed', 'completed', 'done', 'finished'],
    workout_type: ['workout type', 'type', 'exercise type', 'session type'],
    duration: ['duration', 'time', 'length', 'minutes'],
    notes: ['notes', 'comments', 'remarks', 'feedback']
  }
  
  headers.forEach((header, index) => {
    const headerLower = String(header).toLowerCase().trim()
    
    for (const [field, patterns] of Object.entries(workoutFieldMappings)) {
      if (patterns.some(pattern => headerLower.includes(pattern))) {
        mapping[String(header)] = field
        break
      }
    }
  })
  
  return mapping
}