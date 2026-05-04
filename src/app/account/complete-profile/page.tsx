'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowser } from '@/lib/supabase/client'

const QLD_LOCATIONS = ['Bundaberg', 'Burleigh Heads', 'Cairns', 'Mackay', 'Rockhampton City', 'Toowoomba', 'Townsville', 'Yatala', 'Brisbane']

// First-time post-OAuth profile completion. Captures the customer
// details that are otherwise scattered across the long QLD/SA
// registration form, links the new customers row back to the
// authenticated user via user_metadata.customer_id.
export default function CompleteProfilePage() {
  const supabase = createSupabaseBrowser()
  const router = useRouter()
  const [authEmail, setAuthEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [form, setForm] = useState({
    first_name: '', last_name: '', phone: '', address: '', suburb: '', postcode: '',
    crn: '', state: 'QLD', tier: 'priority',
    preferred_locations: [] as string[],
  })

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.replace('/account/sign-in')
        return
      }
      setAuthEmail(user.email || '')
      // If a name came from the OAuth provider, prefill it
      const m = user.user_metadata as Record<string, unknown>
      const fn = (m?.given_name || m?.first_name || '') as string
      const ln = (m?.family_name || m?.last_name || '') as string
      setForm(f => ({ ...f, first_name: f.first_name || fn, last_name: f.last_name || ln }))
    })
  }, [supabase, router])

  function update<K extends keyof typeof form>(field: K, v: typeof form[K]) {
    setForm(f => ({ ...f, [field]: v }))
  }
  function toggleLoc(loc: string) {
    setForm(f => ({
      ...f,
      preferred_locations: f.preferred_locations.includes(loc)
        ? f.preferred_locations.filter(x => x !== loc)
        : [...f.preferred_locations, loc],
    }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.first_name || !form.last_name || !form.phone || !form.address)
      return setErr('Please fill in name, phone, and address.')
    if (!/^04\d{8}$/.test(form.phone)) return setErr('Mobile must be 10 digits starting with 04.')
    setBusy(true)
    setErr(null)
    const res = await fetch('/api/account/create-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, email: authEmail }),
    })
    const j = await res.json()
    setBusy(false)
    if (!res.ok) return setErr(j.error || 'Failed to create profile.')
    router.replace('/account')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#eee', fontFamily: 'DM Sans, sans-serif', padding: '40px 20px' }}>
      <div style={{ maxWidth: 540, margin: '0 auto', background: '#111', border: '1px solid #222', borderRadius: 10, padding: 28 }}>
        <h1 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 26, letterSpacing: '0.06em', color: '#C9A84C', margin: '0 0 6px 0' }}>COMPLETE YOUR PROFILE</h1>
        <p style={{ color: '#888', fontSize: 13, marginTop: 0, marginBottom: 20 }}>Signed in as <strong style={{ color: '#eee' }}>{authEmail}</strong>. Tell us a bit about you so we don't ask again next time you add a vehicle.</p>

        <form onSubmit={submit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="First name" value={form.first_name} onChange={v => update('first_name', v)} />
          <Field label="Last name" value={form.last_name} onChange={v => update('last_name', v)} />
          <Field label="Mobile (04…)" value={form.phone} onChange={v => update('phone', v.replace(/\D/g, '').replace(/^61/, '0').slice(0, 10))} fullRow />
          <Field label="Address" value={form.address} onChange={v => update('address', v)} fullRow />
          <Field label="Suburb" value={form.suburb} onChange={v => update('suburb', v)} />
          <Field label="Postcode" value={form.postcode} onChange={v => update('postcode', v)} />

          <div style={{ gridColumn: 'span 2' }}>
            <label style={lbl}>State</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['QLD', 'SA'] as const).map(st => (
                <button
                  type="button"
                  key={st}
                  onClick={() => update('state', st)}
                  style={pill(form.state === st)}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {form.state === 'QLD' && (
            <Field label="CRN" value={form.crn} onChange={v => update('crn', v)} fullRow />
          )}

          {form.state === 'QLD' && (
            <div style={{ gridColumn: 'span 2' }}>
              <label style={lbl}>Preferred QLD inspection locations (you can edit later)</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {QLD_LOCATIONS.map(loc => (
                  <button
                    type="button"
                    key={loc}
                    onClick={() => toggleLoc(loc)}
                    style={pill(form.preferred_locations.includes(loc))}
                  >
                    {loc}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div style={{ gridColumn: 'span 2', marginTop: 8 }}>
            <button type="submit" disabled={busy} style={primary}>
              {busy ? 'Saving…' : 'Save profile'}
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
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{ width: '100%', padding: '8px 10px', borderRadius: 6, background: '#0a0a0a', border: '1px solid #222', color: '#eee', fontSize: 14 }}
      />
    </div>
  )
}
const lbl: React.CSSProperties = { display: 'block', fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }
const primary: React.CSSProperties = { padding: '11px 18px', borderRadius: 6, background: '#C9A84C', color: '#000', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }
function pill(on: boolean): React.CSSProperties {
  return {
    padding: '6px 12px', borderRadius: 999, fontSize: 12,
    background: on ? '#1a1200' : '#0a0a0a',
    border: `1px solid ${on ? '#4a3a00' : '#222'}`,
    color: on ? '#C9A84C' : '#888',
    cursor: 'pointer', fontFamily: 'inherit',
  }
}
