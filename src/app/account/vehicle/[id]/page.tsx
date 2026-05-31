'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { validateCutoffDate } from '@/lib/validators'
import { PreviewShell, Arrow, BackToGarage } from '@/lib/previewDesign'
import PhotoGallery from '@/components/PhotoGallery'

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
  previous_cutoff: string | null
  booked_at: string | null
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
  const params = useParams<{ id: string }>()
  const id = params?.id

  const [v, setV] = useState<Vehicle | null>(null)
  const [photos, setPhotos] = useState<string[]>([])
  const [heroIndex, setHeroIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  useEffect(() => {
    if (!id) return
    ;(async () => {
      const r = await fetch(`/api/account/vehicle/${id}`, { cache: 'no-store' })
      if (!r.ok) { setErr('Vehicle not found.'); setLoading(false); return }
      const veh = await r.json()
      setV(veh)
      setLoading(false)
      if (veh?.vin) {
        try {
          const g = await fetch(`/api/vehicle-lookup?vin=${encodeURIComponent(veh.vin)}&hero=1`)
          const d = await g.json()
          if (Array.isArray(d?.photos) && d.photos.length) {
            setPhotos(d.photos)
            setHeroIndex(Number(d.hero_index) || 0)
          }
        } catch { /* gallery is optional */ }
      }
    })()
  }, [id])

  if (loading) return <PreviewShell><BackToGarage href="/account" /><p style={{ color: 'var(--muted)' }}>Loading…</p></PreviewShell>
  if (!v) return (
    <PreviewShell>
      <BackToGarage href="/account" />
      <h1 className="disp" style={{ fontSize: 40, marginTop: 18 }}>Vehicle not found</h1>
    </PreviewShell>
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
  const original = v.previous_cutoff || v.cutoff_date
  const earlier = v.booked_date ? daysEarlier(original, v.booked_date) : null
  const title = [v.year, v.make, v.model].filter(Boolean).join(' ') || v.label || 'Vehicle'
  const specChips = ([['Build', v.build_month], ['Damage', v.damage], ['Colour', v.colour], ['Type', v.vehicle_type]] as [string, string | null | undefined][]).filter(([, val]) => val)
  const details = ([['Make', v.make], ['Model', v.model], ['Year', String(v.year || '')], ['Colour', v.colour], ['VIN', v.vin], ['Type', v.vehicle_type], ['Build', v.build_month], ['State', v.state]] as [string, string | null | undefined][]).filter(([, val]) => val)

  return (
    <PreviewShell>
      <BackToGarage href="/account" />

      {/* header */}
      <div className="r" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 14, flexWrap: 'wrap', marginBottom: 22 }}>
        <div style={{ minWidth: 0 }}>
          <span className="eyebrow">Vehicle</span>
          <h1 className="disp" style={{ fontSize: 'clamp(34px,4.4vw,54px)', marginTop: 14 }}>{title}</h1>
          <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 10, fontFamily: 'ui-monospace,monospace' }}>
            {[v.state, v.vin ? `VIN ${v.vin}` : null].filter(Boolean).join('  ·  ')}
          </p>
        </div>
        <span className="spill" style={{ color: status.color, background: status.bg, border: `1px solid ${status.color}` }}>
          <span className={v.active && !v.booked_date ? 'dot live' : 'dot'} style={{ background: status.color }} />{status.label}
        </span>
      </div>

      <div className="bento-v" style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 18, alignItems: 'start' }}>
        {/* LEFT */}
        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 18 }}>
          {photos.length > 0 && (
            <div className="r card" style={{ overflow: 'hidden', padding: 8 }}>
              <PhotoGallery photos={photos} initialIndex={heroIndex} />
            </div>
          )}

          {specChips.length > 0 && (
            <div className="r" style={{ animationDelay: '.05s', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 12 }}>
              {specChips.map(([lab, val]) => (
                <div key={lab} className="card" style={{ padding: '14px 16px' }}>
                  <div className="fl">{lab}</div><div className="fv" style={{ fontWeight: 600 }}>{val}</div>
                </div>
              ))}
            </div>
          )}

          <div className="r card" style={{ animationDelay: '.1s', padding: 26 }}>
            <span className="eyebrow">Vehicle details</span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: '20px 28px', marginTop: 20 }}>
              {details.map(([l, val]) => (<div key={l}><div className="fl">{l}</div><div className="fv">{val}</div></div>))}
            </div>
            <p style={{ marginTop: 18, padding: 12, borderRadius: 12, background: 'rgba(201,168,76,0.07)', border: '1px solid rgba(201,168,76,0.3)', color: 'var(--gold-2)', fontSize: 12, lineHeight: 1.5 }}>
              Vehicle details are locked once registered — <Link href="/account/add-vehicle" style={{ color: 'var(--gold-2)', textDecoration: 'underline' }}>add a new vehicle</Link> to monitor a different car.
            </p>
          </div>
        </div>

        {/* RIGHT sticky */}
        <div className="side-v" style={{ display: 'flex', flexDirection: 'column', gap: 18, position: 'sticky', top: 18 }}>
          {/* booking */}
          <div className="r card" style={{ animationDelay: '.08s', padding: 24, background: 'radial-gradient(120% 90% at 100% 0%, rgba(98,227,106,0.13), transparent 55%), linear-gradient(180deg,rgba(20,18,16,0.86),rgba(11,10,9,0.92))' }}>
            <span className="eyebrow" style={{ color: 'var(--green)', background: 'rgba(255,255,255,0.04)', borderColor: 'var(--green)' }}>Booking</span>
            {v.booked_date ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 16, padding: '14px 16px', borderRadius: 16, background: 'rgba(98,227,106,0.08)', border: '1px solid rgba(98,227,106,0.3)' }}>
                  <div style={{ flex: 1 }}><div className="fl">Original</div><div style={{ fontSize: 14, color: 'var(--muted)', textDecoration: 'line-through', marginTop: 3 }}>{fmtDate(original)}</div></div>
                  <span style={{ color: 'var(--green)' }}><Arrow s={18} /></span>
                  <div style={{ flex: 1 }}><div className="fl" style={{ color: 'var(--green)' }}>Now booked</div><div className="disp" style={{ fontSize: 20, color: 'var(--green)', marginTop: 3 }}>{fmtDate(v.booked_date)}</div></div>
                </div>
                {earlier && earlier > 0 ? (
                  <div style={{ display: 'inline-block', marginTop: 12, fontSize: 12, fontWeight: 700, color: 'var(--green)', background: 'rgba(98,227,106,0.14)', border: '1px solid rgba(98,227,106,0.4)', borderRadius: 999, padding: '5px 13px' }}>{earlier} day{earlier !== 1 ? 's' : ''} earlier</div>
                ) : null}
                <div style={{ marginTop: 14, fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>
                  {[v.booked_time, v.booked_location].filter(Boolean).join(' · ')}{(v.booked_time || v.booked_location) ? '. ' : ''}The bot keeps watching for an even earlier slot.
                </div>
              </>
            ) : (
              <>
                <div style={{ marginTop: 16, display: 'grid', gap: '14px 0' }}>
                  <div><div className="fl">Your original date</div><div className="fv">{fmtDate(v.cutoff_date)}</div></div>
                  <div><div className="fl">Locations</div><div className="fv">{(v.locations || []).join(', ') || (isQld ? '—' : 'Regency Park')}</div></div>
                </div>
                <p style={{ marginTop: 14, fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>
                  {v.active ? 'The bot is searching for a slot earlier than your original date and will rebook automatically.' : 'Monitoring is paused — resume below to start searching.'}
                </p>
              </>
            )}
          </div>

          {/* monitoring */}
          <div className="r card" style={{ animationDelay: '.12s', padding: 24 }}>
            <span className="eyebrow">Monitoring</span>
            <button type="button" onClick={() => update('active', !v.active)}
              style={{ width: '100%', marginTop: 16, textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10, borderRadius: 14, padding: '13px 16px', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, background: v.active ? 'rgba(98,227,106,0.1)' : 'rgba(255,255,255,0.04)', border: `1px solid ${v.active ? 'rgba(98,227,106,0.4)' : 'rgba(255,255,255,0.1)'}`, color: v.active ? 'var(--green)' : 'var(--muted)' }}>
              <span className={v.active ? 'dot live' : 'dot'} style={{ background: v.active ? 'var(--green)' : 'var(--muted)' }} />{v.active ? 'Active — bot is searching' : 'Paused — click to resume'}
            </button>

            <div style={{ marginTop: 16 }}>
              <div className="fl" style={{ marginBottom: 7 }}>Nickname (shows on dashboard)</div>
              <input className="inp" value={v.label || ''} onChange={e => update('label', e.target.value)} placeholder={`${v.make} ${v.model}`} />
            </div>

            <div style={{ marginTop: 16 }}>
              <div className="fl" style={{ marginBottom: 7 }}>Latest acceptable date (your existing booking)</div>
              <input className="inp" type="date" value={v.cutoff_date || ''} onChange={e => update('cutoff_date', e.target.value)} />
              <p style={{ color: 'var(--muted)', fontSize: 12, marginTop: 6 }}>The bot only books slots earlier than this date.</p>
            </div>

            {isQld && (
              <div style={{ marginTop: 16 }}>
                <div className="fl" style={{ marginBottom: 7 }}>Inspection locations</div>
                <p style={{ color: 'var(--muted)', fontSize: 12, marginBottom: 9 }}>Tap to include/exclude. Tap the number to set priority (1 = top).</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {WOVI_LOCATIONS.map(loc => {
                    const on = (v.locations || []).includes(loc)
                    const pIdx = (v.priority_locations || []).indexOf(loc)
                    return (
                      <div key={loc} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <button type="button" onClick={() => toggleLoc(loc)} className={on ? 'chip on' : 'chip'}>{loc}</button>
                        {on && (
                          <button type="button" onClick={() => togglePriority(loc)} title={pIdx >= 0 ? `Priority ${pIdx + 1}` : 'Set priority'}
                            style={{ width: 24, height: 24, borderRadius: '50%', background: pIdx >= 0 ? 'var(--gold)' : 'rgba(255,255,255,0.05)', color: pIdx >= 0 ? '#231900' : 'var(--muted)', border: `1px solid ${pIdx >= 0 ? 'var(--gold)' : 'rgba(255,255,255,0.15)'}`, fontSize: 11, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
                            {pIdx >= 0 ? pIdx + 1 : '+'}
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {err && <div style={{ marginTop: 14, padding: 12, borderRadius: 12, background: 'rgba(240,120,120,0.1)', border: '1px solid rgba(240,120,120,0.4)', color: '#f08a8a', fontSize: 13 }}>{err}</div>}
            {savedAt && !err && <div style={{ marginTop: 14, padding: 12, borderRadius: 12, background: 'rgba(98,227,106,0.1)', border: '1px solid rgba(98,227,106,0.4)', color: 'var(--green)', fontSize: 13 }}>Saved.</div>}

            <button type="button" onClick={save} disabled={busy} className="pill gold" style={{ width: '100%', justifyContent: 'center', marginTop: 18, padding: '14px 0', opacity: busy ? 0.7 : 1 }}>
              {busy ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: '@media(max-width:820px){.bento-v{grid-template-columns:1fr!important}.side-v{position:static!important}}' }} />
    </PreviewShell>
  )
}

function fmtDate(d?: string | null): string {
  if (!d) return '—'
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return d
  return dt.toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
function daysEarlier(a?: string | null, b?: string | null): number | null {
  if (!a || !b) return null
  const da = new Date(a), db = new Date(b)
  if (isNaN(da.getTime()) || isNaN(db.getTime())) return null
  return Math.round((da.getTime() - db.getTime()) / 86400000)
}
function vehicleStatus(v: Vehicle): { label: string; color: string; bg: string } {
  if (v.archived) return { label: 'Archived', color: '#8d8678', bg: 'rgba(141,134,120,0.12)' }
  if (v.booked_date) return { label: 'Booked', color: '#62e36a', bg: 'rgba(98,227,106,0.16)' }
  if (!v.active) return { label: 'Paused', color: '#aaa', bg: 'rgba(170,170,170,0.12)' }
  if (v.booking_in_progress) return { label: 'Booking now…', color: '#6bb6ff', bg: 'rgba(107,182,255,0.16)' }
  return { label: 'Searching', color: '#E9CE88', bg: 'rgba(201,168,76,0.16)' }
}
