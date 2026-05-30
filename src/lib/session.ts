import { createHmac } from 'crypto'
import { NextResponse } from 'next/server'
import { one } from '@/lib/db'

// Native AVIBM customer session — replaces Supabase Auth. Compact HMAC token
// (same shape as the admin token in lib/auth.ts), stored in a host-only
// `avibm_session` cookie bound to avibm.com. Independent secret from
// auction-intel's ai_session — the two sites never share auth.
export const SESSION_COOKIE = 'avibm_session'
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30 // 30 days (seconds)

export const SESSION_COOKIE_OPTS = {
  httpOnly: true,
  secure: true,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: SESSION_MAX_AGE,
}

const getSecret = () => {
  const s = process.env.PUBLIC_AUTH_SECRET
  if (!s) throw new Error('PUBLIC_AUTH_SECRET env var is not set')
  return s
}

export interface SessionPayload {
  sub: string // customer id ('' for a verified-email-but-no-profile-yet session)
  email: string
  exp: number // unix seconds
}

export function signSession(customerId: string, email: string): string {
  const payload: SessionPayload = {
    sub: customerId,
    email,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE,
  }
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig = createHmac('sha256', getSecret()).update(body).digest('base64url')
  return `${body}.${sig}`
}

export function verifySession(token: string): SessionPayload | null {
  try {
    const [body, sig] = token.split('.')
    if (!body || !sig) return null
    const expected = createHmac('sha256', getSecret()).update(body).digest('base64url')
    if (sig !== expected) return null
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as SessionPayload
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null
    return payload
  } catch {
    return null
  }
}

// Read + verify the session from the Next cookies() store (server components
// + server actions, where there's no Request object).
export async function getSessionFromCookies(): Promise<SessionPayload | null> {
  const { cookies } = await import('next/headers')
  const store = await cookies()
  const v = store.get(SESSION_COOKIE)?.value
  if (!v) return null
  return verifySession(v)
}

// Read + verify the session cookie straight off the incoming request.
export function getSession(request: Request): SessionPayload | null {
  const cookie = request.headers.get('cookie') || ''
  const m = cookie.match(/(?:^|;\s*)avibm_session=([^;]+)/)
  if (!m) return null
  return verifySession(decodeURIComponent(m[1]))
}

// Resolve the signed-in customer row, or null. Replaces supabase.auth.getUser()
// + user_metadata.customer_id lookups.
export async function getSessionCustomer<T = any>(request: Request): Promise<T | null> {
  const s = getSession(request)
  if (!s?.sub) return null
  return await one<T>('SELECT * FROM customers WHERE id = $1', [s.sub])
}

// Resolve a customer id by email (prefer active, non-deleted, most-recent).
// Shared by the magic-link + Google callbacks.
export async function findCustomerIdByEmail(email: string): Promise<string | null> {
  const row = await one<{ id: string }>(
    `SELECT id FROM customers
      WHERE lower(email) = $1 AND pending_deletion = false
      ORDER BY active DESC, archived ASC, created_at DESC
      LIMIT 1`,
    [email.toLowerCase()],
  )
  return row?.id ?? null
}

// Short-lived signed CSRF state for the OAuth round-trip (carries `next`).
export function signState(data: Record<string, any>): string {
  const body = Buffer.from(
    JSON.stringify({ ...data, exp: Math.floor(Date.now() / 1000) + 600 }),
  ).toString('base64url')
  const sig = createHmac('sha256', getSecret()).update(body).digest('base64url')
  return `${body}.${sig}`
}

export function verifyState(token: string): Record<string, any> | null {
  try {
    const [body, sig] = token.split('.')
    if (!body || !sig) return null
    const expected = createHmac('sha256', getSecret()).update(body).digest('base64url')
    if (sig !== expected) return null
    const p = JSON.parse(Buffer.from(body, 'base64url').toString())
    if (!p.exp || p.exp < Math.floor(Date.now() / 1000)) return null
    return p
  } catch {
    return null
  }
}

// Set / clear the session cookie on a NextResponse (route handlers).
export function setSessionCookie(res: NextResponse, customerId: string, email: string): void {
  res.cookies.set(SESSION_COOKIE, signSession(customerId, email), SESSION_COOKIE_OPTS)
}

export function clearSessionCookie(res: NextResponse): void {
  res.cookies.set(SESSION_COOKIE, '', { ...SESSION_COOKIE_OPTS, maxAge: 0 })
}
