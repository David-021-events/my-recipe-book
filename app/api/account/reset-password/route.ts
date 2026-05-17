import { NextRequest, NextResponse } from 'next/server'
import { hashPassword } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  const { token, newPassword, confirmPassword } = await request.json() as {
    token?: string
    newPassword?: string
    confirmPassword?: string
  }

  if (!token) {
    return NextResponse.json({ error: 'Invalid or expired reset link' }, { status: 400 })
  }
  if (!newPassword || newPassword.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }
  if (newPassword !== confirmPassword) {
    return NextResponse.json({ error: 'Passwords do not match' }, { status: 400 })
  }

  const { data: resetToken } = await supabaseAdmin
    .from('password_reset_tokens')
    .select('user_id, expires_at, used_at')
    .eq('token', token)
    .single()

  if (!resetToken || resetToken.used_at || new Date(resetToken.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Invalid or expired reset link' }, { status: 400 })
  }

  const passwordHash = await hashPassword(newPassword)

  // Mark token as used and update password atomically (best-effort; token check above prevents double-use)
  await Promise.all([
    supabaseAdmin
      .from('password_reset_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('token', token),
    supabaseAdmin
      .from('users')
      .update({ password_hash: passwordHash, must_change_password: false })
      .eq('id', resetToken.user_id),
  ])

  return NextResponse.json({ ok: true })
}
