import { describe, it, expect } from 'vitest'
import { signCookie, verifyCookie, getAdminSession } from './auth'

describe('signCookie / verifyCookie', () => {
  it('signed cookie is in value.signature format', async () => {
    const signed = await signCookie('admin')
    expect(signed).toMatch(/^admin\.[a-f0-9]{64}$/)
  })

  it('verifyCookie returns true for a valid signed cookie', async () => {
    const signed = await signCookie('admin')
    expect(await verifyCookie(signed)).toBe(true)
  })

  it('verifyCookie returns false for a tampered signature', async () => {
    const signed = await signCookie('admin')
    const tampered = signed.slice(0, -4) + 'aaaa'
    expect(await verifyCookie(tampered)).toBe(false)
  })

  it('verifyCookie returns false for a tampered value', async () => {
    const signed = await signCookie('admin')
    const [, sig] = signed.split('.')
    expect(await verifyCookie(`hacker.${sig}`)).toBe(false)
  })

  it('verifyCookie returns false for a cookie with no dot', async () => {
    expect(await verifyCookie('nodothere')).toBe(false)
  })

  it('verifyCookie returns false for an empty string', async () => {
    expect(await verifyCookie('')).toBe(false)
  })
})

describe('getAdminSession', () => {
  it('returns true when a valid admin_session cookie is present', async () => {
    const signed = await signCookie('admin')
    const req = new Request('http://localhost/', {
      headers: { cookie: `admin_session=${encodeURIComponent(signed)}` },
    })
    expect(await getAdminSession(req)).toBe(true)
  })

  it('returns false when no cookie header is present', async () => {
    const req = new Request('http://localhost/')
    expect(await getAdminSession(req)).toBe(false)
  })

  it('returns false when admin_session cookie has wrong signature', async () => {
    const req = new Request('http://localhost/', {
      headers: { cookie: 'admin_session=admin.badsignature' },
    })
    expect(await getAdminSession(req)).toBe(false)
  })
})
