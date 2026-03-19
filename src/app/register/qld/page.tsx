'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

const DAMAGE_OPTIONS = ['Hail Damage', 'Flood Damage', 'Collision Damage', 'Fire Damage', 'Other']
const PURCHASE_OPTIONS = ['Auction', 'Private Sale', 'Insurance', 'Other']
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const VEHICLE_TYPES = ['Car', 'Motorcycle', 'Truck', 'Trailer', 'Caravan']

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
}

const emptyVehicle = (): Vehicle => ({
  label: '', vehicle_type: 'Car', vin: '', make: '', model: '',
  year: '', colour: '', build_month: '', damage: '', purchase_method: '',
  purchased_from: '', cutoff_date: '',
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
      if (!v.vin || !v.make || !v.model || !v.year || !v.colour || !v.build_month || !v.damage || !v.purchase_method || !v.purchased_from || !v.cutoff_date)
        return `Please fill in all fields for Vehicle ${i + 1}.`
    }
    return ''
  }

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
        customer_id: customer.id,
        state: 'QLD',
        active: true,
        label: v.label || `${v.make} ${v.model}`,
        ...v,
      }))
      const { error: ve } = await supabase.from('vehicles').insert(vehicleRows)
      if (ve) throw new Error(ve.message)

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
              <div><label>First Name</label><input value={owner.first_name} onChange={e => updateOwner('first_name', e.target.value)} placeholder="John" /></div>
              <div><label>Last Name</label><input value={owner.last_name} onChange={e => updateOwner('last_name', e.target.value)} placeholder="Smith" /></div>
              <div><label>Email</label><input type="email" value={owner.email} onChange={e => updateOwner('email', e.target.value)} placeholder="john@email.com" /></div>
              <div><label>Mobile</label><input value={owner.phone} onChange={e => updateOwner('phone', e.target.value)} placeholder="0412 345 678" /></div>
              <div style={{ gridColumn: '1 / -1' }}><label>Street Address</label><input value={owner.address} onChange={e => updateOwner('address', e.target.value)} placeholder="123 Main Street" /></div>
              <div><label>Suburb</label><input value={owner.suburb} onChange={e => updateOwner('suburb', e.target.value)} placeholder="Brisbane" /></div>
              <div><label>Postcode</label><input value={owner.postcode} onChange={e => updateOwner('postcode', e.target.value)} placeholder="4000" /></div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label>QLD Driver's Licence / CRN</label>
                <input value={owner.crn} onChange={e => updateOwner('crn', e.target.value)} placeholder="Your CRN number" />
              </div>
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
