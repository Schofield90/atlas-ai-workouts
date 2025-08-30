import { NextRequest } from 'next/server'

export interface FileValidationResult {
  isValid: boolean
  error?: string
  file?: File
}

export const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB for large multi-sheet client files
export const ALLOWED_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel', // .xls
  'text/csv', // .csv
  'application/csv',
]

export const ALLOWED_EXTENSIONS = ['.xlsx', '.xls', '.csv']

export async function validateExcelFile(
  request: NextRequest
): Promise<FileValidationResult> {
  try {
    const contentType = request.headers.get('content-type')
    if (!contentType?.includes('multipart/form-data')) {
      return {
        isValid: false,
        error: 'Invalid content type. Expected multipart/form-data',
      }
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return {
        isValid: false,
        error: 'No file provided',
      }
    }

    // Check file extension
    const fileName = file.name.toLowerCase()
    const hasValidExtension = ALLOWED_EXTENSIONS.some(ext => fileName.endsWith(ext))
    if (!hasValidExtension) {
      return {
        isValid: false,
        error: `Invalid file extension. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`,
      }
    }

    // Check MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.type) && file.type !== '') {
      // Some browsers don't set MIME type for CSV files
      if (!fileName.endsWith('.csv')) {
        return {
          isValid: false,
          error: `Invalid file type. Please upload an Excel (.xlsx, .xls) or CSV file`,
        }
      }
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return {
        isValid: false,
        error: `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB`,
      }
    }

    // Check if file is empty
    if (file.size === 0) {
      return {
        isValid: false,
        error: 'File is empty',
      }
    }

    return {
      isValid: true,
      file,
    }
  } catch (error) {
    return {
      isValid: false,
      error: 'Failed to validate file',
    }
  }
}

export function sanitizeStringValue(value: any): string {
  if (value === null || value === undefined) return ''
  
  // Convert to string and trim
  const str = String(value).trim()
  
  // Remove any potential SQL injection attempts
  return str
    .replace(/['";\\]/g, '') // Remove quotes and semicolons
    .replace(/--/g, '') // Remove SQL comments
    .replace(/\/\*/g, '') // Remove /* comments
    .replace(/\*\//g, '') // Remove */ comments
    .slice(0, 1000) // Limit length
}

export function sanitizeNumberValue(value: any): number | undefined {
  if (value === null || value === undefined || value === '') return undefined
  
  const num = Number(value)
  if (isNaN(num) || !isFinite(num)) return undefined
  
  // Reasonable bounds for our use case
  if (num < 0 || num > 999999) return undefined
  
  return num
}

export function sanitizeArrayValue(value: any): string[] {
  if (!Array.isArray(value)) {
    if (typeof value === 'string') {
      // Try to parse comma-separated values
      return value.split(',').map(v => sanitizeStringValue(v)).filter(Boolean)
    }
    return []
  }
  
  return value.map(v => sanitizeStringValue(v)).filter(Boolean).slice(0, 100)
}