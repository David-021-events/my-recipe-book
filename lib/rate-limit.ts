const attempts = new Map<string, { count: number; resetAt: number }>()

/** Clears all rate limit state. For use in tests only. */
export function _resetForTests(): void {
  attempts.clear()
}

const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000 // 15 minutes

/**
 * Checks whether the given IP address is within the allowed login attempt rate limit.
 * Expired entries are pruned on each call. Increments the attempt counter if allowed.
 * @param ip - The client IP address to check.
 * @returns `{ allowed: true }` if the request is permitted, or `{ allowed: false, retryAfter }` (seconds) if rate-limited.
 */
export function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now()

  // Clear expired entries
  for (const [key, entry] of attempts) {
    if (entry.resetAt < now) attempts.delete(key)
  }

  const entry = attempts.get(ip)

  if (!entry) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return { allowed: true }
  }

  if (entry.count >= MAX_ATTEMPTS) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000)
    return { allowed: false, retryAfter }
  }

  entry.count++
  return { allowed: true }
}

/**
 * Immediately saturates the rate-limit counter for the given IP to MAX_ATTEMPTS,
 * ensuring subsequent requests are blocked for the remainder of the window.
 * @param ip - The client IP address that failed authentication.
 */
export function recordFailedAttempt(ip: string): void {
  const now = Date.now()
  const entry = attempts.get(ip)
  if (entry) {
    entry.count = Math.max(entry.count, MAX_ATTEMPTS)
  } else {
    attempts.set(ip, { count: MAX_ATTEMPTS, resetAt: now + WINDOW_MS })
  }
}
