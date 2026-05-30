import { NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { getAuthToken, unauthorized } from '@/lib/auth'
import { query, one } from '@/lib/db'

// ── Reference numbers ───────────────────────────────────────────────────
// Customers: P-XXXXXX  (P for "profile") = first 6 hex chars of
//   sha256(lowercase(email)). Stable across re-runs, distinct from
//   auction-intel's vehicle refs.
// Vehicles: type-prefixed like the auction-intel project (per
//   memory/project_vehicle_refs.md).
//   C=Car, M=Motorcycle, H=Heavy/Truck, R=Caravan/RV, L=Trailer, O=Other.
//   Hash = sha256(vin|colour|make|model|year)[:6]. So a vehicle scraped
//   in auction-intel and registered in AVIBM will share the same ref —
//   a deliberate design choice to make cross-system lookups easy.
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
  if (v.startsWith('car')) return 'C'
  // Default — most AVIBM vehicles are cars
  return 'C'
}

function vehicleRef(v: any): string {
  const parts = [
    v?.vin || '',
    v?.colour || '',
    v?.make || '',
    v?.model || '',
    String(v?.year || ''),
  ].join('|').toLowerCase()
  if (!parts.replace(/\|/g, '').trim()) return `${vehicleTypePrefix(v?.vehicle_type)}-??????`
  const h = createHash('sha256').update(parts).digest('hex')
  return `${vehicleTypePrefix(v?.vehicle_type)}-${h.slice(0, 6).toUpperCase()}`
}

export async function GET(request: Request) {
  if (!getAuthToken(request)) return unauthorized()
  try {
    const [customers, allVehicles, monitorStatus] = await Promise.all([
      query<any>(`SELECT * FROM customers ORDER BY created_at DESC`),
      query<any>(`SELECT * FROM vehicles`),
      one(`SELECT * FROM monitor_status WHERE id = $1`, ['main']),
    ])

    // Group vehicles by customer_id, mirroring PostgREST's vehicles(*) embed.
    const byCustomer = new Map<any, any[]>()
    for (const v of allVehicles) {
      const arr = byCustomer.get(v.customer_id) ?? []
      arr.push(v)
      byCustomer.set(v.customer_id, arr)
    }

    // Annotate every customer + vehicle with a stable display ref.
    const annotated = customers.map((c: any) => {
      const vehicles = byCustomer.get(c.id) ?? []
      return {
        ...c,
        ref: customerRef(c?.email),
        vehicles: vehicles.map((v: any) => ({ ...v, ref: vehicleRef(v) })),
      }
    })

    return NextResponse.json({
      customers: annotated,
      monitorStatus,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
