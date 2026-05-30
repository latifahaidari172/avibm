import { NextResponse, type NextRequest } from 'next/server'
import { one, updateById } from '@/lib/db'
import { getSession } from '@/lib/session'

// Whitelist of customer-editable fields. Everything else (vin, make, model,
// year, vehicle_type, customer_id, ref, etc.) is identity that would let a
// customer swap the vehicle without paying for a new monitor — read-only.
const EDITABLE_FIELDS = ['cutoff_date', 'locations', 'priority_locations', 'label', 'active']

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

  // Pausing also clears any in-progress booking flag so the bot won't
  // accidentally land a slot for a paused customer.
  if (patch.active === false) patch.booking_in_progress = false

  const updated = await updateById<any>('vehicles', id, patch)
  return NextResponse.json(updated || {})
}
