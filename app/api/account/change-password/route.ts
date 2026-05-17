import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession, hashPassword, verifyPassword, signCookie } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

/**
 * POST /api/account/change-password
 *
 * First-login flow (mustChangePassword=true in session):
 *   Body: { newPassword, confirmPassword }
 *   Does NOT require current password — user has a temp password from email.
 *
 * Account page flow (mustChangePassword=false):
 *   Body: { currentPassword, newPassword, confirmPassword }
 *   REQUIRES current password verification before accepting the change.
 */
export async function POST(request: NextRequest) {
  const session = await getAdminSession(request)
  if (!session.valid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { currentPassword, newPassword, confirmPassword } = await request.json() as {
    currentPassword?: string
    newPassword?: string
    confirmPassword?: string
  }

  if (!newPassword || newPassword.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }
  if (newPassword !== confirmPassword) {
    return NextResponse.json({ error: 'Passwords do not match' }, { status: 400 })
  }

  // Account page flow: verify current password
  if (!session.mustChangePassword) {
    if (!currentPassword) {
      return NextResponse.json({ error: 'Current password is required' }, { status: 400 })
    }
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('password_hash')
      .eq('id', session.userId)
      .single()

    const ok = user ? await verifyPassword(currentPassword, user.password_hash) : false
    if (!ok) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 })
    }
  }

  const passwordHash = await hashPassword(newPassword)

  const { error } = await supabaseAdmin
    .from('users')
    .update({ password_hash: passwordHash, must_change_password: false })
    .eq('id', session.userId)

  if (error) {
    return NextResponse.json({ error: 'Failed to update password' }, { status: 500 })
  }

  // Refresh session cookie with mustChangePassword=false
  const response = NextResponse.json({ ok: true })
  response.cookies.set(
    'admin_session',
    await signCookie({ userId: session.userId, mustChangePassword: false }),
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
