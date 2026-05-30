import { NextResponse, type NextRequest } from 'next/server'
import { one, insertRow, updateById } from '@/lib/db'
import { getSession } from '@/lib/session'

// Add a vehicle for the signed-in customer.
//
// Rich body shape (matches the unified add-vehicle page):
//   {
//     customer_patch: {...},      // editable customer fields (updated if present)
//     preferred_locations: [],    // saved on the customer row + becomes vehicle.locations default
//     priority_locations: [],     // ordered, max 3 — saved on customer + vehicle.priority_locations
//     vehicle: { ...all fields..., locations, priority_locations }
//   }
//
// Backward-compatible: a flat vehicle object (legacy shape) still works.
export async function POST(req: NextRequest) {
  const s = getSession(req)
  if (!s) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  const customerId = s.sub
  if (!customerId) return NextResponse.json({ error: 'profile not set up' }, { status: 400 })

  const body = await req.json()
  const isRichShape = body?.vehicle && typeof body.vehicle === 'object'

  // 1. Patch the customer row if customer_patch is non-empty.
  if (isRichShape && body.customer_patch && Object.keys(body.customer_patch).length > 0) {
    const patch = { ...body.customer_patch }
    delete patch.email // email is identity, not editable here
    try {
      await updateById('customers', customerId, patch)
    } catch (e: any) {
      return NextResponse.json({ error: `customer patch: ${e.message}` }, { status: 400 })
    }
  }

  // 2. Persist preferred + priority locations on the customer row so they
  //    flow back as defaults next time.
  if (isRichShape) {
    const meta: Record<string, unknown> = {}
    if (Array.isArray(body.preferred_locations)) meta.preferred_locations = body.preferred_locations
    if (Array.isArray(body.priority_locations)) meta.priority_locations = body.priority_locations
    if (Object.keys(meta).length > 0) await updateById('customers', customerId, meta)
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
    // Original WOVI booking time + location (the date is cutoff_date).
    current_booking_time: vIn.current_booking_time || null,
    current_booking_location: vIn.current_booking_location || null,
    // Per-vehicle monitoring plan + auction-intel photo URL.
    tier: vIn.tier || null,
    photo_url: vIn.photo_url || null,
    active: true, archived: false, booking_in_progress: false,
  }
  // Locations columns exist on vehicles; use the rich payload if present,
  // otherwise fall back to the customer's saved preferred_locations.
  let fromCustomer: string[] = []
  if (!Array.isArray(vIn.locations)) {
    const c = await one<{ preferred_locations: string[] | null }>(
      'SELECT preferred_locations FROM customers WHERE id = $1', [customerId])
    fromCustomer = c?.preferred_locations || []
  }
  vehicle.locations = Array.isArray(vIn.locations) ? vIn.locations
    : (fromCustomer.length > 0 ? fromCustomer : null)
  vehicle.priority_locations = Array.isArray(vIn.priority_locations) ? vIn.priority_locations : []

  try {
    const row = await insertRow<{ id: string }>('vehicles', vehicle, 'id')
    return NextResponse.json({ id: row?.id })
  } catch (e: any) {
    return NextResponse.json({ error: `vehicle insert: ${e.message}` }, { status: 400 })
  }
}
