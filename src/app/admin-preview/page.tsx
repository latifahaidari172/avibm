'use client'

import { useState, useEffect } from 'react'
import { PreviewShell, Arrow } from '@/lib/previewDesign'

// PROTOTYPE — maximalist redesign of /admin (sample data, isolated route).
// Header actions, summary stats, state tabs + search, and expandable customer
// cards. A card turns GREEN when a booking is made; the minimised card shows
// the NEW booking date/time/location; the expanded card shows the FULL WOVI
// vehicle detail per vehicle plus the original → now-booked before/after, and
// the archived (Done) + deleted vehicle records.

type Veh = {
  title: string; vin: string; ref?: string; status: string; c: string; bg: string; line: string
  // WOVI vehicle detail
  make?: string; model?: string; year?: string; build?: string; colour?: string
  type?: string; damage?: string; method?: string; from?: string
  // booking (booked) / monitoring (searching)
  date?: string; time?: string; loc?: string
  origDate?: string; origTime?: string; origLoc?: string; earlier?: string
  cutoff?: string; locations?: string
}
type Cust = {
  id: string; ref: string; first: string; last: string; email: string; phone: string
  state: 'QLD' | 'SA'; tier: 'priority' | 'standard' | 'basic'; active: boolean; pending: boolean
  crn: string; dob: string; address: string; created: string
  vehicles: Veh[]; archived: Veh[]; deleted: { title: string; vin: string }[]
}

const GREEN = { c: '#62e36a', bg: 'rgba(98,227,106,0.16)' }
const GOLD = { c: '#E9CE88', bg: 'rgba(201,168,76,0.16)' }
const BLUE = { c: '#6bb6ff', bg: 'rgba(107,182,255,0.16)' }
const GREY = { c: '#cfcabb', bg: 'rgba(170,170,170,0.14)' }

const CUSTOMERS: Cust[] = [
  { id: '1', ref: 'P-A38F87', first: 'Emanuel', last: 'Chitez', email: 'emanuel@example.com', phone: '0421 405 419', state: 'QLD', tier: 'priority', active: true, pending: false, crn: '073455268', dob: '14/02/1990', address: '30 Nerida Street, Rochedale South, QLD 4123', created: '12/05/2026',
    vehicles: [
      { title: '2026 Kia Sportage', vin: 'KNAPU81GMT7373620', ref: 'C-078AC2', status: 'Booked', ...GREEN, line: 'Booked 25/05/2026 · 10:30 AM · Brisbane',
        make: 'Kia', model: 'Sportage', year: '2026', build: '11/2025', colour: 'Grey', type: 'Car · Wagon', damage: 'Impact damage – drivers front', method: 'Auction', from: 'Pickles',
        date: '25/05/2026', time: '10:30 AM', loc: 'Brisbane', origDate: '02/07/2026', origTime: '2:30 PM', origLoc: 'Brisbane', earlier: '38 days earlier' },
      { title: '2018 Renault Megane RS', vin: 'VF1RFB00X73185486', ref: 'C-1F9D44', status: 'Searching', ...GOLD, line: 'Looking for slots before 24/07/2026',
        make: 'Renault', model: 'Megane RS', year: '2018', build: '06/2018', colour: 'Blue', type: 'Car · Hatch', damage: 'Hail damage', method: 'Auction', from: 'Manheim',
        cutoff: '24/07/2026', locations: 'Brisbane, Yatala' },
    ],
    archived: [{ title: '2015 Ford Ranger', vin: 'MNAUMFF50FW123456', ref: 'C-22D5A1', status: 'Done', ...GREY, line: 'Inspection completed 02/04/2026' }],
    deleted: [{ title: '2012 Hyundai i30', vin: 'KMHDB41CACU456789' }] },
  { id: '2', ref: 'C-7F21A0', first: 'Sarah', last: 'Nguyen', email: 'sarah.nguyen@example.com', phone: '0438 112 904', state: 'QLD', tier: 'standard', active: false, pending: true, crn: '044120937', dob: '03/09/1988', address: '8 Vista Court, Narangba, QLD 4504', created: '28/05/2026',
    vehicles: [{ title: '2020 Toyota HiLux', vin: 'MR0FB29G401234567', ref: 'C-5A2E10', status: 'Awaiting payment', c: '#F0A93C', bg: 'rgba(240,169,60,0.16)', line: 'Monitoring starts on payment',
      make: 'Toyota', model: 'HiLux SR5', year: '2020', build: '02/2020', colour: 'White', type: 'Ute · Dual cab', damage: 'Water damage', method: 'Insurance', from: 'IAAI' }], archived: [], deleted: [] },
  { id: '3', ref: 'C-3D90E1', first: 'Liam', last: 'Brooks', email: 'liam.brooks@example.com', phone: '0405 882 117', state: 'SA', tier: 'priority', active: true, pending: false, crn: '—', dob: '21/06/1995', address: '12 Reid Road, Regency Park, SA 5010', created: '24/05/2026',
    vehicles: [{ title: '2017 Holden Commodore', vin: '6G1FK5E27HL901234', ref: 'C-9B33F7', status: 'Searching', ...BLUE, line: 'Regency Park · before 02/08/2026',
      make: 'Holden', model: 'Commodore SV6', year: '2017', build: '08/2017', colour: 'Black', type: 'Car · Sedan', damage: 'Structural damage', method: 'Auction', from: 'Grays',
      cutoff: '02/08/2026', locations: 'Regency Park' }], archived: [], deleted: [] },
  { id: '4', ref: 'C-55B2C9', first: 'Mia', last: 'Patel', email: 'mia.patel@example.com', phone: '0421 660 543', state: 'QLD', tier: 'basic', active: true, pending: false, crn: '091223764', dob: '11/11/1992', address: '40 Harbour Drive, Yatala, QLD 4207', created: '19/05/2026',
    vehicles: [{ title: '2019 Mazda CX-5', vin: 'JM0KF4W5A00567890', ref: 'C-6E1B90', status: 'Booked', ...GREEN, line: 'Booked 30/05/2026 · 9:00 AM · Yatala',
      make: 'Mazda', model: 'CX-5 Maxx', year: '2019', build: '04/2019', colour: 'Red', type: 'Car · SUV', damage: 'Malicious damage', method: 'Auction', from: 'Pickles',
      date: '30/05/2026', time: '9:00 AM', loc: 'Yatala', origDate: '20/06/2026', origTime: '11:00 AM', origLoc: 'Yatala', earlier: '21 days earlier' }], archived: [], deleted: [] },
]

const TIER_META: Record<string, { label: string; c: string }> = {
  priority: { label: 'Priority · $5', c: 'var(--gold-2)' },
  standard: { label: 'Standard · $3', c: '#cfcabb' },
  basic: { label: 'Basic · $1.50', c: '#b08d57' },
}

// ── small inline icons (no emojis — Heroicons-style outline) ──
const ic = { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7 } as const
const Cal = () => <svg {...ic}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v4M16 3v4" strokeLinecap="round" /></svg>
const Clock = () => <svg {...ic}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" /></svg>
const Pin = () => <svg {...ic}><path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z" /><circle cx="12" cy="11" r="2.5" /></svg>

const dtl: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6 }

// Click-to-copy reference chip — copies the value and flips to "Copied!" for a
// moment. stopPropagation so clicking it inside the card header doesn't expand.
function CopyRef({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  function fallback(t: string) {
    try { const ta = document.createElement('textarea'); ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta) } catch {}
  }
  function copy(e: React.MouseEvent | React.KeyboardEvent) {
    e.stopPropagation()
    try { if (navigator.clipboard?.writeText) navigator.clipboard.writeText(value).catch(() => fallback(value)); else fallback(value) } catch { fallback(value) }
    setCopied(true); setTimeout(() => setCopied(false), 1000)
  }
  return (
    <span role="button" tabIndex={0} title="Click to copy" onClick={copy}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); copy(e) } }}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: 'ui-monospace,monospace', fontSize: 11, fontWeight: 600, cursor: 'pointer', userSelect: 'none', borderRadius: 6, padding: '2px 7px', transition: 'color .2s, background .2s', color: copied ? 'var(--green)' : 'var(--gold)', background: copied ? 'rgba(98,227,106,0.14)' : 'rgba(201,168,76,0.1)', border: `1px solid ${copied ? 'rgba(98,227,106,0.4)' : 'rgba(201,168,76,0.28)'}` }}>
      {copied ? 'Copied!' : <>{value}<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ opacity: 0.6 }}><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" strokeLinecap="round" /></svg></>}
    </span>
  )
}

// Full per-vehicle detail block (the data WOVI requires) + booking/monitoring.
function VehicleBlock({ v }: { v: Veh }) {
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

      {/* WOVI vehicle detail */}
      <div className="fl" style={{ marginTop: 16, marginBottom: 10 }}>Vehicle details · for WOVI</div>
      {/* 5 columns on desktop → the 9 fields split evenly across two rows (5 + 4). */}
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

      {/* booking / monitoring */}
      {isBooked ? (
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(98,227,106,0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 150 }}>
              <div className="fl">Original booking</div>
              <div style={{ marginTop: 8, display: 'grid', gap: 6, fontSize: 13, color: 'var(--muted)' }}>
                <span style={dtl}><Cal />{v.origDate}</span><span style={dtl}><Clock />{v.origTime}</span><span style={dtl}><Pin />{v.origLoc}</span>
              </div>
            </div>
            <span style={{ color: 'var(--green)', flexShrink: 0 }}><Arrow s={18} /></span>
            <div style={{ flex: 1, minWidth: 150 }}>
              <div className="fl" style={{ color: 'var(--green)' }}>Now booked</div>
              <div style={{ marginTop: 8, display: 'grid', gap: 6, fontSize: 13, color: 'var(--green)', fontWeight: 600 }}>
                <span style={dtl}><Cal />{v.date}</span><span style={dtl}><Clock />{v.time}</span><span style={dtl}><Pin />{v.loc}</span>
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
    </div>
  )
}

export default function AdminPreview() {
  const [tab, setTab] = useState<'all' | 'QLD' | 'SA'>('all')
  const [q, setQ] = useState('')
  const [openId, setOpenId] = useState<string | null>('1')

  // Manage-admins modal (prototype — local state)
  const [showAdmins, setShowAdmins] = useState(false)
  const [admins, setAdmins] = useState([
    { id: '0', username: 'navidhaidari12@gmail.com', role: 'Owner' as const },
    { id: '1', username: 'ops@avibm.com', role: 'Admin' as const },
  ])
  const [newAdmin, setNewAdmin] = useState({ username: '', password: '' })
  useEffect(() => {
    if (!showAdmins) return
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowAdmins(false) }
    document.addEventListener('keydown', k)
    return () => document.removeEventListener('keydown', k)
  }, [showAdmins])
  function addAdmin() {
    const u = newAdmin.username.trim()
    if (!u || !newAdmin.password.trim()) return
    setAdmins(a => [...a, { id: String(a.length + 1) + u, username: u, role: 'Admin' }])
    setNewAdmin({ username: '', password: '' })
  }

  // Search matches name, email, profile ref (P-…), and any vehicle ref (C-…),
  // VIN, make/model — so you can jump straight to a customer instead of scrolling.
  const filtered = CUSTOMERS.filter(c => {
    if (tab !== 'all' && c.state !== tab) return false
    if (!q.trim()) return true
    const hay = [
      c.first, c.last, c.email, c.ref,
      ...c.vehicles.flatMap(v => [v.ref, v.vin, v.title, v.make, v.model]),
      ...c.archived.flatMap(v => [v.ref, v.vin, v.title]),
      ...c.deleted.flatMap(v => [v.vin, v.title]),
    ].filter(Boolean).join(' ').toLowerCase()
    return hay.includes(q.trim().toLowerCase())
  })

  const bookedCount = CUSTOMERS.reduce((n, c) => n + c.vehicles.filter(v => v.status === 'Booked').length, 0)
  const stats = [
    { label: 'Customers', value: CUSTOMERS.length, c: 'var(--gold-2)', a: 'rgba(201,168,76,0.6)', g: 'rgba(201,168,76,0.14)' },
    { label: 'Active', value: CUSTOMERS.filter(c => c.active).length, c: 'var(--blue)', a: 'rgba(107,182,255,0.6)', g: 'rgba(107,182,255,0.12)' },
    { label: 'Booked', value: bookedCount, c: 'var(--green)', a: 'rgba(98,227,106,0.6)', g: 'rgba(98,227,106,0.14)' },
    { label: 'Pending pay', value: CUSTOMERS.filter(c => c.pending).length, c: 'var(--amber)', a: 'rgba(240,169,60,0.6)', g: 'rgba(240,169,60,0.12)' },
  ]

  return (
    <PreviewShell>
      {/* Floating glass nav */}
      <div className="r card" style={{ borderRadius: 999, padding: '9px 9px 9px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 36, gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <span className="disp shimmer" style={{ fontSize: 20 }}>AVIBM</span>
          <span style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '0.18em', textTransform: 'uppercase' }}>Admin</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span className="spill" style={{ color: 'var(--green)', background: 'rgba(98,227,106,0.12)', border: '1px solid rgba(98,227,106,0.4)' }}><span className="dot live" style={{ background: 'var(--green)' }} />Bot online</span>
          <button className="menu">Refresh</button>
          <a href="/admin/logs" className="menu" style={{ textDecoration: 'none' }}>Live logs</a>
          <button className="menu" onClick={() => setShowAdmins(true)}>Manage admins</button>
          <button className="pill ghost" style={{ padding: '8px 16px', fontSize: 12 }}>Log out</button>
        </div>
      </div>

      <div className="r" style={{ marginBottom: 24 }}>
        <span className="eyebrow">Admin panel</span>
        <h1 className="disp" style={{ fontSize: 'clamp(36px,5vw,60px)', marginTop: 14 }}>Customer <span className="shimmer">control</span></h1>
      </div>

      {/* Stats */}
      <div className="r" style={{ animationDelay: '.06s', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 16, marginBottom: 22 }}>
        {stats.map(s => (
          <div key={s.label} className="card" style={{ padding: '22px 24px', overflow: 'hidden', background: `radial-gradient(130% 130% at 50% -20%, ${s.g}, transparent 55%), linear-gradient(180deg,rgba(20,18,16,0.86),rgba(11,10,9,0.92))` }}>
            <div style={{ position: 'absolute', top: 1, left: 22, right: 22, height: 2, borderRadius: 2, background: `linear-gradient(90deg,transparent,${s.a},transparent)` }} />
            <div className="disp" style={{ fontSize: 48, color: s.c, lineHeight: 1 }}>{s.value}</div>
            <div className="fl" style={{ marginTop: 10 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Controls: tabs + search */}
      <div className="r" style={{ animationDelay: '.1s', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['all', 'QLD', 'SA'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={tab === t ? 'chip on' : 'chip'}>{t === 'all' ? 'All states' : t}</button>
          ))}
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
          const status = booked ? { label: 'Booked', ...GREEN }
            : c.pending ? { label: 'Awaiting payment', c: '#F0A93C', bg: 'rgba(240,169,60,0.16)' }
            : c.active ? { label: 'Active', ...GREEN }
            : { label: 'Paused', c: '#aaa', bg: 'rgba(170,170,170,0.14)' }
          const tier = TIER_META[c.tier]
          const cardStyle: React.CSSProperties = booked
            ? { padding: 0, overflow: 'hidden', boxShadow: '0 0 0 1px rgba(98,227,106,0.5), 0 30px 60px -30px rgba(0,0,0,0.9)', background: 'radial-gradient(130% 80% at 0% 0%, rgba(98,227,106,0.12), transparent 52%), linear-gradient(180deg,rgba(18,22,18,0.9),rgba(10,12,10,0.94))' }
            : { padding: 0, overflow: 'hidden' }
          return (
            <div key={c.id} className="card" style={cardStyle}>
              {/* header row (click to expand) */}
              <button onClick={() => setOpenId(open ? null : c.id)}
                style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14, fontFamily: 'inherit' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 999, flexShrink: 0, background: booked ? 'linear-gradient(135deg,#7ef08a,#3fcf57)' : 'linear-gradient(135deg,var(--gold-2),var(--gold))', color: '#10210f', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 15 }}>{c.first[0]}{c.last[0]}</div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <span className="disp" style={{ fontSize: 20 }}>{c.first} {c.last}</span>
                        <CopyRef value={c.ref} />
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.email} · {c.phone}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                    <span className="spill hide-sm" style={{ color: tier.c, background: 'rgba(255,255,255,0.04)', border: `1px solid ${tier.c}` }}>{tier.label}</span>
                    <span className="spill" style={{ color: status.c, background: status.bg, border: `1px solid ${status.c}` }}>
                      {status.label === 'Booked'
                        ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={status.c} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                        : <span className={status.label === 'Active' ? 'dot live' : 'dot'} style={{ background: status.c }} />}
                      {status.label}
                    </span>
                    <span style={{ color: 'var(--muted)', transition: 'transform .3s', transform: open ? 'rotate(180deg)' : 'none', display: 'inline-flex' }}><Arrow dir="left" s={14} /></span>
                  </div>
                </div>

                {/* Minimised: show the NEW booking date/time/location at a glance */}
                {!open && booked && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, width: '100%' }}>
                    {bookedVehicles.map(v => (
                      <div key={v.vin} style={{ display: 'inline-flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', padding: '9px 14px', borderRadius: 12, background: 'rgba(98,227,106,0.08)', border: '1px solid rgba(98,227,106,0.3)', fontSize: 13 }}>
                        <span style={{ ...dtl, color: 'var(--green)', fontWeight: 700 }}><Cal />{v.date}</span>
                        <span style={{ ...dtl, color: '#dfeede' }}><Clock />{v.time}</span>
                        <span style={{ ...dtl, color: '#dfeede' }}><Pin />{v.loc}</span>
                        <span style={{ color: 'var(--muted)' }}>· {v.title}</span>
                      </div>
                    ))}
                  </div>
                )}
              </button>

              {/* expanded body */}
              {open && (
                <div style={{ padding: '0 24px 24px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                  {/* customer detail (WOVI applicant) */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: '18px 28px', marginTop: 20 }}>
                    {([['State', c.state], ['Tier', tier.label], ['CRN', c.crn], ['Date of birth', c.dob], ['Joined', c.created]] as [string, string][]).map(([l, v]) => (
                      <div key={l}><div className="fl">{l}</div><div className="fv">{v}</div></div>
                    ))}
                    <div style={{ gridColumn: '1 / -1' }}><div className="fl">Address</div><div className="fv">{c.address}</div></div>
                  </div>

                  <div className="fl" style={{ marginTop: 22, marginBottom: 12 }}>Vehicles · {c.vehicles.length}</div>
                  <div style={{ display: 'grid', gap: 12 }}>
                    {c.vehicles.map(v => <VehicleBlock key={v.vin} v={v} />)}
                  </div>

                  {/* Completed / Past (archived) */}
                  {c.archived.length > 0 && (
                    <>
                      <div className="fl" style={{ marginTop: 20, marginBottom: 10 }}>Completed / Past · {c.archived.length}</div>
                      <div style={{ display: 'grid', gap: 10 }}>
                        {c.archived.map(v => (
                          <div key={v.vin} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', padding: '12px 16px', borderRadius: 14, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', opacity: 0.8 }}>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 14, fontWeight: 600 }}>{v.title}</div>
                              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}><span style={{ fontFamily: 'ui-monospace,monospace' }}>{v.vin}</span> · {v.line}</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span className="spill" style={{ color: GREY.c, background: GREY.bg, border: `1px solid ${GREY.c}` }}><span className="dot" style={{ background: GREY.c }} />Done</span>
                              <button className="chip">Unarchive</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {/* Deleted (record kept for admin) */}
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
                            <button className="chip" style={{ color: 'var(--green)', borderColor: 'rgba(98,227,106,0.4)' }}>Restore</button>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {/* actions */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginTop: 22, paddingTop: 18, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                    {c.pending
                      ? <button className="pill gold" style={{ padding: '11px 20px', fontSize: 13 }}>Send payment request</button>
                      : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--green)' }}><span className="dot live" style={{ background: 'var(--green)' }} />{booked ? 'Booking secured' : 'Active — monitoring running'}</span>}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button className="pill gold" style={{ padding: '10px 16px', fontSize: 13 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ marginRight: 2 }}><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" strokeLinecap="round" /></svg>
                        View as user
                      </button>
                      <button className="chip">Archive</button>
                      <button className="chip" style={{ color: '#f08a8a', borderColor: 'rgba(240,120,120,0.4)' }}>Delete</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
        {filtered.length === 0 && <p style={{ color: 'var(--muted)', fontSize: 14 }}>No customers match.</p>}
      </div>

      {/* Manage admins modal */}
      {showAdmins && (
        <div onClick={() => setShowAdmins(false)} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(4,4,4,0.72)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '8vh 20px 24px', overflowY: 'auto' }}>
          <div onClick={e => e.stopPropagation()} className="card" style={{ width: '100%', maxWidth: 480, padding: 26 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div>
                <span className="eyebrow">Access</span>
                <h2 className="disp" style={{ fontSize: 26, marginTop: 12 }}>Manage admins</h2>
              </div>
              <button onClick={() => setShowAdmins(false)} aria-label="Close" style={{ width: 34, height: 34, borderRadius: 999, flexShrink: 0, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: 'var(--muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
              </button>
            </div>

            <div style={{ marginTop: 20, display: 'grid', gap: 10 }}>
              {admins.map(a => {
                const owner = a.role === 'Owner'
                return (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '12px 14px', borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 999, flexShrink: 0, background: owner ? 'linear-gradient(135deg,var(--gold-2),var(--gold))' : 'rgba(255,255,255,0.08)', color: owner ? '#231900' : 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13 }}>{a.username[0].toUpperCase()}</div>
                      <span style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.username}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      <span className="spill" style={{ color: owner ? 'var(--gold-2)' : 'var(--muted)', background: 'rgba(255,255,255,0.04)', border: `1px solid ${owner ? 'var(--gold-2)' : 'rgba(255,255,255,0.15)'}` }}>{a.role}</span>
                      {owner
                        ? <span style={{ fontSize: 11, color: 'var(--muted)' }}>You</span>
                        : <button onClick={() => setAdmins(list => list.filter(x => x.id !== a.id))} className="chip" style={{ color: '#f08a8a', borderColor: 'rgba(240,120,120,0.4)' }}>Remove</button>}
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
    </PreviewShell>
  )
}
