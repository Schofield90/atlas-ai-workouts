import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Handle large file upload errors properly
  if (request.nextUrl.pathname.startsWith('/api/clients/import')) {
    try {
      // Check content-length header
      const contentLength = request.headers.get('content-length')
      if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) { // 10MB
        return NextResponse.json({
          error: 'File too large',
          maxSize: '10MB',
          actualSize: `${Math.round(parseInt(contentLength) / 1024 / 1024)}MB`,
          needsChunking: true,
          message: 'File exceeds server limits. Please use chunked processing for large files.'
        }, { 
          status: 413,
          headers: {
            'Content-Type': 'application/json',
          }
        })
      }
    } catch (error) {
      // If we can't parse the request, let it proceed normally
      console.warn('Middleware error checking file size:', error)
    }
  }
  
  // No authentication needed - just pass through
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}