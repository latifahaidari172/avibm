import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { promises as dns } from 'dns'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const h = () => ({
  apikey: serviceKey,
  Authorization: `Bearer ${serviceKey}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
})

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

// First-time post-OAuth setup: create the customer row + link it back
// to the auth user via user_metadata.customer_id.
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  // If they already have a linked customer, don't create a duplicate.
  if (user.user_metadata?.customer_id) {
    return NextResponse.json({ error: 'profile already exists' }, { status: 409 })
  }

  const body = await req.json()
  const email = (body.email || user.email || '').toLowerCase().trim()
  if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 })
  if (!/^04\d{8}$/.test(body.phone || '')) {
    return NextResponse.json({ error: 'Mobile must be 10 digits starting with 04.' }, { status: 400 })
  }
  const mxErr = await checkEmailMx(email)
  if (mxErr) return NextResponse.json({ error: mxErr }, { status: 400 })

  // Reuse an existing customer row if email matches (admin pre-created
  // them, etc.) — link instead of duplicating.
  const findRes = await fetch(
    `${supabaseUrl}/rest/v1/customers?email=eq.${encodeURIComponent(email)}&select=id`,
    { headers: h() },
  )
  const existing = await findRes.json()
  let customerId: string

  if (Array.isArray(existing) && existing.length > 0) {
    customerId = existing[0].id
    // Update existing row with whatever the user just typed
    await fetch(`${supabaseUrl}/rest/v1/customers?id=eq.${customerId}`, {
      method: 'PATCH', headers: h(),
      body: JSON.stringify({
        first_name: body.first_name, last_name: body.last_name,
        phone: body.phone, address: body.address, suburb: body.suburb,
        postcode: body.postcode, crn: body.crn, state: body.state, tier: body.tier,
        active: true, archived: false,
      }),
    })
  } else {
    const cRes = await fetch(`${supabaseUrl}/rest/v1/customers`, {
      method: 'POST', headers: h(),
      body: JSON.stringify({
        first_name: body.first_name, last_name: body.last_name, email,
        phone: body.phone, address: body.address, suburb: body.suburb, postcode: body.postcode,
        crn: body.crn, state: body.state, tier: body.tier || 'priority',
        active: true, auto_payment_email: true, archived: false,
      }),
    })
    if (!cRes.ok) return NextResponse.json({ error: await cRes.text() }, { status: 400 })
    const arr = await cRes.json()
    customerId = arr[0]?.id
    if (!customerId) return NextResponse.json({ error: 'failed to create customer' }, { status: 500 })
  }

  // Link the auth user → customer + stash preferred_locations
  // (customers table doesn't have a locations column; vehicles do).
  const { error: updErr } = await supabase.auth.updateUser({
    data: {
      customer_id: customerId,
      preferred_locations: Array.isArray(body.preferred_locations) ? body.preferred_locations : [],
    },
  })
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })

  return NextResponse.json({ customer_id: customerId })
}
