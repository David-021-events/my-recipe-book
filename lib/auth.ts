import crypto from 'crypto'

const COOKIE_SECRET = process.env.COOKIE_SECRET!

function hmac(value: string): string {
  return crypto.createHmac('sha256', COOKIE_SECRET).update(value).digest('hex')
}

/**
 * Hashes a plaintext password using HMAC-SHA256 with the COOKIE_SECRET.
 * @param password - The plaintext password to hash.
 * @returns The hex-encoded HMAC digest.
 */
export function hashPassword(password: string): string {
  return crypto.createHmac('sha256', COOKIE_SECRET).update(password).digest('hex')
}

/**
 * Signs a cookie value by appending an HMAC-SHA256 signature.
 * @param value - The raw cookie value to sign.
 * @returns The signed cookie string in the format `value.signature`.
 */
export function signCookie(value: string): string {
  return `${value}.${hmac(value)}`
}

/**
 * Verifies a signed cookie using constant-time comparison to prevent timing attacks.
 * @param cookie - The signed cookie string in the format `value.signature`.
 * @returns `true` if the signature is valid, `false` otherwise.
 */
export function verifyCookie(cookie: string): boolean {
  const lastDot = cookie.lastIndexOf('.')
  if (lastDot === -1) return false
  const value = cookie.slice(0, lastDot)
  const signature = cookie.slice(lastDot + 1)
  const expected = hmac(value)
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  } catch {
    return false
  }
}

/**
 * Extracts and verifies the admin session cookie from an incoming Request.
 * @param request - The incoming HTTP Request object.
 * @returns `true` if a valid admin session cookie is present, `false` otherwise.
 */
export function getAdminSession(request: Request): boolean {
  const cookieHeader = request.headers.get('cookie') ?? ''
  const match = cookieHeader.match(/(?:^|;\s*)admin_session=([^;]*)/)
  if (!match) return false
  return verifyCookie(decodeURIComponent(match[1]))
}
