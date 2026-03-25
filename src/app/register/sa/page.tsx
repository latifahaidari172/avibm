'use client'
import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function RegisterSA() {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

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
    const streetNum = a.house_number || ''
    const street    = a.road || ''
    const suburb    = a.suburb || a.town || a.city_district || a.village || ''
    const postcode  = a.postcode || ''
    const fullStreet = [streetNum, street].filter(Boolean).join(' ')
    setForm(p => ({
      ...p,
      address:  fullStreet || place.display_name.split(',')[0],
      suburb:   suburb,
      postcode: postcode,
    }))
    setAddrSuggestions([])
  }

  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', phone: '',
    address: '', suburb: '', postcode: '',
    licence_number: '', date_of_birth: '',
    cutoff_date: '',
  })

  const update = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const handleSubmit = async () => {
    const required = ['first_name','last_name','email','phone','address','suburb','postcode','licence_number','date_of_birth','cutoff_date']
    for (const k of required) {
      if (!form[k as keyof typeof form]) { setError('Please fill in all fields.'); return }
    }
    if (!/^\S+@\S+\.\S+$/.test(form.email)) { setError('Please enter a valid email.'); return }
    setError(''); setLoading(true)
    try {
      const { data: customer, error: ce } = await supabase
        .from('customers')
        .insert({
          state: 'SA', active: false, tier: 'basic',
          first_name: form.first_name, last_name: form.last_name,
          email: form.email, phone: form.phone,
          address: form.address, suburb: form.suburb, postcode: form.postcode,
          licence_number: form.licence_number, date_of_birth: form.date_of_birth,
        })
        .select('id').single()
      if (ce || !customer) throw new Error(ce?.message || 'Failed to save')

      const { error: ve } = await supabase.from('vehicles').insert({
        customer_id: customer.id,
        state: 'SA',
        active: true,
        label: 'SA Inspection Vehicle',
        vehicle_type: 'Car',
        vin: '', make: '', model: '', year: '', colour: '',
        build_month: '', damage: '', purchase_method: '', purchased_from: '',
        cutoff_date: form.cutoff_date,
      })
      if (ve) throw new Error(ve.message)

      // Redirect to Stripe payment
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: 'basic', customer_id: customer.id, state: 'SA' }),
      })
      const { url, error: stripeError } = await res.json()
      if (stripeError || !url) throw new Error(stripeError || 'Payment setup failed. Please try again.')
      window.location.href = url
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
          Your details have been received. We'll review and activate your monitoring shortly. You'll receive an email once you're live.
        </p>
        <Link href="/" style={{ color: 'var(--gold)', fontSize: 14, textDecoration: 'none' }}>← Back to home</Link>
      </div>
    </main>
  )

  return (
    <main className='register-main' style={{ minHeight: '100vh', padding: '40px 20px' }}>
      <div style={{ maxWidth: 680, margin: '0 auto 32px' }}>
        <Link href="/" style={{ color: 'var(--text-muted)', fontSize: 13, textDecoration: 'none' }}>← Back</Link>
        <div style={{ marginTop: 24 }}>
          <div className="section-label">South Australia — Service SA</div>
          <h1 style={{ fontSize: 48, lineHeight: 1 }}>REGISTER YOUR<br /><span className="gold">VEHICLE</span></h1>
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

        <div className="card">
          <h3 style={{ fontSize: 24, marginBottom: 24 }}>YOUR DETAILS</h3>
          <div className='register-grid-2' style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div><label>First Name</label><input value={form.first_name} onChange={e => update('first_name', e.target.value)} placeholder="John" /></div>
            <div><label>Last Name</label><input value={form.last_name} onChange={e => update('last_name', e.target.value)} placeholder="Smith" /></div>
            <div><label>Email</label><input type="email" value={form.email} onChange={e => update('email', e.target.value)} placeholder="john@email.com" /></div>
            <div><label>Mobile</label><input value={form.phone} onChange={e => update('phone', e.target.value)} placeholder="0412 345 678" /></div>
            <div style={{ gridColumn: '1 / -1', position: 'relative' }}>
              <label>Street Address</label>
              <div style={{ position: 'relative' }}>
                <input
                  value={form.address}
                  onChange={e => {
                    update('address', e.target.value)
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
            <div><label>Suburb</label><input value={form.suburb} onChange={e => update('suburb', e.target.value)} placeholder="Adelaide" /></div>
            <div><label>Postcode</label><input value={form.postcode} onChange={e => update('postcode', e.target.value)} placeholder="5000" /></div>
            <div><label>SA Licence Number</label><input value={form.licence_number} onChange={e => update('licence_number', e.target.value)} placeholder="Your licence number" /></div>
            <div><label>Date of Birth</label><input type="date" value={form.date_of_birth} onChange={e => update('date_of_birth', e.target.value)} /></div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label>Current Booking Date (Cutoff)</label>
              <input type="date" value={form.cutoff_date} onChange={e => update('cutoff_date', e.target.value)} />
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>We'll only rebook if we find something earlier than this date.</p>
            </div>
          </div>
          <div style={{ marginTop: 24 }}>
            <button className="btn-gold" onClick={handleSubmit} disabled={loading}>
              {loading ? 'SUBMITTING...' : 'SUBMIT REGISTRATION'}
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
