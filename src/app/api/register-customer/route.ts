import { NextRequest, NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY!

const headers = () => ({
  'apikey':        serviceKey,
  'Authorization': `Bearer ${serviceKey}`,
  'Content-Type':  'application/json',
  'Prefer':        'return=representation',
})


import { promises as dns } from 'dns'

// Returns null if the email's domain has at least one MX record.
// Returns an error string if the domain doesn't resolve or has no MX.
async function checkEmailMx(email: string): Promise<string | null> {
  const at = email.lastIndexOf('@')
  if (at < 0) return 'Email format invalid.'
  const domain = email.slice(at + 1).trim().toLowerCase()
  if (!domain || !domain.includes('.')) return 'Email domain invalid.'
  try {
    const records = await dns.resolveMx(domain)
    if (!records || records.length === 0) return `No mail server found for ${domain}.`
    return null
  } catch (e: any) {
    const code = e?.code || ''
    if (code === 'ENOTFOUND' || code === 'ENODATA') {
      return `No mail server found for ${domain}. Did you mistype the domain?`
    }
    // Other errors (network, timeout) — don't block the registration on
    // those; let it through and let the activation email bounce do its job.
    return null
  }
}

export async function POST(req: NextRequest) {
  try {
    const { customer, vehicles } = await req.json()

    // MX-record validation — reject obviously-fake email domains before
    // we insert anything. Catches gmail.com typos like gmial.com that
    // the client-side suggestion didn't fix, plus made-up domains.
    if (customer?.email) {
      const mxErr = await checkEmailMx(String(customer.email))
      if (mxErr) {
        return NextResponse.json({ error: mxErr }, { status: 400 })
      }
    }

    // Insert customer using service role key (bypasses RLS)
    const cRes = await fetch(
      `${supabaseUrl}/rest/v1/customers?select=id`,
      { method: 'POST', headers: headers(), body: JSON.stringify(customer) }
    )
    if (!cRes.ok) {
      const err = await cRes.text()
      return NextResponse.json({ error: err }, { status: 400 })
    }
    const cData = await cRes.json()
    const customerId: string = Array.isArray(cData) ? cData[0]?.id : cData?.id
    if (!customerId) return NextResponse.json({ error: 'Failed to create customer' }, { status: 400 })

    // Insert vehicles
    const vehicleRows = vehicles.map((v: Record<string, unknown>) => ({ ...v, customer_id: customerId }))
    const vRes = await fetch(
      `${supabaseUrl}/rest/v1/vehicles`,
      { method: 'POST', headers: headers(), body: JSON.stringify(vehicleRows) }
    )
    if (!vRes.ok) {
      const err = await vRes.text()
      // Roll back customer if vehicles fail
      await fetch(`${supabaseUrl}/rest/v1/customers?id=eq.${customerId}`, {
        method: 'DELETE', headers: headers(),
      })
      return NextResponse.json({ error: err }, { status: 400 })
    }

    return NextResponse.json({ customer_id: customerId })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
