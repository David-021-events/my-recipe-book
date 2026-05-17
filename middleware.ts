import { NextRequest, NextResponse } from 'next/server'
import { verifyCookie } from '@/lib/auth'

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const cookie = request.cookies.get('admin_session')?.value ?? ''
  const session = cookie ? await verifyCookie(decodeURIComponent(cookie)) : { valid: false as const }

  if (!session.valid) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/admin/login'
    return NextResponse.redirect(loginUrl)
  }

  if (session.mustChangePassword) {
    const changeUrl = request.nextUrl.clone()
    changeUrl.pathname = '/change-password'
    return NextResponse.redirect(changeUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin', '/admin/((?!login).*)'],
}
