import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Check for session cookie
  const session = request.cookies.get('session')
  
  // If accessing dashboard without session, redirect to login
  // if (!session) {
  //   const loginUrl = new URL('/login', request.url)
  //   return NextResponse.redirect(loginUrl)
  // }
  
  // Allow request to proceed
  return NextResponse.next()
}

// Configure middleware to run only on dashboard routes
export const config = {
  matcher: '/dashboard/:path*'
}
