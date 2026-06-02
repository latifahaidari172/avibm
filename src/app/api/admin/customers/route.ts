import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { query, one, updateById, deleteById } from '@/lib/db'

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
  const raw = (t || '').trim()
  if (raw.length === 1) return raw.toUpperCase() // already a single-letter code (auction-intel stores these)
  const v = raw.toLowerCase()
  if (v.startsWith('motor') || v.startsWith('bike')) return 'M'
  if (v.startsWith('truck') || v.startsWith('bus') || v.startsWith('plant') || v.startsWith('heavy')) return 'H'
  if (v.startsWith('caravan') || v.startsWith('rv') || v.startsWith('motorhome')) return 'R'
  if (v.startsWith('trailer')) return 'L'
  if (v.startsWith('boat') || v.startsWith('marine')) return 'O'
  return 'C' // car (default — most AVIBM vehicles)
}
// Mirror auction-intel's app/models/vehicle.py EXACTLY so the same car gets
// the same code on both sites: a 17-char VIN hashes the upper-cased VIN;
// otherwise it hashes "MAKE|MODEL|YEAR|COLOUR" upper-cased. Prefix is the
// single-letter vehicle_type. Keep this byte-for-byte aligned with the bot.
function vehicleRef(v: any): string {
  const prefix = vehicleTypePrefix(v?.vehicle_type)
  const vin = (v?.vin || '').trim().toUpperCase()
  let data: string
  if (vin.length === 17) {
    data = vin
  } else {
    const make = (v?.make || '').trim().toUpperCase()
    const model = (v?.model || '').trim().toUpperCase()
    const year = String(v?.year || '')
    const colour = (v?.colour || '').trim().toUpperCase()
    if (!(make && model && year)) return `${prefix}-??????`
    data = `${make}|${model}|${year}|${colour}`
  }
  const h = createHash('sha256').update(data).digest('hex')
  return `${prefix}-${h.slice(0, 6).toUpperCase()}`
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

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)

    // ?type=monitor_status
    if (searchParams.get('type') === 'monitor_status') {
      const row = await one(`SELECT * FROM monitor_status WHERE id = $1`, ['main'])
      return NextResponse.json(row || null)
    }

    // ?type=new_since&since=<iso>
    if (searchParams.get('type') === 'new_since') {
      const since = searchParams.get('since') || new Date().toISOString()
      const rows = await query(`SELECT id FROM customers WHERE created_at > $1`, [since])
      return NextResponse.json(rows)
    }

    // Default: all customers + vehicles, annotated with display refs
    const [customers, allVehicles] = await Promise.all([
      query<any>(`SELECT * FROM customers ORDER BY created_at DESC`),
      query<any>(`SELECT * FROM vehicles`),
    ])
    const byCustomer = new Map<any, any[]>()
    for (const v of allVehicles) {
      const arr = byCustomer.get(v.customer_id) ?? []
      arr.push(v)
      byCustomer.set(v.customer_id, arr)
    }
    const withVehicles = customers.map((c: any) => ({
      ...c,
      vehicles: byCustomer.get(c.id) ?? [],
    }))
    return NextResponse.json(annotate(withVehicles))
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const { table, id, updates } = await request.json()
    if (!['customers', 'vehicles'].includes(table))
      return NextResponse.json({ error: 'Invalid table' }, { status: 400 })

    await updateById(table, id, updates)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { table, id } = await request.json()
    if (!['customers', 'vehicles'].includes(table))
      return NextResponse.json({ error: 'Invalid table' }, { status: 400 })

    await deleteById(table, id)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
