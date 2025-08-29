import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

// This endpoint handles errors from large file uploads and returns proper JSON responses
export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    
    // Check if this is a "Request Entity Too Large" error
    if (body.includes('Request Entity Too Large') || body.includes('413')) {
      return NextResponse.json({
        error: 'File too large',
        code: 413,
        message: 'The uploaded file exceeds the server size limit. Please try a smaller file or use chunked processing.',
        needsChunking: true,
        maxFileSize: '4MB',
        suggestions: [
          'Use a file smaller than 4MB',
          'Split your data into multiple files',
          'Use the chunked processing feature for large files'
        ]
      }, { status: 413 })
    }
    
    // Check for other common upload errors
    if (body.includes('timeout') || body.includes('TIMEOUT')) {
      return NextResponse.json({
        error: 'Upload timeout',
        code: 408,
        message: 'The file upload took too long. Please try a smaller file.',
        needsChunking: true
      }, { status: 408 })
    }
    
    // Generic error response
    return NextResponse.json({
      error: 'Upload error',
      code: 500,
      message: 'An error occurred while uploading the file. Please try again.',
      originalError: body.substring(0, 200) // First 200 characters of error
    }, { status: 500 })
    
  } catch (error: any) {
    return NextResponse.json({
      error: 'Error handler failed',
      code: 500,
      message: 'Unable to process the error response.'
    }, { status: 500 })
  }
}