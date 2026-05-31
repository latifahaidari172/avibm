'use client'

import { useState, useEffect, type CSSProperties } from 'react'
import { useRouter } from 'next/navigation'
import { validateVin, validateYear, validateCutoffDate, clampYearInput, validateMake, validateModel } from '@/lib/validators'
import { PreviewShell, Arrow, BackToGarage } from '@/lib/previewDesign'
import ProfileMenu from '@/components/ProfileMenu'

const WOVI_LOCATIONS = [
  'Brisbane', 'Bundaberg', 'Burleigh Heads', 'Cairns', 'Mackay',
  'Narangba', 'Rockhampton City', 'Toowoomba', 'Townsville', 'Yatala',
]
const VEHICLE_TYPES = ['Car', 'Motorcycle', 'Truck', 'Trailer', 'Caravan']
const COLOURS = ['White', 'Black', 'Silver', 'Grey', 'Blue', 'Red', 'Green', 'Yellow', 'Orange', 'Brown', 'Gold', 'Other']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const PURCHASE_METHODS = ['Auction', 'Private Sale', 'Insurance', 'Other']
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
  { id: 'priority', name: 'Priority', price: '$5',    desc: 'Books the instant a slot opens', c: 'var(--gold-2)' },
  { id: 'standard', name: 'Standard', price: '$3',    desc: '30s after Priority',             c: '#cfcabb' },
  { id: 'basic',    name: 'Basic',    price: '$1.50', desc: '60s after Standard',             c: '#b08d57' },
]
const MAX_LOC = 4
const MAX_PRIO = 2

function fmtDate(d: string | null | undefined): string | null {
  if (!d) return null
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return d
  return dt.toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

// "Add a vehicle" for signed-in customers — maximalist "Ethereal Glass" design.
// Personal details come from the saved profile; here the customer enters the
// VIN (auto-fills from auction records), the vehicle, their current WOVI
// booking, a per-vehicle tier, and up to 4 inspection locations (2 ranked).
export default function AddVehiclePage() {
  const router = useRouter()

  const [authReady, setAuthReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [authEmail, setAuthEmail] = useState<string>('')

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

  const [photos, setPhotos] = useState<string[]>([])
  const [photoIdx, setPhotoIdx] = useState(0)
  const [photoSave, setPhotoSave] = useState<string | null>(null)
  const photoUrl = photos[photoIdx] || null
  const [candidate, setCandidate] = useState<{
    make: string; model: string; year: string; colour: string
    series?: string | null; badge?: string | null; body_type?: string | null
    transmission?: string | null; odometer_km?: number | null; source?: string | null
    auction_date?: string | null; damage?: string | null
    build_month?: string | null; build_date?: string | null
    vehicle_type?: string | null
  } | null>(null)
  const [lookup, setLookup] = useState<{ status: 'idle' | 'searching' | 'found' | 'autofilled' | 'declined' | 'none' }>({ status: 'idle' })
  const [autoFields, setAutoFields] = useState<Set<string>>(new Set())

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

  useEffect(() => {
    const vin = v.vin.trim().toUpperCase()
    if (validateVin(vin)) { setLookup({ status: 'idle' }); setCandidate(null); setPhotos([]); setPhotoIdx(0); setPhotoSave(null); setAutoFields(new Set()); return }
    let cancelled = false
    setLookup({ status: 'searching' }); setCandidate(null); setAutoFields(new Set())
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/vehicle-lookup?vin=${encodeURIComponent(vin)}`)
        const d = await r.json()
        if (cancelled) return
        if (d?.found) {
          setCandidate({
            make: d.make || '', model: d.model || '',
            year: d.year ? String(d.year) : '', colour: d.colour || '',
            series: d.series || null, badge: d.badge || null, body_type: d.body_type || null,
            transmission: d.transmission || null, odometer_km: d.odometer_km ?? null, source: d.source || null,
            auction_date: d.auction_date || null, damage: d.damage || null,
            build_month: d.build_month || null, build_date: d.build_date || null,
            vehicle_type: d.vehicle_type || null,
          })
          const cands: string[] = Array.isArray(d.photo_candidates)
            ? d.photo_candidates.filter(Boolean)
            : [d.photo_url, d.photo_fallback].filter(Boolean)
          setPhotos(cands); setPhotoIdx(0)
          setPhotoSave(d.photo_durable || cands[0] || null)
          setLookup({ status: 'found' })
        } else {
          setLookup({ status: 'none' }); setCandidate(null); setPhotos([]); setPhotoIdx(0); setPhotoSave(null)
        }
      } catch {
        if (!cancelled) setLookup({ status: 'idle' })
      }
    }, 500)
    return () => { cancelled = true; clearTimeout(t) }
  }, [v.vin])

  function updV<K extends keyof typeof v>(k: K, val: typeof v[K]) {
    setV(s => ({ ...s, [k]: val }))
    setAutoFields(prev => {
      if (!prev.has(k as string)) return prev
      const n = new Set(prev); n.delete(k as string); return n
    })
  }

  function acceptMatch() {
    if (!candidate) return
    const filled = new Set<string>()
    const patch: Partial<typeof v> = {}
    if (candidate.make)   { patch.make = candidate.make;     filled.add('make') }
    if (candidate.model)  { patch.model = candidate.model;   filled.add('model') }
    if (candidate.year)   { patch.year = candidate.year;     filled.add('year') }
    if (candidate.colour) { patch.colour = candidate.colour; filled.add('colour') }
    if (candidate.build_month && MONTHS.includes(candidate.build_month)) { patch.build_month = candidate.build_month; filled.add('build_month') }
    if (candidate.vehicle_type && VEHICLE_TYPES.includes(candidate.vehicle_type)) { patch.vehicle_type = candidate.vehicle_type; filled.add('vehicle_type') }
    if (candidate.damage && DAMAGES.includes(candidate.damage)) { patch.damage = candidate.damage; filled.add('damage') }
    patch.purchase_method = 'Auction'; filled.add('purchase_method')
    if (candidate.source) { patch.purchased_from = candidate.source; filled.add('purchased_from') }
    setV(s => ({ ...s, ...patch }))
    setAutoFields(filled)
    setLookup({ status: 'autofilled' })
  }
  function declineMatch() {
    setPhotos([]); setPhotoIdx(0); setPhotoSave(null)
    setLookup({ status: 'declined' })
  }
  function onPhotoError() {
    setPhotoIdx(i => i + 1)
  }

  function toggleLoc(loc: string) {
    if (locations.includes(loc)) {
      setLocations(locations.filter(x => x !== loc))
      setPriorityLocations(priorityLocations.filter(x => x !== loc))
    } else {
      if (locations.length >= MAX_LOC) return
      const next = [...locations, loc]
      setLocations(next)
      if (next.length === 2 && priorityLocations.length === 0) setPriorityLocations([locations[0]])
    }
  }
  function togglePriority(loc: string) {
    if (priorityLocations.includes(loc)) setPriorityLocations(priorityLocations.filter(x => x !== loc))
    else if (priorityLocations.length < MAX_PRIO) setPriorityLocations([...priorityLocations, loc])
  }

  function validateAll(): string {
    const vinErr = validateVin(v.vin);     if (vinErr)   return vinErr
    const makeErr = validateMake(v.make);  if (makeErr)  return makeErr
    const modelErr = validateModel(v.model); if (modelErr) return modelErr
    const yearErr = validateYear(v.year);  if (yearErr)  return yearErr
    if (!v.colour) return 'Select a colour.'
    if (!v.vehicle_type) return 'Select a vehicle type.'
    if (!v.build_month) return 'Select the build month.'
    if (!v.damage) return 'Select the damage type.'
    if (!v.purchase_method) return 'Select how the vehicle was bought.'
    if (!v.purchased_from.trim()) return 'Tell us where the vehicle was purchased from.'
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
          photo_url: photoSave,
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
    return <PreviewShell><p style={{ color: 'var(--muted)' }}>Loading…</p></PreviewShell>
  }

  const bookingLocations = c.state === 'QLD' ? WOVI_LOCATIONS : ['Regency Park']
  const showNeeds = lookup.status === 'autofilled' || lookup.status === 'declined' || lookup.status === 'none'

  return (
    <PreviewShell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <BackToGarage href="/account" />
        <div className="r"><ProfileMenu email={authEmail} /></div>
      </div>

      <div className="r" style={{ marginBottom: 26 }}>
        <span className="eyebrow">Add a vehicle</span>
        <h1 className="disp" style={{ fontSize: 'clamp(36px,5vw,60px)', marginTop: 16 }}>Add a <span className="shimmer">vehicle</span></h1>
        <p style={{ color: 'var(--muted)', fontSize: 15, marginTop: 14, maxWidth: 480 }}>Enter your VIN — we pull the photo and details straight from auction records.{authEmail ? <span style={{ color: '#6f6757' }}> Signed in as {authEmail}.</span> : null}</p>
      </div>

      {/* VIN search + match */}
      <div className="r card" style={{ animationDelay: '.06s', padding: 26, marginBottom: 18 }}>
        <div style={{ position: 'relative' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--gold-2)" strokeWidth="1.7" style={{ position: 'absolute', left: 16, top: 15 }}><circle cx="11" cy="11" r="7" /><path d="m20 20-3-3" strokeLinecap="round" /></svg>
          <input className="inp" value={v.vin} maxLength={17} placeholder="Enter your VIN" autoComplete="off"
            onChange={e => updV('vin', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 17))}
            style={{ paddingLeft: 44, fontFamily: 'ui-monospace,monospace', letterSpacing: '0.06em', ...((v.vin && validateVin(v.vin)) ? { borderColor: '#a33' } : {}) }} />
        </div>

        {v.vin && validateVin(v.vin) ? (
          <p style={{ fontSize: 12, color: '#f08a8a', marginTop: 8 }}>{validateVin(v.vin)}</p>
        ) : lookup.status === 'searching' ? (
          <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 12 }}>Searching auction records…</p>
        ) : lookup.status === 'found' && candidate ? (
          <div style={{ marginTop: 18, borderRadius: 18, overflow: 'hidden', border: '1px solid rgba(98,227,106,0.3)' }}>
            {(() => {
              const found = (
                <span className="spill" style={{ color: 'var(--green)', background: 'rgba(98,227,106,0.18)', border: '1px solid var(--green)' }}><span className="dot" style={{ background: 'var(--green)' }} />Found in auction records</span>
              )
              const title = [candidate.year, candidate.make, candidate.model, candidate.badge].filter(Boolean).join(' ') || 'Vehicle'
              return photoUrl ? (
                <div style={{ position: 'relative', height: 170 }}>
                  <img src={photoUrl} alt="" onError={onPhotoError} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(6,6,6,0.95), transparent 60%)' }} />
                  <div style={{ position: 'absolute', top: 12, left: 12 }}>{found}</div>
                  <div className="disp" style={{ position: 'absolute', left: 16, right: 16, bottom: 12, fontSize: 24, color: '#fff', textShadow: '0 2px 12px rgba(0,0,0,0.8)' }}>{title}</div>
                </div>
              ) : (
                <div style={{ padding: '16px 16px 0' }}>{found}<div className="disp" style={{ fontSize: 24, color: 'var(--gold-2)', marginTop: 10 }}>{title}</div></div>
              )
            })()}
            <div style={{ background: 'rgba(98,227,106,0.04)', padding: 18 }}>
              {(() => {
                const specs = ([
                  ['Series', candidate.series], ['Body', candidate.body_type], ['Build', candidate.build_date],
                  ['Transmission', candidate.transmission], ['Odometer', candidate.odometer_km ? `${candidate.odometer_km.toLocaleString()} km` : null],
                  ['Colour', candidate.colour], ['Damage', candidate.damage], ['Bought from', candidate.source], ['Auction date', fmtDate(candidate.auction_date)],
                ] as [string, any][]).filter(([, val]) => val)
                return specs.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: '14px 20px', marginBottom: 16 }}>
                    {specs.map(([label, val]) => (<div key={label}><div className="fl">{label}</div><div className="fv" style={{ fontSize: 14 }}>{val}</div></div>))}
                  </div>
                ) : null
              })()}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>Is this your vehicle?</span>
                <button type="button" className="pill gold" onClick={acceptMatch} style={{ padding: '10px 20px' }}>Yes, autofill</button>
                <button type="button" className="pill ghost" onClick={declineMatch} style={{ padding: '10px 18px' }}>No</button>
              </div>
            </div>
          </div>
        ) : lookup.status === 'autofilled' ? (
          <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--green)', fontSize: 13 }}>
            <span className="dot" style={{ background: 'var(--green)' }} />Autofilled from auction records — edit anything that&apos;s different.
          </div>
        ) : lookup.status === 'declined' ? (
          <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 12 }}>No problem — enter the details manually below.</p>
        ) : lookup.status === 'none' ? (
          <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 12 }}>No auction record on file — enter the details manually.</p>
        ) : (
          <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 10 }}>We search auction records as you type.</p>
        )}
      </div>

      {/* vehicle details */}
      <div className="r card" style={{ animationDelay: '.1s', padding: 26, marginBottom: 18 }}>
        <span className="eyebrow">Vehicle details</span>
        <p style={{ color: 'var(--muted)', fontSize: 12, marginTop: 8, fontStyle: 'italic' }}>Autofilled from auction records when we have your VIN — edit anything.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 18, marginTop: 20 }}>
          <AVField label="Make" value={v.make} placeholder="e.g. Toyota" error={v.make ? validateMake(v.make) : null} autofilled={autoFields.has('make')} needsInput={showNeeds && !v.make} onChange={x => updV('make', x.replace(/[^A-Za-z0-9\s\-/]/g, '').slice(0, 30))} />
          <AVField label="Model" value={v.model} placeholder="e.g. HiLux" error={v.model ? validateModel(v.model) : null} autofilled={autoFields.has('model')} needsInput={showNeeds && !v.model} onChange={x => updV('model', x.replace(/[^A-Za-z0-9\s\-/.]/g, '').slice(0, 40))} />
          <AVField label="Year" value={v.year} placeholder="e.g. 2022" inputMode="numeric" maxLength={4} error={v.year ? validateYear(v.year) : null} autofilled={autoFields.has('year')} needsInput={showNeeds && !v.year} onChange={x => updV('year', clampYearInput(x))} />
          <AVSelect label="Build month" value={v.build_month} placeholder="Select" options={MONTHS} autofilled={autoFields.has('build_month')} needsInput={showNeeds && !v.build_month} onChange={x => updV('build_month', x)} />
          <AVSelect label="Colour" value={v.colour} placeholder="Select" options={COLOURS} autofilled={autoFields.has('colour')} needsInput={showNeeds && !v.colour} onChange={x => updV('colour', x)} />
          <AVSelect label="Vehicle type" value={v.vehicle_type} options={VEHICLE_TYPES} autofilled={autoFields.has('vehicle_type')} onChange={x => updV('vehicle_type', x)} />
          <AVSelect label="Damage" value={v.damage} placeholder="Select" options={DAMAGES} autofilled={autoFields.has('damage')} needsInput={showNeeds && !v.damage} onChange={x => updV('damage', x)} />
          <AVSelect label="How did you buy it?" value={v.purchase_method} placeholder="Select" options={PURCHASE_METHODS} autofilled={autoFields.has('purchase_method')} needsInput={showNeeds && !v.purchase_method} onChange={x => updV('purchase_method', x)} />
        </div>
        <div style={{ marginTop: 18 }}>
          <AVField label="Where was it purchased from?" value={v.purchased_from} placeholder="e.g. Pickles, a dealer, a private seller" autofilled={autoFields.has('purchased_from')} needsInput={showNeeds && !v.purchased_from.trim()} onChange={x => updV('purchased_from', x)} />
        </div>
      </div>

      {/* current booking */}
      <div className="r card" style={{ animationDelay: '.13s', padding: 26, marginBottom: 18 }}>
        <span className="eyebrow">Your current {c.state === 'QLD' ? 'WOVI' : 'Service SA'} booking</span>
        <p style={{ color: 'var(--muted)', fontSize: 12, marginTop: 8, fontStyle: 'italic' }}>The inspection you already have booked — we only rebook if we find an earlier slot.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 18, marginTop: 20 }}>
          <div>
            <div className="fl" style={{ marginBottom: 7 }}>Date</div>
            <input className="inp" type="date" value={v.cutoff_date} onChange={e => updV('cutoff_date', e.target.value)} style={(v.cutoff_date && validateCutoffDate(v.cutoff_date)) ? { borderColor: '#a33' } : undefined} />
            {v.cutoff_date && validateCutoffDate(v.cutoff_date) && <p style={{ fontSize: 12, color: '#f08a8a', marginTop: 6 }}>{validateCutoffDate(v.cutoff_date)}</p>}
          </div>
          <AVSelect label="Time" value={v.current_booking_time} placeholder="Select time" options={TIMES} onChange={x => updV('current_booking_time', x)} />
          <AVSelect label="Location" value={v.current_booking_location} placeholder="Select centre" options={bookingLocations} onChange={x => updV('current_booking_location', x)} />
        </div>
      </div>

      {/* tiers */}
      <div className="r" style={{ animationDelay: '.16s', marginBottom: 14 }}><span className="eyebrow">Monitoring tier · per vehicle</span></div>
      <div className="r" style={{ animationDelay: '.18s', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 14, marginBottom: 18 }}>
        {TIERS.map(t => (
          <button key={t.id} type="button" onClick={() => setC(s => ({ ...s, tier: t.id as any }))} className="card" style={{ padding: 20, textAlign: 'left', cursor: 'pointer', border: 'none', background: c.tier === t.id ? 'radial-gradient(120% 120% at 50% 0%, rgba(201,168,76,0.16), transparent 60%), linear-gradient(180deg,rgba(20,18,16,0.9),rgba(11,10,9,0.95))' : undefined, boxShadow: c.tier === t.id ? '0 0 0 1px rgba(201,168,76,0.5)' : undefined }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span className="disp" style={{ fontSize: 22, color: t.c }}>{t.name}</span>
              <span className="disp" style={{ fontSize: 26, color: 'var(--ink)' }}>{t.price}</span>
            </div>
            <p style={{ color: 'var(--muted)', fontSize: 12, marginTop: 8 }}>{t.desc}</p>
          </button>
        ))}
      </div>

      {/* locations (QLD) */}
      {c.state === 'QLD' && (
        <div className="r card" style={{ animationDelay: '.2s', padding: 26, marginBottom: 18 }}>
          <span className="eyebrow">Inspection locations · up to {MAX_LOC}</span>
          <p style={{ color: 'var(--muted)', fontSize: 12, marginTop: 8, fontStyle: 'italic' }}>Pick up to {MAX_LOC} WOVI centres you&apos;d accept an earlier slot at.</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16, opacity: locations.length >= MAX_LOC ? 0.85 : 1 }}>
            {WOVI_LOCATIONS.map(loc => {
              const on = locations.includes(loc)
              return <button key={loc} type="button" onClick={() => toggleLoc(loc)} className={on ? 'chip on' : 'chip'}>{loc}</button>
            })}
          </div>
          {locations.length >= 2 && (
            <div style={{ marginTop: 18 }}>
              <div className="fl" style={{ marginBottom: 6 }}>Priority · up to {MAX_PRIO}</div>
              <p style={{ color: 'var(--muted)', fontSize: 12, fontStyle: 'italic', marginBottom: 10 }}>Your first pick is #1 by default. Tap another to make it #2 — ① is tried before ②.</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {locations.map(loc => {
                  const idx = priorityLocations.indexOf(loc)
                  const isP = idx > -1
                  const atMax = priorityLocations.length >= MAX_PRIO && !isP
                  return (
                    <button key={loc} type="button" onClick={() => togglePriority(loc)} className={isP ? 'chip on' : 'chip'} style={atMax ? { opacity: 0.45 } : undefined}>
                      {isP && <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 16, height: 16, borderRadius: '50%', background: 'rgba(0,0,0,0.25)', color: '#231900', fontSize: 10, fontWeight: 800, marginRight: 6 }}>{idx + 1}</span>}{loc}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {err && <div className="r" style={{ marginBottom: 14, padding: 12, borderRadius: 12, background: 'rgba(240,120,120,0.1)', border: '1px solid rgba(240,120,120,0.4)', color: '#f08a8a', fontSize: 13 }}>{err}</div>}

      <div className="r" style={{ animationDelay: '.22s', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
        <button type="button" onClick={submit} disabled={busy || !formValid} className="pill gold" style={{ fontSize: 15, opacity: (busy || !formValid) ? 0.5 : 1, cursor: (busy || !formValid) ? 'not-allowed' : 'pointer' }} title={formValid ? '' : formErr}>
          {busy ? 'Adding…' : <>Register vehicle<span className="ibtn"><Arrow /></span></>}
        </button>
        {!formValid && <p style={{ fontSize: 12, color: 'var(--muted)' }}>{formErr}</p>}
      </div>
    </PreviewShell>
  )
}

// AUTO (gold) / NEEDS INPUT (amber) badge beside a field label.
function FieldTag({ autofilled, needsInput }: { autofilled?: boolean; needsInput?: boolean }) {
  if (autofilled) return <span style={{ marginLeft: 8, fontSize: 8, fontWeight: 800, letterSpacing: '0.08em', color: 'var(--gold-2)', background: 'rgba(201,168,76,0.16)', border: '1px solid rgba(201,168,76,0.5)', borderRadius: 999, padding: '1px 7px' }}>AUTO</span>
  if (needsInput) return <span style={{ marginLeft: 8, fontSize: 8, fontWeight: 800, letterSpacing: '0.08em', color: 'var(--amber)', background: 'rgba(240,169,60,0.12)', border: '1px solid rgba(240,169,60,0.45)', borderRadius: 999, padding: '1px 7px' }}>NEEDS INPUT</span>
  return null
}

// error (red) wins, then autofilled (gold), then needs-input (amber dashed).
function fieldStyle(error?: string | null, autofilled?: boolean, needsInput?: boolean): CSSProperties | undefined {
  if (error) return { borderColor: '#a33' }
  if (autofilled) return { borderColor: 'rgba(201,168,76,0.55)', background: 'rgba(201,168,76,0.06)' }
  if (needsInput) return { borderColor: 'rgba(240,169,60,0.4)', borderStyle: 'dashed' }
  return undefined
}

function AVField({ label, value, onChange, placeholder, inputMode, maxLength, error, autofilled, needsInput }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
  inputMode?: 'numeric' | 'text'; maxLength?: number; error?: string | null
  autofilled?: boolean; needsInput?: boolean
}) {
  return (
    <div>
      <div className="fl" style={{ marginBottom: 7 }}>{label}<FieldTag autofilled={autofilled} needsInput={needsInput} /></div>
      <input className="inp" value={value} placeholder={placeholder} inputMode={inputMode} maxLength={maxLength} onChange={e => onChange(e.target.value)} style={fieldStyle(error, autofilled, needsInput)} />
      {error && <p style={{ fontSize: 12, color: '#f08a8a', marginTop: 6 }}>{error}</p>}
    </div>
  )
}

function AVSelect({ label, value, onChange, options, placeholder, autofilled, needsInput }: {
  label: string; value: string; onChange: (v: string) => void; options: string[]; placeholder?: string
  autofilled?: boolean; needsInput?: boolean
}) {
  return (
    <div>
      <div className="fl" style={{ marginBottom: 7 }}>{label}<FieldTag autofilled={autofilled} needsInput={needsInput} /></div>
      <select className="inp" value={value} onChange={e => onChange(e.target.value)} style={{ ...fieldStyle(null, autofilled, needsInput), appearance: 'auto' }}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}
