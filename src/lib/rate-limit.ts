const rateMap = new Map<string, { count: number; resetAt: number }>()

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, val] of rateMap) {
    if (val.resetAt < now) rateMap.delete(key)
  }
}, 60_000)

export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; remaining: number } {
  const now = Date.now()
  const entry = rateMap.get(key)

  if (!entry || entry.resetAt < now) {
    rateMap.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true, remaining: limit - 1 }
  }

  entry.count++
  if (entry.count > limit) {
    return { ok: false, remaining: 0 }
  }

  return { ok: true, remaining: limit - entry.count }
}
