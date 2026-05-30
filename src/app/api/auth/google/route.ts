import { NextResponse } from 'next/server'
import { signState } from '@/lib/session'

// Start the native Google OAuth2 flow (no Supabase). Redirects to Google's
// consent screen with a signed CSRF state carrying the post-login `next`.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://avibm.com'

function bounce(path: string) {
  return new NextResponse(null, { status: 307, headers: { Location: path } })
}

export async function GET(request: Request) {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID
  if (!clientId) return bounce('/account/sign-in?error=google_not_configured')

  const next = new URL(request.url).searchParams.get('next') || '/account'
  const state = signState({ next: next.startsWith('/') ? next : '/account' })

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${SITE_URL}/api/auth/google/callback`,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'online',
    prompt: 'select_account',
  })
  return bounce(`https://accounts.google.com/o/oauth2/v2/auth?${params}`)
}
