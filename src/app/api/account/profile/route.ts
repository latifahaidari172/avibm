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
