'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowser } from '@/lib/supabase/client'

// Lean "add another vehicle" form for returning customers. We DON'T
// re-ask for personal details / locations — those come from the
// customer row. Only need vehicle-specific fields + cutoff_date.
const VEHICLE_TYPES = ['Car', 'Motorcycle', 'Truck', 'Trailer', 'Caravan']
const DAMAGES = ['HAIL DAMAGE', 'WATER DAMAGE', 'MALICIOUS DAMAGE', 'FIRE DAMAGE', 'STRUCTURAL DAMAGE', 'IMPACT DAMAGE DRIVERS FRONT', 'IMPACT DAMAGE PASSENGER FRONT', 'IMPACT DAMAGE DRIVERS SIDE', 'IMPACT DAMAGE PASSENGER SIDE', 'IMPACT DAMAGE DRIVERS REAR', 'IMPACT DAMAGE PASSENGER REAR', 'OTHER']
const PURCHASE_METHODS = ['Auction', 'Private Sale', 'Insurance', 'Other']

export default function AddVehiclePage() {
  const supabase = createSupabaseBrowser()
  const router = useRouter()
  const [authReady, setAuthReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [v, setV] = useState({
    label: '', make: '', model: '', year: '', vin: '', colour: '',
    vehicle_type: 'Car', build_month: '',
    damage: '', purchase_method: '', purchased_from: '',
    cutoff_date: '',
  })

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.replace('/account/sign-in'); return }
      if (!user.user_metadata?.customer_id) { router.replace('/account/complete-profile'); return }
      setAuthReady(true)
    })
  }, [supabase, router])

  function up<K extends keyof typeof v>(field: K, val: typeof v[K]) { setV(s => ({ ...s, [field]: val })) }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!v.make || !v.model || !v.year || !v.vin) return setErr('Please fill make, model, year and VIN.')
    if (!v.cutoff_date) return setErr('Please pick the latest acceptable WOVI date (your current booking).')
    setBusy(true); setErr(null)
    const res = await fetch('/api/account/add-vehicle', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(v),
    })
    const j = await res.json()
    setBusy(false)
    if (!res.ok) return setErr(j.error || 'Failed to add vehicle.')
    router.replace('/account')
  }

  if (!authReady) return <div style={loadingScreen}>Loading…</div>

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#eee', fontFamily: 'DM Sans, sans-serif', padding: '40px 20px' }}>
      <div style={{ maxWidth: 540, margin: '0 auto', background: '#111', border: '1px solid #222', borderRadius: 10, padding: 28 }}>
        <h1 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 26, letterSpacing: '0.06em', color: '#C9A84C', margin: '0 0 6px 0' }}>ADD A VEHICLE</h1>
        <p style={{ color: '#888', fontSize: 13, marginTop: 0, marginBottom: 20 }}>Personal details come from your profile — just tell us about the vehicle.</p>

        <form onSubmit={submit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Nickname (optional)" value={v.label} onChange={x => up('label', x)} fullRow />
          <Field label="Make" value={v.make} onChange={x => up('make', x)} />
          <Field label="Model" value={v.model} onChange={x => up('model', x)} />
          <Field label="Year" value={v.year} onChange={x => up('year', x)} />
          <Field label="Colour" value={v.colour} onChange={x => up('colour', x)} />
          <Field label="VIN" value={v.vin} onChange={x => up('vin', x.toUpperCase())} fullRow />

          <Select label="Vehicle Type" value={v.vehicle_type} options={VEHICLE_TYPES} onChange={x => up('vehicle_type', x)} />
          <Select label="Build Month" value={v.build_month} options={['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']} onChange={x => up('build_month', x)} />
          <Select label="Damage" value={v.damage} options={['', ...DAMAGES]} onChange={x => up('damage', x)} fullRow />
          <Select label="Purchased via" value={v.purchase_method} options={['', ...PURCHASE_METHODS]} onChange={x => up('purchase_method', x)} />
          <Field label="Purchased From" value={v.purchased_from} onChange={x => up('purchased_from', x)} />

          <div style={{ gridColumn: 'span 2' }}>
            <label style={lbl}>Latest acceptable WOVI date (your current booking)</label>
            <input type="date" value={v.cutoff_date} onChange={e => up('cutoff_date', e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 6, background: '#0a0a0a', border: '1px solid #222', color: '#eee', fontSize: 14 }} />
            <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>The bot will only book slots earlier than this date.</div>
          </div>

          <div style={{ gridColumn: 'span 2', marginTop: 8 }}>
            <button type="submit" disabled={busy} style={primary}>
              {busy ? 'Adding…' : '+ Add vehicle'}
            </button>
          </div>

          {err && <div style={{ gridColumn: 'span 2', padding: 10, background: '#1f0c0c', border: '1px solid #3a1a1a', borderRadius: 6, color: '#f87171', fontSize: 13 }}>{err}</div>}
        </form>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, fullRow = false }: { label: string; value: string; onChange: (v: string) => void; fullRow?: boolean }) {
  return (
    <div style={{ gridColumn: fullRow ? 'span 2' : undefined }}>
      <label style={lbl}>{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)}
        style={{ width: '100%', padding: '8px 10px', borderRadius: 6, background: '#0a0a0a', border: '1px solid #222', color: '#eee', fontSize: 14 }} />
    </div>
  )
}
function Select({ label, value, options, onChange, fullRow = false }: { label: string; value: string; options: string[]; onChange: (v: string) => void; fullRow?: boolean }) {
  return (
    <div style={{ gridColumn: fullRow ? 'span 2' : undefined }}>
      <label style={lbl}>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{ width: '100%', padding: '8px 10px', borderRadius: 6, background: '#0a0a0a', border: '1px solid #222', color: '#eee', fontSize: 14 }}>
        {options.map(o => <option key={o} value={o}>{o || '— Select —'}</option>)}
      </select>
    </div>
  )
}
const lbl: React.CSSProperties = { display: 'block', fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }
const primary: React.CSSProperties = { padding: '11px 18px', borderRadius: 6, background: '#C9A84C', color: '#000', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }
const loadingScreen: React.CSSProperties = { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a', color: '#888', fontFamily: 'DM Sans, sans-serif' }
