import { NextResponse, type NextRequest } from 'next/server'
import { one, updateById, query } from '@/lib/db'
import { getSession } from '@/lib/session'

// Whitelist of customer-editable fields. Everything else (vin, make, model,
// year, vehicle_type, customer_id, ref, etc.) is identity that would let a
// customer swap the vehicle without paying for a new monitor — read-only.
const EDITABLE_FIELDS = ['cutoff_date', 'locations', 'priority_locations', 'label', 'active', 'archived']

// GET — return one vehicle (only if it belongs to the signed-in customer).
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const s = getSession(req)
  if (!s) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  const customerId = s.sub
  if (!customerId) return NextResponse.json({ error: 'no profile' }, { status: 400 })

  const v = await one<any>(
    'SELECT * FROM vehicles WHERE id = $1 AND customer_id = $2',
    [id, customerId],
  )
  if (!v) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json(v)
}

// PATCH — update only the operational fields. Identity fields are silently
// dropped (old clients sending stale fields still succeed for allowed ones).
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const s = getSession(req)
  if (!s) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  const customerId = s.sub
  if (!customerId) return NextResponse.json({ error: 'no profile' }, { status: 400 })

  // Verify the vehicle belongs to this customer (prevents cross-customer
  // tampering even if someone forges a vehicle id).
  const exists = await one<{ id: string }>(
    'SELECT id FROM vehicles WHERE id = $1 AND customer_id = $2',
    [id, customerId],
  )
  if (!exists) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const body = await req.json()
  const patch: Record<string, unknown> = {}
  for (const k of EDITABLE_FIELDS) {
    if (k in body) patch[k] = body[k]
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'nothing to update' }, { status: 400 })
  }

  // Archiving (e.g. inspection finished) stops monitoring: pause + clear any
  // in-progress booking so the bot drops it. Restoring puts it back to active.
  if (patch.archived === true) { patch.active = false; patch.booking_in_progress = false }
  if (patch.archived === false) patch.active = true

  // Pausing also clears any in-progress booking flag so the bot won't
  // accidentally land a slot for a paused customer.
  if (patch.active === false) patch.booking_in_progress = false

  const updated = await updateById<any>('vehicles', id, patch)
  return NextResponse.json(updated || {})
}

// DELETE — soft-delete: remove the vehicle from the customer's account but
// KEEP the row (deleted_at stamp) so it stays in the admin/backend record of
// every vehicle entry. Scoped to the signed-in customer's own vehicle.
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const s = getSession(req)
  if (!s) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  const customerId = s.sub
  if (!customerId) return NextResponse.json({ error: 'no profile' }, { status: 400 })

  const exists = await one<{ id: string }>(
    'SELECT id FROM vehicles WHERE id = $1 AND customer_id = $2',
    [id, customerId],
  )
  if (!exists) return NextResponse.json({ error: 'not found' }, { status: 404 })

  // Stamp deleted_at + stop monitoring; the row remains for the backend record.
  await query(
    'UPDATE vehicles SET deleted_at = now(), active = false, booking_in_progress = false WHERE id = $1 AND customer_id = $2',
    [id, customerId],
  )
  return NextResponse.json({ ok: true })
}
