import { NextResponse, type NextRequest } from 'next/server'

// Domains that should 301 to the canonical avibm.com host.
const REDIRECT_HOSTS = new Set([
  'www.avibm.com',
])

// Middleware: canonical-host redirect only. Sessions are now stateless,
// HMAC-signed cookies (lib/session.ts) — no per-request refresh needed, so
// the old Supabase session-refresh step is gone.
export function middleware(request: NextRequest) {
  const host = request.headers.get('host') || ''
  if (REDIRECT_HOSTS.has(host)) {
    const url = new URL(request.url)
    url.host = 'avibm.com'
    url.protocol = 'https:'
    return NextResponse.redirect(url, 301)
  }
  return NextResponse.next()
}

export const config = {
  matcher: [
    // Run on every page + API route except static assets
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
