import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

/**
 * DELETE /api/account — Deletes the authenticated user's account.
 * Cascades to delete all their recipes via FK ON DELETE CASCADE.
 * Clears the session cookie and redirects to the homepage.
 */
export async function DELETE(request: NextRequest) {
  const session = await getAdminSession(request)
  if (!session.valid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { error } = await supabaseAdmin
    .from('users')
    .delete()
    .eq('id', session.userId)

  if (error) {
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 })
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set('admin_session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  })
  return response
}
