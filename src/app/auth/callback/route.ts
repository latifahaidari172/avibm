import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'

// OAuth + magic-link callback. Supports two flows:
//
//   PKCE (Google OAuth)    : ?code=xxx
//      -> exchangeCodeForSession(code) — needs the code_verifier cookie
//         that the browser client stored when signInWithOAuth was called.
//
//   Email OTP (magic link) : ?token_hash=xxx&type=magiclink|email|recovery
//      -> verifyOtp({ token_hash, type }) — server-side, NO verifier
//         cookie required. Survives across browsers/devices, doesn't
//         break if cookies were cleared, doesn't depend on the email
//         being clicked in the same browser the link was requested in.
//
// We previously only handled `code`, which meant magic links failed
// with "PKCE code verifier not found in storage" whenever the cookie
// went missing (cleared cookies, cross-device click, browser preview,
// 3rd-party-cookie blocking). Switching the magic-link email template
// to point here with ?token_hash=... bypasses that whole class of bug.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const otpType = searchParams.get('type')
  const next = searchParams.get('next') || '/account'

  const supabase = await createSupabaseServer()

  let authError: string | null = null

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) authError = error.message
  } else if (tokenHash && otpType) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: otpType as 'email' | 'magiclink' | 'recovery' | 'invite' | 'signup',
    })
    if (error) authError = error.message
  } else {
    authError = 'missing_code_and_token'
  }

  if (authError) {
    return NextResponse.redirect(
      `${origin}/account/sign-in?error=${encodeURIComponent(authError)}`,
    )
  }

  // After session is established, decide where to send them.
  const { data: { user } } = await supabase.auth.getUser()
  const linkedCustomerId = user?.user_metadata?.customer_id as string | undefined

  if (linkedCustomerId) {
    return NextResponse.redirect(`${origin}${next}`)
  }
  // First-time visitor: route to profile-completion which writes the
  // customer row and links it via user_metadata.customer_id.
  return NextResponse.redirect(`${origin}/account/complete-profile`)
}
