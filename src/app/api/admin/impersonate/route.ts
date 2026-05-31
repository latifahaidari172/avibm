import { NextResponse, type NextRequest } from 'next/server'
import { one } from '@/lib/db'
import { getAuthToken, unauthorized } from '@/lib/auth'
import { setSessionCookie } from '@/lib/session'

// Admin-only: "sign in as" a customer to view their account exactly as they
// see it. Requires a valid admin Bearer token. Sets an IMPERSONATION
// avibm_session cookie (shorter-lived, flagged imp) on the admin's browser,
// then the admin opens /account in a new tab. Exiting = signing out, which
// clears only this cookie (the admin panel uses a separate Bearer token).
export async function POST(req: NextRequest) {
  const admin = getAuthToken(req)
  if (!admin) return unauthorized()

  const { customer_id } = await req.json().catch(() => ({}))
  if (!customer_id) return NextResponse.json({ error: 'customer_id required' }, { status: 400 })

  const customer = await one<{ id: string; email: string }>(
    'SELECT id, email FROM customers WHERE id = $1',
    [customer_id],
  )
  if (!customer) return NextResponse.json({ error: 'customer not found' }, { status: 404 })

  const res = NextResponse.json({ ok: true, email: customer.email })
  setSessionCookie(res, customer.id, customer.email, true) // imp = true
  return res
}
