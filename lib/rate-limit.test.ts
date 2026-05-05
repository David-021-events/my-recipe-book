import { describe, it, expect, beforeEach, vi } from 'vitest'
import { checkRateLimit, recordFailedAttempt, _resetForTests } from './rate-limit'

beforeEach(() => {
  _resetForTests()
  vi.useRealTimers()
})

describe('checkRateLimit', () => {
  it('allows the first request from a new IP', () => {
    expect(checkRateLimit('1.2.3.4').allowed).toBe(true)
  })

  it('allows up to 5 attempts', () => {
    for (let i = 0; i < 4; i++) checkRateLimit('1.2.3.5')
    expect(checkRateLimit('1.2.3.5').allowed).toBe(true)
  })

  it('blocks after recordFailedAttempt saturates the counter', () => {
    checkRateLimit('1.2.3.6')
    recordFailedAttempt('1.2.3.6')
    const result = checkRateLimit('1.2.3.6')
    expect(result.allowed).toBe(false)
    expect(result.retryAfter).toBeGreaterThan(0)
  })

  it('allows again after the window expires', () => {
    vi.useFakeTimers()
    checkRateLimit('1.2.3.7')
    recordFailedAttempt('1.2.3.7')
    // Advance past the 15-minute window
    vi.advanceTimersByTime(16 * 60 * 1000)
    expect(checkRateLimit('1.2.3.7').allowed).toBe(true)
  })

  it('returns retryAfter in seconds', () => {
    checkRateLimit('1.2.3.8')
    recordFailedAttempt('1.2.3.8')
    const result = checkRateLimit('1.2.3.8')
    expect(result.allowed).toBe(false)
    expect(result.retryAfter).toBeLessThanOrEqual(15 * 60)
  })
})
