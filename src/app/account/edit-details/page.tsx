'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { PreviewShell, Arrow, BackToGarage } from '@/lib/previewDesign'
import {
  validateAuMobile, validatePostcode, validateStreetAddress, validateSuburb,
  validateCrn, normaliseAuMobile,
} from '@/lib/validators'

const WOVI_LOCATIONS = [
  'Brisbane', 'Bundaberg', 'Burleigh Heads', 'Cairns', 'Mackay',
  'Narangba', 'Rockhampton City', 'Toowoomba', 'Townsville', 'Yatala',
]

type Form = {
  state: 'QLD' | 'SA'
  first_name: string
  last_name: string
  email: string
  phone: string
  address: string
  suburb: string
  postcode: string
  crn: string
  licence_number: string
  date_of_birth: string
  preferred_locations: string[]
}

export default function EditDetailsPage() {
  const router = useRouter()
  const [f, setF] = useState<Form | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  useEffect(() => {
    (async () => {
      const r = await fetch('/api/account/profile', { cache: 'no-store' })
      if (!r.ok) { router.replace('/account/sign-in'); return }
      const c = await r.json()
      setF({
        state: (c.state || 'QLD') as 'QLD' | 'SA',
        first_name: c.first_name || '',
        last_name: c.last_name || '',
        email: c.email || '',
        phone: c.phone || '',
        address: c.address || '',
        suburb: c.suburb || '',
        postcode: c.postcode || '',
        crn: c.crn || '',
        licence_number: c.licence_number || '',
        date_of_birth: c.date_of_birth || '',
        preferred_locations: Array.isArray(c.preferred_locations) ? c.preferred_locations : [],
      })
      setLoading(false)
    })()
  }, [router])

  if (loading || !f) return <PreviewShell><BackToGarage href="/account" /><p style={{ color: 'var(--muted)' }}>Loading…</p></PreviewShell>

  function up<K extends keyof Form>(k: K, v: Form[K]) {
    setF(s => s ? { ...s, [k]: v } : s)
  }
  function toggleLoc(loc: string) {
    setF(s => {
      if (!s) return s
      const cur = s.preferred_locations
      return { ...s, preferred_locations: cur.includes(loc) ? cur.filter(x => x !== loc) : [...cur, loc] }
    })
  }

  function validate(): string {
    if (!f) return 'Loading…'
    if (!f.first_name.trim() || !f.last_name.trim()) return 'First and last name are required.'
    const phoneErr = validateAuMobile(f.phone);            if (phoneErr)  return phoneErr
    const addrErr  = validateStreetAddress(f.address);     if (addrErr)   return addrErr
    const subErr   = validateSuburb(f.suburb);             if (subErr)    return subErr
    const pcErr    = validatePostcode(f.postcode, f.state); if (pcErr)    return pcErr
    if (f.state === 'QLD') { const crnErr = validateCrn(f.crn); if (crnErr) return crnErr }
    if (f.state === 'SA' && !f.licence_number.trim()) return 'Licence number is required for SA.'
    return ''
  }
  const formErr = validate()
  const formValid = formErr === ''

  async function save() {
    if (!f || !formValid) { setErr(formErr); return }
    setErr(null); setBusy(true)
    const r = await fetch('/api/account/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        first_name: f.first_name, last_name: f.last_name, phone: f.phone,
        address: f.address, suburb: f.suburb, postcode: f.postcode,
        ...(f.state === 'QLD' ? { crn: f.crn } : {}),
        ...(f.state === 'SA' ? { licence_number: f.licence_number } : {}),
        date_of_birth: f.date_of_birth,
        preferred_locations: f.preferred_locations,
      }),
    })
    setBusy(false)
    if (!r.ok) { const j = await r.json().catch(() => ({})); setErr(j.error || 'Save failed.'); return }
    setSavedAt(Date.now())
    setTimeout(() => router.replace('/account'), 600)
  }

  return (
    <PreviewShell>
      <BackToGarage href="/account" />

      <div className="r" style={{ marginBottom: 26 }}>
        <span className="eyebrow">Edit details</span>
        <h1 className="disp" style={{ fontSize: 'clamp(36px,5vw,58px)', marginTop: 16 }}>Your <span className="shimmer">details</span></h1>
        <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 14, maxWidth: 480 }}>Email and state are locked. To change your email, sign out and sign in with the new account.</p>
      </div>

      <div className="r card" style={{ animationDelay: '.06s', padding: 28, marginBottom: 18 }}>
        <span className="eyebrow">Personal details</span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 20, marginTop: 22 }}>
          <EField label="First name" value={f.first_name} onChange={x => up('first_name', x)} />
          <EField label="Last name" value={f.last_name} onChange={x => up('last_name', x)} />
          <div style={{ gridColumn: '1 / -1' }}><EField label="Email (locked)" value={f.email} onChange={() => {}} disabled /></div>
          <div style={{ gridColumn: '1 / -1' }}><EField label="Mobile (04…)" value={f.phone} onChange={x => up('phone', normaliseAuMobile(x))} error={f.phone ? validateAuMobile(f.phone) : null} /></div>
          <div style={{ gridColumn: '1 / -1' }}><EField label="Street address (number + name)" value={f.address} onChange={x => up('address', x)} error={f.address ? validateStreetAddress(f.address) : null} /></div>
          <EField label="Suburb (no postcode)" value={f.suburb} onChange={x => up('suburb', x.replace(/\d/g, ''))} error={f.suburb ? validateSuburb(f.suburb) : null} />
          <EField label="Postcode" value={f.postcode} onChange={x => up('postcode', x.replace(/\D/g, '').slice(0, 4))} error={f.postcode ? validatePostcode(f.postcode, f.state) : null} />
          <EField label="State (locked)" value={f.state} onChange={() => {}} disabled />
          {f.state === 'QLD' && <EField label="CRN" value={f.crn} onChange={x => up('crn', x.replace(/\D/g, '').slice(0, 10))} error={f.crn ? validateCrn(f.crn) : null} />}
          {f.state === 'SA' && <EField label="Licence number" value={f.licence_number} onChange={x => up('licence_number', x)} />}
          <EField label="Date of birth" type="date" value={f.date_of_birth} onChange={x => up('date_of_birth', x)} />
        </div>
      </div>

      {f.state === 'QLD' && (
        <div className="r card" style={{ animationDelay: '.1s', padding: 28, marginBottom: 18 }}>
          <span className="eyebrow">Preferred inspection locations</span>
          <p style={{ color: 'var(--muted)', fontSize: 12, marginTop: 8, fontStyle: 'italic' }}>Tap to include or exclude. These apply to any new vehicles you add.</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
            {WOVI_LOCATIONS.map(loc => {
              const on = f.preferred_locations.includes(loc)
              return <button type="button" key={loc} onClick={() => toggleLoc(loc)} className={on ? 'chip on' : 'chip'}>{loc}</button>
            })}
          </div>
        </div>
      )}

      {err && <div className="r" style={{ marginBottom: 14, padding: 12, borderRadius: 12, background: 'rgba(240,120,120,0.1)', border: '1px solid rgba(240,120,120,0.4)', color: '#f08a8a', fontSize: 13 }}>{err}</div>}
      {savedAt && !err && <div className="r" style={{ marginBottom: 14, padding: 12, borderRadius: 12, background: 'rgba(98,227,106,0.1)', border: '1px solid rgba(98,227,106,0.4)', color: 'var(--green)', fontSize: 13 }}>Saved. Redirecting…</div>}

      <div className="r" style={{ animationDelay: '.14s', display: 'flex', justifyContent: 'flex-end', gap: 12, alignItems: 'stretch' }}>
        <Link href="/account" className="pill ghost" style={{ textDecoration: 'none', padding: '0 22px' }}>Cancel</Link>
        <button type="button" onClick={save} disabled={busy || !formValid} className="pill gold" title={formValid ? '' : formErr} style={{ opacity: (busy || !formValid) ? 0.5 : 1, cursor: (busy || !formValid) ? 'not-allowed' : 'pointer' }}>
          {busy ? 'Saving…' : <>Save changes<span className="ibtn"><Arrow /></span></>}
        </button>
      </div>
      {!formValid && !busy && <p className="r" style={{ textAlign: 'right', marginTop: 8, color: 'var(--muted)', fontSize: 12 }}>{formErr}</p>}
    </PreviewShell>
  )
}

function EField({ label, value, onChange, type = 'text', error = null, disabled = false }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; error?: string | null; disabled?: boolean
}) {
  return (
    <div>
      <div className="fl" style={{ marginBottom: 7 }}>{label}</div>
      <input className="inp" type={type} value={value} disabled={disabled} onChange={e => onChange(e.target.value)}
        style={{ ...(error ? { borderColor: '#a33' } : {}), ...(disabled ? { opacity: 0.55, cursor: 'not-allowed' } : {}) }} />
      {error && <p style={{ fontSize: 12, color: '#f08a8a', marginTop: 6 }}>{error}</p>}
    </div>
  )
}
