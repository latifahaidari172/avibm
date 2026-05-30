import { NextResponse, type NextRequest } from 'next/server'
import { createHash } from 'crypto'
import { one, query, updateById } from '@/lib/db'
import { getSession } from '@/lib/session'

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

// Returns the signed-in customer + vehicles. The session cookie carries the
// customer id (sub); an optional ?customer_id must match it — prevents
// probing other customers by guessing IDs.
export async function GET(req: NextRequest) {
  const s = getSession(req)
  if (!s) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  const linkedId = s.sub
  if (!linkedId) return NextResponse.json({ error: 'no profile linked' }, { status: 404 })

  const customerIdParam = new URL(req.url).searchParams.get('customer_id')
  if (customerIdParam && customerIdParam !== linkedId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const c = await one<any>('SELECT * FROM customers WHERE id = $1', [linkedId])
  if (!c) return NextResponse.json({ error: 'not found' }, { status: 404 })
  const vehicles = await query<any>('SELECT * FROM vehicles WHERE customer_id = $1', [linkedId])
  c.ref = customerRef(c.email)
  c.vehicles = vehicles.map((v: any) => ({ ...v, ref: vehicleRef(v) }))
  return NextResponse.json(c)
}

// PATCH — update editable customer fields. email / tier / state are NOT
// editable here (email is identity; state picks the bot pipeline; tier ties
// to billing). preferred_locations now live on the customers row.
const EDITABLE_FIELDS = [
  'first_name', 'last_name', 'phone',
  'address', 'suburb', 'postcode',
  'crn', 'licence_number', 'date_of_birth',
]

export async function PATCH(req: NextRequest) {
  const s = getSession(req)
  if (!s) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  const linkedId = s.sub
  if (!linkedId) return NextResponse.json({ error: 'no profile linked' }, { status: 404 })

  const body = await req.json()
  const patch: Record<string, unknown> = {}
  for (const k of EDITABLE_FIELDS) {
    if (k in body) patch[k] = body[k]
  }
  if (Array.isArray(body.preferred_locations)) {
    patch.preferred_locations = body.preferred_locations
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'nothing to update' }, { status: 400 })
  }

  await updateById('customers', linkedId, patch)
  return NextResponse.json({ ok: true })
}
