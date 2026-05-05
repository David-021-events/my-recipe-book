import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/admin/logout — Clears the admin session cookie and redirects to the login page.
 * @param request - The incoming request (used to derive the redirect URL origin).
 */
export async function POST(request: NextRequest) {
  const loginUrl = request.nextUrl.clone()
  loginUrl.pathname = '/admin/login'
  const response = NextResponse.redirect(loginUrl)
  response.cookies.set('admin_session', '', {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  })
  return response
}
