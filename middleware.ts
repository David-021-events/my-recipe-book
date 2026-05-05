import { NextRequest, NextResponse } from 'next/server'
import { verifyCookie } from '@/lib/auth'

/**
 * Next.js middleware that guards all `/admin/*` routes (excluding `/admin/login`).
 * Redirects unauthenticated requests to `/admin/login`.
 * @param request - The incoming Next.js request.
 * @returns A redirect response if unauthenticated, or `NextResponse.next()` to continue.
 */
export async function middleware(request: NextRequest): Promise<NextResponse> {
  const cookie = request.cookies.get('admin_session')?.value ?? ''
  const valid = cookie ? await verifyCookie(decodeURIComponent(cookie)) : false

  if (!valid) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/admin/login'
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin', '/admin/((?!login).*)'],
}
