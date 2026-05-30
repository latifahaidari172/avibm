import { NextResponse } from 'next/server'
import { getSession, getSessionCustomer } from '@/lib/session'

// Lightweight auth probe for client pages (replaces supabase.auth.getUser()).
// 401 when not signed in. When signed in, returns the verified email and the
// linked customer row (customer is null for a verified-email-but-no-profile
// session — drives the complete-profile flow).
export async function GET(request: Request) {
  const s = getSession(request)
  if (!s) return NextResponse.json({ authenticated: false }, { status: 401 })
  const customer = await getSessionCustomer(request)
  return NextResponse.json({ authenticated: true, email: s.email, customer })
}
