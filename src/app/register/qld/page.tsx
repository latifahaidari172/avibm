'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

const DAMAGE_OPTIONS = ['Hail Damage', 'Flood Damage', 'Collision Damage', 'Fire Damage', 'Other']
const PURCHASE_OPTIONS = ['Auction', 'Private Sale', 'Insurance', 'Other']
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const VEHICLE_TYPES = ['Car', 'Motorcycle', 'Truck', 'Trailer', 'Caravan']

const WOVI_LOCATIONS: { name: string; lat: number; lng: number; address: string }[] = [
  { name: 'Brisbane',         lat: -27.4354, lng: 153.0870, address: '110 Lamington Ave, Eagle Farm QLD 4009' },
  { name: 'Bundaberg',        lat: -24.8661, lng: 152.3489, address: 'Bundaberg QLD' },
  { name: 'Burleigh Heads',   lat: -28.0856, lng: 153.4334, address: '52-56 Township Dr, Burleigh Heads QLD 4220' },
  { name: 'Cairns',           lat: -16.9186, lng: 145.7538, address: 'Unit 4/261 McCormack St, Manunda QLD 4870' },
  { name: 'Mackay',           lat: -21.1411, lng: 149.1860, address: 'Mackay QLD' },
  { name: 'Narangba',         lat: -27.1986, lng: 152.9636, address: 'Shed 14/10 Cerium St, Narangba QLD 4504' },
  { name: 'Rockhampton City', lat: -23.3791, lng: 150.5100, address: 'Rockhampton QLD' },
  { name: 'Toowoomba',        lat: -27.5562, lng: 151.9418, address: '9/11-15 Gardner Ct, Toowoomba QLD 4350' },
  { name: 'Townsville',       lat: -19.2590, lng: 146.7218, address: '647-651 Ingham Rd, Bohle QLD 4818' },
  { name: 'Yatala',           lat: -27.7183, lng: 153.2230, address: 'Yatala QLD 4207' },
]

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

async function geocodeAddress(address: string): Promise<{lat: number, lng: number} | null> {
  try {
    const encoded = encodeURIComponent(address + ', Queensland, Australia')
    const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1`)
    const data = await r.json()
    if (data && data[0]) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
    return null
  } catch { return null }
}

type Vehicle = {
  label: string
  vehicle_type: string
  vin: string
  make: string
  model: string
  year: string
  colour: string
  build_month: string
  damage: string
  purchase_method: string
  purchased_from: string
  cutoff_date: string
  locations: string[]
}

const emptyVehicle = (): Vehicle => ({
  label: '', vehicle_type: 'Car', vin: '', make: '', model: '',
  year: '', colour: '', build_month: '', damage: '', purchase_method: '',
  purchased_from: '', cutoff_date: '', locations: WOVI_LOCATIONS.map(l => l.name),
})

export default function RegisterQLD() {
  const [step, setStep] = useState(1)
  const [selectedTier, setSelectedTier] = useState<'priority'|'standard'|'basic'>('standard')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const [owner, setOwner] = useState({
    first_name: '', last_name: '', email: '', phone: '',
    address: '', suburb: '', postcode: '', crn: '',
  })
  const [vehicles, setVehicles] = useState<Vehicle[]>([emptyVehicle()])

  const updateOwner = (k: string, v: string) => setOwner(p => ({ ...p, [k]: v }))
  const updateVehicle = (i: number, k: string, v: string) =>
    setVehicles(vs => vs.map((veh, idx) => idx === i ? { ...veh, [k]: v } : veh))

  const addVehicle = () => setVehicles(vs => [...vs, emptyVehicle()])
  const removeVehicle = (i: number) => setVehicles(vs => vs.filter((_, idx) => idx !== i))

  const validateStep1 = () => {
    const r = owner
    if (!r.first_name || !r.last_name || !r.email || !r.phone || !r.address || !r.suburb || !r.postcode || !r.crn)
      return 'Please fill in all owner details.'
    if (!/^\S+@\S+\.\S+$/.test(r.email)) return 'Please enter a valid email.'
    return ''
  }

  const validateStep2 = () => {
    for (let i = 0; i < vehicles.length; i++) {
      const v = vehicles[i]
      const missing = []
      if (!v.vin) missing.push('VIN')
      if (!v.make) missing.push('Make')
      if (!v.model) missing.push('Model')
      if (!v.year) missing.push('Year')
      if (!v.colour) missing.push('Colour')
      if (!v.build_month) missing.push('Build Month')
      if (!v.damage) missing.push('Damage Type')
      if (!v.purchase_method) missing.push('Purchase Method')
      if (!v.purchased_from) missing.push('Purchased From')
      if (!v.cutoff_date) missing.push('Booking Date')
      if (missing.length > 0)
        return `Vehicle ${i + 1} — missing: ${missing.join(', ')}`
      if (!v.locations || v.locations.length === 0)
        return `Please select at least one location for Vehicle ${i + 1}.`
    }
    return ''
  }

  const [radiusAddress, setRadiusAddress] = useState('')
  const [addrSuggestions, setAddrSuggestions] = useState<any[]>([])
  const [addrLoading, setAddrLoading] = useState(false)
  const [addrFocused, setAddrFocused] = useState(false)
  const addrTimeout = useRef<any>(null)

  const searchAddress = async (q: string) => {
    if (q.length < 5) { setAddrSuggestions([]); return }
    setAddrLoading(true)
    try {
      const encoded = encodeURIComponent(q + ', Australia')
      const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=6&countrycodes=au&addressdetails=1`)
      const data = await r.json()
      setAddrSuggestions(data)
    } catch { setAddrSuggestions([]) }
    setAddrLoading(false)
  }

  const selectAddress = (place: any) => {
    const a = place.address || {}
    const streetNum  = a.house_number || ''
    const street     = a.road || ''
    const suburb     = a.suburb || a.town || a.city_district || a.village || ''
    const state      = a.state || ''
    const postcode   = a.postcode || ''
    const fullStreet = [streetNum, street].filter(Boolean).join(' ')
    setOwner(p => ({
      ...p,
      address:  fullStreet || place.display_name.split(',')[0],
      suburb:   suburb,
      postcode: postcode,
    }))
    setAddrSuggestions([])
  }
  const [radius, setRadius] = useState(200)
  const [radiusLoading, setRadiusLoading] = useState(false)
  const [radiusError, setRadiusError] = useState('')
  const [homeCoords, setHomeCoords] = useState<{lat:number,lng:number}|null>(null)
  const mapRefs = useRef<Record<number, any>>({})
  const circleRefs = useRef<Record<number, any>>({})
  const markerRefs = useRef<Record<number, any[]>>({})
  const homeMarkerRefs = useRef<Record<number, any>>({})

  const updateRadiusLocations = (vIdx: number, coords: {lat:number,lng:number}, r: number) => {
    const nearby = WOVI_LOCATIONS
      .filter(loc => haversineKm(coords.lat, coords.lng, loc.lat, loc.lng) <= r)
      .map(loc => loc.name)
    setVehicles(vs => vs.map((v, i) => i === vIdx ? { ...v, locations: nearby } : v))
    // Update circle on map
    if (circleRefs.current[vIdx]) {
      circleRefs.current[vIdx].setRadius(r * 1000)
    }
    // Update marker colours
    if (markerRefs.current[vIdx]) {
      markerRefs.current[vIdx].forEach((m: any) => {
        const locName = m.options.title
        const inRadius = haversineKm(coords.lat, coords.lng, m.options._lat, m.options._lng) <= r
        const icon = (window as any).L.divIcon({
          html: `<div style="width:14px;height:14px;border-radius:50%;background:${inRadius ? '#3b9eff' : '#555'};border:2px solid ${inRadius ? '#fff' : '#333'};box-shadow:0 2px 4px rgba(0,0,0,0.5)"></div>`,
          className: '', iconAnchor: [7, 7],
        })
        m.setIcon(icon)
      })
    }
  }

  const initMap = (vIdx: number, coords: {lat:number,lng:number}, r: number, vehicleLocations: string[]) => {
    if (typeof window === 'undefined') return
    const L = (window as any).L
    if (!L) return

    const mapEl = document.getElementById(`map-${vIdx}`)
    if (!mapEl) return

    // Destroy existing map
    if (mapRefs.current[vIdx]) {
      mapRefs.current[vIdx].remove()
    }

    const map = L.map(`map-${vIdx}`, { zoomControl: true }).setView([coords.lat, coords.lng], 7)
    mapRefs.current[vIdx] = map

    // Dark tile layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap © CARTO',
      maxZoom: 19,
    }).addTo(map)

    // Red home marker
    const homeIcon = L.divIcon({
      html: `<div style="width:18px;height:18px;border-radius:50%;background:#ff3333;border:3px solid #fff;box-shadow:0 2px 8px rgba(255,51,51,0.6)"></div>`,
      className: '', iconAnchor: [9, 9],
    })
    const homeMarker = L.marker([coords.lat, coords.lng], { icon: homeIcon, title: 'Your location' })
      .addTo(map)
      .bindPopup('<b style="color:#ff3333">📍 Your Location</b>')
    homeMarkerRefs.current[vIdx] = homeMarker

    // Yellow radius circle
    const circle = L.circle([coords.lat, coords.lng], {
      radius: r * 1000,
      color: '#C9A84C',
      weight: 2,
      fillColor: '#C9A84C',
      fillOpacity: 0.08,
      dashArray: '6 4',
    }).addTo(map)
    circleRefs.current[vIdx] = circle

    // Blue WOVI location markers
    const markers: any[] = []
    WOVI_LOCATIONS.forEach(loc => {
      const dist = haversineKm(coords.lat, coords.lng, loc.lat, loc.lng)
      const inRadius = dist <= r
      const icon = L.divIcon({
        html: `<div style="width:14px;height:14px;border-radius:50%;background:${inRadius ? '#3b9eff' : '#555'};border:2px solid ${inRadius ? '#fff' : '#333'};box-shadow:0 2px 4px rgba(0,0,0,0.5)"></div>`,
        className: '', iconAnchor: [7, 7],
      })
      const m = L.marker([loc.lat, loc.lng], { icon, title: loc.name, _lat: loc.lat, _lng: loc.lng })
        .addTo(map)
        .bindPopup(`<b style="color:${inRadius ? '#3b9eff' : '#aaa'}">${loc.name}</b><br/><span style="font-size:11px;color:#aaa">${loc.address}</span><br/><span style="font-size:12px">${Math.round(dist)}km from you</span>`)
      markers.push(m)
    })
    markerRefs.current[vIdx] = markers
  }

  const findNearbyLocations = async (vIdx: number) => {
    if (!radiusAddress) { setRadiusError('Please enter an address first.'); return }
    setRadiusLoading(true); setRadiusError('')
    const coords = await geocodeAddress(radiusAddress)
    if (!coords) { setRadiusError('Address not found. Try a suburb name or postcode.'); setRadiusLoading(false); return }
    setHomeCoords(coords)
    updateRadiusLocations(vIdx, coords, radius)
    // Init map after state update
    setTimeout(() => initMap(vIdx, coords, radius, vehicles[vIdx].locations), 100)
    setRadiusLoading(false)
  }

  const toggleLocation = (vIdx: number, loc: string) => {
    setVehicles(vs => vs.map((v, i) => {
      if (i !== vIdx) return v
      const locs = v.locations.includes(loc)
        ? v.locations.filter(l => l !== loc)
        : [...v.locations, loc]
      return { ...v, locations: locs }
    }))
  }

  // Load Leaflet CSS and JS once
  useEffect(() => {
    if (typeof window === 'undefined') return
    if ((window as any).L) return
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    document.head.appendChild(link)
    const script = document.createElement('script')
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    document.head.appendChild(script)
  }, [])

  const handleNext = () => {
    const err = validateStep1()
    if (err) { setError(err); return }
    setError(''); setStep(2)
  }

  const handleSubmit = async () => {
    const err = validateStep2()
    if (err) { setError(err); return }
    setError(''); setLoading(true)
    try {
      const { data: customer, error: ce } = await supabase
        .from('customers')
        .insert({ state: 'QLD', active: false, tier: selectedTier, ...owner })
        .select('id').single()
      if (ce || !customer) throw new Error(ce?.message || 'Failed to save')

      const vehicleRows = vehicles.map(v => ({
        ...v,
        customer_id: customer.id,
        state: 'QLD',
        active: true,
        label: v.label || `${v.make} ${v.model}`,
      }))
      const { error: ve } = await supabase.from('vehicles').insert(vehicleRows)
      if (ve) throw new Error(ve.message)

      // Notify admin + send customer confirmation
      await fetch('/api/notify-registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${owner.first_name} ${owner.last_name}`,
          email: owner.email,
          phone: owner.phone,
          state: 'QLD',
          vehicles: vehicles.length,
          tier: selectedTier,
        })
      })

      // Send registration confirmation to customer
      await fetch('/api/registration-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${owner.first_name} ${owner.last_name}`,
          email: owner.email,
          state: 'QLD',
          vehicles: vehicles.length,
          tier: selectedTier,
        })
      })

      setDone(true)
    } catch (e: any) {
      setError(e.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (done) return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
      <div className="card" style={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
        <h2 style={{ fontSize: 36, marginBottom: 12 }}>REGISTRATION SUBMITTED</h2>
        <p style={{ color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: 24 }}>
          Your details have been received. We'll review your registration and activate your monitoring shortly. You'll receive an email confirmation once you're live.
        </p>
        <Link href="/" style={{ color: 'var(--gold)', fontSize: 14, textDecoration: 'none' }}>← Back to home</Link>
      </div>
    </main>
  )

  return (
    <main style={{ minHeight: '100vh', padding: '40px 20px' }}>
      {/* Header */}
      <div style={{ maxWidth: 680, margin: '0 auto 32px' }}>
        <Link href="/" style={{ color: 'var(--text-muted)', fontSize: 13, textDecoration: 'none' }}>← Back</Link>
        <div style={{ marginTop: 24 }}>
          <div className="section-label">Queensland — WOVI</div>
          <h1 style={{ fontSize: 48, lineHeight: 1 }}>REGISTER YOUR<br /><span className="gold">VEHICLES</span></h1>
        </div>
        {/* Progress */}
        <div style={{ display: 'flex', gap: 8, marginTop: 24, alignItems: 'center' }}>
          {[1, 2].map(n => (
            <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: step >= n ? 'var(--gold)' : 'var(--dark-3)',
                border: `1px solid ${step >= n ? 'var(--gold)' : 'var(--border)'}`,
                fontSize: 13, fontWeight: 600,
                color: step >= n ? '#000' : 'var(--text-muted)',
              }}>{n}</div>
              <span style={{ fontSize: 13, color: step >= n ? 'var(--text)' : 'var(--text-muted)' }}>
                {n === 1 ? 'Your Details' : 'Vehicles'}
              </span>
              {n < 2 && <div style={{ width: 32, height: 1, background: 'var(--border)' }} />}
            </div>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        {error && (
          <div style={{
            background: '#2a0a0a', border: '1px solid #4a1a1a',
            borderRadius: 8, padding: '12px 16px', marginBottom: 20,
            color: '#ff6b6b', fontSize: 14,
          }}>{error}</div>
        )}

        {step === 1 && (
          <div className="card">
            <h3 style={{ fontSize: 24, marginBottom: 24 }}>OWNER DETAILS</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label>QLD Driver's Licence / CRN</label>
                <input autoComplete="off" value={owner.crn} onChange={e => updateOwner('crn', e.target.value)} placeholder="Your CRN number" />
              </div>
              <div><label>First Name</label><input autoComplete="given-name" value={owner.first_name} onChange={e => updateOwner('first_name', e.target.value)} placeholder="John" /></div>
              <div><label>Last Name</label><input autoComplete="family-name" value={owner.last_name} onChange={e => updateOwner('last_name', e.target.value)} placeholder="Smith" /></div>
              <div><label>Email</label><input type="email" autoComplete="email" value={owner.email} onChange={e => updateOwner('email', e.target.value)} placeholder="john@email.com" /></div>
              <div><label>Mobile</label><input autoComplete="tel" value={owner.phone} onChange={e => updateOwner('phone', e.target.value)} placeholder="0412 345 678" /></div>
              <div style={{ gridColumn: '1 / -1', position: 'relative' }}>
                <label>Street Address</label>
                <div style={{ position: 'relative' }}>
                  <input
                    value={owner.address}
                    onChange={e => {
                      updateOwner('address', e.target.value)
                      clearTimeout(addrTimeout.current)
                      addrTimeout.current = setTimeout(() => searchAddress(e.target.value), 350)
                    }}
                    onFocus={() => setAddrFocused(true)}
                    onBlur={() => setTimeout(() => setAddrFocused(false), 200)}
                    placeholder="Start typing your address..."
                    autoComplete="off"
                  />
                  {addrLoading && (
                    <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 12 }}>Searching...</div>
                  )}
                </div>
                {addrFocused && addrSuggestions.length > 0 && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                    background: 'var(--dark-2)', border: '1px solid var(--gold)',
                    borderRadius: 8, overflow: 'hidden', marginTop: 4,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                  }}>
                    {addrSuggestions.map((s, idx) => {
                      const a = s.address || {}
                      const num    = a.house_number || ''
                      const road   = a.road || ''
                      const suburb = a.suburb || a.town || a.city_district || ''
                      const state  = a.state || ''
                      const pc     = a.postcode || ''
                      const line1  = [num, road].filter(Boolean).join(' ') || s.display_name.split(',')[0]
                      const line2  = [suburb, state, pc].filter(Boolean).join(' ')
                      const isExact = idx === 0
                      return (
                        <div
                          key={s.place_id}
                          onMouseDown={() => selectAddress(s)}
                          style={{
                            padding: '10px 14px',
                            borderBottom: idx < addrSuggestions.length - 1 ? '1px solid var(--border)' : 'none',
                            cursor: 'pointer',
                            background: isExact ? 'rgba(201,168,76,0.08)' : 'transparent',
                            transition: 'background 0.15s',
                          }}
                          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--dark-3)'}
                          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = isExact ? 'rgba(201,168,76,0.08)' : 'transparent'}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {isExact && <span style={{ fontSize: 10, background: 'var(--gold)', color: '#000', padding: '2px 6px', borderRadius: 3, fontWeight: 700, letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>BEST MATCH</span>}
                            <span style={{ fontSize: 14, color: 'var(--text)', fontWeight: isExact ? 600 : 400 }}>{line1}</span>
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{line2}</div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
              <div><label>Suburb</label><input value={owner.suburb} onChange={e => updateOwner('suburb', e.target.value)} placeholder="Brisbane" /></div>
              <div><label>Postcode</label><input value={owner.postcode} onChange={e => updateOwner('postcode', e.target.value)} placeholder="4000" /></div>
            </div>
            <hr className="divider" />
            <div className="section-label" style={{ marginBottom: 12 }}>Select Your Plan</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
              {[
                { id: 'priority', icon: '🥇', label: 'Priority', price: '$10', desc: 'First in queue. Books immediately when a slot is found.', color: 'var(--gold)' },
                { id: 'standard', icon: '🥈', label: 'Standard', price: '$7.50', desc: 'Second in queue. 30 second delay after Priority customers.', color: '#aaa' },
                { id: 'basic',    icon: '🥉', label: 'Basic',    price: '$5', desc: 'Third in queue. 60 second delay after Standard customers.', color: '#888' },
              ].map(t => (
                <div
                  key={t.id}
                  onClick={() => setSelectedTier(t.id as any)}
                  style={{
                    border: `1px solid ${selectedTier === t.id ? t.color : 'var(--border)'}`,
                    background: selectedTier === t.id ? 'var(--dark-3)' : 'var(--dark-4)',
                    borderRadius: 8, padding: '16px 14px', cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ fontSize: 24, marginBottom: 6 }}>{t.icon}</div>
                  <div style={{ fontFamily: 'Bebas Neue', fontSize: 18, color: t.color, letterSpacing: '0.05em' }}>{t.label}</div>
                  <div style={{ fontFamily: 'Bebas Neue', fontSize: 28, color: t.color, letterSpacing: '0.05em', marginTop: 4 }}>{t.price}<span style={{ fontSize: 13, fontFamily: 'DM Sans', fontWeight: 400 }}> /vehicle</span></div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.5 }}>{t.desc}</div>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>
              One-time fee per vehicle. You will receive payment details after submitting your registration.
            </p>
            <div style={{ marginTop: 24 }}>
              <button className="btn-gold" onClick={handleNext}>NEXT: ADD VEHICLES →</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            {vehicles.map((v, i) => (
              <div key={i} className="card" style={{ marginBottom: 16, position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <h3 style={{ fontSize: 22 }}>VEHICLE {i + 1}</h3>
                  {vehicles.length > 1 && (
                    <button onClick={() => removeVehicle(i)} style={{
                      background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)',
                      padding: '6px 12px', borderRadius: 4, cursor: 'pointer', fontSize: 12,
                    }}>Remove</button>
                  )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label>Vehicle Type</label>
                    <select value={v.vehicle_type} onChange={e => updateVehicle(i, 'vehicle_type', e.target.value)}>
                      {VEHICLE_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div><label>VIN / Chassis Number</label><input value={v.vin} onChange={e => updateVehicle(i, 'vin', e.target.value)} placeholder="17-character VIN" /></div>
                  <div><label>Make</label><input value={v.make} onChange={e => updateVehicle(i, 'make', e.target.value)} placeholder="e.g. Toyota" /></div>
                  <div><label>Model</label><input value={v.model} onChange={e => updateVehicle(i, 'model', e.target.value)} placeholder="e.g. Camry" /></div>
                  <div><label>Year</label><input value={v.year} onChange={e => updateVehicle(i, 'year', e.target.value)} placeholder="e.g. 2023" /></div>
                  <div><label>Colour</label><input value={v.colour} onChange={e => updateVehicle(i, 'colour', e.target.value)} placeholder="e.g. White" /></div>
                  <div>
                    <label>Build Month</label>
                    <select value={v.build_month} onChange={e => updateVehicle(i, 'build_month', e.target.value)}>
                      <option value="">Select month</option>
                      {MONTHS.map(m => <option key={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label>Damage Type</label>
                    <select value={v.damage} onChange={e => updateVehicle(i, 'damage', e.target.value)}>
                      <option value="">Select damage</option>
                      {DAMAGE_OPTIONS.map(d => <option key={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label>Purchase Method</label>
                    <select value={v.purchase_method} onChange={e => updateVehicle(i, 'purchase_method', e.target.value)}>
                      <option value="">Select method</option>
                      {PURCHASE_OPTIONS.map(p => <option key={p}>{p}</option>)}
                    </select>
                  </div>
                  <div><label>Purchased From</label><input value={v.purchased_from} onChange={e => updateVehicle(i, 'purchased_from', e.target.value)} placeholder="e.g. IAA Auctions" /></div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label>Current Booking Date (Cutoff)</label>
                    <input type="date" value={v.cutoff_date} onChange={e => updateVehicle(i, 'cutoff_date', e.target.value)} />
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>We'll only rebook if we find something earlier than this date.</p>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label>Inspection Locations</label>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
                      Enter your address, set your travel radius, and we'll show you which WOVI locations are within range on the map.
                    </p>

                    {/* Address + Radius controls */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, marginBottom: 8 }}>
                      <input
                        value={radiusAddress}
                        onChange={e => setRadiusAddress(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && findNearbyLocations(i)}
                        placeholder="Enter your suburb or full address..."
                      />
                      <button
                        onClick={() => findNearbyLocations(i)}
                        disabled={radiusLoading}
                        style={{
                          background: 'var(--gold)', color: '#000', border: 'none',
                          padding: '0 20px', borderRadius: 6, cursor: 'pointer',
                          fontFamily: 'Bebas Neue', fontSize: 15, letterSpacing: '0.1em',
                          whiteSpace: 'nowrap',
                        }}
                      >{radiusLoading ? 'SEARCHING...' : 'SEARCH →'}</button>
                    </div>

                    {/* Radius slider */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, background: 'var(--dark-3)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 16px' }}>
                      <span style={{ fontSize: 13, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Travel radius:</span>
                      <input
                        type="range" min={50} max={1500} step={50}
                        value={radius}
                        onChange={e => { setRadius(Number(e.target.value)); if (homeCoords) updateRadiusLocations(i, homeCoords, Number(e.target.value)) }}
                        style={{ flex: 1, accentColor: 'var(--gold)' }}
                      />
                      <span style={{ fontSize: 18, color: 'var(--gold)', fontFamily: 'Bebas Neue', letterSpacing: '0.05em', minWidth: 70 }}>{radius} km</span>
                    </div>

                    {radiusError && <p style={{ fontSize: 12, color: '#ff6b6b', marginBottom: 8 }}>{radiusError}</p>}

                    {/* Leaflet Map */}
                    <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)', marginBottom: 12, position: 'relative' }}>
                      <div id={`map-${i}`} style={{ height: 360, width: '100%', background: '#1a1a2e' }} />
                      {!homeCoords && (
                        <div style={{
                          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: 'var(--dark-3)', flexDirection: 'column', gap: 12,
                          borderRadius: 8,
                        }}>
                          <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--dark-4)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>📍</div>
                          <div style={{ color: 'var(--text-muted)', fontSize: 14, textAlign: 'center', lineHeight: 1.6 }}>
                            Enter your suburb or address above<br/>and click <strong style={{ color: 'var(--gold)' }}>SEARCH →</strong> to see the map
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Manual location selection */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <div>
                        {homeCoords ? (
                          <p style={{ fontSize: 12, color: 'var(--gold)', margin: 0 }}>
                            ✓ {v.locations.length} location{v.locations.length !== 1 ? 's' : ''} selected — fine-tune below
                          </p>
                        ) : (
                          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
                            Manually select which locations to monitor
                          </p>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          onClick={() => setVehicles(vs => vs.map((v2, idx) => idx === i ? { ...v2, locations: WOVI_LOCATIONS.map(l => l.name) } : v2))}
                          style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)', padding: '4px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 11, fontFamily: 'DM Sans' }}
                        >Select All</button>
                        <button
                          onClick={() => setVehicles(vs => vs.map((v2, idx) => idx === i ? { ...v2, locations: [] } : v2))}
                          style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)', padding: '4px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 11, fontFamily: 'DM Sans' }}
                        >Clear All</button>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {WOVI_LOCATIONS.map(loc => {
                        const selected = v.locations.includes(loc.name)
                        const dist = homeCoords ? Math.round(haversineKm(homeCoords.lat, homeCoords.lng, loc.lat, loc.lng)) : null
                        return (
                          <div
                            key={loc.name}
                            onClick={() => toggleLocation(i, loc.name)}
                            style={{
                              padding: '7px 12px', borderRadius: 6, cursor: 'pointer',
                              border: `1px solid ${selected ? 'var(--gold)' : 'var(--border)'}`,
                              background: selected ? 'var(--dark-3)' : 'var(--dark-4)',
                              color: selected ? 'var(--gold)' : 'var(--text-muted)',
                              fontSize: 13, transition: 'all 0.2s',
                              userSelect: 'none',
                            }}
                            onMouseEnter={e => { if (!selected) (e.currentTarget as HTMLElement).style.borderColor = 'var(--text-muted)' }}
                            onMouseLeave={e => { if (!selected) (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)' }}
                          >
                            {selected ? '✓ ' : '+ '}{loc.name}{dist !== null ? ` · ${dist}km` : ''}
                          </div>
                        )
                      })}
                    </div>
                    {v.locations.length === 0 && (
                      <p style={{ fontSize: 12, color: '#ff6b6b', marginTop: 8 }}>⚠️ Please select at least one location.</p>
                    )}
                  </div>
                </div>
              </div>
            ))}

            <button onClick={addVehicle} style={{
              width: '100%', padding: '14px', borderRadius: 8,
              border: '1px dashed var(--border)', background: 'transparent',
              color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14,
              fontFamily: 'DM Sans', marginBottom: 16,
              transition: 'border-color 0.2s, color 0.2s',
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--gold)'; (e.currentTarget as HTMLElement).style.color = 'var(--gold)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)' }}
            >+ Add Another Vehicle</button>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: 12 }}>
              <button onClick={() => { setStep(1); setError('') }} style={{
                padding: '14px', borderRadius: 8, border: '1px solid var(--border)',
                background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer',
                fontFamily: 'Bebas Neue', fontSize: 16, letterSpacing: '0.1em',
              }}>← BACK</button>
              <button className="btn-gold" onClick={handleSubmit} disabled={loading}>
                {loading ? 'SUBMITTING...' : 'SUBMIT REGISTRATION'}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
