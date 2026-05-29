'use client'

import { validateVin, validateYear, validatePostcode, validateAuMobile, validateCutoffDate, validateCrn, validateStreetAddress, validateSuburb, clampYearInput, validateMake, validateModel } from '@/lib/validators'
import { IconCheckCircle, IconArrowLeft, IconCalendar, IconMapPin, IconExclamationTriangle, IconCheck, IconUser, IconArrowRight } from '@/components/icons'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowser } from '@/lib/supabase/client'

const DAMAGE_OPTIONS = ['HAIL DAMAGE', 'WATER DAMAGE', 'MALICIOUS DAMAGE', 'FIRE DAMAGE', 'STRUCTURAL DAMAGE', 'IMPACT DAMAGE DRIVERS FRONT', 'IMPACT DAMAGE PASSENGER FRONT', 'IMPACT DAMAGE DRIVERS SIDE', 'IMPACT DAMAGE PASSENGER SIDE', 'IMPACT DAMAGE DRIVERS REAR', 'IMPACT DAMAGE PASSENGER REAR', 'OTHER']
const PURCHASE_OPTIONS = ['Auction', 'Private Sale', 'Insurance', 'Other']
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const VEHICLE_TYPES = ['Car', 'Motorcycle', 'Truck', 'Trailer', 'Caravan']
// WOVI inspection slots run on the half-hour during business hours.
// Customers tell us their existing booking time so the bot knows what
// to beat when looking for an earlier slot.
const WOVI_BOOKING_TIMES = [
  '8:00 AM', '8:30 AM', '9:00 AM', '9:30 AM',
  '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM',
  '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM',
  '4:00 PM', '4:30 PM',
]

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
  // Current booking details — stored as cutoff_date in DB
  current_booking_date: string
  current_booking_time: string
  current_booking_location: string
  locations: string[]
  priority_locations: string[]  // ordered: index 0 = Priority 1, index 1 = Priority 2
}

const emptyVehicle = (): Vehicle => ({
  label: '', vehicle_type: 'Car', vin: '', make: '', model: '',
  year: '', colour: '', build_month: '', damage: '', purchase_method: '',
  purchased_from: '',
  current_booking_date: '',
  current_booking_time: '',
  current_booking_location: '',
  locations: [],
  priority_locations: [],
})

// Normalize an Australian mobile to 04XXXXXXXX. Strips non-digits, then
// rewrites a leading 61 (or +61 input) to 0. Returns at most 10 digits.
function normaliseAuMobile(input: string): string {
  let p = (input || '').replace(/\D/g, '')
  if (p.startsWith('61') && p.length > 9) p = '0' + p.slice(2)
  return p.slice(0, 10)
}

// Common Australian + global email-domain typos. Insert at top of file.
const COMMON_DOMAINS = [
  'gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'yahoo.com.au',
  'icloud.com', 'me.com', 'live.com', 'live.com.au', 'bigpond.com',
  'bigpond.net.au', 'optusnet.com.au', 'iinet.net.au', 'tpg.com.au',
  'protonmail.com', 'proton.me', 'aol.com', 'msn.com',
]

// Levenshtein-distance-based fuzzy match. Returns the closest known
// domain if its distance is within 2 chars; otherwise returns null.
function suggestEmailFix(email: string): string | null {
  const m = (email || '').match(/^(.+)@(.+)$/)
  if (!m) return null
  const [, local, domain] = m
  const d = domain.toLowerCase()
  if (COMMON_DOMAINS.includes(d)) return null
  function lev(a: string, b: string): number {
    const dp: number[][] = Array(a.length + 1).fill(null).map(() => Array(b.length + 1).fill(0))
    for (let i = 0; i <= a.length; i++) dp[i][0] = i
    for (let j = 0; j <= b.length; j++) dp[0][j] = j
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        dp[i][j] = a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
      }
    }
    return dp[a.length][b.length]
  }
  let best: { dom: string; dist: number } | null = null
  for (const known of COMMON_DOMAINS) {
    const dist = lev(d, known)
    if (dist <= 2 && (best === null || dist < best.dist)) {
      best = { dom: known, dist }
    }
  }
  return best ? `${local}@${best.dom}` : null
}

export default function RegisterQLD() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [selectedTier, setSelectedTier] = useState<'priority'|'standard'|'basic'>('priority')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [authChecked, setAuthChecked] = useState(false)

  // Bounce signed-in customers straight to the prefilled add-vehicle
  // flow — no point making them re-type their own details.
  useEffect(() => {
    (async () => {
      try {
        const supabase = createSupabaseBrowser()
        const { data: { user } } = await supabase.auth.getUser()
        if (user?.user_metadata?.customer_id) {
          router.replace('/account/add-vehicle')
          return
        }
      } catch {}
      setAuthChecked(true)
    })()
  }, [router])

  const [owner, setOwner] = useState({
    first_name: '', last_name: '', email: '', phone: '',
    address: '', suburb: '', postcode: '', crn: '',
  })
  const [emailSuggestion, setEmailSuggestion] = useState<string | null>(null)
  const [vehicles, setVehicles] = useState<Vehicle[]>([emptyVehicle()])
  const [hasBookingConfirmed, setHasBookingConfirmed] = useState(false)

  // Email gate: the customer enters their email first. If it's already in
  // the system we sign them in via a magic link; otherwise we reveal the
  // new-customer detail fields + plan selector.
  const [emailStage, setEmailStage] = useState<'entry' | 'new' | 'existing'>('entry')
  const [emailChecking, setEmailChecking] = useState(false)

  const updateOwner = (k: string, v: string) => setOwner(p => ({ ...p, [k]: v }))

  // Re-checking is required any time the email changes after a check.
  const resetEmailGate = () => { if (emailStage !== 'entry') setEmailStage('entry') }

  const signInWithGoogle = async () => {
    setError('')
    const supabase = createSupabaseBrowser()
    const { error: oauthErr } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent('/account/add-vehicle')}` },
    })
    // On success the browser redirects to Google — nothing else runs here.
    if (oauthErr) setError(oauthErr.message)
  }

  const checkEmail = async () => {
    const email = owner.email.trim().toLowerCase()
    if (!/^\S+@\S+\.\S+$/.test(email)) { setError('Please enter a valid email.'); return }
    setError(''); setEmailChecking(true)
    try {
      const res = await fetch('/api/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not check that email.')
      if (data.exists) {
        // Returning customer — send them a one-click sign-in link that
        // lands them on the prefilled add-vehicle flow.
        const supabase = createSupabaseBrowser()
        const { error: otpErr } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent('/account/add-vehicle')}` },
        })
        if (otpErr) throw new Error(otpErr.message)
        setEmailStage('existing')
      } else {
        setEmailStage('new')
      }
    } catch (e: any) {
      setError(e.message || 'Could not check that email. Please try again.')
    } finally {
      setEmailChecking(false)
    }
  }
  const updateVehicle = (i: number, k: string, v: string) =>
    setVehicles(vs => vs.map((veh, idx) => idx === i ? { ...veh, [k]: v } : veh))

  const addVehicle = () => setVehicles(vs => [...vs, emptyVehicle()])
  const removeVehicle = (i: number) => setVehicles(vs => vs.filter((_, idx) => idx !== i))

  const validateStep1 = () => {
    const r = owner
    if (!r.first_name || !r.last_name || !r.email || !r.phone || !r.address || !r.suburb || !r.postcode || !r.crn)
      return 'Please fill in all owner details.'
    if (!/^\S+@\S+\.\S+$/.test(r.email)) return 'Please enter a valid email.'
    const phoneErr = validateAuMobile(r.phone)
    if (phoneErr) return phoneErr
    const addrErr = validateStreetAddress(r.address)
    if (addrErr) return addrErr
    const subErr = validateSuburb(r.suburb)
    if (subErr) return subErr
    const pcErr = validatePostcode(r.postcode, 'QLD')
    if (pcErr) return pcErr
    const crnErr = validateCrn(r.crn)
    if (crnErr) return crnErr
    return ''
  }

  const validateStep2 = () => {
    if (!hasBookingConfirmed)
      return 'Please confirm you have an existing WOVI booking and have paid the $100 deposit before continuing.'
    for (let i = 0; i < vehicles.length; i++) {
      const v = vehicles[i]
      const missing = []
      if (!v.vin) missing.push('VIN')
      else { const vinErr = validateVin(v.vin); if (vinErr) return vinErr }
      if (!v.make) missing.push('Make')
      else { const mkErr = validateMake(v.make); if (mkErr) return mkErr }
      if (!v.model) missing.push('Model')
      else { const mdErr = validateModel(v.model); if (mdErr) return mdErr }
      if (!v.year) missing.push('Year')
      else { const yErr = validateYear(v.year); if (yErr) return yErr }
      if (!v.colour) missing.push('Colour')
      if (!v.build_month) missing.push('Build Month')
      if (!v.damage) missing.push('Damage Type')
      if (!v.purchase_method) missing.push('Purchase Method')
      if (!v.purchased_from) missing.push('Purchased From')
      if (!v.current_booking_date) missing.push('Current Booking Date')
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
    let streetNum   = a.house_number || ''
    const street    = a.road || ''
    const suburb    = a.suburb || a.town || a.city_district || a.village || ''
    const postcode  = a.postcode || ''
    // Nominatim often lacks house numbers for Australian residential
    // addresses. If the geocoder didn't return one but the user already
    // typed a leading number, keep it instead of throwing it away.
    if (!streetNum) {
      const m = (owner.address || '').trim().match(/^(\d+[A-Za-z]?(?:\/\d+[A-Za-z]?)?)\b/)
      if (m) streetNum = m[1]
    }
    const fullStreet = [streetNum, street].filter(Boolean).join(' ')
    setOwner(p => ({
      ...p,
      address:  fullStreet || place.display_name.split(',')[0],
      suburb:   suburb,
      postcode: postcode,
    }))
    setAddrSuggestions([])
  }

  const [radius, setRadius] = useState(50)
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
    if (circleRefs.current[vIdx]) circleRefs.current[vIdx].setRadius(r * 1000)
    if (markerRefs.current[vIdx]) {
      markerRefs.current[vIdx].forEach((m: any) => {
        const inRadius = haversineKm(coords.lat, coords.lng, m.options._lat, m.options._lng) <= r
        const icon = (window as any).L.divIcon({
          html: `<div style="width:14px;height:14px;border-radius:50%;background:${inRadius ? '#3b9eff' : '#555'};border:2px solid ${inRadius ? '#fff' : '#333'};box-shadow:0 2px 4px rgba(0,0,0,0.5)"></div>`,
          className: '', iconAnchor: [7, 7],
        })
        m.setIcon(icon)
      })
    }
  }

  const initMap = (vIdx: number, coords: {lat:number,lng:number}, r: number) => {
    if (typeof window === 'undefined') return
    const L = (window as any).L
    if (!L) return
    const mapEl = document.getElementById(`map-${vIdx}`)
    if (!mapEl) return
    if (mapRefs.current[vIdx]) mapRefs.current[vIdx].remove()
    const map = L.map(`map-${vIdx}`, { zoomControl: true }).setView([coords.lat, coords.lng], 7)
    mapRefs.current[vIdx] = map
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap © CARTO', maxZoom: 19,
    }).addTo(map)
    const homeIcon = L.divIcon({
      html: `<div style="width:18px;height:18px;border-radius:50%;background:#ff3333;border:3px solid #fff;box-shadow:0 2px 8px rgba(255,51,51,0.6)"></div>`,
      className: '', iconAnchor: [9, 9],
    })
    L.marker([coords.lat, coords.lng], { icon: homeIcon, title: 'Your location' })
      .addTo(map).bindPopup('<b style="color:#ff3333">Your Location</b>')
    const circle = L.circle([coords.lat, coords.lng], {
      radius: r * 1000, color: '#C9A84C', weight: 2,
      fillColor: '#C9A84C', fillOpacity: 0.08, dashArray: '6 4',
    }).addTo(map)
    circleRefs.current[vIdx] = circle
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
    setTimeout(() => initMap(vIdx, coords, radius), 100)
    setRadiusLoading(false)
  }

  const toggleLocation = (vIdx: number, loc: string) => {
    setVehicles(vs => vs.map((v, i) => {
      if (i !== vIdx) return v
      const locs = v.locations.includes(loc)
        ? v.locations.filter(l => l !== loc)
        : [...v.locations, loc]
      // Also remove from priority if deselected
      const priority = locs.includes(loc) ? v.priority_locations : v.priority_locations.filter(l => l !== loc)
      return { ...v, locations: locs, priority_locations: priority }
    }))
  }

  const togglePriority = (vIdx: number, loc: string) => {
    setVehicles(vs => vs.map((v, i) => {
      if (i !== vIdx) return v
      const current = v.priority_locations || []
      const isPriority = current.includes(loc)
      if (isPriority) {
        // Remove from priority
        return { ...v, priority_locations: current.filter(l => l !== loc) }
      } else if (current.length < 2) {
        // Add — order matters, index 0 = P1, index 1 = P2
        return { ...v, priority_locations: [...current, loc] }
      }
      return v
    }))
  }

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

  const step1Err = validateStep1()
  const step1Valid = step1Err === ''

  const handleNext = () => {
    if (!step1Valid) { setError(step1Err); return }
    // Prefill the inspection-radius search with what the customer
    // entered as their address in step 1, unless they've already typed
    // something different. They can still edit it before clicking
    // SEARCH if they want to plan around a different starting point.
    if (!radiusAddress.trim()) {
      const combined = [owner.address, owner.suburb, owner.postcode]
        .filter(Boolean).join(', ').trim()
      if (combined) setRadiusAddress(combined)
    }
    setError(''); setStep(2)
  }

  const handleSubmit = async () => {
    const err = validateStep2()
    if (err) { setError(err); return }
    setError(''); setLoading(true)
    try {
      // Check whitelist server-side via API
      const whitelistRes = await fetch('/api/check-whitelist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: owner.email, phone: owner.phone }),
      })
      const whitelistData = await whitelistRes.json()
      const isFree = whitelistData?.whitelisted === true

      const regRes = await fetch('/api/register-customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: {
            state: 'QLD',
            active: isFree,
            tier: isFree ? 'priority' : selectedTier,
            auto_payment_email: !isFree,
            ...owner,
          },
          vehicles: vehicles.map(v => ({
            state: 'QLD',
            active: true,
            label: v.label || `${v.make} ${v.model}`,
            vehicle_type: v.vehicle_type,
            vin: v.vin,
            make: v.make,
            model: v.model,
            year: v.year,
            colour: v.colour,
            build_month: v.build_month,
            damage: v.damage,
            purchase_method: v.purchase_method,
            purchased_from: v.purchased_from,
            // The customer's existing WOVI booking is the cutoff — the
            // date the bot tries to BEAT. booked_* must NOT be written
            // here; those are reserved for slots the BOT actually
            // lands. Otherwise the dashboard mistakenly shows every
            // newly registered vehicle as already booked.
            cutoff_date: v.current_booking_date,
            locations: v.locations,
            priority_locations: v.priority_locations,
          })),
        }),
      })
      const regData = await regRes.json()
      if (!regRes.ok || !regData.customer_id) throw new Error(regData.error || 'Failed to save')
      const customerId = regData.customer_id

      if (!isFree) {
        // Send PayID payment request to customer and notify admin
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
          }),
        })
        setDone(true)
        return
      }

      // Free/whitelisted — send activation email immediately
      await fetch('/api/activation-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${owner.first_name} ${owner.last_name}`,
          email: owner.email,
          state: 'QLD',
          vehicles: vehicles.length,
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
        <div style={{ marginBottom: 16, color: '#5adb5a', display: 'inline-flex' }}><IconCheckCircle size={56} /></div>
        <h2 style={{ fontSize: 36, marginBottom: 12 }}>REGISTRATION SUBMITTED</h2>
        <p style={{ color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: 24 }}>
          Your details have been received. We&apos;ll review your registration and activate your monitoring shortly. You&apos;ll receive an email confirmation once you&apos;re live.
        </p>
        <Link href="/" style={{ color: 'var(--gold)', fontSize: 14, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <IconArrowLeft size={14} />Back to home
        </Link>
      </div>
    </main>
  )

  return (
    <main className='register-main' style={{ minHeight: '100vh', padding: '40px 20px' }}>
      {/* Header */}
      <div style={{ maxWidth: 680, margin: '0 auto 32px' }}>
        <Link href="/" style={{ color: 'var(--text-muted)', fontSize: 13, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <IconArrowLeft size={14} />Back
        </Link>
        <div style={{ marginTop: 24 }}>
          <div className="section-label">Queensland — WOVI</div>
          <h1 style={{ fontSize: 48, lineHeight: 1 }}>REGISTER YOUR<br /><span className="gold">VEHICLES</span></h1>
        </div>
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

        {/* Sign-in CTA — only shown to unauthenticated visitors on step 1 */}
        {step === 1 && authChecked && (
          <div style={{
            background: 'linear-gradient(135deg, #1a1200, #0e0a00)',
            border: '1px solid rgba(201,168,76,0.35)',
            borderRadius: 12, padding: '18px 22px', marginBottom: 16,
            display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
              background: 'rgba(201,168,76,0.12)', color: 'var(--gold)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1px solid rgba(201,168,76,0.4)',
            }}><IconUser size={20} /></div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontFamily: 'Bebas Neue', fontSize: 16, color: 'var(--gold)', letterSpacing: '0.05em' }}>ALREADY REGISTERED?</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
                Sign in and we&apos;ll skip the personal details — just add your new vehicle.
              </div>
            </div>
            <Link
              href={`/account/sign-in?next=${encodeURIComponent('/account/add-vehicle')}`}
              style={{
                background: 'var(--gold)', color: '#000', padding: '10px 18px',
                borderRadius: 6, fontSize: 13, fontWeight: 700, textDecoration: 'none',
                fontFamily: 'DM Sans, sans-serif', display: 'inline-flex', alignItems: 'center', gap: 6,
                whiteSpace: 'nowrap',
              }}
            >Sign in<IconArrowRight size={14} /></Link>
          </div>
        )}

        {/* ── STEP 1: Owner Details ── */}
        {step === 1 && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
              <h3 style={{ fontSize: 24, margin: 0 }}>OWNER DETAILS</h3>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {emailStage === 'new' ? 'New customer' : 'Enter your email to begin'}
              </div>
            </div>

            {/* Email gate — always shown first */}
            <div style={{ marginBottom: emailStage === 'new' ? 16 : 0 }}>
              <label>Email</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <input
                  type="email"
                  autoComplete="email"
                  value={owner.email}
                  onChange={e => { updateOwner('email', e.target.value.toLowerCase()); setEmailSuggestion(null); resetEmailGate() }}
                  onBlur={e => setEmailSuggestion(suggestEmailFix(e.target.value.toLowerCase()))}
                  onKeyDown={e => { if (e.key === 'Enter' && emailStage === 'entry' && !emailChecking) { e.preventDefault(); checkEmail() } }}
                  placeholder="john@email.com"
                  style={{ textTransform: 'lowercase', flex: 1, minWidth: 200 }}
                />
                {emailStage === 'entry' && (
                  <button
                    onClick={checkEmail}
                    disabled={emailChecking || !owner.email}
                    style={{
                      background: 'var(--gold)', color: '#000', border: 'none',
                      padding: '12px 20px', borderRadius: 6, cursor: emailChecking || !owner.email ? 'not-allowed' : 'pointer',
                      fontFamily: 'Bebas Neue', fontSize: 15, letterSpacing: '0.1em',
                      whiteSpace: 'nowrap', flexShrink: 0, opacity: emailChecking || !owner.email ? 0.5 : 1,
                    }}
                  >{emailChecking ? 'CHECKING…' : 'CONTINUE →'}</button>
                )}
              </div>
              {emailSuggestion && emailSuggestion !== owner.email && (
                <div style={{ marginTop: 6, fontSize: 12, color: '#fbbf24' }}>
                  Did you mean{' '}
                  <button
                    type="button"
                    onClick={() => { updateOwner('email', emailSuggestion); setEmailSuggestion(null); resetEmailGate() }}
                    style={{ background: 'none', border: 'none', color: '#5ab0ff', cursor: 'pointer', padding: 0, font: 'inherit', textDecoration: 'underline' }}
                  >
                    {emailSuggestion}
                  </button>
                  ?
                </div>
              )}

              {/* Google as an alternative to the email link */}
              {emailStage === 'entry' && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '18px 0', color: 'var(--text-muted)', fontSize: 12 }}>
                    <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                    OR
                    <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                  </div>
                  <button
                    type="button"
                    onClick={signInWithGoogle}
                    style={{
                      width: '100%', background: '#fff', color: '#000', border: 'none',
                      padding: '11px 14px', borderRadius: 6, cursor: 'pointer',
                      fontSize: 14, fontWeight: 600, fontFamily: 'DM Sans, sans-serif',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                    }}
                  >
                    <GoogleLogo />Continue with Google
                  </button>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, marginBottom: 0, textAlign: 'center' }}>
                    Already a customer? Google or the email link signs you straight in.
                  </p>
                </>
              )}
            </div>

            {/* Existing customer — magic link sent */}
            {emailStage === 'existing' && (
              <div style={{ marginTop: 16, background: '#0d1a0d', border: '1px solid #2a4a2a', borderRadius: 8, padding: '16px 18px' }}>
                <div style={{ fontWeight: 600, fontSize: 15, color: '#5adb5a', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <IconCheckCircle size={16} />You&apos;re already registered
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                  We&apos;ve sent a one-click sign-in link to <strong style={{ color: 'var(--text)' }}>{owner.email}</strong>.
                  Check your inbox (and spam folder), click the link, and you&apos;ll be taken straight to adding your vehicle — no need to re-enter your details.
                </div>
                <button
                  type="button"
                  onClick={() => { updateOwner('email', ''); setEmailStage('entry') }}
                  style={{ marginTop: 12, background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)', padding: '8px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}
                >Use a different email</button>
              </div>
            )}

            {/* New customer — full detail fields, only after the email check */}
            {emailStage === 'new' && (
            <>
            <div className='register-grid-2' style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label>QLD Driver&apos;s Licence / CRN</label>
                <input autoComplete="off" inputMode="numeric" value={owner.crn} onChange={e => updateOwner('crn', e.target.value.replace(/\D/g, ''))} placeholder="Your CRN number" />
              </div>
              <div><label>First Name</label><input autoComplete="given-name" value={owner.first_name} onChange={e => updateOwner('first_name', e.target.value)} placeholder="John" /></div>
              <div><label>Last Name</label><input autoComplete="family-name" value={owner.last_name} onChange={e => updateOwner('last_name', e.target.value)} placeholder="Smith" /></div>
              <div><label>Mobile</label><input autoComplete="tel" inputMode="numeric" value={owner.phone} onChange={e => updateOwner('phone', normaliseAuMobile(e.target.value))} placeholder="0412345678" /></div>
              <div style={{ gridColumn: '1 / -1', position: 'relative' }}>
                <label>Street Address <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: 11 }}>(street number + name only)</span></label>
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
                    placeholder="e.g. 123 Example Street"
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
                      const pc     = a.postcode || ''
                      const line1  = [num, road].filter(Boolean).join(' ') || s.display_name.split(',')[0]
                      const line2  = [suburb, pc].filter(Boolean).join(' ')
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
              <div><label>Suburb</label><input value={owner.suburb} onChange={e => updateOwner('suburb', e.target.value.replace(/[\d]/g, ''))} placeholder="Your suburb name" /></div>
              <div><label>Postcode</label><input value={owner.postcode} onChange={e => updateOwner('postcode', e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="4 digits" inputMode="numeric" maxLength={4} /></div>
              <div style={{ gridColumn: '1 / -1', fontSize: 11, color: 'var(--text-muted)', marginTop: -4 }}>
                Tip: pick an address suggestion above to autofill suburb + postcode. Suburb = your suburb name only (no postcode, no city — just the suburb).
              </div>
            </div>
            <hr className="divider" />
            <div className="section-label" style={{ marginBottom: 4 }}>Which plan would you like to buy?</div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>Choose where you sit in the booking queue.</p>
            <div className='tier-grid-3' style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
              {[
                { id: 'priority', rank: '1', label: 'Priority', price: '$5',    desc: 'First in queue. Books immediately when a slot is found.', color: 'var(--gold)' },
                { id: 'standard', rank: '2', label: 'Standard', price: '$3',    desc: 'Second in queue. 30 second delay after Priority customers.', color: '#aaa' },
                { id: 'basic',    rank: '3', label: 'Basic',    price: '$1.50', desc: 'Third in queue. 60 second delay after Standard customers.', color: '#888' },
              ].map(t => (
                <div key={t.id} onClick={() => setSelectedTier(t.id as any)} style={{
                  border: `1px solid ${selectedTier === t.id ? t.color : 'var(--border)'}`,
                  background: selectedTier === t.id ? 'var(--dark-3)' : 'var(--dark-4)',
                  borderRadius: 8, padding: '16px 14px', cursor: 'pointer', transition: 'all 0.2s',
                }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', border: `1px solid ${t.color}`, color: t.color, fontFamily: 'Bebas Neue', fontSize: 14, lineHeight: '26px', textAlign: 'center', letterSpacing: '0.05em', marginBottom: 6 }}>{t.rank}</div>
                  <div style={{ fontFamily: 'Bebas Neue', fontSize: 18, color: t.color, letterSpacing: '0.05em' }}>{t.label}</div>
                  <div style={{ fontFamily: 'Bebas Neue', fontSize: 28, color: t.color, letterSpacing: '0.05em', marginTop: 4 }}>{t.price}<span style={{ fontSize: 13, fontFamily: 'DM Sans', fontWeight: 400 }}> /vehicle</span></div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.5 }}>{t.desc}</div>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>
              One-time fee per vehicle. You will receive payment details after submitting your registration.
            </p>
            <button
              className="btn-gold"
              onClick={handleNext}
              disabled={!step1Valid}
              style={!step1Valid ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
              title={step1Valid ? '' : step1Err}
            >NEXT: ADD VEHICLES →</button>
            {!step1Valid && (
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
                {step1Err}
              </p>
            )}
            </>
            )}
          </div>
        )}

        {/* ── STEP 2: Vehicles ── */}
        {step === 2 && (
          <div>
            {vehicles.map((v, i) => (
              <div key={i} className="card" style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <h3 style={{ fontSize: 22 }}>VEHICLE {i + 1}</h3>
                  {vehicles.length > 1 && (
                    <button onClick={() => removeVehicle(i)} style={{
                      background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)',
                      padding: '6px 12px', borderRadius: 4, cursor: 'pointer', fontSize: 12,
                    }}>Remove</button>
                  )}
                </div>

                <div className='register-grid-2' style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label>Vehicle Type</label>
                    <select value={v.vehicle_type} onChange={e => updateVehicle(i, 'vehicle_type', e.target.value)}>
                      {VEHICLE_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div><label>VIN / Chassis Number</label><input value={v.vin} onChange={e => updateVehicle(i, 'vin', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 17))} placeholder="17-character VIN" maxLength={17} style={{ textTransform: 'uppercase', fontFamily: 'ui-monospace, monospace' }} /></div>
                  <div><label>Make</label><input value={v.make} onChange={e => updateVehicle(i, 'make', e.target.value.replace(/[^A-Za-z0-9\s\-/]/g, '').slice(0, 30))} placeholder="e.g. Toyota" /></div>
                  <div><label>Model</label><input value={v.model} onChange={e => updateVehicle(i, 'model', e.target.value.replace(/[^A-Za-z0-9\s\-/.]/g, '').slice(0, 40))} placeholder="e.g. Camry" /></div>
                  <div><label>Year</label><input value={v.year} onChange={e => updateVehicle(i, 'year', clampYearInput(e.target.value))} placeholder="e.g. 2023" inputMode="numeric" maxLength={4} /></div>
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

                  {/* Current booking details */}
                  <div style={{ gridColumn: '1 / -1' }}>
                    {/* Booking confirmation checkbox */}
                    <div style={{
                      background: hasBookingConfirmed ? '#0d1a0d' : '#1a0d0d',
                      border: `1px solid ${hasBookingConfirmed ? '#2a4a2a' : '#4a1a1a'}`,
                      borderRadius: 8, padding: '14px 16px', marginBottom: 10,
                    }}>
                      <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={hasBookingConfirmed}
                          onChange={e => setHasBookingConfirmed(e.target.checked)}
                          style={{ marginTop: 3, width: 16, height: 16, flexShrink: 0, cursor: 'pointer' }}
                        />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14, color: hasBookingConfirmed ? '#5adb5a' : '#ff6b6b', display: 'flex', alignItems: 'center', gap: 6 }}>
                            {hasBookingConfirmed ? <><IconCheckCircle size={14} />Confirmed — I have an existing WOVI booking</> : <><IconExclamationTriangle size={14} />I confirm I have already booked a WOVI inspection and paid the $100 deposit</>}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.5 }}>
                            AVIBM can only reschedule an <strong>existing</strong> booking to an earlier date. You must first go to{' '}
                            <a href="https://wovi.com.au/bookings/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gold)' }}>wovi.com.au</a>
                            {' '}and book an inspection + pay the $100 deposit before registering here.
                          </div>
                        </div>
                      </label>
                    </div>

                    {/* Booking date fields — only shown once confirmed */}
                    {hasBookingConfirmed && (
                      <div style={{ background: 'var(--dark-4)', border: '1px solid var(--border)', borderRadius: 8, padding: '14px 16px' }}>
                        <div style={{ color: 'var(--gold)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <IconCalendar size={13} />Current Inspection Booking
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                          <div>
                            <label style={{ fontSize: 12 }}>Booking Date *</label>
                            <input
                              type="date"
                              value={v.current_booking_date}
                              onChange={e => updateVehicle(i, 'current_booking_date', e.target.value)}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: 12 }}>Booking Time</label>
                            <select
                              value={v.current_booking_time}
                              onChange={e => updateVehicle(i, 'current_booking_time', e.target.value)}
                            >
                              <option value="">— Select —</option>
                              {WOVI_BOOKING_TIMES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                          </div>
                          <div>
                            <label style={{ fontSize: 12 }}>Location</label>
                            <select
                              value={v.current_booking_location}
                              onChange={e => updateVehicle(i, 'current_booking_location', e.target.value)}
                            >
                              <option value="">Select location</option>
                              {WOVI_LOCATIONS.map(l => <option key={l.name} value={l.name}>{l.name}</option>)}
                            </select>
                          </div>
                        </div>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8, marginBottom: 0 }}>
                          We&apos;ll only rebook if we find a slot earlier than your current booking date.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Location selector */}
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label>Inspection Locations</label>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
                      Enter your address and travel radius to find nearby WOVI locations.
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                      <input
                        value={radiusAddress}
                        onChange={e => setRadiusAddress(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && findNearbyLocations(i)}
                        placeholder="Enter your suburb or full address..."
                      />
                      <button onClick={() => findNearbyLocations(i)} disabled={radiusLoading} style={{
                        background: 'var(--gold)', color: '#000', border: 'none',
                        padding: '12px 20px', borderRadius: 6, cursor: 'pointer',
                        fontFamily: 'Bebas Neue', fontSize: 15, letterSpacing: '0.1em',
                        whiteSpace: 'nowrap', flexShrink: 0,
                      }}>{radiusLoading ? 'SEARCHING...' : 'SEARCH →'}</button>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, background: 'var(--dark-3)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 16px' }}>
                      <span style={{ fontSize: 13, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Travel radius:</span>
                      <input type="range" min={50} max={1500} step={50} value={radius}
                        onChange={e => { setRadius(Number(e.target.value)); if (homeCoords) updateRadiusLocations(i, homeCoords, Number(e.target.value)) }}
                        style={{ flex: 1, accentColor: 'var(--gold)' }} />
                      <span style={{ fontSize: 18, color: 'var(--gold)', fontFamily: 'Bebas Neue', letterSpacing: '0.05em', minWidth: 70 }}>{radius} km</span>
                    </div>
                    {radiusError && <p style={{ fontSize: 12, color: '#ff6b6b', marginBottom: 8 }}>{radiusError}</p>}
                    <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)', marginBottom: 12, position: 'relative' }}>
                      <div id={`map-${i}`} className='leaflet-map' style={{ height: 'min(360px, 55vw)', minHeight: 220, width: '100%', background: '#1a1a2e' }} />
                      {!homeCoords && (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--dark-3)', flexDirection: 'column', gap: 12, borderRadius: 8 }}>
                          <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--dark-4)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}><IconMapPin size={22} /></div>
                          <div style={{ color: 'var(--text-muted)', fontSize: 14, textAlign: 'center', lineHeight: 1.6 }}>
                            Enter your suburb above<br/>and click <strong style={{ color: 'var(--gold)' }}>SEARCH →</strong>
                          </div>
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <p style={{ fontSize: 12, color: homeCoords ? 'var(--gold)' : 'var(--text-muted)', margin: 0, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        {homeCoords ? <><IconCheck size={12} />{v.locations.length} location{v.locations.length !== 1 ? 's' : ''} selected</> : 'Manually select locations'}
                      </p>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => setVehicles(vs => vs.map((v2, idx) => idx === i ? { ...v2, locations: WOVI_LOCATIONS.map(l => l.name) } : v2))}
                          style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)', padding: '4px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 11, fontFamily: 'DM Sans' }}>Select All</button>
                        <button onClick={() => setVehicles(vs => vs.map((v2, idx) => idx === i ? { ...v2, locations: [], priority_locations: [] } : v2))}
                          style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)', padding: '4px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 11, fontFamily: 'DM Sans' }}>Clear All</button>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {WOVI_LOCATIONS.map(loc => {
                        const selected = v.locations.includes(loc.name)
                        const dist = homeCoords ? Math.round(haversineKm(homeCoords.lat, homeCoords.lng, loc.lat, loc.lng)) : null
                        return (
                          <div key={loc.name} onClick={() => toggleLocation(i, loc.name)} style={{
                            padding: '7px 12px', borderRadius: 6, cursor: 'pointer',
                            border: `1px solid ${selected ? 'var(--gold)' : 'var(--border)'}`,
                            background: selected ? 'var(--dark-3)' : 'var(--dark-4)',
                            color: selected ? 'var(--gold)' : 'var(--text-muted)',
                            fontSize: 13, transition: 'all 0.2s', userSelect: 'none',
                          }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              {selected ? <IconCheck size={12} /> : <span style={{ width: 12, textAlign: 'center', display: 'inline-block' }}>+</span>}
                              {loc.name}{dist !== null ? ` · ${dist}km` : ''}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                    {v.locations.length === 0 && (
                      <p style={{ fontSize: 12, color: '#ff6b6b', marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 6 }}><IconExclamationTriangle size={13} />Please select at least one location.</p>
                    )}

                    {/* Priority locations — numbered */}
                    {v.locations.length > 0 && (
                      <div style={{ marginTop: 16, padding: '14px 16px', background: 'var(--dark-4)', borderRadius: 8, border: '1px solid var(--border)' }}>
                        <div style={{ fontSize: 12, color: 'var(--gold)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>
                          Priority Locations <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional — up to 2)</span>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10, lineHeight: 1.5 }}>
                          Your 1st click = Priority 1 (checked first). Your 2nd click = Priority 2 (checked second). All other selected locations are checked after.
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {v.locations.map(loc => {
                            const priorityIndex = (v.priority_locations || []).indexOf(loc)
                            const isPriority = priorityIndex !== -1
                            const priorityNum = priorityIndex + 1
                            const atMax = (v.priority_locations || []).length >= 2
                            return (
                              <button key={loc} type="button"
                                onClick={() => togglePriority(i, loc)}
                                style={{
                                  padding: '5px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
                                  border: `1px solid ${isPriority ? 'var(--gold)' : 'var(--border)'}`,
                                  background: isPriority ? 'var(--dark-2)' : 'transparent',
                                  color: isPriority ? 'var(--gold)' : atMax && !isPriority ? '#555' : 'var(--text-muted)',
                                  opacity: atMax && !isPriority ? 0.5 : 1,
                                  fontWeight: isPriority ? 600 : 400,
                                  transition: 'all 0.15s',
                                }}
                              >
                                {isPriority ? (
                                  <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                    <span style={{
                                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                      width: 18, height: 18, borderRadius: '50%',
                                      background: 'var(--gold)', color: '#000',
                                      fontSize: 10, fontWeight: 700, flexShrink: 0,
                                    }}>{priorityNum}</span>
                                    {loc}
                                  </span>
                                ) : loc}
                              </button>
                            )
                          })}
                        </div>
                        {(v.priority_locations || []).length > 0 && (
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
                            Scan order: {(v.priority_locations || []).map((l, idx) => (
                              <span key={l}>
                                <span style={{ color: 'var(--gold)', fontWeight: 600 }}>#{idx+1} {l}</span>
                                {idx < (v.priority_locations || []).length - 1 ? ' → ' : ''}
                              </span>
                            ))}
                            {v.locations.filter(l => !(v.priority_locations || []).includes(l)).length > 0 && (
                              <span> → then remaining {v.locations.filter(l => !(v.priority_locations || []).includes(l)).length} location{v.locations.filter(l => !(v.priority_locations || []).includes(l)).length !== 1 ? 's' : ''}</span>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            <button onClick={addVehicle} style={{
              width: '100%', padding: '14px', borderRadius: 8,
              border: '1px dashed var(--border)', background: 'transparent',
              color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14,
              fontFamily: 'DM Sans', marginBottom: 16, transition: 'border-color 0.2s, color 0.2s',
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

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
      <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
    </svg>
  )
}
