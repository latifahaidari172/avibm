import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const h = () => ({
  apikey: serviceKey, Authorization: `Bearer ${serviceKey}`,
  'Content-Type': 'application/json', Prefer: 'return=representation',
})

// Add a vehicle for the signed-in customer.
//
// New richer body shape (matches the unified add-vehicle page):
//   {
//     customer_patch: {...},      // editable customer fields (PATCHed if changed)
//     preferred_locations: [],    // saved to user_metadata + becomes vehicle.locations
//     priority_locations: [],     // ordered, max 3 — saved to metadata + vehicle.priority_locations
//     vehicle: { ...all fields..., locations, priority_locations }
//   }
//
// Backward-compatible: if the body is just a flat vehicle object (legacy
// /account/add-vehicle/page.tsx shape), still works.
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  const customerId = user.user_metadata?.customer_id as string | undefined
  if (!customerId) return NextResponse.json({ error: 'profile not set up' }, { status: 400 })

  const body = await req.json()
  const isRichShape = body?.vehicle && typeof body.vehicle === 'object'

  // 1. Patch the customer row if customer_patch is non-empty.
  if (isRichShape && body.customer_patch && Object.keys(body.customer_patch).length > 0) {
    const patch = { ...body.customer_patch }
    delete patch.email // email is the auth user's, not editable here
    const r = await fetch(`${supabaseUrl}/rest/v1/customers?id=eq.${customerId}`, {
      method: 'PATCH', headers: h(), body: JSON.stringify(patch),
    })
    if (!r.ok) {
      return NextResponse.json({ error: `customer patch: ${await r.text()}` }, { status: 400 })
    }
  }

  // 2. Persist preferred + priority locations into user_metadata so they
  //    flow back next time.
  if (isRichShape) {
    const meta: Record<string, unknown> = { customer_id: customerId }
    if (Array.isArray(body.preferred_locations)) meta.preferred_locations = body.preferred_locations
    if (Array.isArray(body.priority_locations)) meta.priority_locations = body.priority_locations
    await supabase.auth.updateUser({ data: meta })
  }

  // 3. Build the vehicle row.
  const vIn = isRichShape ? body.vehicle : body
  const vehicle: Record<string, unknown> = {
    customer_id: customerId,
    state: vIn.state || (isRichShape ? body.customer_patch?.state : null) || 'QLD',
    label: (vIn.label && String(vIn.label).trim()) || `${vIn.make || ''} ${vIn.model || ''}`.trim() || 'Vehicle',
    make: vIn.make,
    model: vIn.model,
    year: vIn.year,
    vin: (vIn.vin || '').toUpperCase(),
    colour: vIn.colour || null,
    vehicle_type: vIn.vehicle_type || 'Car',
    build_month: vIn.build_month || null,
    damage: vIn.damage || null,
    purchase_method: vIn.purchase_method || null,
    purchased_from: vIn.purchased_from || null,
    cutoff_date: vIn.cutoff_date,
    active: true, archived: false, booking_in_progress: false,
  }
  // Locations columns exist on vehicles; use the rich payload if present,
  // otherwise fall back to the customer's saved metadata + sensible defaults.
  const fromMeta = (user.user_metadata?.preferred_locations as string[] | undefined) || []
  vehicle.locations = Array.isArray(vIn.locations) ? vIn.locations
    : (fromMeta.length > 0 ? fromMeta : null)
  vehicle.priority_locations = Array.isArray(vIn.priority_locations) ? vIn.priority_locations : []

  const r = await fetch(`${supabaseUrl}/rest/v1/vehicles`, {
    method: 'POST', headers: h(), body: JSON.stringify(vehicle),
  })
  if (!r.ok) return NextResponse.json({ error: `vehicle insert: ${await r.text()}` }, { status: 400 })
  const arr = await r.json()
  return NextResponse.json({ id: arr[0]?.id })
}
