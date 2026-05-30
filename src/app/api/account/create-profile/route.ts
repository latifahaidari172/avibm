import { NextResponse, type NextRequest } from 'next/server'
import { promises as dns } from 'dns'
import { one, insertRow, updateById } from '@/lib/db'
import { getSession, setSessionCookie } from '@/lib/session'

async function checkEmailMx(email: string): Promise<string | null> {
  const at = email.lastIndexOf('@')
  if (at < 0) return 'Email format invalid.'
  const domain = email.slice(at + 1).trim().toLowerCase()
  if (!domain.includes('.')) return 'Email domain invalid.'
  try {
    const records = await dns.resolveMx(domain)
    if (!records || records.length === 0) return `No mail server found for ${domain}.`
    return null
  } catch (e: any) {
    if (e?.code === 'ENOTFOUND' || e?.code === 'ENODATA') return `No mail server found for ${domain}.`
    return null
  }
}

// First-time setup after a verified-email session: create (or re-link) the
// customer row and upgrade the session cookie to carry the customer id.
export async function POST(req: NextRequest) {
  const session = getSession(req)
  if (!session) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  // If the session already points at a customer that STILL EXISTS, don't
  // duplicate. A stale link (row since removed) falls through and is
  // re-created below.
  if (session.sub) {
    const linked = await one<{ id: string }>('SELECT id FROM customers WHERE id = $1', [session.sub])
    if (linked) return NextResponse.json({ error: 'profile already exists' }, { status: 409 })
  }

  const body = await req.json()
  const email = (body.email || session.email || '').toLowerCase().trim()
  if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 })
  if (!/^04\d{8}$/.test(body.phone || '')) {
    return NextResponse.json({ error: 'Mobile must be 10 digits starting with 04.' }, { status: 400 })
  }
  const mxErr = await checkEmailMx(email)
  if (mxErr) return NextResponse.json({ error: mxErr }, { status: 400 })

  const prefLoc = Array.isArray(body.preferred_locations) ? body.preferred_locations : []

  // Reuse an existing row for this email (admin pre-created, prior signup)
  // — link instead of duplicating.
  const existing = await one<{ id: string }>(
    `SELECT id FROM customers
      WHERE lower(email) = $1 AND pending_deletion = false
      ORDER BY active DESC, archived ASC, created_at DESC
      LIMIT 1`,
    [email],
  )
  let customerId: string

  if (existing) {
    customerId = existing.id
    await updateById('customers', customerId, {
      first_name: body.first_name, last_name: body.last_name,
      phone: body.phone, address: body.address, suburb: body.suburb,
      postcode: body.postcode, crn: body.crn, state: body.state, tier: body.tier,
      active: true, archived: false, preferred_locations: prefLoc,
    })
  } else {
    const row = await insertRow<{ id: string }>('customers', {
      first_name: body.first_name, last_name: body.last_name, email,
      phone: body.phone, address: body.address, suburb: body.suburb, postcode: body.postcode,
      crn: body.crn, state: body.state, tier: body.tier || 'priority',
      active: true, auto_payment_email: true, archived: false, preferred_locations: prefLoc,
    }, 'id')
    customerId = row?.id
    if (!customerId) return NextResponse.json({ error: 'failed to create customer' }, { status: 500 })
  }

  // Upgrade the verified-email session to a full customer session.
  const res = NextResponse.json({ customer_id: customerId })
  setSessionCookie(res, customerId, email)
  return res
}
