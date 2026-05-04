'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { validateCutoffDate } from '@/lib/validators'
import { IconArrowLeft, IconPlay, IconPause } from '@/components/icons'

const WOVI_LOCATIONS = [
  'Brisbane', 'Bundaberg', 'Burleigh Heads', 'Cairns', 'Mackay',
  'Narangba', 'Rockhampton City', 'Toowoomba', 'Townsville', 'Yatala',
]

type Vehicle = {
  id: string
  customer_id: string
  state: string
  label: string | null
  make: string
  model: string
  year: string | number
  vin: string
  colour: string | null
  vehicle_type: string | null
  build_month: string | null
  damage: string | null
  cutoff_date: string | null
  active: boolean
  archived: boolean
  booking_in_progress: boolean
  booked_date: string | null
  booked_time: string | null
  booked_location: string | null
  locations: string[] | null
  priority_locations: string[] | null
}

export default function VehiclePage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params?.id

  const [v, setV] = useState<Vehicle | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  useEffect(() => {
    if (!id) return
    ;(async () => {
      const r = await fetch(`/api/account/vehicle/${id}`, { cache: 'no-store' })
      if (!r.ok) { setErr('Vehicle not found.'); setLoading(false); return }
      setV(await r.json())
      setLoading(false)
    })()
  }, [id])

  if (loading) return <Page><p style={muted}>Loading…</p></Page>
  if (!v) return (
    <Page>
      <h1 style={h1}>Vehicle not found</h1>
      <p style={muted}><Link href="/account" style={link}>← Back to dashboard</Link></p>
    </Page>
  )

  function update<K extends keyof Vehicle>(k: K, val: Vehicle[K]) {
    setV(prev => prev ? { ...prev, [k]: val } : prev)
  }

  function toggleLoc(loc: string) {
    if (!v) return
    const cur = v.locations || []
    update('locations', cur.includes(loc) ? cur.filter(x => x !== loc) : [...cur, loc])
  }
  function togglePriority(loc: string) {
    if (!v) return
    const cur = v.priority_locations || []
    if (cur.includes(loc)) update('priority_locations', cur.filter(x => x !== loc))
    else if (cur.length < 3) update('priority_locations', [...cur, loc])
  }

  async function save() {
    if (!v) return
    setErr(null)
    if (v.cutoff_date) {
      const ce = validateCutoffDate(v.cutoff_date)
      if (ce) { setErr(ce); return }
    }
    setBusy(true)
    const r = await fetch(`/api/account/vehicle/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cutoff_date: v.cutoff_date,
        locations: v.locations || [],
        priority_locations: v.priority_locations || [],
        label: v.label,
        active: v.active,
      }),
    })
    setBusy(false)
    if (!r.ok) { const j = await r.json().catch(() => ({})); setErr(j.error || 'Save failed.'); return }
    setSavedAt(Date.now())
  }

  const status = vehicleStatus(v)
  const isQld = v.state === 'QLD'

  return (
    <Page>
      <p style={{ marginBottom: 12 }}>
        <Link href="/account" style={{ ...link, display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
          <IconArrowLeft size={14} />Back to dashboard
        </Link>
      </p>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
        <h1 style={h1}>{v.label || `${v.make} ${v.model}`}</h1>
        <span style={{ ...statusBadge, color: status.color, background: status.bg, borderColor: status.color }}>
          {status.label}
        </span>
      </div>

      {/* Booking status panel */}
      {v.booked_date ? (
        <Section title="Current booking">
          <Detail label="Date" value={v.booked_date} />
          {v.booked_time && <Detail label="Time" value={v.booked_time} />}
          {v.booked_location && <Detail label="Location" value={v.booked_location} />}
          <p style={{ ...muted, marginTop: 10 }}>
            The bot will keep watching for a date earlier than your cutoff and rebook automatically if one opens up.
          </p>
        </Section>
      ) : (
        <Section title="Monitor status">
          <Detail label="Status" value={status.label} />
          <Detail label="Cutoff" value={v.cutoff_date || '—'} />
          <Detail label="Locations" value={(v.locations || []).join(', ') || '—'} />
        </Section>
      )}

      {/* Vehicle identity — READ ONLY */}
      <Section title="Vehicle (locked)">
        <p style={{ ...muted, marginTop: 0, marginBottom: 12, padding: 10, background: '#1a1200', border: '1px solid #4a3a00', borderRadius: 6, color: '#C9A84C' }}>
          Vehicle details are locked once registered. To monitor a different vehicle, you must <Link href="/account/add-vehicle" style={{ color: '#C9A84C', textDecoration: 'underline' }}>add it as a new vehicle</Link> — one-time fee per vehicle.
        </p>
        <Detail label="Make" value={v.make} />
        <Detail label="Model" value={v.model} />
        <Detail label="Year" value={String(v.year || '')} />
        <Detail label="Colour" value={v.colour || '—'} />
        <Detail label="VIN" value={v.vin} />
        <Detail label="Type" value={v.vehicle_type || '—'} />
        {v.build_month && <Detail label="Build" value={v.build_month} />}
        {v.damage && <Detail label="Damage" value={v.damage} />}
        <Detail label="State" value={v.state} />
      </Section>

      {/* Editable bits */}
      <Section title="Settings">
        <Field label="Nickname (shows on dashboard)">
          <input style={inp} value={v.label || ''} onChange={e => update('label', e.target.value)} placeholder={`${v.make} ${v.model}`} />
        </Field>
        <Field label="Latest acceptable WOVI date (your existing booking)">
          <input type="date" style={inp} value={v.cutoff_date || ''} onChange={e => update('cutoff_date', e.target.value)} />
          <p style={muted}>The bot only books slots earlier than this date.</p>
        </Field>
        <Field label="Monitoring">
          <button
            type="button"
            onClick={() => update('active', !v.active)}
            style={{ ...toggleBtn, background: v.active ? 'rgba(90,219,90,0.12)' : '#1a1a1a', borderColor: v.active ? '#5adb5a' : '#333', color: v.active ? '#5adb5a' : '#888', display: 'flex', alignItems: 'center', gap: 8 }}
          >
            {v.active ? <IconPlay size={14} /> : <IconPause size={14} />}
            <span>{v.active ? 'Active — bot is searching' : 'Paused — click to resume'}</span>
          </button>
          <p style={muted}>Pausing stops the bot from searching for new slots. Your current booking (if any) is unaffected.</p>
        </Field>
      </Section>

      {/* Locations — QLD only */}
      {isQld && (
        <Section title="Inspection locations">
          <p style={{ ...muted, marginBottom: 8 }}>Tap a location to include or exclude it. Tap the number circle to set priority order (1 = top).</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {WOVI_LOCATIONS.map(loc => {
              const on = (v.locations || []).includes(loc)
              const pIdx = (v.priority_locations || []).indexOf(loc)
              return (
                <div key={loc} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <button type="button" onClick={() => toggleLoc(loc)} style={pill(on)}>{loc}</button>
                  {on && (
                    <button
                      type="button"
                      onClick={() => togglePriority(loc)}
                      title={pIdx >= 0 ? `Priority ${pIdx + 1}` : 'Set priority'}
                      style={{
                        width: 22, height: 22, borderRadius: '50%',
                        background: pIdx >= 0 ? '#C9A84C' : '#1a1a1a',
                        color: pIdx >= 0 ? '#000' : '#666',
                        border: '1px solid ' + (pIdx >= 0 ? '#C9A84C' : '#333'),
                        fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                      }}>
                      {pIdx >= 0 ? pIdx + 1 : '+'}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </Section>
      )}

      {err && <div style={errBox}>{err}</div>}
      {savedAt && !err && <div style={okBox}>Saved.</div>}

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
        <Link href="/account" style={ghostBtnLink}>Cancel</Link>
        <button type="button" onClick={save} disabled={busy} style={primaryBtn}>
          {busy ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </Page>
  )
}

function vehicleStatus(v: Vehicle): { label: string; color: string; bg: string } {
  if (v.archived) return { label: 'Archived', color: '#888', bg: 'rgba(136,136,136,0.1)' }
  if (v.booked_date) return { label: 'Booked', color: '#5adb5a', bg: 'rgba(90,219,90,0.12)' }
  if (!v.active) return { label: 'Paused', color: '#aaa', bg: 'rgba(170,170,170,0.1)' }
  if (v.booking_in_progress) return { label: 'Booking now…', color: '#5ab0ff', bg: 'rgba(90,176,255,0.12)' }
  return { label: 'Searching', color: '#C9A84C', bg: 'rgba(201,168,76,0.12)' }
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
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  )
}
function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', gap: 12, padding: '5px 0', fontSize: 13 }}>
      <div style={{ width: 110, color: '#888', flexShrink: 0 }}>{label}</div>
      <div style={{ wordBreak: 'break-word' }}>{value || '—'}</div>
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
const h1: React.CSSProperties = { fontFamily: 'Bebas Neue, sans-serif', fontSize: 26, letterSpacing: '0.05em', margin: 0 }
const muted: React.CSSProperties = { color: '#888', fontSize: 12 }
const link: React.CSSProperties = { color: '#5ab0ff', fontSize: 13, textDecoration: 'underline' }
const inp: React.CSSProperties = { width: '100%', padding: '8px 10px', borderRadius: 6, background: '#0a0a0a', border: '1px solid #222', color: '#eee', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }
const toggleBtn: React.CSSProperties = { padding: '10px 14px', borderRadius: 6, border: '1px solid', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', width: '100%', textAlign: 'left' }
const primaryBtn: React.CSSProperties = { padding: '11px 18px', borderRadius: 6, background: '#C9A84C', color: '#000', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }
const ghostBtnLink: React.CSSProperties = { padding: '11px 18px', borderRadius: 6, background: 'none', color: '#888', border: '1px solid #333', fontWeight: 600, fontSize: 13, textDecoration: 'none', display: 'inline-block' }
const statusBadge: React.CSSProperties = { fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '4px 10px', borderRadius: 999, border: '1px solid' }
const errBox: React.CSSProperties = { padding: 12, background: '#1f0c0c', border: '1px solid #3a1a1a', borderRadius: 6, color: '#f87171', fontSize: 13, marginBottom: 12 }
const okBox: React.CSSProperties = { padding: 12, background: '#0c1f0c', border: '1px solid #1a3a1a', borderRadius: 6, color: '#5adb5a', fontSize: 13, marginBottom: 12 }
