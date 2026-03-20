'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

type Customer = {
  id: string
  created_at: string
  active: boolean
  state: string
  tier: 'priority' | 'standard' | 'basic'
  auto_payment_email: boolean
  first_name: string
  last_name: string
  email: string
  phone: string
  address?: string
  suburb?: string
  postcode?: string
  crn?: string
  licence_number?: string
  vehicles?: Vehicle[]
}

const TIER_CONFIG = {
  priority: { label: '🥇 Priority — $10/vehicle', color: '#C9A84C', bg: '#2a1a00', border: '#4a3a00' },
  standard: { label: '🥈 Standard — $7.50/vehicle', color: '#888', bg: 'var(--dark-4)', border: 'var(--border)' },
  basic:    { label: '🥉 Basic — $5/vehicle',    color: '#666', bg: 'var(--dark-4)', border: 'var(--border)' },
}

type Vehicle = {
  id: string
  label: string
  make: string
  model: string
  year: string
  vin: string
  cutoff_date: string
  booked_date?: string
  booked_time?: string
  booked_location?: string
  previous_cutoff?: string
  priority_locations?: string[]
  locations?: string[]
  active: boolean
  state: string
}

const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'avibm2024'

export default function Admin() {
  const [authed, setAuthed] = useState(false)
  const [pw, setPw] = useState('')
  const [pwError, setPwError] = useState(false)

  const [customers, setCustomers] = useState<Customer[]>([])
  const [monitorStatus, setMonitorStatus] = useState<{
    last_run: string
    active_customers: number
    qld_count: number
    sa_count: number
    status: string
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<'all' | 'QLD' | 'SA'>('all')
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const login = () => {
    if (pw === ADMIN_PASSWORD) { setAuthed(true); loadData() }
    else setPwError(true)
  }

  const loadData = async () => {
    setLoading(true)
    const { data: custs } = await supabase
      .from('customers')
      .select('*, vehicles(*)')
      .order('created_at', { ascending: false })
    setCustomers(custs || [])

    const { data: status } = await supabase
      .from('monitor_status')
      .select('*')
      .eq('id', 'main')
      .single()
    if (status) setMonitorStatus(status)

    setLoading(false)
  }

  // Auto-refresh monitor status every 30 seconds
  useEffect(() => {
    if (!authed) return
    const interval = setInterval(async () => {
      const { data } = await supabase.from('monitor_status').select('*').eq('id', 'main').single()
      if (data) setMonitorStatus(data)
    }, 30000)
    return () => clearInterval(interval)
  }, [authed])

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from('customers').update({ active: !current }).eq('id', id)
    setCustomers(cs => cs.map(c => c.id === id ? { ...c, active: !current } : c))

    // Send activation confirmation email when turning ON
    if (!current) {
      const customer = customers.find(c => c.id === id)
      if (customer) {
        await fetch('/api/activation-confirmation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: `${customer.first_name} ${customer.last_name}`,
            email: customer.email,
            state: customer.state,
            vehicles: customer.vehicles?.length || 1,
          })
        })
      }
    }
  }

  const toggleVehicle = async (vid: string, current: boolean) => {
    await supabase.from('vehicles').update({ active: !current }).eq('id', vid)
    setCustomers(cs => cs.map(c => ({
      ...c,
      vehicles: c.vehicles?.map(v => v.id === vid ? { ...v, active: !current } : v)
    })))
  }

  const updateTier = async (id: string, tier: string) => {
    await supabase.from('customers').update({ tier }).eq('id', id)
    setCustomers(cs => cs.map(c => c.id === id ? { ...c, tier: tier as any } : c))
  }

  const sendPaymentRequest = async (c: Customer) => {
    const tierPrices: Record<string, number> = { priority: 10, standard: 7.5, basic: 5 }
    const price = c.state === 'SA' ? 5 : tierPrices[c.tier || 'standard']
    const vehicleCount = c.vehicles?.length || 1
    const total = (price * vehicleCount).toFixed(2)

    const res = await fetch('/api/send-payment-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerEmail: c.email,
        customerName:  `${c.first_name} ${c.last_name}`,
        vehicles:      vehicleCount,
        tier:          c.tier || 'standard',
        price,
        total,
        state:         c.state,
      })
    })
    if (res.ok) {
      alert(`✅ Payment request sent to ${c.email}`)
    } else {
      alert('Failed to send email. Check your Vercel env vars.')
    }
  }



  const updateCutoff = async (vid: string, date: string, oldDate: string) => {
    await supabase.from('vehicles').update({ cutoff_date: date, previous_cutoff: oldDate }).eq('id', vid)
    setCustomers(cs => cs.map(c => ({
      ...c,
      vehicles: c.vehicles?.map(v => v.id === vid ? { ...v, cutoff_date: date, previous_cutoff: oldDate } : v)
    })))
  }

  const updatePriorityLocations = async (vid: string, locs: string[]) => {
    await supabase.from('vehicles').update({ priority_locations: locs }).eq('id', vid)
    setCustomers(cs => cs.map(c => ({
      ...c,
      vehicles: c.vehicles?.map(v => v.id === vid ? { ...v, priority_locations: locs } : v)
    })))
  }

  const deleteCustomer = async (id: string) => {
    if (!confirm('Delete this customer and all their vehicles?')) return
    await supabase.from('customers').delete().eq('id', id)
    setCustomers(cs => cs.filter(c => c.id !== id))
  }

  const filtered = customers.filter(c => {
    if (tab !== 'all' && c.state !== tab) return false
    if (search) {
      const s = search.toLowerCase()
      return `${c.first_name} ${c.last_name} ${c.email}`.toLowerCase().includes(s)
    }
    return true
  })

  const stats = {
    total: customers.length,
    active: customers.filter(c => c.active).length,
    qld: customers.filter(c => c.state === 'QLD').length,
    sa: customers.filter(c => c.state === 'SA').length,
    vehicles: customers.reduce((n, c) => n + (c.vehicles?.length || 0), 0),
    priority: customers.filter(c => c.tier === 'priority' || c.state === 'SA').length,
    standard: customers.filter(c => c.tier === 'standard' && c.state !== 'SA').length,
    basic: customers.filter(c => c.tier === 'basic' && c.state !== 'SA').length,
  }

  if (!authed) return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
      <div className="card" style={{ maxWidth: 360, width: '100%' }}>
        <div className="section-label" style={{ marginBottom: 8 }}>Admin Access</div>
        <h2 style={{ fontSize: 32, marginBottom: 24 }}>AVIBM ADMIN</h2>
        <div style={{ marginBottom: 16 }}>
          <label>Password</label>
          <input
            type="password" value={pw}
            onChange={e => { setPw(e.target.value); setPwError(false) }}
            onKeyDown={e => e.key === 'Enter' && login()}
            placeholder="Enter admin password"
            style={{ borderColor: pwError ? '#ff4444' : undefined }}
          />
          {pwError && <p style={{ color: '#ff4444', fontSize: 12, marginTop: 6 }}>Incorrect password</p>}
        </div>
        <button className="btn-gold" onClick={login}>ENTER</button>
        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <Link href="/" style={{ color: 'var(--text-muted)', fontSize: 13, textDecoration: 'none' }}>← Back to home</Link>
        </div>
      </div>
    </main>
  )

  return (
    <main style={{ minHeight: '100vh', padding: '0 0 80px' }}>
      {/* Header */}
      <header className='admin-header' style={{
        borderBottom: '1px solid var(--border)', padding: '20px 40px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        position: 'sticky', top: 0, background: 'rgba(10,10,10,0.95)',
        backdropFilter: 'blur(10px)', zIndex: 100,
      }}>
        <div>
          <span style={{ fontFamily: 'Bebas Neue', fontSize: 22, color: 'var(--gold)', letterSpacing: '0.15em' }}>AVIBM</span>
          <span style={{ color: 'var(--text-muted)', fontSize: 12, marginLeft: 12, letterSpacing: '0.1em' }}>ADMIN PANEL</span>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button onClick={loadData} style={{
            background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)',
            padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontFamily: 'DM Sans',
          }}>↻ Refresh</button>
          <Link href="/" style={{ color: 'var(--text-muted)', fontSize: 13, textDecoration: 'none' }}>← Site</Link>
        </div>
      </header>

      <div className='admin-body' style={{ padding: 'clamp(16px,4vw,32px) clamp(12px,4vw,40px)' }}>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: 8, marginBottom: 20 }}>
          {[
            { label: 'Total', value: stats.total },
            { label: 'Active', value: stats.active, gold: true },
            { label: 'QLD', value: stats.qld },
            { label: 'SA', value: stats.sa },
            { label: '🥇 Priority', value: stats.priority },
            { label: '🥈 Standard', value: stats.standard },
            { label: '🥉 Basic', value: stats.basic },
          ].map(s => (
            <div key={s.label} style={{
              background: 'var(--dark-2)', border: '1px solid var(--border)',
              borderRadius: 10, padding: '14px 10px', textAlign: 'center',
            }}>
              <div style={{ fontFamily: 'Bebas Neue', fontSize: 28, color: s.gold ? 'var(--gold)' : 'var(--text)' }}>{s.value}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2, lineHeight: 1.3 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Monitor Status */}
        <div className='monitor-grid' style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12, marginBottom: 20,
        }}>
          {/* QLD Status */}
          <div style={{
            background: 'var(--dark-2)',
            border: `1px solid ${monitorStatus ? '#2a4a2a' : 'var(--border)'}`,
            borderRadius: 10, padding: '16px 20px',
            display: 'flex', alignItems: 'center', gap: 16,
          }}>
            <div style={{ position: 'relative' }}>
              <div style={{
                width: 14, height: 14, borderRadius: '50%',
                background: monitorStatus ? '#5adb5a' : '#555',
              }} />
              {monitorStatus && (
                <div style={{
                  position: 'absolute', top: 0, left: 0,
                  width: 14, height: 14, borderRadius: '50%',
                  background: '#5adb5a', opacity: 0.4,
                  animation: 'pulse 2s infinite',
                }} />
              )}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'Bebas Neue', fontSize: 15, letterSpacing: '0.05em', color: monitorStatus ? '#5adb5a' : 'var(--text-muted)' }}>
                QLD MONITOR {monitorStatus ? '● ACTIVE' : '○ NO DATA'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                {monitorStatus ? `${monitorStatus.qld_count} customer(s) · Last run: ${monitorStatus.last_run}` : 'Waiting for first run...'}
              </div>
            </div>
          </div>

          {/* SA Status */}
          <div style={{
            background: 'var(--dark-2)',
            border: `1px solid ${monitorStatus ? '#2a4a2a' : 'var(--border)'}`,
            borderRadius: 10, padding: '16px 20px',
            display: 'flex', alignItems: 'center', gap: 16,
          }}>
            <div style={{ position: 'relative' }}>
              <div style={{
                width: 14, height: 14, borderRadius: '50%',
                background: monitorStatus ? '#5adb5a' : '#555',
              }} />
              {monitorStatus && (
                <div style={{
                  position: 'absolute', top: 0, left: 0,
                  width: 14, height: 14, borderRadius: '50%',
                  background: '#5adb5a', opacity: 0.4,
                  animation: 'pulse 2s infinite',
                }} />
              )}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'Bebas Neue', fontSize: 15, letterSpacing: '0.05em', color: monitorStatus ? '#5adb5a' : 'var(--text-muted)' }}>
                SA MONITOR {monitorStatus ? '● ACTIVE' : '○ NO DATA'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                {monitorStatus ? `${monitorStatus.sa_count} customer(s) · Last run: ${monitorStatus.last_run}` : 'Waiting for first run...'}
              </div>
            </div>
          </div>
        </div>

        <style>{`
          @keyframes pulse {
            0% { transform: scale(1); opacity: 0.4; }
            50% { transform: scale(2); opacity: 0; }
            100% { transform: scale(1); opacity: 0; }
          }
        `}</style>

        {/* Auto payment email info */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20,
          background: 'var(--dark-2)', border: '1px solid #2a4a2a',
          borderRadius: 10, padding: '12px 20px',
        }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#5adb5a', flexShrink: 0 }} />
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Payment request emails are <strong style={{ color: '#5adb5a' }}>automatically sent</strong> to every new registration. Use the button below to send reminders.
          </div>
        </div>

        {/* Filters */}
        <div className='filters-row' style={{ display: 'flex', gap: 12, marginBottom: 24, alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email..." style={{ maxWidth: 320 }} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['all', 'QLD', 'SA'] as const).map(t => (
              <button key={t} className={`state-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
                {t === 'all' ? 'ALL' : t}
              </button>
            ))}
          </div>
        </div>

        {/* Customer list */}
        {loading ? (
          <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 40 }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 40 }}>No customers found.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map(c => (
              <div key={c.id} style={{
                background: 'var(--dark-2)',
                border: `1px solid ${c.vehicles?.some(v => v.booked_date) ? '#5adb5a' : 'var(--border)'}`,
                borderRadius: 10, overflow: 'hidden',
                boxShadow: c.vehicles?.some(v => v.booked_date) ? '0 0 12px rgba(90,219,90,0.15)' : 'none',
              }}>
                {/* Customer row */}
                <div className='customer-row' style={{
                  padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
                  cursor: 'pointer',
                }} onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}>
                  {/* State badge */}
                  <div style={{
                    background: c.state === 'QLD' ? '#1a2a3a' : '#2a1a2a',
                    border: `1px solid ${c.state === 'QLD' ? '#2a3a4a' : '#3a2a3a'}`,
                    color: c.state === 'QLD' ? '#5ab0ff' : '#c080ff',
                    padding: '4px 10px', borderRadius: 4, fontSize: 12, fontWeight: 600,
                    minWidth: 48, textAlign: 'center',
                  }}>{c.state}</div>

                  {/* Name */}
                  <div className='customer-name' style={{ flex: 1, minWidth: 140 }}>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{c.first_name} {c.last_name}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{c.email} · {c.phone}</div>
                  </div>

                  {/* Vehicles count */}
                  <div style={{ textAlign: 'center', minWidth: 60 }}>
                    <div style={{ fontFamily: 'Bebas Neue', fontSize: 22, color: 'var(--gold)' }}>{c.vehicles?.length || 0}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.08em' }}>VEHICLE{(c.vehicles?.length || 0) !== 1 ? 'S' : ''}</div>
                  </div>

                  {/* Registered */}
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', minWidth: 90, textAlign: 'right' }}>
                    {new Date(c.created_at).toLocaleDateString('en-AU')}
                  </div>

                  {/* Tier selector — QLD only */}
                  {c.state === 'QLD' && (
                    <div onClick={e => e.stopPropagation()}>
                      <select
                        value={c.tier || 'standard'}
                        onChange={e => updateTier(c.id, e.target.value)}
                        style={{
                          padding: '4px 8px', fontSize: 12, borderRadius: 4,
                          background: TIER_CONFIG[c.tier || 'standard'].bg,
                          border: `1px solid ${TIER_CONFIG[c.tier || 'standard'].border}`,
                          color: TIER_CONFIG[c.tier || 'standard'].color,
                          cursor: 'pointer', minWidth: 110,
                        }}
                      >
                        <option value="priority">🥇 Priority — $10</option>
                        <option value="standard">🥈 Standard — $7.50</option>
                        <option value="basic">🥉 Basic — $5</option>
                      </select>
                    </div>
                  )}

                  {/* Auto email toggle */}
                  <div onClick={e => { e.stopPropagation(); supabase.from('customers').update({ auto_payment_email: !c.auto_payment_email }).eq('id', c.id).then(() => setCustomers(cs => cs.map(x => x.id === c.id ? { ...x, auto_payment_email: !c.auto_payment_email } : x))) }} title="Auto-send payment request email when customer registers">
                    <span style={{
                      cursor: 'pointer', fontSize: 12, padding: '4px 10px', borderRadius: 4,
                      background: c.auto_payment_email ? '#1a2a1a' : 'var(--dark-4)',
                      border: `1px solid ${c.auto_payment_email ? '#2a4a2a' : 'var(--border)'}`,
                      color: c.auto_payment_email ? '#5adb5a' : 'var(--text-muted)',
                    }}>
                      {c.auto_payment_email ? '● AUTO EMAIL' : '○ MANUAL'}
                    </span>
                  </div>

                  {/* Active toggle */}
                  <div onClick={e => { e.stopPropagation(); toggleActive(c.id, c.active) }}>
                    <span className={`badge ${c.active ? 'badge-active' : 'badge-pending'}`} style={{ cursor: 'pointer' }}>
                      {c.active ? '● ACTIVE' : '○ PENDING'}
                    </span>
                  </div>

                  {/* Expand */}
                  <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                    {expandedId === c.id ? '▲' : '▼'}
                  </div>
                </div>

                {/* Expanded detail */}
                {expandedId === c.id && (
                  <div style={{ borderTop: '1px solid var(--border)', padding: '20px' }}>
                    <div className='customer-detail-grid' style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 20, fontSize: 13 }}>
                      <div><span style={{ color: 'var(--text-muted)' }}>Address: </span>{c.address}, {c.suburb} {c.postcode}</div>
                      {c.crn && <div><span style={{ color: 'var(--text-muted)' }}>CRN: </span>{c.crn}</div>}
                      {c.licence_number && <div><span style={{ color: 'var(--text-muted)' }}>Licence: </span>{c.licence_number}</div>}
                    </div>

                    {/* Vehicles */}
                    <div className="section-label" style={{ marginBottom: 12 }}>Vehicles</div>
                    {c.vehicles?.map(v => (
                      <div key={v.id} style={{
                        background: v.booked_date ? '#0d1f0d' : 'var(--dark-3)',
                        border: `1px solid ${v.booked_date ? '#2a4a2a' : 'var(--border)'}`,
                        borderRadius: 8, padding: '14px 16px', marginBottom: 8,
                      }}>
                        {/* Top row — vehicle name + toggle */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 14 }}>{v.make} {v.model} {v.year}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>VIN: {v.vin}</div>
                          </div>
                          <div onClick={() => toggleVehicle(v.id, v.active)} style={{ cursor: 'pointer' }}>
                            <span className={`badge ${v.active ? 'badge-active' : 'badge-inactive'}`}>
                              {v.active ? '● ON' : '○ OFF'}
                            </span>
                          </div>
                        </div>

                        {/* Booking info grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>

                          {/* Current / original booking */}
                          <div style={{ background: 'var(--dark-4)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ color: 'var(--text-muted)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Original Booking</div>
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4 }}>
                              <input
                                type="date"
                                defaultValue={v.cutoff_date}
                                id={`cutoff-${v.id}`}
                                style={{ flex: 1, padding: '4px 8px', fontSize: 13 }}
                              />
                              <button
                                onClick={() => {
                                  const el = document.getElementById(`cutoff-${v.id}`) as HTMLInputElement
                                  if (el && el.value && el.value !== v.cutoff_date) {
                                    updateCutoff(v.id, el.value, v.cutoff_date)
                                  }
                                }}
                                style={{
                                  padding: '4px 10px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
                                  background: 'var(--gold)', border: 'none', color: '#000', fontWeight: 700,
                                  fontFamily: 'DM Sans', whiteSpace: 'nowrap',
                                }}
                              >✓ Save</button>
                            </div>
                            {v.previous_cutoff && (
                              <div style={{ fontSize: 11, color: '#555' }}>
                                Was: <span style={{ textDecoration: 'line-through' }}>{v.previous_cutoff}</span>
                              </div>
                            )}
                          </div>

                          {/* New booking found by monitor */}
                          {v.booked_date ? (
                            <div style={{ background: '#1a2a1a', border: '1px solid #2a4a2a', borderRadius: 6, padding: '10px 12px' }}>
                              <div style={{ color: '#5adb5a', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>✅ New Booking Found</div>
                              <div style={{ fontSize: 14, color: '#fff', fontWeight: 600, marginBottom: 4 }}>
                {v.booked_date ? (() => { const [y,m,d] = v.booked_date.split('-'); return d && m && y ? `${d}/${m}/${y}` : v.booked_date })() : ''}
              </div>
                              {v.booked_time && (
                                <div style={{ fontSize: 13, color: '#5ab0ff', marginBottom: 2 }}>⏰ {v.booked_time}</div>
                              )}
                              {v.booked_location && (
                                <div style={{ fontSize: 13, color: '#5ab0ff' }}>📍 {v.booked_location}</div>
                              )}
                              {!v.booked_time && !v.booked_location && (
                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Time/location updating next run</div>
                              )}
                            </div>
                          ) : (
                            <div style={{ background: 'var(--dark-4)', borderRadius: 6, padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
                                <div style={{ fontSize: 18, marginBottom: 4 }}>🔍</div>
                                Searching for earlier slot...
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Priority locations editor */}
                        {v.locations && v.locations.length > 0 && (
                          <div style={{ marginTop: 10, padding: '10px 12px', background: 'var(--dark-4)', borderRadius: 6, border: '1px solid var(--border)' }}>
                            <div style={{ color: 'var(--gold)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>🥇 Priority Locations (max 2)</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                              {v.locations.map((loc: string) => {
                                const isPriority = (v.priority_locations || []).includes(loc)
                                const atMax = (v.priority_locations || []).length >= 2
                                return (
                                  <button key={loc} onClick={() => {
                                    const current = v.priority_locations || []
                                    const updated = isPriority ? current.filter(l => l !== loc) : atMax ? current : [...current, loc]
                                    updatePriorityLocations(v.id, updated)
                                  }} style={{
                                    padding: '3px 10px', borderRadius: 20, fontSize: 11, cursor: 'pointer',
                                    border: `1px solid ${isPriority ? 'var(--gold)' : 'var(--border)'}`,
                                    background: isPriority ? '#2a2000' : 'transparent',
                                    color: isPriority ? 'var(--gold)' : atMax && !isPriority ? '#444' : 'var(--text-muted)',
                                    opacity: atMax && !isPriority ? 0.5 : 1,
                                  }}>
                                    {isPriority ? '🥇 ' : ''}{loc}
                                  </button>
                                )
                              })}
                            </div>
                            {(v.priority_locations || []).length === 0 && (
                              <div style={{ fontSize: 11, color: '#555', marginTop: 4 }}>No priority — books earliest available anywhere</div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Actions */}
                    <div className='actions-row' style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      {!c.active && (
                        <button
                          onClick={() => sendPaymentRequest(c)}
                          style={{
                            background: 'var(--gold)', color: '#000', border: 'none',
                            padding: '10px 20px', borderRadius: 6, cursor: 'pointer',
                            fontFamily: 'Bebas Neue', fontSize: 15, letterSpacing: '0.1em',
                          }}
                        >
                          📧 SEND PAYMENT REQUEST
                        </button>
                      )}
                      {c.active && (
                        <div style={{ fontSize: 13, color: '#5adb5a' }}>✅ Customer is active — monitoring running</div>
                      )}
                      <button onClick={() => deleteCustomer(c.id)} style={{
                        background: 'none', border: '1px solid #4a1a1a', color: '#ff6b6b',
                        padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontSize: 12,
                        fontFamily: 'DM Sans',
                      }}>Delete Customer</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
