import { describe, it, expect } from 'vitest'
import { signCookie, verifyCookie, getAdminSession } from './auth'

const TEST_PAYLOAD = { userId: 'test-user-id', mustChangePassword: false }

describe('signCookie / verifyCookie', () => {
  it('signed cookie is in base64payload.signature format', async () => {
    const signed = await signCookie(TEST_PAYLOAD)
    expect(signed).toMatch(/^[A-Za-z0-9+/=]+\.[a-f0-9]{64}$/)
  })

  it('verifyCookie returns valid session for a correctly signed cookie', async () => {
    const signed = await signCookie(TEST_PAYLOAD)
    const result = await verifyCookie(signed)
    expect(result).toMatchObject({ valid: true, userId: TEST_PAYLOAD.userId, mustChangePassword: false })
  })

  it('verifyCookie returns { valid: false } for a tampered signature', async () => {
    const signed = await signCookie(TEST_PAYLOAD)
    const tampered = signed.slice(0, -4) + 'aaaa'
    expect(await verifyCookie(tampered)).toEqual({ valid: false })
  })

  it('verifyCookie returns { valid: false } for a tampered payload', async () => {
    const signed = await signCookie(TEST_PAYLOAD)
    const [, sig] = signed.split('.')
    const fakePayload = btoa(JSON.stringify({ userId: 'hacker', mustChangePassword: false }))
    expect(await verifyCookie(`${fakePayload}.${sig}`)).toEqual({ valid: false })
  })

  it('verifyCookie returns { valid: false } for a cookie with no dot', async () => {
    expect(await verifyCookie('nodothere')).toEqual({ valid: false })
  })

  it('verifyCookie returns { valid: false } for an empty string', async () => {
    expect(await verifyCookie('')).toEqual({ valid: false })
  })
})

describe('getAdminSession', () => {
  it('returns valid session when a valid admin_session cookie is present', async () => {
    const signed = await signCookie(TEST_PAYLOAD)
    const req = new Request('http://localhost/', {
      headers: { cookie: `admin_session=${encodeURIComponent(signed)}` },
    })
    const result = await getAdminSession(req)
    expect(result).toMatchObject({ valid: true, userId: TEST_PAYLOAD.userId })
  })

  it('returns { valid: false } when no cookie header is present', async () => {
    const req = new Request('http://localhost/')
    expect(await getAdminSession(req)).toEqual({ valid: false })
  })

  it('returns { valid: false } when admin_session cookie has wrong signature', async () => {
    const req = new Request('http://localhost/', {
      headers: { cookie: 'admin_session=admin.badsignature' },
    })
    expect(await getAdminSession(req)).toEqual({ valid: false })
  })
})
