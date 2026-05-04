import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// Domains that should 301 to the canonical avibm.com host.
// Anything matching here returns immediately; the Supabase session
// refresh below only runs for the canonical host.
const REDIRECT_HOSTS = new Set([
  'avibm.vercel.app',
  'www.avibm.com',
])

// Middleware:
//  1. Redirects legacy / www hosts to avibm.com (301, path + query preserved)
//  2. Refreshes the Supabase session cookie on every request to the canonical
//     host so OAuth-signed-in customers don't get silently logged out.
export async function middleware(request: NextRequest) {
  const host = request.headers.get('host') || ''
  if (REDIRECT_HOSTS.has(host)) {
    const url = new URL(request.url)
    url.host = 'avibm.com'
    url.protocol = 'https:'
    return NextResponse.redirect(url, 301)
  }

  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    },
  )

  // Calling getUser() refreshes the session if it's about to expire.
  await supabase.auth.getUser()

  return response
}

export const config = {
  matcher: [
    // Run on every page + API route except static assets
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
