import { NextRequest, NextResponse } from 'next/server'
import { verifyCookie } from '@/lib/auth'

/**
 * Next.js middleware that guards all `/admin/*` routes.
 * Redirects unauthenticated requests to `/admin/login`.
 * @param request - The incoming Next.js request.
 * @returns A redirect response if unauthenticated, or `NextResponse.next()` to continue.
 */
export function middleware(request: NextRequest): NextResponse {
  const cookie = request.cookies.get('admin_session')?.value ?? ''
  const valid = cookie ? verifyCookie(decodeURIComponent(cookie)) : false

  if (!valid) {
    const loginUrl = new URL('/admin/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
