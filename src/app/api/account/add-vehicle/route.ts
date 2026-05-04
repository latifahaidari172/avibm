import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const h = () => ({
  apikey: serviceKey, Authorization: `Bearer ${serviceKey}`,
  'Content-Type': 'application/json', Prefer: 'return=representation',
})

// "Add another vehicle" — the lean version that re-uses the customer's
// already-saved details. Only inserts the vehicle row and ties it to
// the signed-in user's customer_id.
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  const customerId = user.user_metadata?.customer_id as string | undefined
  if (!customerId) return NextResponse.json({ error: 'profile not set up' }, { status: 400 })

  // Fetch the customer to copy state + default locations to the vehicle
  const cRes = await fetch(
    `${supabaseUrl}/rest/v1/customers?id=eq.${customerId}&select=state,locations`,
    { headers: h() },
  )
  const cArr = await cRes.json()
  const customer = Array.isArray(cArr) ? cArr[0] : null
  if (!customer) return NextResponse.json({ error: 'customer not found' }, { status: 404 })

  const body = await req.json()
  // Prefer the user's preferred_locations from auth metadata (set during
  // complete-profile); fall back to whatever's on the customer row.
  const preferredLocations = (user.user_metadata?.preferred_locations as string[] | undefined) || customer.locations || null
  const vehicle = {
    customer_id: customerId,
    state: customer.state,
    locations: preferredLocations,
    label: body.label || null,
    make: body.make,
    model: body.model,
    year: body.year,
    vin: (body.vin || '').toUpperCase(),
    colour: body.colour || null,
    vehicle_type: body.vehicle_type || 'Car',
    build_month: body.build_month || null,
    damage: body.damage || null,
    purchase_method: body.purchase_method || null,
    purchased_from: body.purchased_from || null,
    cutoff_date: body.cutoff_date,
    active: true,
    archived: false,
    booking_in_progress: false,
  }
  const r = await fetch(`${supabaseUrl}/rest/v1/vehicles`, {
    method: 'POST', headers: h(), body: JSON.stringify(vehicle),
  })
  if (!r.ok) return NextResponse.json({ error: await r.text() }, { status: 400 })
  const arr = await r.json()
  return NextResponse.json({ id: arr[0]?.id })
}
