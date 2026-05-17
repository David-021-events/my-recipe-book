/**
 * Cookie authentication using the Web Crypto API (compatible with Edge Runtime and Node.js).
 * All HMAC operations use SHA-256 via globalThis.crypto.subtle.
 */

const COOKIE_SECRET = process.env.COOKIE_SECRET!

export type SessionResult =
  | { valid: true; userId: string; mustChangePassword: boolean }
  | { valid: false }

async function hmac(value: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = await globalThis.crypto.subtle.importKey(
    'raw',
    encoder.encode(COOKIE_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await globalThis.crypto.subtle.sign('HMAC', key, encoder.encode(value))
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Signs a cookie payload by base64-encoding it and appending an HMAC-SHA256 signature.
 */
export async function signCookie(payload: { userId: string; mustChangePassword: boolean }): Promise<string> {
  const encoded = btoa(JSON.stringify(payload))
  return `${encoded}.${await hmac(encoded)}`
}

/**
 * Verifies a signed cookie and returns the decoded session payload.
 */
export async function verifyCookie(cookie: string): Promise<SessionResult> {
  const lastDot = cookie.lastIndexOf('.')
  if (lastDot === -1) return { valid: false }
  const encoded = cookie.slice(0, lastDot)
  const signature = cookie.slice(lastDot + 1)
  const expected = await hmac(encoded)
  if (signature.length !== expected.length) return { valid: false }
  let diff = 0
  for (let i = 0; i < signature.length; i++) {
    diff |= signature.charCodeAt(i) ^ expected.charCodeAt(i)
  }
  if (diff !== 0) return { valid: false }
  try {
    const payload = JSON.parse(atob(encoded)) as { userId: string; mustChangePassword: boolean }
    return { valid: true, userId: payload.userId, mustChangePassword: payload.mustChangePassword }
  } catch {
    return { valid: false }
  }
}

/**
 * Extracts and verifies the admin session cookie from an incoming Request.
 */
export async function getAdminSession(request: Request): Promise<SessionResult> {
  const cookieHeader = request.headers.get('cookie') ?? ''
  const match = cookieHeader.match(/(?:^|;\s*)admin_session=([^;]*)/)
  if (!match) return { valid: false }
  return verifyCookie(decodeURIComponent(match[1]))
}

/**
 * Reads and verifies the admin session cookie via next/headers — for use in Server Components.
 */
export async function getAdminSessionServer(): Promise<SessionResult> {
  const { cookies } = await import('next/headers')
  const cookieStore = await cookies()
  const cookie = cookieStore.get('admin_session')?.value ?? ''
  return cookie ? verifyCookie(decodeURIComponent(cookie)) : { valid: false }
}

// ── Password hashing (PBKDF2 / SHA-256, edge-compatible) ──────────────────────

export async function hashPassword(password: string): Promise<string> {
  const salt = new Uint8Array(new ArrayBuffer(16))
  globalThis.crypto.getRandomValues(salt)
  const derived = await pbkdf2(password, salt)
  return `pbkdf2:${toHex(salt)}:${toHex(new Uint8Array(derived))}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split(':')
  if (parts.length !== 3 || parts[0] !== 'pbkdf2') return false
  const salt = fromHex(parts[1])
  const expectedHex = parts[2]
  const derived = await pbkdf2(password, salt)
  const derivedHex = toHex(new Uint8Array(derived))
  if (derivedHex.length !== expectedHex.length) return false
  let diff = 0
  for (let i = 0; i < derivedHex.length; i++) {
    diff |= derivedHex.charCodeAt(i) ^ expectedHex.charCodeAt(i)
  }
  return diff === 0
}

async function pbkdf2(password: string, salt: Uint8Array): Promise<ArrayBuffer> {
  const keyMaterial = await globalThis.crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  )
  return globalThis.crypto.subtle.deriveBits(
    // Cast needed: TS types BufferSource as ArrayBufferView<ArrayBuffer> but Uint8Array
    // created from a regular Array has type Uint8Array<ArrayBufferLike> at the type level.
    { name: 'PBKDF2', salt: salt as unknown as BufferSource, iterations: 100_000, hash: 'SHA-256' },
    keyMaterial,
    256
  )
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
}

function fromHex(hex: string): Uint8Array {
  return new Uint8Array((hex.match(/../g) ?? []).map((h) => parseInt(h, 16)))
}
