'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { validateVin, validateYear, validateCutoffDate, clampYearInput, validateMake, validateModel } from '@/lib/validators'

const WOVI_LOCATIONS = [
  'Brisbane', 'Bundaberg', 'Burleigh Heads', 'Cairns', 'Mackay',
  'Narangba', 'Rockhampton City', 'Toowoomba', 'Townsville', 'Yatala',
]
const VEHICLE_TYPES = ['Car', 'Motorcycle', 'Truck', 'Trailer', 'Caravan']
const COLOURS = ['White', 'Black', 'Silver', 'Grey', 'Blue', 'Red', 'Green', 'Yellow', 'Orange', 'Brown', 'Gold', 'Other']
const DAMAGES = [
  'HAIL DAMAGE', 'WATER DAMAGE', 'MALICIOUS DAMAGE', 'FIRE DAMAGE', 'STRUCTURAL DAMAGE',
  'IMPACT DAMAGE DRIVERS FRONT', 'IMPACT DAMAGE PASSENGER FRONT',
  'IMPACT DAMAGE DRIVERS SIDE', 'IMPACT DAMAGE PASSENGER SIDE',
  'IMPACT DAMAGE DRIVERS REAR', 'IMPACT DAMAGE PASSENGER REAR', 'OTHER',
]
const TIMES = [
  '8:00 AM', '8:30 AM', '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM',
]
const TIERS = [
  { id: 'priority', name: 'Priority', price: '$5',    desc: 'Books the instant a slot opens', metal: 'tier-gold' },
  { id: 'standard', name: 'Standard', price: '$3',    desc: '30s after Priority',             metal: 'tier-silver' },
  { id: 'basic',    name: 'Basic',    price: '$1.50', desc: '60s after Standard',             metal: 'tier-bronze' },
]
const MAX_LOC = 4
const MAX_PRIO = 2

// "Add a vehicle" for signed-in customers — the "My Garage" design. The
// customer's personal details come from their saved profile (edited on the
// Edit Details page); here they enter the VIN (auto-fills from auction
// records), the vehicle, their current WOVI booking, a per-vehicle tier, and
// up to 4 inspection locations (2 ranked priority).
export default function AddVehiclePage() {
  const router = useRouter()

  const [authReady, setAuthReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [authEmail, setAuthEmail] = useState<string>('')

  // Customer-level (prefilled from profile, submitted unchanged — not edited here)
  const [c, setC] = useState({
    state: 'QLD' as 'QLD' | 'SA',
    tier: 'priority' as 'priority' | 'standard' | 'basic',
    first_name: '', last_name: '', email: '', phone: '',
    address: '', suburb: '', postcode: '',
    crn: '', licence_number: '', date_of_birth: '',
  })

  const [locations, setLocations] = useState<string[]>([])
  const [priorityLocations, setPriorityLocations] = useState<string[]>([])

  const [v, setV] = useState({
    label: '', make: '', model: '', year: '', vin: '', colour: '',
    vehicle_type: 'Car', build_month: '',
    damage: '', purchase_method: '', purchased_from: '',
    cutoff_date: '',
    current_booking_time: '',
    current_booking_location: '',
  })

  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [lookup, setLookup] = useState<{ status: 'idle' | 'searching' | 'found' | 'none'; count: number }>({ status: 'idle', count: 0 })

  // Bootstrap — fetch profile + prefill the (hidden) customer fields.
  useEffect(() => {
    (async () => {
      const res = await fetch('/api/account/profile', { cache: 'no-store' })
      if (res.status === 401) { router.replace('/account/sign-in'); return }
      if (res.status === 404) { router.replace('/account/complete-profile'); return }
      if (!res.ok) { setAuthReady(true); return }
      const cust = await res.json()
      setAuthEmail(cust.email || '')
      setC(s => ({
        ...s,
        state: cust.state || 'QLD',
        tier: 'priority',
        first_name: cust.first_name || '', last_name: cust.last_name || '',
        email: cust.email || '', phone: cust.phone || '',
        address: cust.address || '', suburb: cust.suburb || '', postcode: cust.postcode || '',
        crn: cust.crn || '', licence_number: cust.licence_number || '', date_of_birth: cust.date_of_birth || '',
      }))
      setAuthReady(true)
    })()
  }, [router])

  // VIN → auction-intel lookup (debounced). Autofills only empty fields.
  useEffect(() => {
    const vin = v.vin.trim().toUpperCase()
    if (validateVin(vin)) { setLookup({ status: 'idle', count: 0 }); setPhotoUrl(null); return }
    let cancelled = false
    setLookup({ status: 'searching', count: 0 })
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/vehicle-lookup?vin=${encodeURIComponent(vin)}`)
        const d = await r.json()
        if (cancelled) return
        if (d?.found) {
          setLookup({ status: 'found', count: d.appearance_count || 0 })
          setPhotoUrl(d.photo_url || null)
          setV(s => ({
            ...s,
            make: s.make || (d.make || ''),
            model: s.model || (d.model || ''),
            year: s.year || (d.year ? String(d.year) : ''),
            colour: s.colour || (d.colour || ''),
          }))
        } else {
          setLookup({ status: 'none', count: 0 }); setPhotoUrl(null)
        }
      } catch {
        if (!cancelled) setLookup({ status: 'idle', count: 0 })
      }
    }, 500)
    return () => { cancelled = true; clearTimeout(t) }
  }, [v.vin])

  function updV<K extends keyof typeof v>(k: K, val: typeof v[K]) { setV(s => ({ ...s, [k]: val })) }

  function toggleLoc(loc: string) {
    if (locations.includes(loc)) {
      setLocations(locations.filter(x => x !== loc))
      setPriorityLocations(priorityLocations.filter(x => x !== loc))
    } else {
      if (locations.length >= MAX_LOC) return
      const next = [...locations, loc]
      setLocations(next)
      // Once a 2nd location is added, the first pick is auto-set as priority #1.
      if (next.length === 2 && priorityLocations.length === 0) setPriorityLocations([locations[0]])
    }
  }
  function togglePriority(loc: string) {
    if (priorityLocations.includes(loc)) setPriorityLocations(priorityLocations.filter(x => x !== loc))
    else if (priorityLocations.length < MAX_PRIO) setPriorityLocations([...priorityLocations, loc])
  }

  // Gate Register on the vehicle + booking fields (personal details come from
  // the saved profile). Matches the prototype's "fill everything" rule.
  function validateAll(): string {
    const vinErr = validateVin(v.vin);     if (vinErr)   return vinErr
    const makeErr = validateMake(v.make);  if (makeErr)  return makeErr
    const modelErr = validateModel(v.model); if (modelErr) return modelErr
    const yearErr = validateYear(v.year);  if (yearErr)  return yearErr
    if (!v.colour) return 'Select a colour.'
    if (!v.vehicle_type) return 'Select a vehicle type.'
    if (!v.damage) return 'Select the damage type.'
    const cutoffErr = validateCutoffDate(v.cutoff_date); if (cutoffErr) return cutoffErr
    if (!v.current_booking_time) return 'Select your current booking time.'
    if (!v.current_booking_location) return 'Select your current booking location.'
    if (c.state === 'QLD' && locations.length < 1) return 'Pick at least one inspection location.'
    return ''
  }
  const formErr = validateAll()
  const formValid = formErr === ''

  async function submit() {
    setErr(null)
    if (!formValid) { setErr(formErr); return }
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
          tier: c.tier,
          photo_url: photoUrl,
          current_booking_time: v.current_booking_time || null,
          current_booking_location: v.current_booking_location || (c.state === 'SA' ? 'Regency Park' : null),
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

  if (!authReady) {
    return <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A] text-[#99907e]" style={{ fontFamily: 'DM Sans, sans-serif' }}>Loading…</div>
  }

  const bookingLocations = c.state === 'QLD' ? WOVI_LOCATIONS : ['Regency Park']

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#e5e2e1]" style={{ fontFamily: 'DM Sans, sans-serif' }}>
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#131313]/95 backdrop-blur border-b border-white/10 h-16 flex items-center justify-between px-5">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => router.replace('/account')} className="text-[#d0c5b2] flex items-center" aria-label="Back to garage">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="av-bebas text-[24px] text-[#e6c364]">Add Vehicle</h1>
        </div>
        <form action="/auth/sign-out" method="post" className="m-0">
          <button type="submit" className="text-[11px] text-[#99907e] border border-[#333] rounded-md px-2.5 py-1">Sign out</button>
        </form>
      </header>

      <main className="max-w-2xl mx-auto px-5 pt-6 pb-16 space-y-8">
        <section className="space-y-1">
          <h2 className="av-bebas text-[32px] text-[#e6c364] leading-none">Add a Vehicle</h2>
          <p className="text-[#d0c5b2] text-[15px] max-w-md">Enter your VIN — we&apos;ll pull the photo and details from auction records instantly.{authEmail ? <span className="text-[#99907e]"> Signed in as {authEmail}.</span> : null}</p>
        </section>
        <div className="sec-divider" />

        {/* VIN search card */}
        <section>
          <div className="vin-card">
            <div className="flex items-center gap-3 mb-4">
              <div className="vin-badge"><span className="material-symbols-outlined">search</span></div>
              <div>
                <p className="av-bebas text-[20px] text-[#e5e2e1] leading-none">Find your vehicle</p>
                <p className="text-[12px] text-[#99907e] mt-1">Smart VIN lookup across auction records</p>
              </div>
            </div>
            <div className="relative flex items-center">
              <span className="material-symbols-outlined absolute left-4 text-[#e6c364] pointer-events-none">search</span>
              <input
                className="vin-search av-input pl-12 pr-4"
                value={v.vin}
                maxLength={17}
                placeholder="Enter your VIN"
                autoComplete="off"
                onChange={e => updV('vin', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 17))}
                style={(v.vin && validateVin(v.vin)) ? { borderColor: '#a33' } : undefined}
              />
            </div>
            {v.vin && validateVin(v.vin) ? (
              <p className="text-[12px] text-[#f87171] mt-2">{validateVin(v.vin)}</p>
            ) : lookup.status === 'searching' ? (
              <p className="text-[13px] text-[#99907e] mt-3">Searching auction records…</p>
            ) : lookup.status === 'found' ? (
              <div className="mt-3 rounded-lg p-3" style={{ background: 'rgba(90,219,90,0.08)' }}>
                <div className="flex items-center gap-1.5 text-[#7fe07f] text-[13px]">
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>verified</span>
                  Match found{lookup.count ? ` · ${lookup.count} appearance${lookup.count > 1 ? 's' : ''}` : ''} — details autofilled below.
                </div>
                {photoUrl && (
                  <div className="mt-2 rounded-lg overflow-hidden border border-[#222]" style={{ maxWidth: 300 }}>
                    <img src={photoUrl} alt="Vehicle" onError={() => setPhotoUrl(null)} className="w-full block" />
                  </div>
                )}
              </div>
            ) : lookup.status === 'none' ? (
              <p className="text-[13px] text-[#99907e] mt-3">No auction record on file — enter the details manually.</p>
            ) : (
              <div className="flex items-center gap-1.5 text-[11px] text-[#99907e] mt-2">
                <span className="material-symbols-outlined text-[#e6c364]" style={{ fontSize: 14 }}>bolt</span>
                We search auction records as you type.
              </div>
            )}
          </div>
        </section>
        <div className="sec-divider" />

        {/* Vehicle details */}
        <section className="space-y-4">
          <div>
            <label className="av-label">Vehicle details</label>
            <p className="text-[12px] text-[#99907e] italic">Autofilled from auction records when we have your VIN — edit anything.</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <AVField label="Make" value={v.make} placeholder="e.g. Toyota" error={v.make ? validateMake(v.make) : null}
              onChange={x => updV('make', x.replace(/[^A-Za-z0-9\s\-/]/g, '').slice(0, 30))} />
            <AVField label="Model" value={v.model} placeholder="e.g. HiLux" error={v.model ? validateModel(v.model) : null}
              onChange={x => updV('model', x.replace(/[^A-Za-z0-9\s\-/.]/g, '').slice(0, 40))} />
            <AVField label="Year" value={v.year} placeholder="e.g. 2022" inputMode="numeric" maxLength={4} error={v.year ? validateYear(v.year) : null}
              onChange={x => updV('year', clampYearInput(x))} />
            <AVSelect label="Colour" value={v.colour} placeholder="Select" options={COLOURS} onChange={x => updV('colour', x)} />
            <AVSelect label="Vehicle type" value={v.vehicle_type} options={VEHICLE_TYPES} onChange={x => updV('vehicle_type', x)} />
            <AVSelect label="Damage" value={v.damage} placeholder="Select" options={DAMAGES} onChange={x => updV('damage', x)} />
          </div>
        </section>
        <div className="sec-divider" />

        {/* Current WOVI booking */}
        <section className="space-y-4">
          <div>
            <label className="av-label">Your current {c.state === 'QLD' ? 'WOVI' : 'Service SA'} booking</label>
            <p className="text-[12px] text-[#99907e] italic">The inspection you already have booked — we only rebook if we find an earlier slot.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="av-label">Date</label>
              <input type="date" className="av-input" value={v.cutoff_date}
                onChange={e => updV('cutoff_date', e.target.value)}
                style={(v.cutoff_date && validateCutoffDate(v.cutoff_date)) ? { borderColor: '#a33' } : undefined} />
              {v.cutoff_date && validateCutoffDate(v.cutoff_date) && <p className="text-[12px] text-[#f87171] mt-1">{validateCutoffDate(v.cutoff_date)}</p>}
            </div>
            <AVSelect label="Time" value={v.current_booking_time} placeholder="Select time" options={TIMES} onChange={x => updV('current_booking_time', x)} />
          </div>
          <AVSelect label="Location" value={v.current_booking_location} placeholder="Select centre" options={bookingLocations} onChange={x => updV('current_booking_location', x)} />
        </section>
        <div className="sec-divider" />

        {/* Monitoring tier */}
        <section>
          <label className="av-label">Monitoring Tier <span className="text-[11px] text-[#99907e] normal-case tracking-normal">· per vehicle</span></label>
          <div className="grid grid-cols-3 gap-2 mt-1">
            {TIERS.map(t => (
              <button key={t.id} type="button" onClick={() => setC(s => ({ ...s, tier: t.id as any }))}
                className={`tier-card ${t.metal} ${c.tier === t.id ? 'sel' : ''}`}>
                <span className="material-symbols-outlined t-medal">military_tech</span>
                <span className="t-name">{t.name}</span>
                <span className="t-price">{t.price}</span>
                <span className="t-desc">{t.desc}</span>
              </button>
            ))}
          </div>
        </section>
        <div className="sec-divider" />

        {/* Inspection locations (QLD) */}
        {c.state === 'QLD' && (
          <section className="space-y-4">
            <div>
              <label className="av-label">Which locations for your next booking? <span className="text-[11px] text-[#99907e] normal-case tracking-normal">(up to {MAX_LOC})</span></label>
              <p className="text-[12px] text-[#99907e] italic">Pick up to {MAX_LOC} WOVI centres you&apos;d accept an earlier slot at.</p>
            </div>
            <div className={`loc-grid grid grid-cols-2 gap-2 ${locations.length >= MAX_LOC ? 'maxed' : ''}`}>
              {WOVI_LOCATIONS.map(loc => {
                const on = locations.includes(loc)
                return (
                  <button key={loc} type="button" onClick={() => toggleLoc(loc)} className={`loc-opt ${on ? 'sel' : ''}`}>
                    <span className="material-symbols-outlined loc-ic">{on ? 'check_circle' : 'location_on'}</span>
                    <span>{loc}</span>
                  </button>
                )
              })}
            </div>
            {locations.length >= 2 && (
              <div>
                <label className="av-label">Priority <span className="text-[11px] text-[#99907e] normal-case tracking-normal">(up to {MAX_PRIO})</span></label>
                <p className="text-[12px] text-[#99907e] italic mb-2">Your first pick is #1 by default. Tap another to make it #2 — ① is tried before ②.</p>
                <div className="flex flex-wrap gap-2">
                  {locations.map(loc => {
                    const idx = priorityLocations.indexOf(loc)
                    const isP = idx > -1
                    const atMax = priorityLocations.length >= MAX_PRIO && !isP
                    return (
                      <button key={loc} type="button" onClick={() => togglePriority(loc)} className={`prio-chip ${isP ? 'on' : ''} ${atMax ? 'dim' : ''}`}>
                        {isP && <span className="pnum">{idx + 1}</span>}{loc}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </section>
        )}

        {err && <div className="rounded-lg p-3 text-[13px]" style={{ background: '#1f0c0c', border: '1px solid #3a1a1a', color: '#f87171' }}>{err}</div>}

        <button type="button" onClick={submit} disabled={busy || !formValid} className="av-register" title={formValid ? '' : formErr}>
          {busy ? 'Adding…' : <>REGISTER VEHICLE <span className="material-symbols-outlined">arrow_forward</span></>}
        </button>
        {!formValid && <p className="text-[12px] text-[#99907e] text-center -mt-2">{formErr}</p>}
      </main>
    </div>
  )
}

function AVField({ label, value, onChange, placeholder, inputMode, maxLength, error }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
  inputMode?: 'numeric' | 'text'; maxLength?: number; error?: string | null
}) {
  return (
    <div>
      <label className="av-label">{label}</label>
      <input className="av-input" value={value} placeholder={placeholder} inputMode={inputMode} maxLength={maxLength}
        onChange={e => onChange(e.target.value)} style={error ? { borderColor: '#a33' } : undefined} />
      {error && <p className="text-[12px] text-[#f87171] mt-1">{error}</p>}
    </div>
  )
}

function AVSelect({ label, value, onChange, options, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; options: string[]; placeholder?: string
}) {
  return (
    <div>
      <label className="av-label">{label}</label>
      <select className="av-input appearance-none" value={value} onChange={e => onChange(e.target.value)}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}
