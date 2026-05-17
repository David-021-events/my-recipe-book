import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const ALWAYS_OK = NextResponse.json({
  message: "If that email is registered, you'll receive a link shortly.",
})

export async function POST(request: NextRequest) {
  const { email } = await request.json() as { email?: string }

  if (!email) return ALWAYS_OK

  const normalised = email.toLowerCase().trim()

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('email', normalised)
    .single()

  // Always return the same response regardless of whether the email exists
  if (!user) return ALWAYS_OK

  const token = toHex(globalThis.crypto.getRandomValues(new Uint8Array(32)))
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()

  await supabaseAdmin.from('password_reset_tokens').insert({
    token,
    user_id: user.id,
    expires_at: expiresAt,
  })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://your-app.vercel.app'
  const resetLink = `${appUrl}/reset-password?token=${token}`

  await sendResetEmail(normalised, resetLink).catch((err) => {
    console.error('[forgot-password] email failed:', err)
  })

  return ALWAYS_OK
}

async function sendResetEmail(email: string, resetLink: string): Promise<void> {
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) return

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'My Recipe Book <noreply@myjamm.com>',
      to: [email],
      subject: 'Reset your Recipe Book password',
      html: `
        <p>We received a request to reset your password.</p>
        <p><a href="${resetLink}">Reset your password</a></p>
        <p>This link expires in 1 hour. If you didn't request a reset, you can ignore this email.</p>
      `,
    }),
  })

  if (!res.ok) throw new Error(`Resend API error: ${res.status}`)
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
}
