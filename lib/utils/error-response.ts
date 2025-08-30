import { NextResponse } from 'next/server'

export interface ErrorResponse {
  error: string
  code?: string
  details?: string
  suggestion?: string
}

export function createErrorResponse(
  message: string,
  status: number = 500,
  code?: string,
  suggestion?: string
): NextResponse {
  const errorBody: ErrorResponse = {
    error: message,
  }

  if (code) errorBody.code = code
  if (suggestion) errorBody.suggestion = suggestion

  // Never expose internal error details in production
  if (process.env.NODE_ENV === 'development') {
    errorBody.details = message
  }

  return NextResponse.json(errorBody, { 
    status,
    headers: {
      'Content-Type': 'application/json',
      'X-Content-Type-Options': 'nosniff'
    }
  })
}

export function handleApiError(error: unknown): NextResponse {
  // Log error for debugging (but not to client)
  if (process.env.NODE_ENV === 'development') {
    console.error('API Error:', error)
  }

  if (error instanceof Error) {
    // Known error types
    if (error.message.includes('File too large')) {
      return createErrorResponse(
        'File size exceeds limit',
        413,
        'FILE_TOO_LARGE',
        'Please use a smaller file or enable chunked upload'
      )
    }

    if (error.message.includes('Invalid file type')) {
      return createErrorResponse(
        'Invalid file format',
        400,
        'INVALID_FILE_TYPE',
        'Please upload an Excel (.xlsx, .xls) or CSV file'
      )
    }

    if (error.message.includes('timeout')) {
      return createErrorResponse(
        'Request timeout',
        408,
        'TIMEOUT',
        'The file is taking too long to process. Try a smaller file or use chunked upload'
      )
    }

    if (error.message.includes('No client sheets found')) {
      return createErrorResponse(
        'No client data found',
        400,
        'NO_CLIENT_SHEETS',
        'The Excel file does not contain valid client sheets. Ensure each sheet tab represents a client.'
      )
    }

    if (error.message.includes('Multi-sheet import failed')) {
      return createErrorResponse(
        'Multi-sheet processing failed',
        500,
        'MULTI_SHEET_ERROR',
        'Try importing sheets individually or reduce file size'
      )
    }

    if (error.message.includes('Batch insert failed')) {
      return createErrorResponse(
        'Database connection issue',
        503,
        'DB_CONNECTION_ERROR',
        'Please try again in a few moments. If the issue persists, try smaller batches.'
      )
    }

    // Generic error
    return createErrorResponse(
      'An error occurred while processing your request',
      500,
      'INTERNAL_ERROR'
    )
  }

  // Unknown error type
  return createErrorResponse(
    'An unexpected error occurred',
    500,
    'UNKNOWN_ERROR'
  )
}