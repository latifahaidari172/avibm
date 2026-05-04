import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createHash } from 'crypto'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const h = () => ({
  apikey: serviceKey,
  Authorization: `Bearer ${serviceKey}`,
  'Content-Type': 'application/json',
})

function customerRef(email?: string | null): string {
  if (!email) return 'P-??????'
  const h = createHash('sha256').update(email.trim().toLowerCase()).digest('hex')
  return 'P-' + h.slice(0, 6).toUpperCase()
}
function vehicleTypePrefix(t?: string | null): string {
  const v = (t || '').trim().toLowerCase()
  if (v.startsWith('motor') || v.startsWith('bike')) return 'M'
  if (v.startsWith('truck') || v.startsWith('bus') || v.startsWith('plant') || v.startsWith('heavy')) return 'H'
  if (v.startsWith('caravan') || v.startsWith('rv')) return 'R'
  if (v.startsWith('trailer')) return 'L'
  return 'C'
}
function vehicleRef(v: any): string {
  const parts = [v?.vin || '', v?.colour || '', v?.make || '', v?.model || '', String(v?.year || '')].join('|').toLowerCase()
  if (!parts.replace(/\|/g, '').trim()) return `${vehicleTypePrefix(v?.vehicle_type)}-??????`
  const h = createHash('sha256').update(parts).digest('hex')
  return `${vehicleTypePrefix(v?.vehicle_type)}-${h.slice(0, 6).toUpperCase()}`
}

// Returns the signed-in user's customer + vehicles. Verifies that the
// customer_id query param matches the user's user_metadata.customer_id —
// prevents users from probing other customers by guessing IDs.
export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const customerIdParam = new URL(req.url).searchParams.get('customer_id')
  const linkedId = user.user_metadata?.customer_id as string | undefined
  if (!linkedId) return NextResponse.json({ error: 'no profile linked' }, { status: 404 })
  if (customerIdParam && customerIdParam !== linkedId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const r = await fetch(
    `${supabaseUrl}/rest/v1/customers?id=eq.${linkedId}&select=*,vehicles(*)`,
    { headers: h() },
  )
  const arr = await r.json()
  const c = Array.isArray(arr) ? arr[0] : null
  if (!c) return NextResponse.json({ error: 'not found' }, { status: 404 })
  c.ref = customerRef(c.email)
  if (Array.isArray(c.vehicles)) c.vehicles = c.vehicles.map((v: any) => ({ ...v, ref: vehicleRef(v) }))
  return NextResponse.json(c)
}

// PATCH — update editable customer fields. Email + tier + state are NOT
// in the whitelist:
//  - email is the auth identity (changing it would orphan the OAuth link)
//  - state determines which bot pipeline runs and which fees apply
//  - tier ties to billing
const EDITABLE_FIELDS = [
  'first_name', 'last_name', 'phone',
  'address', 'suburb', 'postcode',
  'crn', 'licence_number', 'date_of_birth',
]

export async function PATCH(req: NextRequest) {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  const linkedId = user.user_metadata?.customer_id as string | undefined
  if (!linkedId) return NextResponse.json({ error: 'no profile linked' }, { status: 404 })

  const body = await req.json()
  const patch: Record<string, unknown> = {}
  for (const k of EDITABLE_FIELDS) {
    if (k in body) patch[k] = body[k]
  }
  if (Object.keys(patch).length === 0 && !Array.isArray(body.preferred_locations)) {
    return NextResponse.json({ error: 'nothing to update' }, { status: 400 })
  }

  if (Object.keys(patch).length > 0) {
    const r = await fetch(
      `${supabaseUrl}/rest/v1/customers?id=eq.${linkedId}`,
      { method: 'PATCH', headers: { ...h(), Prefer: 'return=representation' }, body: JSON.stringify(patch) },
    )
    if (!r.ok) return NextResponse.json({ error: await r.text() }, { status: 400 })
  }

  // preferred_locations live in user_metadata, not on the customers row.
  if (Array.isArray(body.preferred_locations)) {
    await supabase.auth.updateUser({
      data: { customer_id: linkedId, preferred_locations: body.preferred_locations },
    })
  }

  return NextResponse.json({ ok: true })
}
