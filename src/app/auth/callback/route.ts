import { NextResponse, type NextRequest } from 'next/server'
import { consumeMagicLink } from '@/lib/magicLink'
import { one } from '@/lib/db'
import { setSessionCookie } from '@/lib/session'

// Magic-link callback (native auth — replaces Supabase OAuth/OTP).
//   GET ?t=<raw-token>&next=<path>
// Consumes the single-use token, resolves the customer by email, sets the
// avibm_session cookie, and redirects. First-time visitors (no customer row
// yet) get a verified-email session and are routed to complete-profile.
//
// Redirects use a RELATIVE Location so they resolve against the browser's
// address (avibm.com) — the app runs behind the Cloudflare tunnel where the
// forwarded Host is localhost:3000, so request.url's origin is unreliable.
function redirect(path: string, status = 307): NextResponse {
  const loc = path.startsWith('/') ? path : '/account'
  return new NextResponse(null, { status, headers: { Location: loc } })
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('t')
  const fallbackNext = searchParams.get('next') || '/account'

  if (!token) {
    return redirect('/account/sign-in?error=missing_token')
  }

  const consumed = await consumeMagicLink(token)
  if (!consumed) {
    return redirect(`/account/sign-in?error=${encodeURIComponent('invalid_or_expired_link')}`)
  }

  const email = consumed.email.toLowerCase()
  const next = consumed.next || fallbackNext

  // Find an existing customer for this email. Some emails have both an active
  // and an archived/legacy row — prefer the active, most-recent, non-deleted.
  const existing = await one<{ id: string }>(
    `SELECT id FROM customers
      WHERE lower(email) = $1 AND pending_deletion = false
      ORDER BY active DESC, archived ASC, created_at DESC
      LIMIT 1`,
    [email],
  )

  if (existing) {
    const res = redirect(next)
    setSessionCookie(res, existing.id, email)
    return res
  }

  // First-time visitor: verified-email session (no customer id yet) →
  // complete-profile, which creates + links the row.
  const res = redirect('/account/complete-profile')
  setSessionCookie(res, '', email)
  return res
}
