import { NextResponse } from 'next/server'
import { verifyState, setSessionCookie, findCustomerIdByEmail } from '@/lib/session'

// Google OAuth2 callback (no Supabase). Exchanges the code server-side, reads
// the verified email from the id_token, then reuses the same find/link-customer
// + session path as magic-link. Relative redirects (proxy-agnostic).
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://avibm.com'

function bounce(path: string) {
  return new NextResponse(null, { status: 307, headers: { Location: path } })
}

function decodeJwtPayload(jwt: string): any {
  return JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString())
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const stateRaw = url.searchParams.get('state')
  const state = stateRaw ? verifyState(stateRaw) : null
  const next = state?.next && String(state.next).startsWith('/') ? state.next : '/account'

  if (url.searchParams.get('error') || !code || !state) {
    return bounce(`/account/sign-in?error=${encodeURIComponent('google_failed')}`)
  }

  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET
  if (!clientId || !clientSecret) return bounce('/account/sign-in?error=google_not_configured')

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: `${SITE_URL}/api/auth/google/callback`,
        grant_type: 'authorization_code',
      }),
    })
    if (!tokenRes.ok) throw new Error('token exchange failed')
    const tok = await tokenRes.json()
    const payload = decodeJwtPayload(tok.id_token)
    const email = (payload.email || '').toLowerCase()
    const verified = payload.email_verified === true || payload.email_verified === 'true'
    if (!email || !verified) {
      return bounce(`/account/sign-in?error=${encodeURIComponent('email_unverified')}`)
    }

    const customerId = await findCustomerIdByEmail(email)
    if (customerId) {
      const res = bounce(next)
      setSessionCookie(res, customerId, email)
      return res
    }
    // No customer yet — verified-email session → complete-profile.
    const res = bounce('/account/complete-profile')
    setSessionCookie(res, '', email)
    return res
  } catch {
    return bounce(`/account/sign-in?error=${encodeURIComponent('google_failed')}`)
  }
}
