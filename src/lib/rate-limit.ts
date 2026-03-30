/**
 * Simple in-memory rate limiter (per-process, resets on cold start).
 * Good enough for serverless where each instance is isolated.
 * For multi-instance production, replace with Upstash Redis.
 */

interface Entry { count: number; resetAt: number }
const store = new Map<string, Entry>()

// Periodically clean up expired entries to avoid memory leaks
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of store) {
      if (entry.resetAt < now) store.delete(key)
    }
  }, 60_000)
}

/**
 * @param key      Unique key (e.g. `ip:POST:/api/bookings`)
 * @param limit    Max requests allowed in the window
 * @param windowMs Window duration in milliseconds
 * @returns `{ ok: true }` if allowed, `{ ok: false, retryAfter: number }` if rate-limited
 */
export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfter?: number } {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true }
  }

  entry.count++
  if (entry.count > limit) {
    return { ok: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) }
  }
  return { ok: true }
}
