import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY!

// ── Reference numbers (display-only, computed server-side) ──────────────
// Customers: P-XXXXXX  (P for "profile") = first 6 hex chars of
//   sha256(lowercase(email)).
// Vehicles: type-prefixed like the auction-intel project. C/M/H/R/L/O
//   per project_vehicle_refs.md. Hash = sha256(vin|colour|make|model|year)[:6].
//   So a vehicle scraped in auction-intel + registered in AVIBM shares
//   the same ref → cross-system lookups work.
function customerRef(email?: string | null): string {
  if (!email) return 'P-??????'
  const h = createHash('sha256').update(email.trim().toLowerCase()).digest('hex')
  return 'P-' + h.slice(0, 6).toUpperCase()
}
function vehicleTypePrefix(t?: string | null): string {
  const v = (t || '').trim().toLowerCase()
  if (v.startsWith('motor') || v.startsWith('bike')) return 'M'
  if (v.startsWith('truck') || v.startsWith('bus') || v.startsWith('plant') || v.startsWith('heavy')) return 'H'
  if (v.startsWith('caravan') || v.startsWith('rv') || v.startsWith('motorhome')) return 'R'
  if (v.startsWith('trailer')) return 'L'
  if (v.startsWith('boat') || v.startsWith('marine')) return 'O'
  return 'C' // car (default — most AVIBM vehicles)
}
function vehicleRef(v: any): string {
  const parts = [
    v?.vin || '', v?.colour || '', v?.make || '', v?.model || '', String(v?.year || ''),
  ].join('|').toLowerCase()
  if (!parts.replace(/\|/g, '').trim()) return `${vehicleTypePrefix(v?.vehicle_type)}-??????`
  const h = createHash('sha256').update(parts).digest('hex')
  return `${vehicleTypePrefix(v?.vehicle_type)}-${h.slice(0, 6).toUpperCase()}`
}
function annotate(customers: any[]): any[] {
  return customers.map(c => ({
    ...c,
    ref: customerRef(c?.email),
    vehicles: Array.isArray(c?.vehicles)
      ? c.vehicles.map((v: any) => ({ ...v, ref: vehicleRef(v) }))
      : c?.vehicles,
  }))
}

const h = {
  'apikey':        serviceKey,
  'Authorization': `Bearer ${serviceKey}`,
  'Content-Type':  'application/json',
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)

    // ?type=monitor_status
    if (searchParams.get('type') === 'monitor_status') {
      const res = await fetch(`${supabaseUrl}/rest/v1/monitor_status?id=eq.main`, { headers: h })
      const data = await res.json()
      return NextResponse.json(data[0] || null)
    }

    // ?type=new_since&since=<iso>
    if (searchParams.get('type') === 'new_since') {
      const since = searchParams.get('since') || new Date().toISOString()
      const res = await fetch(
        `${supabaseUrl}/rest/v1/customers?select=id&created_at=gt.${encodeURIComponent(since)}`,
        { headers: h }
      )
      const data = await res.json()
      return NextResponse.json(Array.isArray(data) ? data : [])
    }

    // Default: all customers + vehicles, annotated with display refs
    const res = await fetch(
      `${supabaseUrl}/rest/v1/customers?select=*,vehicles(*)&order=created_at.desc`,
      { headers: h }
    )
    const data = await res.json()
    return NextResponse.json(Array.isArray(data) ? annotate(data) : [])
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const { table, id, updates } = await request.json()
    if (!['customers', 'vehicles'].includes(table))
      return NextResponse.json({ error: 'Invalid table' }, { status: 400 })

    const res = await fetch(
      `${supabaseUrl}/rest/v1/${table}?id=eq.${id}`,
      { method: 'PATCH', headers: h, body: JSON.stringify(updates) }
    )
    if (!res.ok) return NextResponse.json({ error: await res.text() }, { status: 400 })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { table, id } = await request.json()
    if (!['customers', 'vehicles'].includes(table))
      return NextResponse.json({ error: 'Invalid table' }, { status: 400 })

    const res = await fetch(
      `${supabaseUrl}/rest/v1/${table}?id=eq.${id}`,
      { method: 'DELETE', headers: h }
    )
    if (!res.ok) return NextResponse.json({ error: await res.text() }, { status: 400 })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
