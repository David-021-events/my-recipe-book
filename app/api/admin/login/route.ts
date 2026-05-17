import { NextRequest, NextResponse } from 'next/server'
import { signCookie, verifyPassword } from '@/lib/auth'
import { checkRateLimit, recordFailedAttempt } from '@/lib/rate-limit'
import { supabaseAdmin } from '@/lib/supabase'

/**
 * POST /api/admin/login — Authenticates a user by email + password against the users table.
 * Sets a signed HttpOnly session cookie containing userId and mustChangePassword on success.
 * Rate-limited to 5 attempts per IP per 15-minute window.
 */
export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? '127.0.0.1'

  const { allowed, retryAfter } = checkRateLimit(ip)
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many attempts. Try again later.' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    )
  }

  const { email, password } = await request.json() as { email?: string; password?: string }

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
  }

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id, password_hash, must_change_password')
    .eq('email', email.toLowerCase().trim())
    .single()

  const passwordOk = user ? await verifyPassword(password, user.password_hash) : false

  if (!user || !passwordOk) {
    recordFailedAttempt(ip)
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set(
    'admin_session',
    await signCookie({ userId: user.id, mustChangePassword: user.must_change_password }),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    }
  )
  return response
}
