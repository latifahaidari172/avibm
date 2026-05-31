import { type NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { signSso, AUCTION_INTEL_API, AUCTION_INTEL_SITE, safeNext } from '@/lib/sso'

// Outbound SSO: hand the signed-in avibm user off to auction-intel, already
// signed in. Opened in a new tab from the avibm nav button. Mints a fresh
// 60-second token (so a long-open page can't leak a usable one) and bounces to
// auction-intel's inbound SSO endpoint, which sets its own session.
//
// Not signed in → just send them to auction-intel (cross-promo); the worst
// case is they land on its sign-in/home, never an error.
export async function GET(request: NextRequest) {
  const next = safeNext(new URL(request.url).searchParams.get('next'), '/dashboard')
  const session = getSession(request)
  if (!session?.email) {
    return NextResponse.redirect(AUCTION_INTEL_SITE, 302)
  }
  const token = signSso(session.email, 'avibm')
  const url = `${AUCTION_INTEL_API}/api/public/auth/sso`
    + `?token=${encodeURIComponent(token)}&next=${encodeURIComponent(next)}`
  return NextResponse.redirect(url, 302)
}
