'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { PreviewShell, Arrow } from '@/lib/previewDesign'

// AVIBM admin — the /admin-preview prototype, wired to real data + auth.
// 1:1 with the prototype: glass nav, "Customer control" heading, stat cards,
// tabs + search, expandable customer cards (avatar, copy-ref, green-when-booked,
// WOVI grid, original→now-booked) and the Manage-admins modal. Real actions:
// View as user (impersonate), Archive, Delete, Manage admins, Refresh, Log out.

// ── shapes the prototype renders ──
type Veh = {
  id?: string; title: string; vin: string; ref?: string; status: string; c: string; bg: string; line: string; active?: boolean
  make?: string; model?: string; year?: string; build?: string; colour?: string
  type?: string; damage?: string; method?: string; from?: string
  date?: string; time?: string; loc?: string
  origDate?: string; origTime?: string; origLoc?: string; earlier?: string
  cutoff?: string; locations?: string
}
type Cust = {
  id: string; ref: string; first: string; last: string; email: string; phone: string
  state: 'QLD' | 'SA'; tier: 'priority' | 'standard' | 'basic'; active: boolean; pending: boolean
  crn: string; dob: string; address: string; created: string
  vehicles: Veh[]; archived: Veh[]; deleted: { id?: string; title: string; vin: string }[]
  _raw: any
}

const GREEN = { c: '#62e36a', bg: 'rgba(98,227,106,0.16)' }
const GOLD = { c: '#E9CE88', bg: 'rgba(201,168,76,0.16)' }
const BLUE = { c: '#6bb6ff', bg: 'rgba(107,182,255,0.16)' }
const GREY = { c: '#cfcabb', bg: 'rgba(170,170,170,0.14)' }
const AMBER = { c: '#F0A93C', bg: 'rgba(240,169,60,0.16)' }
const TIER_META: Record<string, { label: string; c: string }> = {
  priority: { label: 'Priority · $5', c: 'var(--gold-2)' },
  standard: { label: 'Standard · $3', c: '#cfcabb' },
  basic: { label: 'Basic · $1.50', c: '#b08d57' },
}

const fmtD = (d?: string | null) => { if (!d) return ''; const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d); return m ? `${m[3]}/${m[2]}/${m[1]}` : d }
const daysEarlier = (a?: string | null, b?: string | null) => { if (!a || !b) return null; const da = new Date(a), db = new Date(b); if (isNaN(da.getTime()) || isNaN(db.getTime())) return null; return Math.round((da.getTime() - db.getTime()) / 86400000) }

const ic = { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7 } as const
const Cal = () => <svg {...ic}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v4M16 3v4" strokeLinecap="round" /></svg>
const Clock = () => <svg {...ic}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" /></svg>
const Pin = () => <svg {...ic}><path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z" /><circle cx="12" cy="11" r="2.5" /></svg>
const dtl: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6 }

function CopyRef({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  const fallback = (t: string) => { try { const ta = document.createElement('textarea'); ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta) } catch {} }
  const copy = (e: any) => { e.stopPropagation(); try { if (navigator.clipboard?.writeText) navigator.clipboard.writeText(value).catch(() => fallback(value)); else fallback(value) } catch { fallback(value) } setCopied(true); setTimeout(() => setCopied(false), 1000) }
  return (
    <span role="button" tabIndex={0} title="Click to copy" onClick={copy}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); copy(e) } }}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: 'ui-monospace,monospace', fontSize: 11, fontWeight: 600, cursor: 'pointer', userSelect: 'none', borderRadius: 6, padding: '2px 7px', color: copied ? 'var(--green)' : 'var(--gold)', background: copied ? 'rgba(98,227,106,0.14)' : 'rgba(201,168,76,0.1)', border: `1px solid ${copied ? 'rgba(98,227,106,0.4)' : 'rgba(201,168,76,0.28)'}` }}>
      {copied ? 'Copied!' : <>{value}<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ opacity: 0.6 }}><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" strokeLinecap="round" /></svg></>}
    </span>
  )
}

// Visual on/off switch showing whether the bot is monitoring this vehicle.
function MonitorToggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button onClick={(e) => { e.stopPropagation(); onClick() }} role="switch" aria-checked={on}
      title={on ? 'Bot is monitoring — click to stop' : 'Bot is off — click to start'}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 9, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
      <span style={{ position: 'relative', width: 42, height: 24, borderRadius: 999, flexShrink: 0, transition: 'all .3s var(--ease)', background: on ? 'linear-gradient(180deg,#7ef08a,#3fcf57)' : 'rgba(255,255,255,0.12)', border: `1px solid ${on ? 'rgba(98,227,106,0.6)' : 'rgba(255,255,255,0.18)'}` }}>
        <span style={{ position: 'absolute', top: 2, left: on ? 20 : 2, width: 18, height: 18, borderRadius: 999, background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.4)', transition: 'left .3s var(--ease)' }} />
      </span>
      <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.02em', color: on ? 'var(--green)' : '#aaa' }}>Bot {on ? 'ON' : 'OFF'}</span>
    </button>
  )
}

function VehicleBlock({ v, onToggleMonitor }: { v: Veh; onToggleMonitor?: (v: Veh) => void }) {
  const isBooked = v.status === 'Booked' && !!v.date
  const spec: [string, string | undefined][] = [
    ['Make', v.make], ['Model', v.model], ['Year', v.year], ['Build', v.build],
    ['Colour', v.colour], ['Body / type', v.type], ['Damage', v.damage],
    ['VIN', v.vin], ['Source', [v.method, v.from].filter(Boolean).join(' · ')],
  ]
  return (
    <div style={{ borderRadius: 16, padding: 18, border: `1px solid ${isBooked ? 'rgba(98,227,106,0.3)' : 'rgba(255,255,255,0.08)'}`, background: isBooked ? 'rgba(98,227,106,0.05)' : 'rgba(255,255,255,0.02)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', minWidth: 0 }}>
          <span style={{ fontSize: 15, fontWeight: 700 }}>{v.title}</span>
          {v.ref && <CopyRef value={v.ref} />}
        </div>
        <span className="spill" style={{ color: v.c, background: v.bg, border: `1px solid ${v.c}` }}>
          {isBooked
            ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={v.c} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
            : <span className={v.status === 'Searching' ? 'dot live' : 'dot'} style={{ background: v.c }} />}
          {v.status}
        </span>
      </div>

      <div className="fl" style={{ marginTop: 16, marginBottom: 10 }}>Vehicle details · for WOVI</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: '16px 24px' }}>
        {spec.filter(([, val]) => val).map(([l, val]) => {
          const isVin = l === 'VIN'
          return (
            <div key={l}>
              <div className="fl">{l}</div>
              <div className="fv" style={{ fontSize: 14, ...(isVin ? { fontFamily: 'ui-monospace,monospace', whiteSpace: 'nowrap', overflowX: 'auto' } : { wordBreak: 'break-word' }) }}>{val}</div>
            </div>
          )
        })}
      </div>

      {isBooked ? (
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(98,227,106,0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 150 }}>
              <div className="fl">Original booking</div>
              <div style={{ marginTop: 8, display: 'grid', gap: 6, fontSize: 13, color: 'var(--muted)' }}>
                <span style={dtl}><Cal />{v.origDate}</span>
                {v.origTime && <span style={dtl}><Clock />{v.origTime}</span>}
                {v.origLoc && <span style={dtl}><Pin />{v.origLoc}</span>}
              </div>
            </div>
            <span style={{ color: 'var(--green)', flexShrink: 0 }}><Arrow s={18} /></span>
            <div style={{ flex: 1, minWidth: 150 }}>
              <div className="fl" style={{ color: 'var(--green)' }}>Now booked</div>
              <div style={{ marginTop: 8, display: 'grid', gap: 6, fontSize: 13, color: 'var(--green)', fontWeight: 600 }}>
                <span style={dtl}><Cal />{v.date}</span>
                {v.time && <span style={dtl}><Clock />{v.time}</span>}
                {v.loc && <span style={dtl}><Pin />{v.loc}</span>}
              </div>
            </div>
          </div>
          {v.earlier && <div style={{ display: 'inline-block', marginTop: 14, fontSize: 12, fontWeight: 700, color: 'var(--green)', background: 'rgba(98,227,106,0.14)', border: '1px solid rgba(98,227,106,0.4)', borderRadius: 999, padding: '5px 13px' }}>{v.earlier}</div>}
        </div>
      ) : v.status === 'Searching' ? (
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.07)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: '14px 22px' }}>
          <div><div className="fl">Latest acceptable date</div><div className="fv" style={{ fontSize: 14 }}>{v.cutoff}</div></div>
          <div><div className="fl">Searching locations</div><div className="fv" style={{ fontSize: 14 }}>{v.locations}</div></div>
        </div>
      ) : (
        <div style={{ marginTop: 14, fontSize: 13, color: '#F0A93C' }}>Monitoring starts once payment is received.</div>
      )}

      {onToggleMonitor && v.id && (
        <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>{v.active ? 'Bot is monitoring for an earlier slot' : 'Bot is turned off for this vehicle'}</span>
          <MonitorToggle on={!!v.active} onClick={() => onToggleMonitor(v)} />
        </div>
      )}
    </div>
  )
}

// ── map a real customer row → the prototype shape ──
function toVeh(rv: any): Veh {
  const title = [rv.year, rv.make, rv.model].filter(Boolean).join(' ').trim() || rv.label || 'Vehicle'
  const isBooked = !!rv.booked_date
  const status = isBooked ? 'Booked' : rv.active ? 'Searching' : 'Awaiting payment'
  const palette = isBooked ? GREEN : rv.active ? (rv.state === 'SA' ? BLUE : GOLD) : AMBER
  const orig = rv.previous_cutoff || rv.cutoff_date
  const earlier = isBooked ? daysEarlier(orig, rv.booked_date) : null
  return {
    id: rv.id, active: !!rv.active, title, vin: rv.vin, ref: rv.ref, status, c: palette.c, bg: palette.bg,
    line: isBooked ? `Booked ${fmtD(rv.booked_date)}${rv.booked_time ? ' · ' + rv.booked_time : ''}${rv.booked_location ? ' · ' + rv.booked_location : ''}` : `Looking for slots before ${fmtD(rv.cutoff_date)}`,
    make: rv.make, model: rv.model, year: rv.year ? String(rv.year) : '', build: rv.build_month, colour: rv.colour,
    type: rv.vehicle_type, damage: rv.damage, method: rv.purchase_method, from: rv.purchased_from,
    date: fmtD(rv.booked_date), time: rv.booked_time, loc: rv.booked_location,
    origDate: fmtD(orig), earlier: earlier && earlier > 0 ? `${earlier} day${earlier !== 1 ? 's' : ''} earlier` : undefined,
    cutoff: fmtD(rv.cutoff_date),
    locations: (rv.locations && rv.locations.length ? rv.locations.join(', ') : (rv.state === 'SA' ? 'Regency Park' : 'All centres')),
  }
}
function toCust(rc: any): Cust {
  const vs = Array.isArray(rc.vehicles) ? rc.vehicles : []
  return {
    id: rc.id, ref: rc.ref || '', first: rc.first_name || '', last: rc.last_name || '', email: rc.email || '', phone: rc.phone || '',
    state: rc.state === 'SA' ? 'SA' : 'QLD', tier: (rc.tier || 'standard'), active: !!rc.active, pending: !rc.active && !!rc.auto_payment_email,
    crn: rc.crn || rc.licence_number || '—', dob: fmtD(rc.date_of_birth) || (rc.date_of_birth || '—'),
    address: `${rc.address || ''}${rc.suburb ? ', ' + rc.suburb : ''} ${rc.postcode || ''}`.trim() || '—', created: fmtD(rc.created_at),
    vehicles: vs.filter((v: any) => !v.archived && !v.deleted_at).map(toVeh),
    archived: vs.filter((v: any) => v.archived).map((v: any) => ({ ...toVeh(v), status: 'Done', c: GREY.c, bg: GREY.bg, line: v.booked_date ? `Booked ${fmtD(v.booked_date)}` : 'Completed' })),
    deleted: vs.filter((v: any) => v.deleted_at).map((v: any) => ({ id: v.id, title: [v.year, v.make, v.model].filter(Boolean).join(' ').trim() || 'Vehicle', vin: v.vin })),
    _raw: rc,
  }
}

// ── lightweight inline charts (no deps, on-brand) ──
type Seg = { label: string; value: number; c: string }

// Compact count pill for the collapsed customer card (e.g. "2 monitoring").
function MiniStat({ c, v, label }: { c: string; v: number; label: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--muted)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 999, padding: '4px 10px' }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: c, flexShrink: 0 }} />
      <span style={{ color: '#efece5', fontWeight: 700 }}>{v}</span>{label}
    </span>
  )
}

function Donut({ segments, total, caption }: { segments: Seg[]; total: number; caption: string }) {
  const sum = segments.reduce((n, s) => n + s.value, 0) || 1
  const R = 52, C = 2 * Math.PI * R, sw = 15
  let offset = 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
      <svg width={132} height={132} viewBox="0 0 132 132" style={{ flexShrink: 0 }}>
        <circle cx={66} cy={66} r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={sw} />
        {segments.map((s, i) => {
          const len = (s.value / sum) * C
          const el = <circle key={i} cx={66} cy={66} r={R} fill="none" stroke={s.c} strokeWidth={sw} strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-offset} transform="rotate(-90 66 66)" style={{ transition: 'stroke-dasharray .6s var(--ease)' }} />
          offset += len
          return el
        })}
        <text x={66} y={62} textAnchor="middle" fontFamily="Bricolage Grotesque, sans-serif" fontSize="30" fontWeight="700" fill="#F5F2EB">{total}</text>
        <text x={66} y={82} textAnchor="middle" fontSize="9" fill="#8d8678" letterSpacing="0.14em">{caption}</text>
      </svg>
      <div style={{ display: 'grid', gap: 9, minWidth: 120, flex: 1 }}>
        {segments.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: s.c, flexShrink: 0 }} />
            <span style={{ color: 'var(--muted)' }}>{s.label}</span>
            <span style={{ marginLeft: 'auto', fontWeight: 700 }}>{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function Bars({ items }: { items: Seg[] }) {
  const max = Math.max(1, ...items.map(i => i.value))
  return (
    <div style={{ display: 'grid', gap: 15 }}>
      {items.map((it, i) => (
        <div key={i}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
            <span style={{ color: 'var(--muted)' }}>{it.label}</span><span style={{ fontWeight: 700 }}>{it.value}</span>
          </div>
          <div style={{ height: 9, borderRadius: 999, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
            <div style={{ width: `${(it.value / max) * 100}%`, height: '100%', borderRadius: 999, background: it.c, transition: 'width .6s var(--ease)' }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function ColumnChart({ data, c }: { data: { label: string; value: number }[]; c: string }) {
  const max = Math.max(1, ...data.map(d => d.value))
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 132 }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, justifyContent: 'flex-end', height: '100%' }}>
          <div style={{ fontSize: 11, color: '#efece5', fontWeight: 700 }}>{d.value}</div>
          <div style={{ width: '100%', maxWidth: 34, height: `${Math.max(4, (d.value / max) * 84)}px`, borderRadius: '8px 8px 4px 4px', background: `linear-gradient(180deg,${c},rgba(201,168,76,0.2))` }} />
          <div style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: '0.04em' }}>{d.label}</div>
        </div>
      ))}
    </div>
  )
}

type AdminUser = { id: string; username: string; role: string; active?: boolean }

export default function Admin() {
  const [authed, setAuthed] = useState(() => typeof window !== 'undefined' && !!localStorage.getItem('avibm_admin_user'))
  const [authedAdmin, setAuthedAdmin] = useState<{ id: string; username: string; role: string } | null>(() => {
    if (typeof window === 'undefined') return null
    try { return JSON.parse(localStorage.getItem('avibm_admin_user') || 'null') } catch { return null }
  })
  const isOwner = authedAdmin?.role === 'owner'
  const [username, setUsername] = useState('')
  const [pw, setPw] = useState('')
  const [pwError, setPwError] = useState('')

  const [rawCustomers, setRawCustomers] = useState<any[]>([])
  const [tab, setTab] = useState<'all' | 'QLD' | 'SA'>('all')
  const [q, setQ] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const [showArchived, setShowArchived] = useState(false)
  const [botOnline, setBotOnline] = useState(false)

  const [showAdmins, setShowAdmins] = useState(false)
  const [admins, setAdmins] = useState<AdminUser[]>([])
  const [newAdmin, setNewAdmin] = useState({ username: '', password: '' })

  const [showFree, setShowFree] = useState(false)
  const [freeList, setFreeList] = useState<{ entry: string; customer_id: string | null; notified_at: string | null; created_at: string }[]>([])
  const [newFree, setNewFree] = useState('')
  const [freeBusy, setFreeBusy] = useState(false)

  const authFetch = async (url: string, options: RequestInit = {}) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('avibm_admin_token') || '' : ''
    const res = await fetch(url, { ...options, headers: { ...(options.headers || {}), 'Authorization': `Bearer ${token}` } })
    if (res.status === 401) { localStorage.removeItem('avibm_admin_user'); localStorage.removeItem('avibm_admin_token'); setAuthed(false); setAuthedAdmin(null) }
    return res
  }
  const adminPatch = (table: string, id: string, updates: object) => fetch('/api/admin/customers', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ table, id, updates }) })
  const adminDelete = (table: string, id: string) => fetch('/api/admin/customers', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ table, id }) })
  const logAction = async (action: string, details?: string) => { if (isOwner || !authedAdmin) return; try { await authFetch('/api/admin-logs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, details: details || null, admin_username: authedAdmin.username }) }) } catch {} }

  const mergeDuplicatesByEmail = (rows: any[]): any[] => {
    const byEmail = new Map<string, any[]>()
    for (const c of rows) { const k = (c.email || '').trim().toLowerCase(); if (!k) { byEmail.set(`__n_${c.id}__`, [c]); continue } const b = byEmail.get(k); if (b) b.push(c); else byEmail.set(k, [c]) }
    const out: any[] = []
    for (const bucket of Array.from(byEmail.values())) {
      if (bucket.length === 1) { out.push(bucket[0]); continue }
      const sorted = [...bucket].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
      const keep = sorted[0]; const seen = new Set<string>()
      const veh = bucket.flatMap(c => c.vehicles || []).filter(v => { const k = String(v.id || `${v.vin}`); if (seen.has(k)) return false; seen.add(k); return true })
      out.push({ ...keep, vehicles: veh })
    }
    return out
  }

  const loadData = async () => {
    try {
      const r = await fetch('/api/admin/customers')
      const d = await r.json()
      if (Array.isArray(d)) setRawCustomers(mergeDuplicatesByEmail(d))
    } catch {}
  }
  const loadAdmins = async () => { const r = await authFetch('/api/admin-login?action=list'); if (r.ok) { const d = await r.json(); if (Array.isArray(d)) setAdmins(d) } }
  const loadFree = async () => { try { const r = await authFetch('/api/admin/whitelist'); if (r.ok) { const d = await r.json(); if (Array.isArray(d)) setFreeList(d) } } catch {} }
  const loadBot = async () => { try { const r = await authFetch('/api/bot-control'); if (r.ok) { const d = await r.json(); if (Array.isArray(d)) setBotOnline(d.some((b: any) => b.last_seen && (Date.now() - new Date(b.last_seen).getTime()) < 3 * 60 * 1000)) } } catch {} }

  useEffect(() => {
    if (!authed) return
    authFetch('/api/admin-login?action=refresh').then(async res => { if (res.ok) { const d = await res.json(); if (d.token) localStorage.setItem('avibm_admin_token', d.token) } })
    loadData(); loadBot(); loadAdmins(); loadFree()
    const t = setInterval(loadData, 30000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed])

  useEffect(() => {
    if (!showAdmins && !showFree) return
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') { setShowAdmins(false); setShowFree(false) } }
    document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k)
  }, [showAdmins, showFree])

  const login = async () => {
    if (!username.trim() || !pw.trim()) { setPwError('Enter your username and password'); return }
    setPwError('')
    try {
      const res = await fetch('/api/admin-login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: username.trim(), password: pw.trim() }) })
      const data = await res.json()
      if (!res.ok) { setPwError(data.error || 'Incorrect username or password'); return }
      const u = { id: data.id, username: data.username, role: data.role }
      localStorage.setItem('avibm_admin_user', JSON.stringify(u)); localStorage.setItem('avibm_admin_token', data.token || '')
      setAuthedAdmin(u); setAuthed(true)
    } catch { setPwError('Connection error — try again') }
  }
  const logout = () => { localStorage.removeItem('avibm_admin_user'); localStorage.removeItem('avibm_admin_token'); setAuthed(false); setAuthedAdmin(null) }

  const impersonate = async (id: string, email: string) => {
    const res = await authFetch('/api/admin/impersonate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ customer_id: id }) })
    if (!res.ok) { alert('Could not open this customer’s account.'); return }
    await logAction('Viewed account as user', email || id)
    window.open('/account', '_blank')
  }
  const archiveCustomer = async (id: string) => {
    await adminPatch('customers', id, { archived: true, active: false })
    setRawCustomers(cs => cs.map(c => c.id === id ? { ...c, archived: true, active: false } : c))
    await logAction('Archived customer', id)
  }
  const unarchiveCustomer = async (id: string) => {
    await adminPatch('customers', id, { archived: false })
    setRawCustomers(cs => cs.map(c => c.id === id ? { ...c, archived: false } : c))
    await logAction('Unarchived customer', id)
  }
  const deleteCustomer = async (id: string) => {
    if (!confirm('Delete this customer and all their vehicles?')) return
    await adminDelete('customers', id); setRawCustomers(cs => cs.filter(c => c.id !== id)); await logAction('Deleted customer', id)
  }
  const requestDelete = async (id: string) => {
    if (!confirm('Request deletion? The owner will need to approve it.')) return
    await adminPatch('customers', id, { pending_deletion: true, active: false }); setRawCustomers(cs => cs.map(c => c.id === id ? { ...c, pending_deletion: true, active: false } : c)); await logAction('Requested deletion', id)
  }
  const archiveVehicle = async (vid: string, current: boolean) => {
    await adminPatch('vehicles', vid, { archived: !current, active: false })
    setRawCustomers(cs => cs.map(c => ({ ...c, vehicles: c.vehicles?.map((v: any) => v.id === vid ? { ...v, archived: !current, active: false } : v) })))
  }
  const toggleMonitorVehicle = async (v: Veh) => {
    if (!v.id) return
    const turnOn = !v.active
    await adminPatch('vehicles', v.id, { active: turnOn })
    setRawCustomers(cs => cs.map(c => ({ ...c, vehicles: c.vehicles?.map((rv: any) => rv.id === v.id ? { ...rv, active: turnOn } : rv) })))
    await logAction(turnOn ? 'Resumed monitoring vehicle' : 'Stopped monitoring vehicle', v.id)
  }
  const restoreDeletedVehicle = async (vid: string) => {
    await adminPatch('vehicles', vid, { deleted_at: null, active: true })
    setRawCustomers(cs => cs.map(c => ({ ...c, vehicles: c.vehicles?.map((v: any) => v.id === vid ? { ...v, deleted_at: null, active: true } : v) })))
  }
  const sendPaymentRequest = async (rc: any) => {
    const tp: Record<string, number> = { priority: 5, standard: 3, basic: 1.5 }
    const price = rc.state === 'SA' ? 0 : tp[rc.tier || 'standard']
    const n = rc.vehicles?.length || 1
    const res = await authFetch('/api/send-payment-request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ customerEmail: rc.email, customerName: `${rc.first_name} ${rc.last_name}`, vehicles: n, tier: rc.tier || 'standard', price, total: (price * n).toFixed(2), state: rc.state }) })
    alert(res.ok ? `Payment request sent to ${rc.email}` : 'Failed to send email.')
  }
  const addAdmin = async () => {
    if (!newAdmin.username.trim() || !newAdmin.password.trim()) return
    await authFetch('/api/admin-login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'add', username: newAdmin.username.trim(), password: newAdmin.password.trim() }) })
    setNewAdmin({ username: '', password: '' }); loadAdmins()
  }
  const removeAdmin = async (id: string) => {
    if (!confirm('Remove this admin?')) return
    await authFetch('/api/admin-login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'remove', id }) })
    loadAdmins()
  }
  // ── free customers (whitelist) ──
  const addFree = async () => {
    const v = newFree.trim()
    if (!v) return
    setFreeBusy(true)
    try {
      const r = await authFetch('/api/admin/whitelist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ entry: v }) })
      if (!r.ok) { const d = await r.json().catch(() => ({})); alert(d.error || 'Could not add to the free list.') }
      else { setNewFree(''); await logAction('Added free customer', v) }
      await loadFree()
    } finally { setFreeBusy(false) }
  }
  const removeFreeGroup = async (entries: { entry: string }[], label: string) => {
    if (!confirm(`Remove ${label} from the free list? This clears all their linked emails and numbers.`)) return
    for (const e of entries) {
      await authFetch('/api/admin/whitelist', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ entry: e.entry }) })
    }
    await loadFree(); await logAction('Removed free customer', label)
  }
  const makeFree = async (rc: any) => {
    const r = await authFetch('/api/admin/whitelist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ customer_id: rc.id }) })
    const d = await r.json().catch(() => ({}))
    await loadFree(); await logAction('Granted free access', rc.email || rc.id)
    alert(r.ok ? (d.emailed ? `Free access granted — confirmation emailed to ${rc.email}.` : 'Free access granted.') : (d.error || 'Could not grant free access.'))
  }
  const removeFreeCustomer = async (rc: any) => {
    if (!confirm('Remove free access for this customer?')) return
    await authFetch('/api/admin/whitelist', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ customer_id: rc.id }) })
    await loadFree(); await logAction('Revoked free access', rc.email || rc.id)
  }

  // ── login screen ──
  if (!authed) {
    return (
      <PreviewShell>
        <div style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card" style={{ maxWidth: 380, width: '100%', padding: 30 }}>
            <span className="eyebrow">Admin access</span>
            <h1 className="disp" style={{ fontSize: 38, marginTop: 14, marginBottom: 22 }}>AVIBM <span className="shimmer">Admin</span></h1>
            <div className="fl" style={{ marginBottom: 7 }}>Username</div>
            <input className="inp" value={username} autoComplete="username" onChange={e => { setUsername(e.target.value); setPwError('') }} onKeyDown={e => e.key === 'Enter' && login()} placeholder="Enter username" style={{ marginBottom: 14 }} />
            <div className="fl" style={{ marginBottom: 7 }}>Password</div>
            <input className="inp" type="password" value={pw} autoComplete="current-password" onChange={e => { setPw(e.target.value); setPwError('') }} onKeyDown={e => e.key === 'Enter' && login()} placeholder="Enter password" style={{ borderColor: pwError ? '#f08a8a' : undefined }} />
            {pwError && <p style={{ color: '#f08a8a', fontSize: 12, marginTop: 8 }}>{pwError}</p>}
            <button className="pill gold" onClick={login} style={{ width: '100%', justifyContent: 'center', padding: '14px 0', marginTop: 18 }}>Enter</button>
            <div style={{ textAlign: 'center', marginTop: 16 }}><Link href="/" className="navlink" style={{ fontSize: 13 }}>Back to home</Link></div>
          </div>
        </div>
        <style dangerouslySetInnerHTML={{ __html: '.navlink{color:var(--muted);text-decoration:none}.navlink:hover{color:var(--ink)}' }} />
      </PreviewShell>
    )
  }

  // ── data ──
  const customers = rawCustomers.filter(c => !c.archived && !c.pending_deletion).map(toCust)
  const archivedCustomers = rawCustomers.filter(c => c.archived && !c.pending_deletion).map(toCust)
  const listBase = showArchived ? archivedCustomers : customers
  const filtered = listBase.filter(c => {
    if (tab !== 'all' && c.state !== tab) return false
    if (!q.trim()) return true
    const hay = [c.first, c.last, c.email, c.ref, ...c.vehicles.flatMap(v => [v.ref, v.vin, v.title, v.make, v.model]), ...c.archived.flatMap(v => [v.ref, v.vin, v.title]), ...c.deleted.flatMap(v => [v.vin, v.title])].filter(Boolean).join(' ').toLowerCase()
    return hay.includes(q.trim().toLowerCase())
  })
  // ── aggregations for stats + charts (whole base, incl. archived customers) ──
  const allCusts = [...customers, ...archivedCustomers]
  // Every vehicle across every customer (active + archived), excluding deleted.
  const everyVeh = rawCustomers
    .filter((c: any) => !c.pending_deletion)
    .flatMap((c: any) => (c.vehicles || []).filter((v: any) => !v.deleted_at).map((v: any) => ({ active: !!v.active, booked: !!v.booked_date })))
  const totalVehicles = everyVeh.length
  const vehBooked = everyVeh.filter(v => v.booked).length
  const vehMonitoring = everyVeh.filter(v => v.active && !v.booked).length
  const vehIdle = Math.max(0, totalVehicles - vehBooked - vehMonitoring)
  const bookedCount = vehBooked

  const stats = [
    { label: 'Customers', value: allCusts.length, c: 'var(--gold-2)', a: 'rgba(201,168,76,0.6)', g: 'rgba(201,168,76,0.14)' },
    { label: 'Active', value: customers.filter(c => c.active).length, c: 'var(--blue)', a: 'rgba(107,182,255,0.6)', g: 'rgba(107,182,255,0.12)' },
    { label: 'Archived', value: archivedCustomers.length, c: '#9b958a', a: 'rgba(155,149,138,0.6)', g: 'rgba(155,149,138,0.12)' },
    { label: 'Vehicles', value: totalVehicles, c: '#cfcabb', a: 'rgba(207,202,187,0.6)', g: 'rgba(207,202,187,0.12)' },
    { label: 'Bots running', value: vehMonitoring, c: 'var(--green)', a: 'rgba(98,227,106,0.6)', g: 'rgba(98,227,106,0.14)' },
    { label: 'Booked', value: bookedCount, c: 'var(--blue)', a: 'rgba(107,182,255,0.6)', g: 'rgba(107,182,255,0.12)' },
    { label: 'Pending pay', value: customers.filter(c => c.pending).length, c: 'var(--amber)', a: 'rgba(240,169,60,0.6)', g: 'rgba(240,169,60,0.12)' },
  ]

  const statusSeg: Seg[] = [
    { label: 'Monitoring', value: vehMonitoring, c: '#62e36a' },
    { label: 'Booked', value: vehBooked, c: '#6bb6ff' },
    { label: 'Idle / off', value: vehIdle, c: '#8d8678' },
  ]
  const stateSeg: Seg[] = [
    { label: 'Queensland', value: allCusts.filter(c => c.state === 'QLD').length, c: '#6bb6ff' },
    { label: 'South Australia', value: allCusts.filter(c => c.state === 'SA').length, c: '#c080ff' },
  ]
  const tierItems: Seg[] = [
    { label: 'Priority · $5', value: allCusts.filter(c => c.tier === 'priority').length, c: '#E9CE88' },
    { label: 'Standard · $3', value: allCusts.filter(c => c.tier === 'standard').length, c: '#cfcabb' },
    { label: 'Basic · $1.50', value: allCusts.filter(c => c.tier === 'basic').length, c: '#b08d57' },
  ]
  // New customers by month (last 6) from created_at — across the whole base.
  const now = new Date()
  const signups = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    return { key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: d.toLocaleDateString('en-AU', { month: 'short' }), value: 0 }
  })
  for (const c of allCusts) {
    const raw = c._raw?.created_at
    if (!raw) continue
    const b = signups.find(s => s.key === String(raw).slice(0, 7))
    if (b) b.value++
  }

  // Free-customer (whitelist) lookup + resolution to profiles.
  // Phones normalised to their last 9 digits so formatting (+61 / spaces /
  // leading 0) doesn't break matching.
  const phoneKey = (s?: string | null) => { const d = (s || '').replace(/\D/g, ''); return d.length >= 9 ? d.slice(-9) : d }
  const emailToCust = new Map<string, any>()
  const phoneToCust = new Map<string, any>()
  for (const rc of rawCustomers) {
    if (rc.email) emailToCust.set(rc.email.toLowerCase().trim(), rc)
    if (rc.phone) { const k = phoneKey(rc.phone); if (k) phoneToCust.set(k, rc) }
  }
  const freeEmails = new Set(freeList.filter(f => (f.entry || '').includes('@')).map(f => f.entry.toLowerCase().trim()))
  const freePhoneKeys = new Set(freeList.filter(f => !(f.entry || '').includes('@')).map(f => phoneKey(f.entry)).filter(Boolean))
  const isFreeCustomer = (c: Cust) => freeEmails.has((c.email || '').toLowerCase().trim()) || (!!c.phone && freePhoneKeys.has(phoneKey(c.phone)))
  const resolveFree = (f: { entry: string; customer_id: string | null }) => {
    if (f.customer_id) { const rc = rawCustomers.find((x: any) => x.id === f.customer_id); if (rc) return rc }
    const ent = (f.entry || '').toLowerCase().trim()
    if (ent.includes('@')) return emailToCust.get(ent) || null
    const k = phoneKey(ent); return k ? (phoneToCust.get(k) || null) : null
  }
  // Group entries by the resolved customer (or keep orphans separate).
  type FreeGroup = { key: string; customer: any | null; entries: typeof freeList }
  const freeGroupsMap = new Map<string, FreeGroup>()
  for (const f of freeList) {
    const rc = resolveFree(f)
    const key = rc ? `c_${rc.id}` : `e_${(f.entry || '').toLowerCase().trim()}`
    const g = freeGroupsMap.get(key)
    if (g) g.entries.push(f); else freeGroupsMap.set(key, { key, customer: rc, entries: [f] })
  }
  const freeGroups = Array.from(freeGroupsMap.values())

  return (
    <PreviewShell>
      {/* Floating glass nav */}
      <div className="r card" style={{ borderRadius: 999, padding: '9px 9px 9px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 36, gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <span className="disp shimmer" style={{ fontSize: 20 }}>AVIBM</span>
          <span style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '0.18em', textTransform: 'uppercase' }}>Admin</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span className="spill" style={{ color: botOnline ? 'var(--green)' : '#aaa', background: botOnline ? 'rgba(98,227,106,0.12)' : 'rgba(170,170,170,0.12)', border: `1px solid ${botOnline ? 'rgba(98,227,106,0.4)' : 'rgba(170,170,170,0.3)'}` }}><span className={botOnline ? 'dot live' : 'dot'} style={{ background: botOnline ? 'var(--green)' : '#aaa' }} />{botOnline ? 'Bot online' : 'Bot offline'}</span>
          <button className="menu" onClick={loadData}>Refresh</button>
          <a href="/admin/logs" className="menu" style={{ textDecoration: 'none' }}>Live logs</a>
          <button className="menu" onClick={() => { setShowFree(true); loadFree() }}>Free customers{freeGroups.length ? ` · ${freeGroups.length}` : ''}</button>
          {isOwner && <button className="menu" onClick={() => { setShowAdmins(true); loadAdmins() }}>Manage admins</button>}
          <button className="pill ghost" style={{ padding: '8px 16px', fontSize: 12 }} onClick={logout}>Log out</button>
        </div>
      </div>

      <div className="r" style={{ marginBottom: 24 }}>
        <span className="eyebrow">Admin panel</span>
        <h1 className="disp" style={{ fontSize: 'clamp(36px,5vw,60px)', marginTop: 14 }}>Customer <span className="shimmer">control</span></h1>
      </div>

      {/* Stats */}
      <div className="r" style={{ animationDelay: '.06s', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(118px,1fr))', gap: 12, marginBottom: 22 }}>
        {stats.map(s => (
          <div key={s.label} className="card" style={{ padding: '13px 16px', overflow: 'hidden', display: 'flex', alignItems: 'baseline', gap: 9, background: `radial-gradient(130% 130% at 50% -30%, ${s.g}, transparent 55%), linear-gradient(180deg,rgba(20,18,16,0.86),rgba(11,10,9,0.92))` }}>
            <div style={{ position: 'absolute', top: 1, left: 16, right: 16, height: 2, borderRadius: 2, background: `linear-gradient(90deg,transparent,${s.a},transparent)` }} />
            <div className="disp" style={{ fontSize: 28, color: s.c, lineHeight: 1 }}>{s.value}</div>
            <div className="fl" style={{ fontSize: 9 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Insights — charts */}
      <div className="r" style={{ animationDelay: '.08s', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(290px,1fr))', gap: 16, marginBottom: 26 }}>
        <div className="card" style={{ padding: '22px 24px' }}>
          <div className="fl" style={{ marginBottom: 16 }}>Vehicles by status</div>
          <Donut segments={statusSeg} total={totalVehicles} caption="VEHICLES" />
        </div>
        <div className="card" style={{ padding: '22px 24px' }}>
          <div className="fl" style={{ marginBottom: 16 }}>Customers by state</div>
          <Donut segments={stateSeg} total={allCusts.length} caption="CUSTOMERS" />
        </div>
        <div className="card" style={{ padding: '22px 24px' }}>
          <div className="fl" style={{ marginBottom: 18 }}>Plan tier</div>
          <Bars items={tierItems} />
        </div>
        <div className="card" style={{ padding: '22px 24px' }}>
          <div className="fl" style={{ marginBottom: 18 }}>New customers · last 6 months</div>
          <ColumnChart data={signups} c="var(--gold-2)" />
        </div>
      </div>

      {/* Controls: tabs + search */}
      <div className="r" style={{ animationDelay: '.1s', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {(['all', 'QLD', 'SA'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={tab === t ? 'chip on' : 'chip'}>{t === 'all' ? 'All states' : t}</button>
          ))}
          <button onClick={() => { setShowArchived(s => !s); setOpenId(null) }} className={showArchived ? 'chip on' : 'chip'} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7h18v3H3zM5 10v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9M9 14h6" /></svg>
            Archived{archivedCustomers.length ? ` · ${archivedCustomers.length}` : ''}
          </button>
        </div>
        <div style={{ position: 'relative', minWidth: 240, flex: '0 1 320px' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.7" style={{ position: 'absolute', left: 14, top: 13 }}><circle cx="11" cy="11" r="7" /><path d="m20 20-3-3" strokeLinecap="round" /></svg>
          <input className="inp" value={q} onChange={e => setQ(e.target.value)} placeholder="Search name, ref or VIN…" style={{ paddingLeft: 40 }} />
        </div>
      </div>

      {/* Customer cards */}
      <div className="r" style={{ animationDelay: '.14s', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {filtered.map(c => {
          const open = openId === c.id
          const bookedVehicles = c.vehicles.filter(v => v.status === 'Booked' && v.date)
          const booked = bookedVehicles.length > 0
          const vTotal = c.vehicles.length
          const vMon = c.vehicles.filter(v => v.active && v.status !== 'Booked').length
          const status = booked ? { label: 'Booked', ...GREEN }
            : c.pending ? { label: 'Awaiting payment', ...AMBER }
            : c.active ? { label: 'Active', ...GREEN }
            : { label: 'Paused', c: '#aaa', bg: 'rgba(170,170,170,0.14)' }
          const tier = TIER_META[c.tier]
          const free = isFreeCustomer(c)
          const cardStyle: React.CSSProperties = booked
            ? { padding: 0, overflow: 'hidden', boxShadow: '0 0 0 1px rgba(98,227,106,0.5), 0 30px 60px -30px rgba(0,0,0,0.9)', background: 'radial-gradient(130% 80% at 0% 0%, rgba(98,227,106,0.12), transparent 52%), linear-gradient(180deg,rgba(18,22,18,0.9),rgba(10,12,10,0.94))' }
            : { padding: 0, overflow: 'hidden' }
          return (
            <div key={c.id} className="card" style={cardStyle}>
              <button onClick={() => setOpenId(open ? null : c.id)}
                style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14, fontFamily: 'inherit' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 999, flexShrink: 0, background: booked ? 'linear-gradient(135deg,#7ef08a,#3fcf57)' : 'linear-gradient(135deg,var(--gold-2),var(--gold))', color: '#10210f', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 15 }}>{(c.first[0] || '?')}{(c.last[0] || '')}</div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <span className="disp" style={{ fontSize: 20 }}>{c.first} {c.last}</span>
                        {c.ref && <CopyRef value={c.ref} />}
                        <span className={`pill`} style={{ fontSize: 10, color: c.state === 'QLD' ? '#6bb6ff' : '#c080ff', background: 'rgba(255,255,255,0.04)', border: `1px solid ${c.state === 'QLD' ? '#6bb6ff' : '#c080ff'}` }}>{c.state}</span>
                        {free && <span className="pill" style={{ fontSize: 10, color: 'var(--gold-2)', background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.5)' }}>Free</span>}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.email} · {c.phone}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                    <span className="spill hide-sm" style={{ color: tier.c, background: 'rgba(255,255,255,0.04)', border: `1px solid ${tier.c}` }}>{c.state === 'SA' ? 'SA · Free' : tier.label}</span>
                    <span className="spill" style={{ color: status.c, background: status.bg, border: `1px solid ${status.c}` }}>
                      {status.label === 'Booked'
                        ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={status.c} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                        : <span className={status.label === 'Active' ? 'dot live' : 'dot'} style={{ background: status.c }} />}
                      {status.label}
                    </span>
                    <span style={{ color: 'var(--muted)', transition: 'transform .3s', transform: open ? 'rotate(180deg)' : 'none', display: 'inline-flex' }}><Arrow dir="left" s={14} /></span>
                  </div>
                </div>

                {!open && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, width: '100%' }}>
                    {vTotal === 0
                      ? <MiniStat c="#8d8678" v={0} label=" vehicles" />
                      : <>
                          <MiniStat c="#62e36a" v={vMon} label=" monitoring" />
                          {booked && <MiniStat c="#6bb6ff" v={bookedVehicles.length} label=" booked" />}
                          <MiniStat c="#cfcabb" v={vTotal} label={vTotal === 1 ? ' vehicle' : ' vehicles'} />
                          {c.archived.length > 0 && <MiniStat c="#8d8678" v={c.archived.length} label=" done" />}
                        </>}
                  </div>
                )}

                {!open && booked && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, width: '100%' }}>
                    {bookedVehicles.map(v => (
                      <div key={v.vin} style={{ display: 'inline-flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', padding: '9px 14px', borderRadius: 12, background: 'rgba(98,227,106,0.08)', border: '1px solid rgba(98,227,106,0.3)', fontSize: 13 }}>
                        <span style={{ ...dtl, color: 'var(--green)', fontWeight: 700 }}><Cal />{v.date}</span>
                        {v.time && <span style={{ ...dtl, color: '#dfeede' }}><Clock />{v.time}</span>}
                        {v.loc && <span style={{ ...dtl, color: '#dfeede' }}><Pin />{v.loc}</span>}
                        <span style={{ color: 'var(--muted)' }}>· {v.title}</span>
                      </div>
                    ))}
                  </div>
                )}
              </button>

              {open && (
                <div style={{ padding: '0 24px 24px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: '18px 28px', marginTop: 20 }}>
                    {([['State', c.state], ['Tier', c.state === 'SA' ? 'SA · Free' : tier.label], ['CRN', c.crn], ['Date of birth', c.dob], ['Joined', c.created]] as [string, string][]).map(([l, v]) => (
                      <div key={l}><div className="fl">{l}</div><div className="fv">{v}</div></div>
                    ))}
                    <div style={{ gridColumn: '1 / -1' }}><div className="fl">Address</div><div className="fv">{c.address}</div></div>
                  </div>

                  <div className="fl" style={{ marginTop: 22, marginBottom: 12 }}>Vehicles · {c.vehicles.length}</div>
                  {c.vehicles.length === 0 ? <p style={{ color: 'var(--muted)', fontSize: 13 }}>No active vehicles.</p> : (
                    <div style={{ display: 'grid', gap: 12 }}>{c.vehicles.map(v => <VehicleBlock key={v.vin} v={v} onToggleMonitor={toggleMonitorVehicle} />)}</div>
                  )}

                  {c.archived.length > 0 && (
                    <>
                      <div className="fl" style={{ marginTop: 20, marginBottom: 10 }}>Completed / Past · {c.archived.length}</div>
                      <div style={{ display: 'grid', gap: 10 }}>
                        {c.archived.map(v => (
                          <div key={v.vin} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', padding: '12px 16px', borderRadius: 14, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', opacity: 0.85 }}>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 14, fontWeight: 600 }}>{v.title}</div>
                              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}><span style={{ fontFamily: 'ui-monospace,monospace' }}>{v.vin}</span> · {v.line}</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                              {v.id && <MonitorToggle on={!!v.active} onClick={() => toggleMonitorVehicle(v)} />}
                              <span className="spill" style={{ color: GREY.c, background: GREY.bg, border: `1px solid ${GREY.c}` }}><span className="dot" style={{ background: GREY.c }} />Done</span>
                              {v.id && <button className="chip" onClick={() => archiveVehicle(v.id!, true)}>Unarchive</button>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {c.deleted.length > 0 && (
                    <>
                      <div className="fl" style={{ marginTop: 20, marginBottom: 10, color: '#f08a8a' }}>Deleted vehicles · {c.deleted.length}</div>
                      <div style={{ display: 'grid', gap: 10 }}>
                        {c.deleted.map(v => (
                          <div key={v.vin} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', padding: '12px 16px', borderRadius: 14, background: 'rgba(240,120,120,0.05)', border: '1px solid rgba(240,120,120,0.25)' }}>
                            <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                              <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.08em', color: '#f08a8a', background: 'rgba(240,120,120,0.12)', border: '1px solid rgba(240,120,120,0.45)', borderRadius: 6, padding: '2px 7px' }}>DELETED</span>
                              <span style={{ fontSize: 14 }}>{v.title}</span>
                              <span style={{ fontFamily: 'ui-monospace,monospace', fontSize: 11, color: 'var(--muted)' }}>{v.vin}</span>
                            </div>
                            {v.id && <button className="chip" style={{ color: 'var(--green)', borderColor: 'rgba(98,227,106,0.4)' }} onClick={() => restoreDeletedVehicle(v.id!)}>Restore</button>}
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginTop: 22, paddingTop: 18, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                    {showArchived
                      ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--muted)' }}><span className="dot" style={{ background: '#aaa' }} />Archived customer</span>
                      : c.pending
                      ? <button className="pill gold" style={{ padding: '11px 20px', fontSize: 13 }} onClick={() => sendPaymentRequest(c._raw)}>Send payment request</button>
                      : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--green)' }}><span className="dot live" style={{ background: 'var(--green)' }} />{booked ? 'Booking secured' : 'Active — monitoring running'}</span>}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button className="pill gold" style={{ padding: '10px 16px', fontSize: 13 }} onClick={() => impersonate(c.id, c.email)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ marginRight: 2 }}><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" strokeLinecap="round" /></svg>
                        View as user
                      </button>
                      {free
                        ? <button className="chip" style={{ color: 'var(--gold-2)', borderColor: 'rgba(201,168,76,0.45)' }} onClick={() => removeFreeCustomer(c._raw)}>Remove free</button>
                        : <button className="chip" onClick={() => makeFree(c._raw)}>Make free</button>}
                      {showArchived
                        ? <button className="chip" style={{ color: 'var(--green)', borderColor: 'rgba(98,227,106,0.4)' }} onClick={() => unarchiveCustomer(c.id)}>Unarchive</button>
                        : <button className="chip" onClick={() => archiveCustomer(c.id)}>Archive</button>}
                      <button className="chip" style={{ color: '#f08a8a', borderColor: 'rgba(240,120,120,0.4)' }} onClick={() => isOwner ? deleteCustomer(c.id) : requestDelete(c.id)}>{isOwner ? 'Delete' : 'Request delete'}</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
        {filtered.length === 0 && <p style={{ color: 'var(--muted)', fontSize: 14 }}>{showArchived ? 'No archived customers.' : 'No customers match.'}</p>}
      </div>

      {/* Manage admins modal */}
      {showAdmins && (
        <div onClick={() => setShowAdmins(false)} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(4,4,4,0.72)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '8vh 20px 24px', overflowY: 'auto' }}>
          <div onClick={e => e.stopPropagation()} className="card" style={{ width: '100%', maxWidth: 480, padding: 26 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div><span className="eyebrow">Access</span><h2 className="disp" style={{ fontSize: 26, marginTop: 12 }}>Manage admins</h2></div>
              <button onClick={() => setShowAdmins(false)} aria-label="Close" style={{ width: 34, height: 34, borderRadius: 999, flexShrink: 0, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: 'var(--muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
              </button>
            </div>
            <div style={{ marginTop: 20, display: 'grid', gap: 10 }}>
              {admins.length === 0 && <p style={{ color: 'var(--muted)', fontSize: 13 }}>No admins loaded.</p>}
              {admins.map(a => {
                const owner = a.role === 'owner'
                return (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '12px 14px', borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 999, flexShrink: 0, background: owner ? 'linear-gradient(135deg,var(--gold-2),var(--gold))' : 'rgba(255,255,255,0.08)', color: owner ? '#231900' : 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13 }}>{(a.username[0] || '?').toUpperCase()}</div>
                      <span style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.username}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      <span className="spill" style={{ color: owner ? 'var(--gold-2)' : 'var(--muted)', background: 'rgba(255,255,255,0.04)', border: `1px solid ${owner ? 'var(--gold-2)' : 'rgba(255,255,255,0.15)'}` }}>{owner ? 'Owner' : 'Admin'}</span>
                      {owner ? <span style={{ fontSize: 11, color: 'var(--muted)' }}>You</span> : <button onClick={() => removeAdmin(a.id)} className="chip" style={{ color: '#f08a8a', borderColor: 'rgba(240,120,120,0.4)' }}>Remove</button>}
                    </div>
                  </div>
                )
              })}
            </div>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', margin: '22px 0 16px' }} />
            <div className="fl" style={{ marginBottom: 12 }}>Add an admin</div>
            <div style={{ display: 'grid', gap: 12 }}>
              <input className="inp" placeholder="Email or username" autoComplete="off" name="avibm-new-admin-user" value={newAdmin.username} onChange={e => setNewAdmin(s => ({ ...s, username: e.target.value }))} />
              <input className="inp" type="password" placeholder="Temporary password" autoComplete="new-password" name="avibm-new-admin-pass" value={newAdmin.password} onChange={e => setNewAdmin(s => ({ ...s, password: e.target.value }))} />
              <button onClick={addAdmin} disabled={!newAdmin.username.trim() || !newAdmin.password.trim()} className="pill gold" style={{ width: '100%', justifyContent: 'center', padding: '13px 0', opacity: (!newAdmin.username.trim() || !newAdmin.password.trim()) ? 0.5 : 1, cursor: (!newAdmin.username.trim() || !newAdmin.password.trim()) ? 'not-allowed' : 'pointer' }}>Add admin</button>
            </div>
          </div>
        </div>
      )}

      {/* Free customers (whitelist) modal */}
      {showFree && (
        <div onClick={() => setShowFree(false)} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(4,4,4,0.72)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '8vh 20px 24px', overflowY: 'auto' }}>
          <div onClick={e => e.stopPropagation()} className="card" style={{ width: '100%', maxWidth: 520, padding: 26 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div><span className="eyebrow">Whitelist</span><h2 className="disp" style={{ fontSize: 26, marginTop: 12 }}>Free customers</h2></div>
              <button onClick={() => setShowFree(false)} aria-label="Close" style={{ width: 34, height: 34, borderRadius: 999, flexShrink: 0, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: 'var(--muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
              </button>
            </div>
            <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 8, lineHeight: 1.55 }}>Emails or phone numbers on this list register for free — the bot skips payment and activates monitoring automatically.</p>

            <div className="fl" style={{ marginTop: 18, marginBottom: 10 }}>Add a free customer</div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <input className="inp" placeholder="Email or phone number" autoComplete="off" name="avibm-free-entry" value={newFree} onChange={e => setNewFree(e.target.value)} onKeyDown={e => e.key === 'Enter' && addFree()} style={{ flex: '1 1 240px' }} />
              <button onClick={addFree} disabled={!newFree.trim() || freeBusy} className="pill gold" style={{ padding: '0 22px', opacity: (!newFree.trim() || freeBusy) ? 0.5 : 1, cursor: (!newFree.trim() || freeBusy) ? 'not-allowed' : 'pointer' }}>{freeBusy ? 'Adding…' : 'Add'}</button>
            </div>

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', margin: '22px 0 14px' }} />
            <div className="fl" style={{ marginBottom: 12 }}>On the free list · {freeGroups.length}</div>
            <div style={{ display: 'grid', gap: 10, maxHeight: '42vh', overflowY: 'auto' }}>
              {freeGroups.length === 0 && <p style={{ color: 'var(--muted)', fontSize: 13 }}>No free customers yet.</p>}
              {freeGroups.map(g => {
                const rc = g.customer
                const name = rc ? (`${rc.first_name || ''} ${rc.last_name || ''}`.trim() || rc.email) : null
                const anyNotified = g.entries.some(e => e.notified_at)
                return (
                  <div key={g.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '12px 14px', borderRadius: 14, background: 'rgba(201,168,76,0.05)', border: '1px solid rgba(201,168,76,0.22)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 999, flexShrink: 0, background: rc ? 'linear-gradient(135deg,var(--gold-2),var(--gold))' : 'rgba(255,255,255,0.08)', color: rc ? '#231900' : 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12 }}>
                        {rc ? `${(rc.first_name?.[0] || '?')}${(rc.last_name?.[0] || '')}` : '?'}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 13, fontWeight: 700 }}>{name || 'Unlinked entry'}</span>
                          {rc?.ref && <CopyRef value={rc.ref} />}
                          {anyNotified && <span style={{ color: 'var(--green)', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4 }}><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>Notified</span>}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, display: 'flex', gap: 6, flexWrap: 'wrap', fontFamily: 'ui-monospace,monospace' }}>
                          {g.entries.map(e => <span key={e.entry}>{e.entry}</span>)}
                        </div>
                      </div>
                    </div>
                    <button onClick={() => removeFreeGroup(g.entries, name || g.entries[0].entry)} className="chip" style={{ flexShrink: 0, color: '#f08a8a', borderColor: 'rgba(240,120,120,0.4)' }}>Remove</button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </PreviewShell>
  )
}
