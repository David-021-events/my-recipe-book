import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { signCookie } from '@/lib/auth'
import { checkRateLimit, recordFailedAttempt } from '@/lib/rate-limit'

/**
 * POST /api/admin/login — Authenticates the admin user with a plaintext password
 * compared via constant-time equality. Sets a signed, HttpOnly session cookie on success.
 * Rate-limited to 5 attempts per IP per 15-minute window.
 * @param request - The incoming request containing `{ password: string }` in the JSON body.
 */
export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? '127.0.0.1'

  const { allowed, retryAfter } = checkRateLimit(ip)
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many attempts. Try again later.' },
      {
        status: 429,
        headers: { 'Retry-After': String(retryAfter) },
      }
    )
  }

  const { password } = await request.json()

  const submitted = Buffer.from(password ?? '')
  const validPasswords = [process.env.ADMIN_PASSWORD, process.env.MOM_PASSWORD].filter(
    Boolean
  ) as string[]

  let valid = validPasswords.some((pw) => {
    const expected = Buffer.from(pw)
    return submitted.length === expected.length && crypto.timingSafeEqual(submitted, expected)
  })

  if (!valid) {
    recordFailedAttempt(ip)
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set('admin_session', await signCookie('admin'), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  })
  return response
}
