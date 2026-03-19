'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function RegisterSA() {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

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
          state: 'SA', active: false,
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
          Your details have been received. We'll review and activate your monitoring shortly. You'll receive an email once you're live.
        </p>
        <Link href="/" style={{ color: 'var(--gold)', fontSize: 14, textDecoration: 'none' }}>← Back to home</Link>
      </div>
    </main>
  )

  return (
    <main style={{ minHeight: '100vh', padding: '40px 20px' }}>
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div><label>First Name</label><input value={form.first_name} onChange={e => update('first_name', e.target.value)} placeholder="John" /></div>
            <div><label>Last Name</label><input value={form.last_name} onChange={e => update('last_name', e.target.value)} placeholder="Smith" /></div>
            <div><label>Email</label><input type="email" value={form.email} onChange={e => update('email', e.target.value)} placeholder="john@email.com" /></div>
            <div><label>Mobile</label><input value={form.phone} onChange={e => update('phone', e.target.value)} placeholder="0412 345 678" /></div>
            <div style={{ gridColumn: '1 / -1' }}><label>Street Address</label><input value={form.address} onChange={e => update('address', e.target.value)} placeholder="123 Main Street" /></div>
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
