import { NextResponse } from 'next/server'
import { issueMagicLink } from '@/lib/magicLink'
import { checkRateLimit, getIP, tooManyRequests } from '@/lib/rateLimit'

// Request a sign-in link (replaces Supabase signInWithOtp).
// Always responds { ok: true } on a valid-looking email to avoid leaking
// whether an account exists. Rate-limited per IP and per email.
export async function POST(request: Request) {
  const ip = getIP(request)
  if (!checkRateLimit(`magic-ip:${ip}`, 10, 60 * 60 * 1000).allowed) {
    return tooManyRequests()
  }

  let body: any = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }
  const email = String(body.email || '').trim().toLowerCase()
  const next = typeof body.next === 'string' ? body.next : '/account'

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: 'invalid_email' }, { status: 400 })
  }

  // Per-email 60s cooldown.
  if (!checkRateLimit(`magic-email:${email}`, 1, 60 * 1000).allowed) {
    return NextResponse.json({ ok: true }) // silently throttle
  }

  try {
    await issueMagicLink(email, next)
  } catch (e) {
    console.error('[auth/magic-link] send failed:', e)
    return NextResponse.json({ error: 'send_failed' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
