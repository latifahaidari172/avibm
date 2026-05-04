import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const h = () => ({
  apikey: serviceKey,
  Authorization: `Bearer ${serviceKey}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
})

// Whitelist of customer-editable fields. Everything else (vin, make,
// model, year, vehicle_type, customer_id, ref, etc.) is identity that
// would let a customer swap the vehicle without paying for a new
// monitor — keep them read-only.
const EDITABLE_FIELDS = ['cutoff_date', 'locations', 'priority_locations', 'label', 'active']

// GET — return one vehicle (only if it belongs to the signed-in user).
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  const customerId = user.user_metadata?.customer_id as string | undefined
  if (!customerId) return NextResponse.json({ error: 'no profile' }, { status: 400 })

  const r = await fetch(
    `${supabaseUrl}/rest/v1/vehicles?id=eq.${id}&customer_id=eq.${customerId}&select=*`,
    { headers: h(), cache: 'no-store' },
  )
  const arr = await r.json()
  const v = Array.isArray(arr) ? arr[0] : null
  if (!v) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json(v)
}

// PATCH — update only the operational fields. Identity fields are
// silently dropped (we do not 400 — old clients sending stale fields
// should still succeed for the fields they're allowed to change).
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  const customerId = user.user_metadata?.customer_id as string | undefined
  if (!customerId) return NextResponse.json({ error: 'no profile' }, { status: 400 })

  // Verify the vehicle belongs to this customer (prevents cross-customer
  // tampering even if someone forges a vehicle id).
  const verify = await fetch(
    `${supabaseUrl}/rest/v1/vehicles?id=eq.${id}&customer_id=eq.${customerId}&select=id`,
    { headers: h(), cache: 'no-store' },
  )
  const exists = await verify.json()
  if (!Array.isArray(exists) || exists.length === 0) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }

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

  const r = await fetch(
    `${supabaseUrl}/rest/v1/vehicles?id=eq.${id}`,
    { method: 'PATCH', headers: h(), body: JSON.stringify(patch) },
  )
  if (!r.ok) return NextResponse.json({ error: await r.text() }, { status: 400 })
  const updated = await r.json()
  return NextResponse.json(updated[0] || {})
}
