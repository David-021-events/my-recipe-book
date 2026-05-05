/**
 * Cookie authentication using the Web Crypto API (compatible with Edge Runtime and Node.js).
 * All HMAC operations use SHA-256 via globalThis.crypto.subtle.
 */

const COOKIE_SECRET = process.env.COOKIE_SECRET!

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
 * Signs a cookie value by appending an HMAC-SHA256 signature.
 * @param value - The raw cookie value to sign.
 * @returns The signed cookie string in the format `value.signature`.
 */
export async function signCookie(value: string): Promise<string> {
  return `${value}.${await hmac(value)}`
}

/**
 * Verifies a signed cookie using timing-safe comparison to prevent timing attacks.
 * @param cookie - The signed cookie string in the format `value.signature`.
 * @returns `true` if the signature is valid, `false` otherwise.
 */
export async function verifyCookie(cookie: string): Promise<boolean> {
  const lastDot = cookie.lastIndexOf('.')
  if (lastDot === -1) return false
  const value = cookie.slice(0, lastDot)
  const signature = cookie.slice(lastDot + 1)
  const expected = await hmac(value)
  if (signature.length !== expected.length) return false
  // Timing-safe XOR comparison for hex strings
  let result = 0
  for (let i = 0; i < signature.length; i++) {
    result |= signature.charCodeAt(i) ^ expected.charCodeAt(i)
  }
  return result === 0
}

/**
 * Extracts and verifies the admin session cookie from an incoming Request.
 * @param request - The incoming HTTP Request object.
 * @returns `true` if a valid admin session cookie is present, `false` otherwise.
 */
export async function getAdminSession(request: Request): Promise<boolean> {
  const cookieHeader = request.headers.get('cookie') ?? ''
  const match = cookieHeader.match(/(?:^|;\s*)admin_session=([^;]*)/)
  if (!match) return false
  return verifyCookie(decodeURIComponent(match[1]))
}
