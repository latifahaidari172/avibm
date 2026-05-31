import { createHmac, timingSafeEqual } from 'crypto'

// Cross-site single-sign-on token shared between avibm.com and
// auction-intel.com. The two sites are different registrable domains, so a
// session cookie can't span both — instead the site you're signed into mints
// a tiny, short-lived signed token carrying your email, and hands it to the
// other site (in a new tab), which verifies it and mints its OWN native
// session. One login, one email, both sites.
//
// Signed with SSO_SHARED_SECRET — a DEDICATED secret set identically on both
// sites (NOT either site's own session secret, which stay independent). The
// wire format (base64url(payload).base64url(hmac)) and the verification
// (re-hash the received body string) match auction-intel's _sign/_verify
// byte-for-byte, so a token minted on one side verifies on the other.
const SSO_TTL_S = 60 // tokens are used within a couple of seconds of a click

const ssoSecret = () => {
  const s = process.env.SSO_SHARED_SECRET
  if (!s) throw new Error('SSO_SHARED_SECRET env var is not set')
  return s
}

export interface SsoPayload {
  email: string
  iss: string // 'avibm' | 'auction-intel' — informational
  exp: number // unix seconds
}

export function signSso(email: string, iss = 'avibm'): string {
  const payload: SsoPayload = {
    email: email.toLowerCase(),
    iss,
    exp: Math.floor(Date.now() / 1000) + SSO_TTL_S,
  }
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig = createHmac('sha256', ssoSecret()).update(body).digest('base64url')
  return `${body}.${sig}`
}

export function verifySso(token: string): SsoPayload | null {
  try {
    const [body, sig] = token.split('.')
    if (!body || !sig) return null
    const expected = createHmac('sha256', ssoSecret()).update(body).digest('base64url')
    const a = Buffer.from(sig), b = Buffer.from(expected)
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as SsoPayload
    if (!payload.email || !payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null
    return payload
  } catch {
    return null
  }
}

// Where each site lives. auction-intel's public API is served from the admin
// host (Cloudflare-exempt for /api/public/*); its consumer pages are on the
// apex.
export const AUCTION_INTEL_API = 'https://admin.auction-intel.com'
export const AUCTION_INTEL_SITE = 'https://auction-intel.com'

// Only allow relative same-site redirect targets (no open-redirect).
export function safeNext(next: string | null | undefined, fallback: string): string {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : fallback
}
