type RateLimitEntry = { count: number; resetAt: number }
const store = new Map<string, RateLimitEntry>()

export function checkRateLimit(
  key: string,
  maxAttempts: number,
  windowMs: number
): { allowed: boolean } {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true }
  }

  entry.count++
  if (entry.count > maxAttempts) return { allowed: false }
  return { allowed: true }
}

export function getIP(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}

export function tooManyRequests(message = 'Too many attempts. Please try again later.') {
  return new Response(JSON.stringify({ error: message }), {
    status: 429,
    headers: { 'Content-Type': 'application/json', 'Retry-After': '900' },
  })
}
