'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseBrowser } from '@/lib/supabase/client'
import { IconArrowLeft } from '@/components/icons'
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
      // preferred_locations live in user_metadata, not on the customers
      // row — read them straight from the supabase browser client.
      try {
        const supabase = createSupabaseBrowser()
        const { data: { user } } = await supabase.auth.getUser()
        const fromMeta = (user?.user_metadata?.preferred_locations as string[] | undefined) || []
        if (fromMeta.length > 0) {
          setF(s => s ? { ...s, preferred_locations: fromMeta } : s)
        }
      } catch {}
      setLoading(false)
    })()
  }, [router])

  if (loading || !f) return <Page><p style={muted}>Loading…</p></Page>

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
    <Page>
      <p style={{ marginBottom: 12 }}>
        <Link href="/account" style={{ ...link, display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
          <IconArrowLeft size={14} />Back to dashboard
        </Link>
      </p>

      <h1 style={h1}>Edit details</h1>
      <p style={{ ...muted, marginBottom: 20 }}>
        Email and state are locked. To change your email you&apos;ll need to sign out and sign in with the new account.
      </p>

      <Section title="Personal details">
        <Grid>
          <Field label="First name" value={f.first_name} onChange={x => up('first_name', x)} />
          <Field label="Last name"  value={f.last_name}  onChange={x => up('last_name', x)} />
          <Field label="Email (locked)" value={f.email} onChange={() => {}} disabled fullRow />
          <Field
            label="Mobile (04…)"
            value={f.phone}
            onChange={x => up('phone', normaliseAuMobile(x))}
            fullRow
            error={f.phone ? validateAuMobile(f.phone) : null}
          />
          <Field
            label="Street address (number + name)"
            value={f.address}
            onChange={x => up('address', x)}
            fullRow
            error={f.address ? validateStreetAddress(f.address) : null}
          />
          <Field
            label="Suburb (no postcode)"
            value={f.suburb}
            onChange={x => up('suburb', x.replace(/\d/g, ''))}
            error={f.suburb ? validateSuburb(f.suburb) : null}
          />
          <Field
            label="Postcode"
            value={f.postcode}
            onChange={x => up('postcode', x.replace(/\D/g, '').slice(0, 4))}
            error={f.postcode ? validatePostcode(f.postcode, f.state) : null}
          />
          <Field label="State (locked)" value={f.state} onChange={() => {}} disabled />
          {f.state === 'QLD' && (
            <Field
              label="CRN"
              value={f.crn}
              onChange={x => up('crn', x.replace(/\D/g, '').slice(0, 10))}
              error={f.crn ? validateCrn(f.crn) : null}
            />
          )}
          {f.state === 'SA' && (
            <Field label="Licence number" value={f.licence_number} onChange={x => up('licence_number', x)} />
          )}
          <Field label="Date of birth" type="date" value={f.date_of_birth} onChange={x => up('date_of_birth', x)} />
        </Grid>
      </Section>

      {f.state === 'QLD' && (
        <Section title="Preferred inspection locations">
          <p style={{ ...muted, marginBottom: 8 }}>Tap to include or exclude. These apply to any new vehicles you add.</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {WOVI_LOCATIONS.map(loc => {
              const on = f.preferred_locations.includes(loc)
              return (
                <button type="button" key={loc} onClick={() => toggleLoc(loc)} style={pill(on)}>{loc}</button>
              )
            })}
          </div>
        </Section>
      )}

      {err && <div style={errBox}>{err}</div>}
      {savedAt && !err && <div style={okBox}>Saved. Redirecting…</div>}

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
        <Link href="/account" style={ghostBtnLink}>Cancel</Link>
        <button
          type="button"
          onClick={save}
          disabled={busy || !formValid}
          style={(!formValid && !busy) ? { ...primaryBtn, opacity: 0.4, cursor: 'not-allowed' } : primaryBtn}
          title={formValid ? '' : formErr}
        >
          {busy ? 'Saving…' : 'Save changes'}
        </button>
      </div>
      {!formValid && !busy && (
        <p style={{ ...muted, textAlign: 'right', marginTop: 8 }}>{formErr}</p>
      )}
    </Page>
  )
}

function Page({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#eee', fontFamily: 'DM Sans, sans-serif', padding: '40px 20px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>{children}</div>
    </div>
  )
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#111', border: '1px solid #222', borderRadius: 10, padding: 20, marginBottom: 16 }}>
      <h2 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 16, letterSpacing: '0.06em', color: '#C9A84C', margin: '0 0 14px 0' }}>{title}</h2>
      {children}
    </div>
  )
}
function Grid({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>{children}</div>
}
function Field({ label, value, onChange, fullRow = false, type = 'text', error = null, disabled = false }: { label: string; value: string; onChange: (v: string) => void; fullRow?: boolean; type?: string; error?: string | null; disabled?: boolean }) {
  return (
    <div style={{ gridColumn: fullRow ? 'span 2' : undefined }}>
      <label style={lbl}>{label}</label>
      <input
        type={type}
        value={value}
        disabled={disabled}
        onChange={e => onChange(e.target.value)}
        style={{ ...inp, borderColor: error ? '#a33' : '#222', opacity: disabled ? 0.6 : 1, cursor: disabled ? 'not-allowed' : 'auto' }}
      />
      {error && <p style={{ fontSize: 11, color: '#f87171', margin: '4px 0 0 0' }}>{error}</p>}
    </div>
  )
}
function pill(on: boolean): React.CSSProperties {
  return {
    padding: '6px 12px', borderRadius: 999, fontSize: 12,
    background: on ? '#1a1200' : '#0a0a0a',
    border: `1px solid ${on ? '#4a3a00' : '#222'}`,
    color: on ? '#C9A84C' : '#888',
    cursor: 'pointer', fontFamily: 'inherit',
  }
}

const h1: React.CSSProperties = { fontFamily: 'Bebas Neue, sans-serif', fontSize: 26, letterSpacing: '0.05em', margin: '0 0 8px 0' }
const muted: React.CSSProperties = { color: '#888', fontSize: 12 }
const link: React.CSSProperties = { color: '#5ab0ff', fontSize: 13, textDecoration: 'underline' }
const lbl: React.CSSProperties = { display: 'block', fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }
const inp: React.CSSProperties = { width: '100%', padding: '8px 10px', borderRadius: 6, background: '#0a0a0a', border: '1px solid #222', color: '#eee', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }
const primaryBtn: React.CSSProperties = { padding: '11px 18px', borderRadius: 6, background: '#C9A84C', color: '#000', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }
const ghostBtnLink: React.CSSProperties = { padding: '11px 18px', borderRadius: 6, background: 'none', color: '#888', border: '1px solid #333', fontWeight: 600, fontSize: 13, textDecoration: 'none', display: 'inline-block' }
const errBox: React.CSSProperties = { padding: 12, background: '#1f0c0c', border: '1px solid #3a1a1a', borderRadius: 6, color: '#f87171', fontSize: 13, marginBottom: 12 }
const okBox: React.CSSProperties = { padding: 12, background: '#0c1f0c', border: '1px solid #1a3a1a', borderRadius: 6, color: '#5adb5a', fontSize: 13, marginBottom: 12 }
