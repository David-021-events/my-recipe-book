import { NextRequest, NextResponse } from 'next/server'
import { hashPassword } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

// Lemon Squeezy retries on non-2xx. Raw body must be read before any JSON parsing
// so signature verification uses the exact bytes LS signed.

const WEBHOOK_SECRET = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET!

async function verifySignature(rawBody: string, signature: string | null): Promise<boolean> {
  if (!signature) return false
  const encoder = new TextEncoder()
  const key = await globalThis.crypto.subtle.importKey(
    'raw',
    encoder.encode(WEBHOOK_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await globalThis.crypto.subtle.sign('HMAC', key, encoder.encode(rawBody))
  const expected = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  if (expected.length !== signature.length) return false
  let diff = 0
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i)
  }
  return diff === 0
}

function generateTempPassword(length = 16): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(length))
  return Array.from(bytes).map((b) => chars[b % chars.length]).join('')
}

export async function POST(request: NextRequest) {
  // 1. Read raw body first — must come before any JSON parsing
  const rawBody = await request.text()
  const signature = request.headers.get('x-signature')

  // 2. Verify signature
  const valid = await verifySignature(rawBody, signature)
  if (!valid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // 3. Parse payload
  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Only handle order_created events
  const eventName = (payload.meta as Record<string, unknown>)?.event_name
  if (eventName !== 'order_created') {
    return NextResponse.json({ ok: true })
  }

  const data = payload.data as Record<string, unknown>
  const orderId = String(data?.id ?? '')
  const attrs = data?.attributes as Record<string, unknown>
  const email = String(attrs?.user_email ?? '').toLowerCase().trim()

  if (!orderId || !email) {
    return NextResponse.json({ error: 'Missing order id or email' }, { status: 400 })
  }

  // 4. Idempotency — return 200 if this order was already processed
  const { data: existing } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('lemon_squeezy_order_id', orderId)
    .single()

  if (existing) {
    return NextResponse.json({ ok: true })
  }

  // 5. Create user account
  const tempPassword = generateTempPassword()
  const passwordHash = await hashPassword(tempPassword)

  const { data: newUser, error: insertError } = await supabaseAdmin
    .from('users')
    .insert({
      email,
      password_hash: passwordHash,
      must_change_password: true,
      lemon_squeezy_order_id: orderId,
    })
    .select('id, email')
    .single()

  if (insertError || !newUser) {
    console.error('[webhook/lemon-squeezy] insert error:', insertError?.message)
    return NextResponse.json({ error: 'Account creation failed' }, { status: 500 })
  }

  // 6. Send welcome email — see ticket 021-93 (blocked on email template approval)
  await sendWelcomeEmail(newUser.email, tempPassword).catch((err) => {
    // Log but don't fail the webhook — Lemon Squeezy would retry and create a duplicate
    console.error('[webhook/lemon-squeezy] welcome email failed:', err)
  })

  return NextResponse.json({ ok: true })
}

async function sendWelcomeEmail(email: string, tempPassword: string): Promise<void> {
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    console.warn('[webhook/lemon-squeezy] RESEND_API_KEY not set — skipping welcome email')
    return
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://your-app.vercel.app'

  // TODO (021-93): Replace body with approved email template before launch.
  // Current copy is a placeholder — must not ship without design/copy sign-off.
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'My Recipe Book <noreply@your-domain.com>',
      to: [email],
      subject: 'Your Recipe Book is ready',
      html: `
        <p>Hi there,</p>
        <p>Your Recipe Book is ready. Sign in with your temporary password below, then set a new one.</p>
        <p><strong>App:</strong> <a href="${appUrl}">${appUrl}</a></p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Temporary password:</strong> ${tempPassword}</p>
        <p><strong>To add to your home screen on iPhone:</strong><br>
        1. Open the link above in Safari<br>
        2. Tap the share icon → "Add to Home Screen"</p>
        <p>If you don't see this email, check your spam folder.</p>
      `,
    }),
  })

  if (!res.ok) {
    throw new Error(`Resend API error: ${res.status}`)
  }
}
