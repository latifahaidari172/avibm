import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createHash } from 'crypto'
import { createSupabaseServer } from '@/lib/supabase/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

function customerRefOf(email?: string | null): string {
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
function vehicleRefOf(v: any): string {
  const parts = [v?.vin || '', v?.colour || '', v?.make || '', v?.model || '', String(v?.year || '')].join('|').toLowerCase()
  if (!parts.replace(/\|/g, '').trim()) return `${vehicleTypePrefix(v?.vehicle_type)}-??????`
  const h = createHash('sha256').update(parts).digest('hex')
  return `${vehicleTypePrefix(v?.vehicle_type)}-${h.slice(0, 6).toUpperCase()}`
}

// Customer profile dashboard. Queries Supabase directly via the
// service-role key (server-side only — the key never reaches the
// browser). This avoids the Server-Component-fetching-its-own-API-route
// pitfall that broke first attempt.
export default async function AccountPage() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/account/sign-in')

  const customerId = user.user_metadata?.customer_id as string | undefined
  if (!customerId) redirect('/account/complete-profile')

  let customer: any = null
  try {
    const r = await fetch(
      `${supabaseUrl}/rest/v1/customers?id=eq.${customerId}&select=*,vehicles(*)`,
      {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
        cache: 'no-store',
      },
    )
    if (r.ok) {
      const arr = await r.json()
      customer = Array.isArray(arr) ? arr[0] : null
    }
  } catch {}

  if (!customer) {
    return (
      <Page>
        <h1 style={h1}>Profile not found</h1>
        <p style={muted}>We couldn&apos;t load your profile. Try <Link href="/account/sign-in" style={link}>signing in again</Link>.</p>
      </Page>
    )
  }

  customer.ref = customerRefOf(customer.email)
  if (Array.isArray(customer.vehicles)) {
    customer.vehicles = customer.vehicles.map((v: any) => ({ ...v, ref: vehicleRefOf(v) }))
  }
  const activeVehicles = (customer.vehicles || []).filter((v: any) => !v.archived)

  return (
    <Page>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 24, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={h1}>Hi, {customer.first_name}</h1>
          <p style={muted}>{customer.email} · {customer.phone}</p>
          {customer.ref && <span style={refPill}>{customer.ref}</span>}
        </div>
        <form action="/auth/sign-out" method="post">
          <button style={ghostBtn}>Sign out</button>
        </form>
      </div>

      <Section title="Personal details">
        <Detail label="Address" value={`${customer.address || ''}${customer.suburb ? ', ' + customer.suburb : ''} ${customer.postcode || ''}`.trim()} />
        <Detail label="CRN (QLD)" value={customer.crn || '—'} />
        <Detail label="Licence" value={customer.licence_number || '—'} />
        <Detail label="DOB" value={customer.date_of_birth || '—'} />
      </Section>

      <Section title={`Vehicles (${activeVehicles.length})`}>
        {activeVehicles.length === 0 ? (
          <p style={muted}>No active vehicles. Add one to start monitoring for earlier inspection slots.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {activeVehicles.map((v: any) => (
              <div key={v.id} style={vehicleCard}>
                <div style={{ fontWeight: 600 }}>
                  {v.label || `${v.make} ${v.model}`}
                  <span style={{ color: '#888', fontWeight: 400, fontSize: 12 }}> · {v.year}</span>
                </div>
                <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>VIN: {v.vin}</div>
                {v.booked_date && (
                  <div style={{ fontSize: 12, color: '#5adb5a', marginTop: 4 }}>
                    ✓ Currently booked: {v.booked_date}{v.booked_time ? ` at ${v.booked_time}` : ''}{v.booked_location ? ` — ${v.booked_location}` : ''}
                  </div>
                )}
                {v.cutoff_date && !v.booked_date && (
                  <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
                    Searching for slots before: {v.cutoff_date}
                  </div>
                )}
                {v.ref && <div style={{ fontSize: 11, color: '#5ab0ff', marginTop: 4, fontFamily: 'ui-monospace,monospace' }}>{v.ref}</div>}
              </div>
            ))}
          </div>
        )}
        <div style={{ marginTop: 14 }}>
          <Link href="/account/add-vehicle" style={primaryBtn}>+ Add another vehicle</Link>
        </div>
      </Section>

      <Section title="Preferred inspection locations">
        {(() => {
          const fromMeta = (user.user_metadata?.preferred_locations as string[] | undefined) || []
          const list = fromMeta.length > 0 ? fromMeta : (Array.isArray(customer.locations) ? customer.locations : [])
          return list.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {list.map((loc: string) => (
              <span key={loc} style={pill}>{loc}</span>
            ))}
          </div>
        ) : (
          <p style={muted}>No preferred locations set yet.</p>
        )
        })()}
      </Section>
    </Page>
  )
}

function Page({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#eee', fontFamily: 'DM Sans, sans-serif', padding: '40px 20px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>{children}</div>
    </div>
  )
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#111', border: '1px solid #222', borderRadius: 10, padding: 20, marginBottom: 16 }}>
      <h2 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 16, letterSpacing: '0.06em', color: '#C9A84C', margin: '0 0 14px 0' }}>{title}</h2>
      {children}
    </div>
  )
}
function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', gap: 12, padding: '5px 0', fontSize: 13 }}>
      <div style={{ width: 110, color: '#888', flexShrink: 0 }}>{label}</div>
      <div>{value || '—'}</div>
    </div>
  )
}
const h1: React.CSSProperties = { fontFamily: 'Bebas Neue, sans-serif', fontSize: 28, letterSpacing: '0.05em', margin: 0 }
const muted: React.CSSProperties = { color: '#888', fontSize: 13 }
const link: React.CSSProperties = { color: '#5ab0ff', fontSize: 13, textDecoration: 'underline' }
const ghostBtn: React.CSSProperties = { background: 'none', border: '1px solid #333', color: '#888', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }
const primaryBtn: React.CSSProperties = { background: '#C9A84C', color: '#000', padding: '8px 14px', borderRadius: 6, fontSize: 13, fontWeight: 700, textDecoration: 'none' }
const vehicleCard: React.CSSProperties = { background: '#0a0a0a', border: '1px solid #222', borderRadius: 8, padding: 12 }
const refPill: React.CSSProperties = { fontFamily: 'ui-monospace,monospace', fontSize: 11, color: '#C9A84C', background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.25)', padding: '2px 8px', borderRadius: 4, marginTop: 6, display: 'inline-block' }
const pill: React.CSSProperties = { fontSize: 12, padding: '3px 10px', borderRadius: 999, background: '#1a1a1a', border: '1px solid #2a2a2a' }
