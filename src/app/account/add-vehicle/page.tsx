'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowser } from '@/lib/supabase/client'
import { validateVin, validateYear, validatePostcode, validateAuMobile, validateCutoffDate, normaliseAuMobile, validateCrn, validateStreetAddress, validateSuburb } from '@/lib/validators'

const WOVI_LOCATIONS = [
  'Brisbane', 'Bundaberg', 'Burleigh Heads', 'Cairns', 'Mackay',
  'Narangba', 'Rockhampton City', 'Toowoomba', 'Townsville', 'Yatala',
]
const VEHICLE_TYPES = ['Car', 'Motorcycle', 'Truck', 'Trailer', 'Caravan']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAMAGES = [
  'HAIL DAMAGE', 'WATER DAMAGE', 'MALICIOUS DAMAGE', 'FIRE DAMAGE', 'STRUCTURAL DAMAGE',
  'IMPACT DAMAGE DRIVERS FRONT', 'IMPACT DAMAGE PASSENGER FRONT',
  'IMPACT DAMAGE DRIVERS SIDE', 'IMPACT DAMAGE PASSENGER SIDE',
  'IMPACT DAMAGE DRIVERS REAR', 'IMPACT DAMAGE PASSENGER REAR', 'OTHER',
]
const PURCHASE_METHODS = ['Auction', 'Private Sale', 'Insurance', 'Other']

const TIERS = [
  { id: 'priority', label: '🥇 Priority', price: '$5',    desc: 'First in queue. Books immediately when a slot is found.' },
  { id: 'standard', label: '🥈 Standard', price: '$3',    desc: 'Standard monitoring cadence.' },
  { id: 'basic',    label: '🥉 Basic',    price: '$1.50', desc: 'Slowest monitoring, lowest priority.' },
]

// Single-page "add a vehicle" for signed-in customers. Mirrors the
// shape of /register/qld and /register/sa but as ONE page with a state
// toggle, prefills from the user's saved profile, lets them edit
// anything, and on submit creates the vehicle + (if anything changed)
// patches the customer.
export default function AddVehiclePage() {
  const supabase = createSupabaseBrowser()
  const router = useRouter()

  const [authReady, setAuthReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [originalCustomer, setOriginalCustomer] = useState<any>(null)

  // Customer-level form (prefilled, editable)
  const [c, setC] = useState({
    state: 'QLD' as 'QLD' | 'SA',
    tier: 'priority' as 'priority' | 'standard' | 'basic',
    first_name: '', last_name: '', email: '', phone: '',
    address: '', suburb: '', postcode: '',
    crn: '', licence_number: '', date_of_birth: '',
  })

  // QLD-only — locations + priority locations (ordered, max 3)
  const [locations, setLocations] = useState<string[]>(WOVI_LOCATIONS)
  const [priorityLocations, setPriorityLocations] = useState<string[]>([])

  // Vehicle (single — we're adding one at a time)
  const [v, setV] = useState({
    label: '', make: '', model: '', year: '', vin: '', colour: '',
    vehicle_type: 'Car', build_month: '',
    damage: '', purchase_method: '', purchased_from: '',
    cutoff_date: '',
  })

  // Bootstrap — fetch the customer profile via API and prefill
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/account/sign-in'); return }
      if (!user.user_metadata?.customer_id) { router.replace('/account/complete-profile'); return }

      const res = await fetch('/api/account/profile', { cache: 'no-store' })
      if (!res.ok) { setAuthReady(true); return }
      const cust = await res.json()
      setOriginalCustomer(cust)
      setC(s => ({
        ...s,
        state: cust.state || 'QLD',
        tier: 'priority',
        first_name: cust.first_name || '',
        last_name: cust.last_name || '',
        email: cust.email || '',
        phone: cust.phone || '',
        address: cust.address || '',
        suburb: cust.suburb || '',
        postcode: cust.postcode || '',
        crn: cust.crn || '',
        licence_number: cust.licence_number || '',
        date_of_birth: cust.date_of_birth || '',
      }))
      // Locations: prefer user_metadata.preferred_locations
      const fromMeta = (user.user_metadata?.preferred_locations as string[] | undefined) || []
      if (fromMeta.length > 0) {
        setLocations(fromMeta)
      }
      const fromMetaPriority = (user.user_metadata?.priority_locations as string[] | undefined) || []
      if (fromMetaPriority.length > 0) {
        setPriorityLocations(fromMetaPriority.slice(0, 3))
      }
      setAuthReady(true)
    })()
  }, [supabase, router])

  function updC<K extends keyof typeof c>(k: K, val: typeof c[K]) { setC(s => ({ ...s, [k]: val })) }
  function updV<K extends keyof typeof v>(k: K, val: typeof v[K]) { setV(s => ({ ...s, [k]: val })) }
  function toggleLoc(loc: string) {
    setLocations(ls => ls.includes(loc) ? ls.filter(x => x !== loc) : [...ls, loc])
  }
  function togglePriority(loc: string) {
    setPriorityLocations(ps => {
      if (ps.includes(loc)) return ps.filter(x => x !== loc)
      if (ps.length >= 3) return ps
      return [...ps, loc]
    })
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    if (!c.first_name || !c.last_name || !c.phone || !c.address) return setErr('Fill in name, phone, address.')
    const phoneErr = validateAuMobile(c.phone); if (phoneErr) return setErr(phoneErr)
    const addrErr = validateStreetAddress(c.address); if (addrErr) return setErr(addrErr)
    const subErr = validateSuburb(c.suburb); if (subErr) return setErr(subErr)
    const pcErr = validatePostcode(c.postcode, c.state); if (pcErr) return setErr(pcErr)
    if (c.state === 'QLD') { const ce = validateCrn(c.crn); if (ce) return setErr(ce) }
    if (c.state === 'SA' && !c.licence_number.trim()) return setErr('Licence number is required for SA.')
    if (!v.make || !v.model) return setErr('Fill in vehicle make and model.')
    const yearErr = validateYear(v.year); if (yearErr) return setErr(yearErr)
    const vinErr = validateVin(v.vin); if (vinErr) return setErr(vinErr)
    const cutoffErr = validateCutoffDate(v.cutoff_date); if (cutoffErr) return setErr(cutoffErr)

    setBusy(true)
    const res = await fetch('/api/account/add-vehicle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_patch: {
          first_name: c.first_name, last_name: c.last_name, phone: c.phone,
          address: c.address, suburb: c.suburb, postcode: c.postcode,
          ...(c.state === 'QLD' ? { crn: c.crn } : {}),
          ...(c.state === 'SA' ? { licence_number: c.licence_number } : {}),
          date_of_birth: c.date_of_birth,
          state: c.state, tier: c.tier, active: true, archived: false,
        },
        preferred_locations: locations,
        priority_locations: priorityLocations,
        vehicle: {
          ...v,
          vin: v.vin.toUpperCase(),
          state: c.state,
          locations: c.state === 'QLD' ? locations : ['Regency Park'],
          priority_locations: c.state === 'QLD' ? priorityLocations : [],
        },
      }),
    })
    const j = await res.json()
    setBusy(false)
    if (!res.ok) return setErr(j.error || 'Failed to add vehicle.')
    router.replace('/account')
  }

  if (!authReady) return <div style={loadingStyle}>Loading…</div>

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#eee', fontFamily: 'DM Sans, sans-serif', padding: '32px 16px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <h1 style={h1}>ADD ANOTHER VEHICLE</h1>
        <p style={{ color: '#888', fontSize: 13, marginBottom: 24 }}>
          Your saved details are filled in below. Edit anything that's different for this booking.
        </p>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* State picker */}
          <Section title="State">
            <div style={{ display: 'flex', gap: 8 }}>
              {(['QLD', 'SA'] as const).map(s => (
                <button type="button" key={s} onClick={() => updC('state', s)} style={pill(c.state === s)}>
                  {s}
                </button>
              ))}
            </div>
          </Section>

          {/* Personal details */}
          <Section title="Personal details">
            <Grid>
              <Field label="First name" value={c.first_name} onChange={x => updC('first_name', x)} />
              <Field label="Last name"  value={c.last_name}  onChange={x => updC('last_name', x)} />
              <Field label="Email" value={c.email} onChange={x => updC('email', x.toLowerCase())} fullRow />
              <Field label="Mobile (04…)" value={c.phone} onChange={x => updC('phone', x.replace(/\D/g, '').replace(/^61/, '0').slice(0, 10))} fullRow />
              <Field label="Street address (number + name)" value={c.address} onChange={x => updC('address', x)} fullRow />
              <Field label="Suburb (no postcode)" value={c.suburb} onChange={x => updC('suburb', x.replace(/\d/g, ''))} />
              <Field label="Postcode" value={c.postcode} onChange={x => updC('postcode', x.replace(/\D/g, '').slice(0, 4))} />
              <div style={{ gridColumn: 'span 2', fontSize: 11, color: '#888', marginTop: -4 }}>
                Suburb is just your suburb name (e.g. <strong>Park Ridge</strong>) — not <strong>Brisbane 4125</strong>.
              </div>
              {c.state === 'QLD' && <Field label="CRN" value={c.crn} onChange={x => updC('crn', x.replace(/\D/g, '').slice(0, 10))} />}
              {c.state === 'SA' && <Field label="Licence number" value={c.licence_number} onChange={x => updC('licence_number', x)} />}
              <Field label="Date of birth" type="date" value={c.date_of_birth} onChange={x => updC('date_of_birth', x)} />
            </Grid>
          </Section>

          {/* Tier */}
          <Section title="Monitoring tier">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {TIERS.map(t => (
                <button
                  type="button"
                  key={t.id}
                  onClick={() => updC('tier', t.id as any)}
                  style={tierButton(c.tier === t.id)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontWeight: 600 }}>{t.label}</span>
                    <span style={{ color: '#C9A84C', fontWeight: 700 }}>{t.price} <span style={{ color: '#888', fontWeight: 400, fontSize: 11 }}>/ vehicle</span></span>
                  </div>
                  <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{t.desc}</div>
                </button>
              ))}
            </div>
          </Section>

          {/* Locations + priority locations — QLD only */}
          {c.state === 'QLD' && (
            <Section title="Inspection locations">
              <p style={{ fontSize: 12, color: '#888', marginTop: 0, marginBottom: 8 }}>Tap a location to include it. Tap a number circle to set priority order (1 = top).</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {WOVI_LOCATIONS.map(loc => {
                  const on = locations.includes(loc)
                  const pIdx = priorityLocations.indexOf(loc)
                  return (
                    <div key={loc} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <button type="button" onClick={() => toggleLoc(loc)} style={pill(on)}>{loc}</button>
                      {on && (
                        <button
                          type="button"
                          onClick={() => togglePriority(loc)}
                          title={pIdx >= 0 ? `Priority ${pIdx + 1}` : 'Set priority'}
                          style={{
                            width: 22, height: 22, borderRadius: '50%',
                            background: pIdx >= 0 ? '#C9A84C' : '#1a1a1a',
                            color: pIdx >= 0 ? '#000' : '#666',
                            border: '1px solid ' + (pIdx >= 0 ? '#C9A84C' : '#333'),
                            fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                          }}>
                          {pIdx >= 0 ? pIdx + 1 : '+'}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </Section>
          )}

          {/* Vehicle */}
          <Section title="Vehicle details">
            <Grid>
              <Field label="Nickname (optional)" value={v.label} onChange={x => updV('label', x)} fullRow />
              <Field label="Make" value={v.make} onChange={x => updV('make', x)} />
              <Field label="Model" value={v.model} onChange={x => updV('model', x)} />
              <Field label="Year" value={v.year} onChange={x => updV('year', x)} />
              <Field label="Colour" value={v.colour} onChange={x => updV('colour', x)} />
              <Field label="VIN" value={v.vin} onChange={x => updV('vin', x.toUpperCase())} fullRow />
              <Select label="Vehicle Type" value={v.vehicle_type} options={VEHICLE_TYPES} onChange={x => updV('vehicle_type', x)} />
              <Select label="Build Month" value={v.build_month} options={['', ...MONTHS]} onChange={x => updV('build_month', x)} />
              <Select label="Damage type" value={v.damage} options={['', ...DAMAGES]} onChange={x => updV('damage', x)} fullRow />
              <Select label="Purchased via" value={v.purchase_method} options={['', ...PURCHASE_METHODS]} onChange={x => updV('purchase_method', x)} />
              <Field label="Purchased from" value={v.purchased_from} onChange={x => updV('purchased_from', x)} />
              <div style={{ gridColumn: 'span 2' }}>
                <label style={lbl}>Latest acceptable WOVI date (your existing booking)</label>
                <input type="date" value={v.cutoff_date} onChange={e => updV('cutoff_date', e.target.value)} style={inp} />
                <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>The bot will only book slots earlier than this date.</div>
              </div>
            </Grid>
          </Section>

          {err && <div style={{ padding: 12, background: '#1f0c0c', border: '1px solid #3a1a1a', borderRadius: 6, color: '#f87171', fontSize: 13 }}>{err}</div>}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => router.replace('/account')} style={ghostBtn}>Cancel</button>
            <button type="submit" disabled={busy} style={primary}>
              {busy ? 'Adding…' : '+ Add vehicle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#111', border: '1px solid #222', borderRadius: 10, padding: 18 }}>
      <h2 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 14, letterSpacing: '0.06em', color: '#C9A84C', margin: '0 0 12px 0' }}>{title}</h2>
      {children}
    </div>
  )
}
function Grid({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>{children}</div>
}
function Field({ label, value, onChange, fullRow = false, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; fullRow?: boolean; type?: string }) {
  return (
    <div style={{ gridColumn: fullRow ? 'span 2' : undefined }}>
      <label style={lbl}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} style={inp} />
    </div>
  )
}
function Select({ label, value, options, onChange, fullRow = false }: { label: string; value: string; options: string[]; onChange: (v: string) => void; fullRow?: boolean }) {
  return (
    <div style={{ gridColumn: fullRow ? 'span 2' : undefined }}>
      <label style={lbl}>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} style={inp}>
        {options.map(o => <option key={o} value={o}>{o || '— Select —'}</option>)}
      </select>
    </div>
  )
}
const h1: React.CSSProperties = { fontFamily: 'Bebas Neue, sans-serif', fontSize: 26, letterSpacing: '0.06em', color: '#C9A84C', margin: '0 0 6px 0' }
const lbl: React.CSSProperties = { display: 'block', fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }
const inp: React.CSSProperties = { width: '100%', padding: '8px 10px', borderRadius: 6, background: '#0a0a0a', border: '1px solid #222', color: '#eee', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }
const primary: React.CSSProperties = { padding: '11px 18px', borderRadius: 6, background: '#C9A84C', color: '#000', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }
const ghostBtn: React.CSSProperties = { padding: '11px 18px', borderRadius: 6, background: 'none', color: '#888', border: '1px solid #333', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }
const loadingStyle: React.CSSProperties = { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a', color: '#888', fontFamily: 'DM Sans, sans-serif' }
function pill(on: boolean): React.CSSProperties {
  return {
    padding: '6px 12px', borderRadius: 999, fontSize: 12,
    background: on ? '#1a1200' : '#0a0a0a',
    border: `1px solid ${on ? '#4a3a00' : '#222'}`,
    color: on ? '#C9A84C' : '#888',
    cursor: 'pointer', fontFamily: 'inherit',
  }
}
function tierButton(on: boolean): React.CSSProperties {
  return {
    padding: '12px 14px', borderRadius: 8, textAlign: 'left',
    background: on ? '#1a1200' : '#0a0a0a',
    border: `1px solid ${on ? '#4a3a00' : '#222'}`,
    color: '#eee', cursor: 'pointer', fontFamily: 'inherit',
    width: '100%',
  }
}
