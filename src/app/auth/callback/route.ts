import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'

// OAuth + magic-link callback. Supabase redirects here after the user
// authenticates with Google/Microsoft/Apple/email-magic-link. We exchange
// the `code` query param for a session cookie, then forward to either
// /account (if the user already has a customer row linked) or
// /account/complete-profile (first-time setup).
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') || '/account'

  if (!code) {
    return NextResponse.redirect(`${origin}/account/sign-in?error=missing_code`)
  }

  const supabase = await createSupabaseServer()
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    return NextResponse.redirect(
      `${origin}/account/sign-in?error=${encodeURIComponent(error.message)}`,
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
