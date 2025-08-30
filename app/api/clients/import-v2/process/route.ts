import { NextRequest } from 'next/server'
import * as XLSX from 'xlsx'
import { createServerClient } from '@/lib/db/server'
import { validateExcelFile, sanitizeStringValue, sanitizeNumberValue, sanitizeArrayValue } from '@/lib/utils/file-validation'
import { createErrorResponse, handleApiError } from '@/lib/utils/error-response'

export const maxDuration = 120

interface ImportOptions {
  sheetName?: string
  columnMapping?: Record<string, string>
  skipRows?: number
  maxRows?: number
  dryRun?: boolean
  processAllSheets?: boolean // New option for multi-sheet processing
}

interface WorkoutClient {
  full_name: string
  email?: string
  phone?: string
  age?: number
  sex?: string
  height_cm?: number
  weight_kg?: number
  goals?: string
  injuries?: string
  equipment?: string[]
  preferences?: any
  notes?: string
  user_id: string
}

export async function POST(request: NextRequest) {
  try {
    // Validate file
    const validation = await validateExcelFile(request)
    if (!validation.isValid || !validation.file) {
      return createErrorResponse(validation.error || 'Invalid file', 400)
    }

    const formData = await request.formData()
    const file = validation.file
    const optionsStr = formData.get('options') as string
    const options: ImportOptions = optionsStr ? JSON.parse(optionsStr) : {}

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Parse Excel file
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true })
    
    let clients: WorkoutClient[] = []
    let errors: Array<{ row: number; sheet?: string; error: string }> = []

    if (options.processAllSheets) {
      // Process all sheets - each sheet is a client
      for (const sheetName of workbook.SheetNames) {
        try {
          const sheetClients = await processSheet(workbook, sheetName, options)
          clients.push(...sheetClients)
        } catch (error) {
          errors.push({
            row: 1,
            sheet: sheetName,
            error: `Failed to process sheet: ${error instanceof Error ? error.message : 'Unknown error'}`
          })
        }
      }
    } else {
      // Process single sheet
      const sheetName = options.sheetName || workbook.SheetNames[0]
      try {
        const sheetClients = await processSheet(workbook, sheetName, options)
        clients.push(...sheetClients)
      } catch (error) {
        errors.push({
          row: 1,
          sheet: sheetName,
          error: `Failed to process sheet: ${error instanceof Error ? error.message : 'Unknown error'}`
        })
      }
    }

    // If dry run, return preview without saving
    if (options.dryRun) {
      return Response.json({
        success: true,
        preview: true,
        clientCount: clients.length,
        clients: clients.slice(0, 5), // Preview first 5
        errors
      })
    }

    // Save to database with optimized batch processing
    const supabase = await createServerClient()
    const results = {
      successful: 0,
      failed: 0,
      errors: errors
    }

    // Process in smaller batches for Supabase (10 instead of default batch size)
    const BATCH_SIZE = 10
    for (let i = 0; i < clients.length; i += BATCH_SIZE) {
      const batch = clients.slice(i, i + BATCH_SIZE)
      
      try {
        const { data, error } = await supabase
          .from('workout_clients')
          .insert(batch)
          .select()
        
        if (error) {
          // Log batch error but continue with other batches
          results.failed += batch.length
          results.errors.push({
            row: i + 1,
            error: `Batch insert failed: ${error.message}`
          })
        } else {
          results.successful += (data?.length || 0)
        }
      } catch (error) {
        results.failed += batch.length
        results.errors.push({
          row: i + 1,
          error: `Batch processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        })
      }
    }

    return Response.json({
      success: results.successful > 0,
      imported: results.successful,
      failed: results.failed,
      total: clients.length,
      errors: results.errors
    })
    
  } catch (error) {
    return handleApiError(error)
  }
}

async function processSheet(
  workbook: XLSX.WorkBook, 
  sheetName: string, 
  options: ImportOptions
): Promise<WorkoutClient[]> {
  const worksheet = workbook.Sheets[sheetName]
  
  if (!worksheet) {
    throw new Error(`Sheet "${sheetName}" not found`)
  }

  // Convert to JSON with row numbers
  const data = XLSX.utils.sheet_to_json(worksheet, { 
    header: 1,
    defval: null,
    blankrows: false
  }) as any[][]
  
  if (data.length === 0) {
    throw new Error('No data found in the Excel sheet')
  }

  // For multi-sheet format: sheet name is client name, look for metadata in header area
  const clientName = sheetName.trim()
  
  // Find where workout data starts (look for Date column)
  let dataStartRow = 0
  let metadataRows = 0
  
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
      const value = String(row[1]).trim()
      
      if (key.includes('membership') || key.includes('goal') || key.includes('type')) {
        metadata[key] = value
      }
    }
  }

  // Get headers and data rows for workout data
  const skipRows = Math.max(options.skipRows || 0, dataStartRow)
  const headers = data[skipRows] || []
  const dataRows = data.slice(skipRows + 1, options.maxRows ? skipRows + 1 + options.maxRows : undefined)
  
  // Create single client record with workout history
  const client: WorkoutClient = {
    full_name: sanitizeStringValue(clientName),
    email: undefined, // Could be extracted from metadata if present
    phone: undefined,
    age: undefined,
    sex: undefined,
    height_cm: undefined,
    weight_kg: undefined,
    goals: sanitizeStringValue(metadata['goal'] || metadata['transformation goal'] || metadata['goals']),
    injuries: undefined,
    equipment: undefined,
    preferences: {
      membershipType: metadata['membership type'] || metadata['membership'],
      workoutHistory: processWorkoutHistory(dataRows, headers)
    },
    notes: `Imported from sheet: ${sheetName}. ${dataRows.length} workout records.`,
    user_id: 'default-user' // TODO: Get from auth context
  }

  return [client]
}

function processWorkoutHistory(dataRows: any[][], headers: any[]): any[] {
  const workoutHistory: any[] = []
  
  for (const row of dataRows) {
    if (!row || row.every(cell => !cell)) continue // Skip empty rows
    
    const record: Record<string, any> = {}
    headers.forEach((header, index) => {
      if (header && row[index] !== null && row[index] !== undefined) {
        const headerStr = String(header).trim().toLowerCase()
        const value = row[index]
        
        // Map common workout fields
        if (headerStr.includes('date')) {
          record.date = value
        } else if (headerStr.includes('workout') && headerStr.includes('completed')) {
          record.completed = value
        } else if (headerStr.includes('type')) {
          record.workoutType = value
        } else {
          record[headerStr] = value
        }
      }
    })
    
    if (Object.keys(record).length > 0) {
      workoutHistory.push(record)
    }
  }
  
  return workoutHistory
}