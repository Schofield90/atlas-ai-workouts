import { NextResponse, type NextRequest } from 'next/server'

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Handle /p/clients redirect to /clients
  if (pathname.startsWith('/p/clients')) {
    const newPath = pathname.replace('/p/clients', '/clients')
    return NextResponse.redirect(new URL(newPath, request.url))
  }

  // Clean up malformed client IDs in URLs
  const clientMatch = pathname.match(/\/clients\/([^\/]+)/)
  if (clientMatch) {
    const clientId = clientMatch[1]
    
    // If the ID is too long, truncate it and redirect
    if (clientId.length > 36) {
      const cleanId = clientId.substring(0, 36)
      const newPath = pathname.replace(clientId, cleanId)
      console.log(`[Middleware] Cleaning client ID: ${clientId} -> ${cleanId}`)
      return NextResponse.redirect(new URL(newPath, request.url))
    }
    
    // If the ID doesn't match UUID format after cleaning, log it
    if (!UUID_REGEX.test(clientId) && clientId.length === 36) {
      console.warn(`[Middleware] Invalid UUID format detected: ${clientId}`)
    }
  }

  // Clean up malformed workout IDs in URLs
  const workoutMatch = pathname.match(/\/workouts\/([^\/]+)/)
  if (workoutMatch) {
    const workoutId = workoutMatch[1]
    
    // If the ID is too long, truncate it and redirect
    if (workoutId.length > 36) {
      const cleanId = workoutId.substring(0, 36)
      const newPath = pathname.replace(workoutId, cleanId)
      console.log(`[Middleware] Cleaning workout ID: ${workoutId} -> ${cleanId}`)
      return NextResponse.redirect(new URL(newPath, request.url))
    }
  }

  // Handle large file upload errors properly
  if (pathname.startsWith('/api/clients/import')) {
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