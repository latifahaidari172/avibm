import { type NextRequest, NextResponse } from 'next/server'
import { one } from '@/lib/db'
import { setSessionCookie } from '@/lib/session'
import { verifySso, safeNext } from '@/lib/sso'

// Inbound SSO: an auction-intel user arriving from their nav button. Verify
// the cross-site token, resolve (or stub) the avibm identity by email, set our
// native avibm_session cookie, and land them in their garage.
//
// Mirrors the magic-link callback exactly: an email with an existing avibm
// profile gets a full session; an auction-intel user with no avibm profile yet
// gets a verified-email session (sub='') and is routed to complete-profile —
// same email, same person, just opting into the monitoring product.
//
// Relative Location so it resolves against avibm.com (the app runs behind the
// Cloudflare tunnel where request.url's host is localhost:3000).
function redirect(path: string): NextResponse {
  const loc = path.startsWith('/') && !path.startsWith('//') ? path : '/account'
  return new NextResponse(null, { status: 302, headers: { Location: loc } })
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token') || ''
  const next = safeNext(searchParams.get('next'), '/account')

  const payload = verifySso(token)
  if (!payload?.email) {
    return redirect('/account/sign-in?error=sso')
  }
  const email = payload.email.toLowerCase()

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

  // Signed in on auction-intel, no avibm profile yet → verified-email session,
  // complete-profile creates + links the row.
  const res = redirect('/account/complete-profile')
  setSessionCookie(res, '', email)
  return res
}
