import { NextRequest, NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY!

const headers = () => ({
  'apikey':        serviceKey,
  'Authorization': `Bearer ${serviceKey}`,
  'Content-Type':  'application/json',
  'Prefer':        'return=representation',
})

export async function POST(req: NextRequest) {
  try {
    const { customer, vehicles } = await req.json()

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
