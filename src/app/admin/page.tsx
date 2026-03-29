'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

type Customer = {
  id: string
  created_at: string
  active: boolean
  archived?: boolean
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
  date_of_birth?: string
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
  colour?: string
  vehicle_type?: string
  build_month?: string
  damage?: string
  purchase_method?: string
  purchased_from?: string
  cutoff_date: string
  booked_date?: string
  booked_time?: string
  booked_location?: string
  previous_cutoff?: string
  priority_locations?: string[]
  locations?: string[]
  active: boolean
  state: string
  search_after_date?: string
  search_after_active?: boolean
  notes?: string
  archived?: boolean
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
  const [editingCustomer, setEditingCustomer] = useState<string | null>(null)
  const [customerEdits, setCustomerEdits] = useState<Record<string, Partial<Customer>>>({})
  const [editingVehicle, setEditingVehicle] = useState<string | null>(null)
  const [vehicleEdits, setVehicleEdits] = useState<Record<string, Partial<Vehicle>>>({})
  const [freeList, setFreeList] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('avibm_free_list') || '[]') } catch { return [] }
  })
  const [newFreeEntry, setNewFreeEntry] = useState('')
  const [showFreePanel, setShowFreePanel] = useState(false)
  const [showPendingPanel, setShowPendingPanel] = useState(true)
  const [showArchivedPanel, setShowArchivedPanel] = useState(false)
  const [newRegCount, setNewRegCount] = useState(0)
  const [pendingCoupons, setPendingCoupons] = useState<Record<string, string>>({})
  const [sendingReminder, setSendingReminder] = useState<string | null>(null)

  const login = () => {
    if (ADMIN_PASSWORD.split(',').map(p => p.trim()).includes(pw)) {
      localStorage.setItem('avibm_admin_last_seen', new Date().toISOString())
      setAuthed(true)
      loadData()
    } else setPwError(true)
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

  useEffect(() => {
    if (!authed) return
    const interval = setInterval(async () => {
      const { data } = await supabase.from('monitor_status').select('*').eq('id', 'main').single()
      if (data) setMonitorStatus(data)
    }, 30000)
    return () => clearInterval(interval)
  }, [authed])

  // Poll for new registrations and update tab title
  useEffect(() => {
    if (!authed) return
    const lastSeenKey = 'avibm_admin_last_seen'
    const getLastSeen = () => localStorage.getItem(lastSeenKey) || new Date().toISOString()

    const check = async () => {
      const lastSeen = getLastSeen()
      const { data } = await supabase
        .from('customers')
        .select('id')
        .gt('created_at', lastSeen)
      if (data && data.length > 0) {
        setNewRegCount(n => n + data.length)
      }
    }

    const interval = setInterval(check, 30000)
    return () => clearInterval(interval)
  }, [authed])

  // Update tab title when newRegCount changes
  useEffect(() => {
    if (newRegCount > 0) {
      document.title = `🔔 (${newRegCount}) New Registration! — AVIBM Admin`
    } else {
      document.title = 'AVIBM Admin'
    }
    return () => { document.title = 'AVIBM Admin' }
  }, [newRegCount])

  // Clear notification when tab is focused
  useEffect(() => {
    if (!authed) return
    const onFocus = () => {
      if (newRegCount > 0) {
        localStorage.setItem('avibm_admin_last_seen', new Date().toISOString())
        setNewRegCount(0)
        loadData()
      }
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [authed, newRegCount])

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from('customers').update({ active: !current }).eq('id', id)
    setCustomers(cs => cs.map(c => c.id === id ? { ...c, active: !current } : c))
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
    if (res.ok) alert(`✅ Payment request sent to ${c.email}`)
    else alert('Failed to send email. Check your Vercel env vars.')
  }

  const updateCutoff = async (vid: string, date: string, oldDate: string) => {
    await supabase.from('vehicles').update({
      cutoff_date: date,
      previous_cutoff: oldDate,
      booked_date: null,
      booked_time: null,
      booked_location: null,
    }).eq('id', vid)
    setCustomers(cs => cs.map(c => ({
      ...c,
      vehicles: c.vehicles?.map(v => v.id === vid ? {
        ...v,
        cutoff_date: date,
        previous_cutoff: oldDate,
        booked_date: undefined,
        booked_time: undefined,
        booked_location: undefined,
      } : v)
    })))
  }

  const updateManualBooking = async (vid: string, date: string, time: string, location: string) => {
    await supabase.from('vehicles').update({
      booked_date: date || null,
      booked_time: time || null,
      booked_location: location || null,
    }).eq('id', vid)
    setCustomers(cs => cs.map(c => ({
      ...c,
      vehicles: c.vehicles?.map(v => v.id === vid ? {
        ...v,
        booked_date: date || undefined,
        booked_time: time || undefined,
        booked_location: location || undefined,
      } : v)
    })))
  }

  const updateSearchAfter = async (vid: string, date: string | null, active: boolean) => {
    await supabase.from('vehicles').update({
      search_after_date: date,
      search_after_active: active,
    }).eq('id', vid)
    setCustomers(cs => cs.map(c => ({
      ...c,
      vehicles: c.vehicles?.map(v => v.id === vid ? {
        ...v,
        search_after_date: date ?? undefined,
        search_after_active: active,
      } : v)
    })))
  }

  const addFreeEntry = (entry: string) => {
    const cleaned = entry.trim().toLowerCase()
    if (!cleaned || freeList.includes(cleaned)) return
    const updated = [...freeList, cleaned]
    setFreeList(updated)
    localStorage.setItem('avibm_free_list', JSON.stringify(updated))
    setNewFreeEntry('')
  }

  const removeFreeEntry = (entry: string) => {
    const updated = freeList.filter(e => e !== entry)
    setFreeList(updated)
    localStorage.setItem('avibm_free_list', JSON.stringify(updated))
  }

  const updateLocations = async (vid: string, locs: string[]) => {
    await supabase.from('vehicles').update({ locations: locs }).eq('id', vid)
    setCustomers(cs => cs.map(c => ({
      ...c,
      vehicles: c.vehicles?.map(v => v.id === vid ? { ...v, locations: locs } : v)
    })))
  }

  const updatePriorityLocations = async (vid: string, locs: string[]) => {
    await supabase.from('vehicles').update({ priority_locations: locs }).eq('id', vid)
    setCustomers(cs => cs.map(c => ({
      ...c,
      vehicles: c.vehicles?.map(v => v.id === vid ? { ...v, priority_locations: locs } : v)
    })))
  }

  const saveCustomerEdits = async (id: string) => {
    const edits = customerEdits[id]
    if (!edits) return
    await supabase.from('customers').update(edits).eq('id', id)
    setCustomers(cs => cs.map(c => c.id === id ? { ...c, ...edits } : c))
    setEditingCustomer(null)
  }

  const saveVehicleEdits = async (vid: string) => {
    const edits = vehicleEdits[vid]
    if (!edits) return
    await supabase.from('vehicles').update(edits).eq('id', vid)
    setCustomers(cs => cs.map(c => ({
      ...c,
      vehicles: c.vehicles?.map(v => v.id === vid ? { ...v, ...edits } : v)
    })))
    setEditingVehicle(null)
  }

  const updateNotes = async (vid: string, notes: string) => {
    await supabase.from('vehicles').update({ notes }).eq('id', vid)
    setCustomers(cs => cs.map(c => ({
      ...c,
      vehicles: c.vehicles?.map(v => v.id === vid ? { ...v, notes } : v)
    })))
  }

  const sendStripeReminder = async (c: Customer, coupon: string) => {
    setSendingReminder(c.id)
    try {
      const res = await fetch('/api/send-stripe-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: c.id,
          tier: c.tier || 'basic',
          state: c.state,
          coupon_code: coupon || null,
          customer_name: `${c.first_name} ${c.last_name}`,
          customer_email: c.email,
        }),
      })
      if (res.ok) alert(`✅ Payment link sent to ${c.email}`)
      else alert('Failed to send reminder.')
    } catch { alert('Error sending reminder.') }
    setSendingReminder(null)
  }

  const deleteCustomer = async (id: string) => {
    if (!confirm('Delete this customer and all their vehicles?')) return
    await supabase.from('customers').delete().eq('id', id)
    setCustomers(cs => cs.filter(c => c.id !== id))
  }

  const archiveCustomer = async (id: string, current: boolean) => {
    await supabase.from('customers').update({ archived: !current, active: false }).eq('id', id)
    setCustomers(cs => cs.map(c => c.id === id ? { ...c, archived: !current, active: false } : c))
  }

  const archiveVehicle = async (vid: string, current: boolean) => {
    await supabase.from('vehicles').update({ archived: !current, active: false }).eq('id', vid)
    setCustomers(cs => cs.map(c => ({
      ...c,
      vehicles: c.vehicles?.map(v => v.id === vid ? { ...v, archived: !current, active: false } : v)
    })))
  }

  const pendingPayment = customers.filter(c => !c.active && c.auto_payment_email)

  const archived = customers.filter(c => c.archived)

  const filtered = customers.filter(c => {
    if (c.archived) return false
    if (tab !== 'all' && c.state !== tab) return false
    if (search) {
      const s = search.toLowerCase()
      return `${c.first_name} ${c.last_name} ${c.email}`.toLowerCase().includes(s)
    }
    return true
  })

  const active_customers = customers.filter(c => !c.archived)

  const stats = {
    total: active_customers.length,
    active: active_customers.filter(c => c.active).length,
    qld: active_customers.filter(c => c.state === 'QLD').length,
    sa: active_customers.filter(c => c.state === 'SA').length,
    vehicles: active_customers.reduce((n, c) => n + (c.vehicles?.filter(v => !v.archived).length || 0), 0),
    priority: active_customers.filter(c => c.tier === 'priority' || c.state === 'SA').length,
    standard: active_customers.filter(c => c.tier === 'standard' && c.state !== 'SA').length,
    basic: active_customers.filter(c => c.tier === 'basic' && c.state !== 'SA').length,
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
        <div className='monitor-grid' style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12, marginBottom: 20 }}>
          {[{ label: 'QLD', count: monitorStatus?.qld_count }, { label: 'SA', count: monitorStatus?.sa_count }].map(m => (
            <div key={m.label} style={{
              background: 'var(--dark-2)', border: `1px solid ${monitorStatus ? '#2a4a2a' : 'var(--border)'}`,
              borderRadius: 10, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16,
            }}>
              <div style={{ position: 'relative' }}>
                <div style={{ width: 14, height: 14, borderRadius: '50%', background: monitorStatus ? '#5adb5a' : '#555' }} />
                {monitorStatus && (
                  <div style={{
                    position: 'absolute', top: 0, left: 0, width: 14, height: 14, borderRadius: '50%',
                    background: '#5adb5a', opacity: 0.4, animation: 'pulse 2s infinite',
                  }} />
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'Bebas Neue', fontSize: 15, letterSpacing: '0.05em', color: monitorStatus ? '#5adb5a' : 'var(--text-muted)' }}>
                  {m.label} MONITOR {monitorStatus ? '● ACTIVE' : '○ NO DATA'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  {monitorStatus ? `${m.count} customer(s) · Last run: ${monitorStatus.last_run}` : 'Waiting for first run...'}
                </div>
              </div>
            </div>
          ))}
        </div>

        <style>{`
          @keyframes pulse {
            0% { transform: scale(1); opacity: 0.4; }
            50% { transform: scale(2); opacity: 0; }
            100% { transform: scale(1); opacity: 0; }
          }
        `}</style>

        {/* Free Customers Panel */}
        <div style={{ marginBottom: 16 }}>
          <div onClick={() => setShowFreePanel(p => !p)} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'var(--dark-2)', border: '1px solid var(--border)',
            borderRadius: showFreePanel ? '10px 10px 0 0' : 10, padding: '12px 20px', cursor: 'pointer',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 16 }}>🎁</span>
              <div>
                <div style={{ fontFamily: 'Bebas Neue', fontSize: 16, letterSpacing: '0.05em' }}>FREE CUSTOMERS</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{freeList.length} email{freeList.length !== 1 ? 's' : ''} / phones whitelisted — auto Priority, no payment</div>
              </div>
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{showFreePanel ? '▲' : '▼'}</div>
          </div>
          {showFreePanel && (
            <div style={{ background: 'var(--dark-2)', border: '1px solid var(--border)', borderTop: 'none', borderRadius: '0 0 10px 10px', padding: '16px 20px' }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
                Add email addresses or phone numbers. When a matching customer registers, they are automatically set to <strong style={{ color: 'var(--gold)' }}>Priority</strong> and <strong style={{ color: '#5adb5a' }}>Active</strong> — no payment required.
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <input type="text" placeholder="email@example.com or 0412345678" value={newFreeEntry}
                  onChange={e => setNewFreeEntry(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addFreeEntry(newFreeEntry)}
                  style={{ flex: 1, padding: '8px 12px', borderRadius: 6, fontSize: 13 }} />
                <button onClick={() => addFreeEntry(newFreeEntry)}
                  style={{ padding: '8px 16px', borderRadius: 6, background: 'var(--gold)', border: 'none', color: '#000', fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans', fontSize: 13 }}>
                  + Add
                </button>
              </div>
              {freeList.length === 0 ? (
                <div style={{ fontSize: 12, color: '#555' }}>No free customers added yet</div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {freeList.map(entry => (
                    <div key={entry} style={{
                      display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px',
                      borderRadius: 20, fontSize: 12, background: 'var(--dark-3)',
                      border: '1px solid var(--gold)', color: 'var(--gold)',
                    }}>
                      🎁 {entry}
                      <span onClick={() => removeFreeEntry(entry)} style={{ cursor: 'pointer', color: '#ff6b6b', marginLeft: 2, fontWeight: 700 }}>×</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Pending Payment Section */}
        {pendingPayment.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div onClick={() => setShowPendingPanel(p => !p)} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: '#1a0808', border: '1px solid #4a2020',
              borderRadius: showPendingPanel ? '10px 10px 0 0' : 10, padding: '12px 20px', cursor: 'pointer',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 16 }}>⏳</span>
                <div>
                  <div style={{ fontFamily: 'Bebas Neue', fontSize: 16, letterSpacing: '0.05em', color: '#ff8888' }}>PENDING PAYMENT</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{pendingPayment.length} customer{pendingPayment.length !== 1 ? 's' : ''} registered but not yet paid</div>
                </div>
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{showPendingPanel ? '▲' : '▼'}</div>
            </div>
            {showPendingPanel && (
              <div style={{ background: '#120808', border: '1px solid #4a2020', borderTop: 'none', borderRadius: '0 0 10px 10px', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {pendingPayment.map(c => (
                  <div key={c.id} style={{ background: 'var(--dark-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
                      <div style={{
                        background: c.state === 'QLD' ? '#1a2a3a' : '#2a1a2a',
                        border: `1px solid ${c.state === 'QLD' ? '#2a3a4a' : '#3a2a3a'}`,
                        color: c.state === 'QLD' ? '#5ab0ff' : '#c080ff',
                        padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                      }}>{c.state}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{c.first_name} {c.last_name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.email} · {c.phone}</div>
                      </div>
                      <div style={{ fontSize: 11, color: TIER_CONFIG[c.tier]?.color }}>{TIER_CONFIG[c.tier]?.label}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(c.created_at).toLocaleDateString('en-AU')}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input
                        placeholder="Coupon code (optional)"
                        value={pendingCoupons[c.id] || ''}
                        onChange={e => setPendingCoupons(p => ({ ...p, [c.id]: e.target.value.toUpperCase() }))}
                        style={{ flex: 1, padding: '7px 12px', borderRadius: 6, fontSize: 12 }}
                      />
                      <button
                        onClick={() => sendStripeReminder(c, pendingCoupons[c.id] || '')}
                        disabled={sendingReminder === c.id}
                        style={{ padding: '7px 14px', borderRadius: 6, background: '#C9A84C', border: 'none', color: '#000', fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans', fontSize: 12, opacity: sendingReminder === c.id ? 0.6 : 1, whiteSpace: 'nowrap' }}
                      >{sendingReminder === c.id ? 'Sending...' : '📧 Send Link'}</button>
                      <button
                        onClick={() => deleteCustomer(c.id)}
                        style={{ padding: '7px 12px', borderRadius: 6, background: '#2a0a0a', border: '1px solid #4a1a1a', color: '#ff6b6b', cursor: 'pointer', fontFamily: 'DM Sans', fontSize: 12 }}
                      >🗑</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Auto payment email info */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20,
          background: 'var(--dark-2)', border: '1px solid #2a4a2a', borderRadius: 10, padding: '12px 20px',
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
                border: `1px solid ${c.vehicles?.some(v => v.booked_date && new Date(v.booked_date) < new Date(v.cutoff_date)) ? '#5adb5a' : 'var(--border)'}`,
                borderRadius: 10, overflow: 'hidden',
                boxShadow: c.vehicles?.some(v => v.booked_date && new Date(v.booked_date) < new Date(v.cutoff_date)) ? '0 0 12px rgba(90,219,90,0.15)' : 'none',
              }}>
                {/* Customer row */}
                <div className='customer-row' style={{
                  padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', cursor: 'pointer',
                }} onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}>
                  <div style={{
                    background: c.state === 'QLD' ? '#1a2a3a' : '#2a1a2a',
                    border: `1px solid ${c.state === 'QLD' ? '#2a3a4a' : '#3a2a3a'}`,
                    color: c.state === 'QLD' ? '#5ab0ff' : '#c080ff',
                    padding: '4px 10px', borderRadius: 4, fontSize: 12, fontWeight: 600, minWidth: 48, textAlign: 'center',
                  }}>{c.state}</div>
                  <div className='customer-name' style={{ flex: 1, minWidth: 140 }}>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{c.first_name} {c.last_name}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{c.email} · {c.phone}</div>
                  </div>
                  <div style={{ textAlign: 'center', minWidth: 60 }}>
                    <div style={{ fontFamily: 'Bebas Neue', fontSize: 22, color: 'var(--gold)' }}>{c.vehicles?.length || 0}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.08em' }}>VEHICLE{(c.vehicles?.length || 0) !== 1 ? 'S' : ''}</div>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', minWidth: 90, textAlign: 'right' }}>
                    {new Date(c.created_at).toLocaleDateString('en-AU')}
                  </div>
                  {c.state === 'QLD' && (
                    <div onClick={e => e.stopPropagation()}>
                      <select value={c.tier || 'standard'} onChange={e => updateTier(c.id, e.target.value)} style={{
                        padding: '4px 8px', fontSize: 12, borderRadius: 4,
                        background: TIER_CONFIG[c.tier || 'standard'].bg,
                        border: `1px solid ${TIER_CONFIG[c.tier || 'standard'].border}`,
                        color: TIER_CONFIG[c.tier || 'standard'].color,
                        cursor: 'pointer', minWidth: 110,
                      }}>
                        <option value="priority">🥇 Priority — $10</option>
                        <option value="standard">🥈 Standard — $7.50</option>
                        <option value="basic">🥉 Basic — $5</option>
                      </select>
                    </div>
                  )}
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
                  <div onClick={e => { e.stopPropagation(); toggleActive(c.id, c.active) }}>
                    <span className={`badge ${c.active ? 'badge-active' : 'badge-pending'}`} style={{ cursor: 'pointer' }}>
                      {c.active ? '● ACTIVE' : '○ PENDING'}
                    </span>
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{expandedId === c.id ? '▲' : '▼'}</div>
                </div>

                {/* Expanded detail */}
                {expandedId === c.id && (
                  <div style={{ borderTop: '1px solid var(--border)', padding: '20px' }}>
                    {/* Customer Details — view / edit */}
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <div className="section-label" style={{ marginBottom: 0 }}>Customer Details</div>
                        {editingCustomer === c.id ? (
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={() => saveCustomerEdits(c.id)} style={{ padding: '4px 12px', borderRadius: 6, background: 'var(--gold)', border: 'none', color: '#000', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'DM Sans' }}>✓ Save</button>
                            <button onClick={() => setEditingCustomer(null)} style={{ padding: '4px 12px', borderRadius: 6, background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer', fontFamily: 'DM Sans' }}>Cancel</button>
                          </div>
                        ) : (
                          <button onClick={() => { setEditingCustomer(c.id); setCustomerEdits(e => ({ ...e, [c.id]: { first_name: c.first_name, last_name: c.last_name, email: c.email, phone: c.phone, address: c.address, suburb: c.suburb, postcode: c.postcode, crn: c.crn, licence_number: c.licence_number, date_of_birth: c.date_of_birth } })) }} style={{ padding: '4px 12px', borderRadius: 6, background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer', fontFamily: 'DM Sans' }}>✏️ Edit</button>
                        )}
                      </div>
                      {editingCustomer === c.id ? (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8, fontSize: 13 }}>
                          {([
                            { label: 'First Name', field: 'first_name' },
                            { label: 'Last Name', field: 'last_name' },
                            { label: 'Email', field: 'email' },
                            { label: 'Phone', field: 'phone' },
                            { label: 'Address', field: 'address' },
                            { label: 'Suburb', field: 'suburb' },
                            { label: 'Postcode', field: 'postcode' },
                            { label: 'CRN', field: 'crn' },
                            { label: 'Licence No.', field: 'licence_number' },
                            { label: 'Date of Birth', field: 'date_of_birth' },
                          ] as { label: string; field: keyof Customer }[]).map(({ label, field }) => (
                            <div key={String(field)}>
                              <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>{label}</div>
                              <input
                                value={(customerEdits[c.id]?.[field] as string) || ''}
                                onChange={e => setCustomerEdits(eds => ({ ...eds, [c.id]: { ...eds[c.id], [field]: e.target.value } }))}
                                style={{ width: '100%', padding: '4px 8px', fontSize: 13, borderRadius: 4, boxSizing: 'border-box' }}
                              />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className='customer-detail-grid' style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, fontSize: 13 }}>
                          <div><span style={{ color: 'var(--text-muted)' }}>Address: </span>{c.address}, {c.suburb} {c.postcode}</div>
                          {c.crn && <div><span style={{ color: 'var(--text-muted)' }}>CRN: </span>{c.crn}</div>}
                          {c.licence_number && <div><span style={{ color: 'var(--text-muted)' }}>Licence: </span>{c.licence_number}</div>}
                          {c.date_of_birth && <div><span style={{ color: 'var(--text-muted)' }}>DOB: </span>{c.date_of_birth}</div>}
                        </div>
                      )}
                    </div>

                    <div className="section-label" style={{ marginBottom: 12 }}>Vehicles</div>
                    {c.vehicles?.filter(v => !v.archived).map(v => (
                      <div key={v.id} style={{
                        background: (v.booked_date && new Date(v.booked_date) < new Date(v.cutoff_date)) ? '#0d1f0d' : 'var(--dark-3)',
                        border: `1px solid ${(v.booked_date && new Date(v.booked_date) < new Date(v.cutoff_date)) ? '#2a4a2a' : 'var(--border)'}`,
                        borderRadius: 8, padding: '14px 16px', marginBottom: 8,
                      }}>
                        {/* Vehicle header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, gap: 8 }}>
                          <div style={{ flex: 1 }}>
                            {editingVehicle === v.id ? (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'flex-end' }}>
                                {([
                                  { label: 'Make', field: 'make', width: 80 },
                                  { label: 'Model', field: 'model', width: 100 },
                                  { label: 'Year', field: 'year', width: 60 },
                                  { label: 'Colour', field: 'colour', width: 80 },
                                  { label: 'VIN', field: 'vin', width: 160 },
                                  { label: 'Label/Nickname', field: 'label', width: 130 },
                                  { label: 'Purchased From', field: 'purchased_from', width: 150 },
                                ] as { label: string; field: keyof Vehicle; width: number }[]).map(({ label, field, width }) => (
                                  <div key={String(field)}>
                                    <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>{label}</div>
                                    <input
                                      value={(vehicleEdits[v.id]?.[field] as string) || ''}
                                      onChange={e => setVehicleEdits(eds => ({ ...eds, [v.id]: { ...eds[v.id], [field]: e.target.value } }))}
                                      style={{ width, padding: '3px 6px', fontSize: 12, borderRadius: 4 }}
                                    />
                                  </div>
                                ))}
                                {([
                                  { label: 'Vehicle Type', field: 'vehicle_type', width: 120, options: ['Car','Motorcycle','Truck','Trailer','Caravan'] },
                                  { label: 'Build Month', field: 'build_month', width: 100, options: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'] },
                                  { label: 'Damage', field: 'damage', width: 200, options: ['HAIL DAMAGE','WATER DAMAGE','MALICIOUS DAMAGE','FIRE DAMAGE','STRUCTURAL DAMAGE','IMPACT DAMAGE DRIVERS FRONT','IMPACT DAMAGE PASSENGER FRONT','IMPACT DAMAGE DRIVERS SIDE','IMPACT DAMAGE PASSENGER SIDE','IMPACT DAMAGE DRIVERS REAR','IMPACT DAMAGE PASSENGER REAR','OTHER'] },
                                  { label: 'Purchase Method', field: 'purchase_method', width: 140, options: ['Auction','Private Sale','Insurance','Other'] },
                                ] as { label: string; field: keyof Vehicle; width: number; options: string[] }[]).map(({ label, field, width, options }) => (
                                  <div key={String(field)}>
                                    <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>{label}</div>
                                    <select
                                      value={(vehicleEdits[v.id]?.[field] as string) || ''}
                                      onChange={e => setVehicleEdits(eds => ({ ...eds, [v.id]: { ...eds[v.id], [field]: e.target.value } }))}
                                      style={{ width, padding: '3px 6px', fontSize: 12, borderRadius: 4, background: 'var(--dark-3)', border: '1px solid var(--border)', color: 'var(--text)' }}
                                    >
                                      <option value="">— Select —</option>
                                      {options.map(o => <option key={o} value={o}>{o}</option>)}
                                    </select>
                                  </div>
                                ))}
                                <div style={{ display: 'flex', gap: 6 }}>
                                  <button onClick={() => saveVehicleEdits(v.id)} style={{ padding: '4px 10px', borderRadius: 6, background: 'var(--gold)', border: 'none', color: '#000', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'DM Sans' }}>✓ Save</button>
                                  <button onClick={() => setEditingVehicle(null)} style={{ padding: '4px 8px', borderRadius: 6, background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer', fontFamily: 'DM Sans' }}>✕</button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div style={{ fontWeight: 600, fontSize: 14 }}>{v.label ? `${v.label} — ` : ''}{v.make} {v.model} {v.year}{v.vehicle_type ? ` (${v.vehicle_type})` : ''}</div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>VIN: {v.vin}{v.colour ? ` · ${v.colour}` : ''}{v.build_month ? ` · Built: ${v.build_month}` : ''}</div>
                                {(v.damage || v.purchase_method || v.purchased_from) && (
                                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                                    {[v.damage && `Damage: ${v.damage}`, v.purchase_method && `Purchased: ${v.purchase_method}`, v.purchased_from && `From: ${v.purchased_from}`].filter(Boolean).join(' · ')}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                            {editingVehicle !== v.id && (
                              <button onClick={() => { setEditingVehicle(v.id); setVehicleEdits(eds => ({ ...eds, [v.id]: { make: v.make, model: v.model, year: v.year, colour: v.colour || '', vin: v.vin, label: v.label || '', vehicle_type: v.vehicle_type || '', build_month: v.build_month || '', damage: v.damage || '', purchase_method: v.purchase_method || '', purchased_from: v.purchased_from || '' } })) }} style={{ padding: '3px 8px', borderRadius: 4, background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 11, cursor: 'pointer', fontFamily: 'DM Sans' }}>✏️</button>
                            )}
                            <div onClick={() => toggleVehicle(v.id, v.active)} style={{ cursor: 'pointer' }}>
                              <span className={`badge ${v.active ? 'badge-active' : 'badge-inactive'}`}>
                                {v.active ? '● ON' : '○ OFF'}
                              </span>
                            </div>
                            <button onClick={() => archiveVehicle(v.id, !!v.archived)} title="Archive vehicle" style={{
                              padding: '3px 8px', borderRadius: 4, background: 'none',
                              border: '1px solid #4a3a1a', color: '#C9A84C', fontSize: 11,
                              cursor: 'pointer', fontFamily: 'DM Sans',
                            }}>📦</button>
                          </div>
                        </div>

                        {/* Booking info grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
                          {/* Cutoff Date */}
                          <div style={{ background: 'var(--dark-4)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ color: 'var(--text-muted)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Cutoff Date</div>
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4 }}>
                              <input type="date" defaultValue={v.cutoff_date} id={`cutoff-${v.id}`} style={{ flex: 1, padding: '4px 8px', fontSize: 13 }} />
                              <button onClick={async (e) => {
                                const el = document.getElementById(`cutoff-${v.id}`) as HTMLInputElement
                                const btn = e.currentTarget as HTMLButtonElement
                                if (el && el.value) {
                                  await updateCutoff(v.id, el.value, v.cutoff_date)
                                  btn.textContent = '✅'; btn.style.background = '#5adb5a'
                                  setTimeout(() => { btn.textContent = '✓ Save'; btn.style.background = 'var(--gold)' }, 1500)
                                }
                              }} style={{
                                padding: '4px 10px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
                                background: 'var(--gold)', border: 'none', color: '#000', fontWeight: 700,
                                fontFamily: 'DM Sans', whiteSpace: 'nowrap', transition: 'all 0.2s',
                              }}>✓ Save</button>
                            </div>
                            {v.previous_cutoff && (
                              <div style={{ fontSize: 11, color: '#555' }}>Was: <span style={{ textDecoration: 'line-through' }}>{v.previous_cutoff}</span></div>
                            )}
                          </div>

                          {/* Booked slot */}
                          {v.booked_date ? (
                            <div style={{ background: '#1a2a1a', border: '1px solid #2a4a2a', borderRadius: 6, padding: '10px 12px' }}>
                              <div style={{ color: '#5adb5a', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>✅ New Booking Found</div>
                              <div style={{ fontSize: 14, color: '#fff', fontWeight: 600, marginBottom: 4 }}>
                                {(() => { const [y,m,d] = v.booked_date.split('-'); return d && m && y ? `${d}/${m}/${y}` : v.booked_date })()}
                              </div>
                              {v.booked_time && <div style={{ fontSize: 13, color: '#5ab0ff', marginBottom: 2 }}>⏰ {v.booked_time}</div>}
                              {v.booked_location && <div style={{ fontSize: 13, color: '#5ab0ff' }}>📍 {v.booked_location}</div>}
                              {!v.booked_time && !v.booked_location && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Time/location updating next run</div>}
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

                        {/* Manual Booking Entry — admin only */}
                        <div style={{ marginTop: 10, background: 'var(--dark-4)', border: '1px solid var(--border)', borderRadius: 6, padding: '10px 12px' }}>
                          <div style={{ color: 'var(--text-muted)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
                            ✏️ Admin — Manual Booking Entry
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 6, alignItems: 'center' }}>
                            <input
                              type="date"
                              id={`manual-date-${v.id}`}
                              defaultValue={v.booked_date || ''}
                              placeholder="Date"
                              style={{ padding: '4px 8px', fontSize: 12 }}
                            />
                            <input
                              type="text"
                              id={`manual-time-${v.id}`}
                              defaultValue={v.booked_time || ''}
                              placeholder="Time (e.g. 9:00 am)"
                              style={{ padding: '4px 8px', fontSize: 12 }}
                            />
                            <input
                              type="text"
                              id={`manual-loc-${v.id}`}
                              defaultValue={v.booked_location || ''}
                              placeholder="Location"
                              style={{ padding: '4px 8px', fontSize: 12 }}
                            />
                            <button
                              onClick={async (e) => {
                                const dateEl = document.getElementById(`manual-date-${v.id}`) as HTMLInputElement
                                const timeEl = document.getElementById(`manual-time-${v.id}`) as HTMLInputElement
                                const locEl  = document.getElementById(`manual-loc-${v.id}`) as HTMLInputElement
                                const btn = e.currentTarget as HTMLButtonElement
                                await updateManualBooking(v.id, dateEl?.value || '', timeEl?.value || '', locEl?.value || '')
                                btn.textContent = '✅'
                                btn.style.background = '#5adb5a'
                                setTimeout(() => { btn.textContent = '✓ Save'; btn.style.background = 'var(--gold)' }, 1500)
                              }}
                              style={{
                                padding: '4px 10px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
                                background: 'var(--gold)', border: 'none', color: '#000', fontWeight: 700,
                                fontFamily: 'DM Sans', whiteSpace: 'nowrap',
                              }}
                            >✓ Save</button>
                          </div>
                          <div style={{ fontSize: 11, color: '#555', marginTop: 6 }}>
                            Manually record a booking the system didn&apos;t make — shows in the green booking card above
                          </div>
                        </div>

                        {/* Search After Date — admin only */}
                        <div style={{
                          marginTop: 10,
                          background: v.search_after_active ? '#1a1500' : 'var(--dark-4)',
                          border: `1px solid ${v.search_after_active ? '#C9A84C' : 'var(--border)'}`,
                          borderRadius: 6, padding: '10px 12px',
                          transition: 'all 0.2s',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                            <div style={{ color: v.search_after_active ? '#C9A84C' : 'var(--text-muted)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                              🔬 Admin — Search After Date
                            </div>
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                              {/* ON/OFF toggle */}
                              <div
                                onClick={() => updateSearchAfter(v.id, v.search_after_date || null, !v.search_after_active)}
                                style={{
                                  cursor: 'pointer', fontSize: 11, padding: '2px 10px', borderRadius: 20,
                                  background: v.search_after_active ? '#2a2000' : 'var(--dark-3)',
                                  border: `1px solid ${v.search_after_active ? '#C9A84C' : 'var(--border)'}`,
                                  color: v.search_after_active ? '#C9A84C' : 'var(--text-muted)',
                                  transition: 'all 0.2s', userSelect: 'none',
                                }}
                              >
                                {v.search_after_active ? '● ON' : '○ OFF'}
                              </div>
                              {/* Clear button — only when active */}
                              {v.search_after_active && (
                                <div
                                  onClick={() => updateSearchAfter(v.id, null, false)}
                                  style={{
                                    cursor: 'pointer', fontSize: 11, padding: '2px 8px', borderRadius: 20,
                                    background: 'none', border: '1px solid #4a1a1a',
                                    color: '#ff6b6b', userSelect: 'none',
                                  }}
                                >✕ Clear</div>
                              )}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <input
                              type="date"
                              id={`after-${v.id}`}
                              defaultValue={v.search_after_date || ''}
                              style={{ flex: 1, padding: '4px 8px', fontSize: 13, opacity: v.search_after_active ? 1 : 0.5 }}
                            />
                            <button
                              onClick={async (e) => {
                                const el = document.getElementById(`after-${v.id}`) as HTMLInputElement
                                const btn = e.currentTarget as HTMLButtonElement
                                if (el) {
                                  await updateSearchAfter(v.id, el.value || null, v.search_after_active ?? false)
                                  btn.textContent = '✅'; btn.style.background = '#5adb5a'
                                  setTimeout(() => { btn.textContent = '✓ Save'; btn.style.background = 'var(--gold)' }, 1500)
                                }
                              }}
                              style={{
                                padding: '4px 10px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
                                background: 'var(--gold)', border: 'none', color: '#000', fontWeight: 700,
                                fontFamily: 'DM Sans', whiteSpace: 'nowrap',
                              }}
                            >✓ Save</button>
                          </div>
                          <div style={{ fontSize: 11, marginTop: 6, color: v.search_after_active && v.search_after_date ? '#C9A84C' : '#555' }}>
                            {v.search_after_active && v.search_after_date
                              ? `Only searching slots after ${v.search_after_date.split('-').reverse().join('/')}`
                              : 'Off — searching all slots before cutoff'}
                          </div>
                        </div>

                        {/* Priority Locations */}
                        {v.state === 'QLD' && (
                          <div style={{ marginTop: 10, padding: '10px 12px', background: 'var(--dark-4)', borderRadius: 6, border: '1px solid var(--border)' }}>
                            <div style={{ color: 'var(--gold)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>🥇 Priority Locations</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 6 }}>
                              {([0, 1] as const).map(idx => {
                                const slotLabel = idx === 0 ? 'Priority 1' : 'Priority 2'
                                const currentVal = (v.priority_locations || [])[idx] || ''
                                const otherVal = (v.priority_locations || [])[1 - idx] || ''
                                return (
                                  <div key={idx}>
                                    <div style={{ fontSize: 10, color: idx === 0 ? 'var(--gold)' : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                                      {idx === 0 ? '🥇' : '🥈'} {slotLabel}
                                    </div>
                                    <select
                                      value={currentVal}
                                      onChange={e => {
                                        const newLoc = e.target.value
                                        const current = [...(v.priority_locations || [])]
                                        if (newLoc) { current[idx] = newLoc } else { current.splice(idx, 1) }
                                        updatePriorityLocations(v.id, current.filter(Boolean))
                                      }}
                                      style={{
                                        width: '100%', padding: '5px 8px', fontSize: 12, borderRadius: 4, cursor: 'pointer',
                                        background: currentVal ? '#2a2000' : 'var(--dark-3)',
                                        border: `1px solid ${currentVal ? 'var(--gold)' : 'var(--border)'}`,
                                        color: currentVal ? 'var(--gold)' : 'var(--text-muted)',
                                      }}
                                    >
                                      <option value="">— None —</option>
                                      {['Brisbane','Bundaberg','Burleigh Heads','Cairns','Mackay','Narangba','Rockhampton City','Toowoomba','Townsville','Yatala']
                                        .filter(loc => loc !== otherVal || loc === currentVal)
                                        .map(loc => <option key={loc} value={loc}>{loc}</option>)
                                      }
                                    </select>
                                  </div>
                                )
                              })}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                              {(v.priority_locations || []).filter(Boolean).length === 0
                                ? 'No priority set — books earliest slot at any location'
                                : `Checks in order: ${(v.priority_locations || []).filter(Boolean).join(' → ')} → then any remaining`
                              }
                            </div>
                          </div>
                        )}

                        {/* Locations Checklist */}
                        {v.state === 'QLD' && (
                          <div style={{ marginTop: 10, padding: '10px 12px', background: 'var(--dark-4)', borderRadius: 6, border: '1px solid var(--border)' }}>
                            <div style={{ color: 'var(--text-muted)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>📍 Locations to Search</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                              {['Brisbane','Bundaberg','Burleigh Heads','Cairns','Mackay','Narangba','Rockhampton City','Toowoomba','Townsville','Yatala'].map(loc => {
                                const allLocs = v.locations && v.locations.length > 0 ? v.locations : ['Brisbane','Bundaberg','Burleigh Heads','Cairns','Mackay','Narangba','Rockhampton City','Toowoomba','Townsville','Yatala']
                                const checked = allLocs.includes(loc)
                                return (
                                  <div key={loc} onClick={() => {
                                    const current = v.locations && v.locations.length > 0 ? v.locations : ['Brisbane','Bundaberg','Burleigh Heads','Cairns','Mackay','Narangba','Rockhampton City','Toowoomba','Townsville','Yatala']
                                    const updated = checked ? current.filter(l => l !== loc) : [...current, loc]
                                    updateLocations(v.id, updated)
                                  }} style={{
                                    display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px',
                                    borderRadius: 20, fontSize: 11, cursor: 'pointer', userSelect: 'none',
                                    background: checked ? '#1a2a1a' : 'transparent',
                                    border: `1px solid ${checked ? '#2a4a2a' : 'var(--border)'}`,
                                    color: checked ? '#5adb5a' : 'var(--text-muted)',
                                    transition: 'all 0.15s',
                                  }}>
                                    <span>{checked ? '✓' : '○'}</span> {loc}
                                  </div>
                                )
                              })}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                              {!v.locations || v.locations.length === 0
                                ? 'All locations enabled (default)'
                                : `Searching ${v.locations.length} location${v.locations.length !== 1 ? 's' : ''}`
                              }
                            </div>
                          </div>
                        )}

                        {/* Admin Notes */}
                        <div style={{ marginTop: 10, padding: '10px 12px', background: 'var(--dark-4)', borderRadius: 6, border: '1px solid var(--border)' }}>
                          <div style={{ color: 'var(--text-muted)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>📝 Admin Notes</div>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <textarea
                              id={`notes-${v.id}`}
                              defaultValue={v.notes || ''}
                              placeholder="Add private notes about this vehicle..."
                              rows={3}
                              style={{
                                flex: 1, padding: '6px 8px', fontSize: 13, borderRadius: 4,
                                resize: 'vertical', fontFamily: 'DM Sans', lineHeight: 1.5,
                                background: 'var(--dark-3)', border: '1px solid var(--border)', color: 'var(--text)',
                              }}
                            />
                            <button
                              onClick={async (e) => {
                                const el = document.getElementById(`notes-${v.id}`) as HTMLTextAreaElement
                                const btn = e.currentTarget as HTMLButtonElement
                                await updateNotes(v.id, el?.value || '')
                                btn.textContent = '✅'; btn.style.background = '#5adb5a'
                                setTimeout(() => { btn.textContent = '✓ Save'; btn.style.background = 'var(--gold)' }, 1500)
                              }}
                              style={{
                                padding: '4px 10px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
                                background: 'var(--gold)', border: 'none', color: '#000', fontWeight: 700,
                                fontFamily: 'DM Sans', whiteSpace: 'nowrap', alignSelf: 'flex-start',
                              }}
                            >✓ Save</button>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Archived Vehicles (within this customer) */}
                    {c.vehicles?.some(v => v.archived) && (
                      <div style={{ marginTop: 16, padding: '12px 14px', background: '#1a1200', border: '1px solid #4a3a00', borderRadius: 8 }}>
                        <div style={{ fontSize: 11, color: '#C9A84C', fontWeight: 700, letterSpacing: '0.08em', marginBottom: 10 }}>📦 ARCHIVED VEHICLES</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {c.vehicles.filter(v => v.archived).map(v => (
                            <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                              <div>
                                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{v.label || `${v.make} ${v.model} ${v.year}`}</span>
                                {v.booked_date && <span style={{ marginLeft: 10, fontSize: 12, color: '#5adb5a' }}>✓ Booked {v.booked_date}{v.booked_time ? ` at ${v.booked_time}` : ''}{v.booked_location ? ` — ${v.booked_location}` : ''}</span>}
                              </div>
                              <button onClick={() => archiveVehicle(v.id, true)} style={{
                                padding: '3px 10px', borderRadius: 4, background: 'none',
                                border: '1px solid #2a4a2a', color: '#5adb5a',
                                cursor: 'pointer', fontSize: 11, fontFamily: 'DM Sans',
                              }}>↩ Unarchive</button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className='actions-row' style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      {!c.active ? (
                        <button onClick={() => sendPaymentRequest(c)} style={{
                          background: 'var(--gold)', color: '#000', border: 'none',
                          padding: '10px 20px', borderRadius: 6, cursor: 'pointer',
                          fontFamily: 'Bebas Neue', fontSize: 15, letterSpacing: '0.1em',
                        }}>📧 SEND PAYMENT REQUEST</button>
                      ) : (
                        <div style={{ fontSize: 13, color: '#5adb5a' }}>✅ Customer is active — monitoring running</div>
                      )}
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => archiveCustomer(c.id, !!c.archived)} style={{
                          background: 'none', border: '1px solid #4a3a1a', color: '#C9A84C',
                          padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontFamily: 'DM Sans',
                        }}>📦 Archive Customer</button>
                        <button onClick={() => deleteCustomer(c.id)} style={{
                          background: 'none', border: '1px solid #4a1a1a', color: '#ff6b6b',
                          padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontFamily: 'DM Sans',
                        }}>Delete Customer</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Archived Section */}
        {archived.length > 0 && (
          <div style={{ marginTop: 40 }}>
            <button
              onClick={() => setShowArchivedPanel(p => !p)}
              style={{
                width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: 'var(--dark-2)', border: '1px solid #4a3a1a', borderRadius: 10,
                padding: '14px 20px', cursor: 'pointer', color: '#C9A84C', fontFamily: 'Bebas Neue',
                fontSize: 18, letterSpacing: '0.08em',
              }}
            >
              <span>📦 ARCHIVED ({archived.length})</span>
              <span style={{ fontSize: 14 }}>{showArchivedPanel ? '▲ HIDE' : '▼ SHOW'}</span>
            </button>

            {showArchivedPanel && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                {archived.map(c => (
                  <div key={c.id} style={{
                    background: 'var(--dark-2)', border: '1px solid #3a2a0a',
                    borderRadius: 10, overflow: 'hidden', opacity: 0.85,
                  }}>
                    {/* Header row — clickable to expand */}
                    <div
                      className='customer-row'
                      style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', cursor: 'pointer' }}
                      onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
                    >
                      <div style={{
                        background: c.state === 'QLD' ? '#1a2a3a' : '#2a1a2a',
                        border: `1px solid ${c.state === 'QLD' ? '#2a3a4a' : '#3a2a3a'}`,
                        color: c.state === 'QLD' ? '#5ab0ff' : '#c080ff',
                        padding: '4px 10px', borderRadius: 4, fontSize: 12, fontWeight: 600,
                      }}>{c.state}</div>
                      <div className='customer-name' style={{ flex: 1, minWidth: 140 }}>
                        <div style={{ fontWeight: 600, fontSize: 15 }}>{c.first_name} {c.last_name}</div>
                        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{c.email} · {c.phone}</div>
                      </div>
                      <div style={{ textAlign: 'center', minWidth: 60 }}>
                        <div style={{ fontFamily: 'Bebas Neue', fontSize: 22, color: 'var(--gold)' }}>{c.vehicles?.length || 0}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.08em' }}>VEHICLE{(c.vehicles?.length || 0) !== 1 ? 'S' : ''}</div>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', minWidth: 90, textAlign: 'right' }}>
                        {new Date(c.created_at).toLocaleDateString('en-AU')}
                      </div>
                      <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: '#1a1200', border: '1px solid #4a3a00', color: '#C9A84C' }}>📦 ARCHIVED</span>
                      <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{expandedId === c.id ? '▲' : '▼'}</div>
                    </div>

                    {/* Expanded detail — same as main list */}
                    {expandedId === c.id && (
                      <div style={{ borderTop: '1px solid var(--border)', padding: '20px' }}>
                        {/* Customer Details */}
                        <div style={{ marginBottom: 20 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <div className="section-label" style={{ marginBottom: 0 }}>Customer Details</div>
                            {editingCustomer === c.id ? (
                              <div style={{ display: 'flex', gap: 8 }}>
                                <button onClick={() => saveCustomerEdits(c.id)} style={{ padding: '4px 12px', borderRadius: 6, background: 'var(--gold)', border: 'none', color: '#000', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'DM Sans' }}>✓ Save</button>
                                <button onClick={() => setEditingCustomer(null)} style={{ padding: '4px 12px', borderRadius: 6, background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer', fontFamily: 'DM Sans' }}>Cancel</button>
                              </div>
                            ) : (
                              <button onClick={() => { setEditingCustomer(c.id); setCustomerEdits(e => ({ ...e, [c.id]: { first_name: c.first_name, last_name: c.last_name, email: c.email, phone: c.phone, address: c.address, suburb: c.suburb, postcode: c.postcode, crn: c.crn, licence_number: c.licence_number, date_of_birth: c.date_of_birth } })) }} style={{ padding: '4px 12px', borderRadius: 6, background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer', fontFamily: 'DM Sans' }}>✏️ Edit</button>
                            )}
                          </div>
                          {editingCustomer === c.id ? (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8, fontSize: 13 }}>
                              {([
                                { label: 'First Name', field: 'first_name' },
                                { label: 'Last Name', field: 'last_name' },
                                { label: 'Email', field: 'email' },
                                { label: 'Phone', field: 'phone' },
                                { label: 'Address', field: 'address' },
                                { label: 'Suburb', field: 'suburb' },
                                { label: 'Postcode', field: 'postcode' },
                                { label: 'CRN', field: 'crn' },
                                { label: 'Licence No.', field: 'licence_number' },
                                { label: 'Date of Birth', field: 'date_of_birth' },
                              ] as { label: string; field: keyof Customer }[]).map(({ label, field }) => (
                                <div key={String(field)}>
                                  <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>{label}</div>
                                  <input
                                    value={(customerEdits[c.id]?.[field] as string) || ''}
                                    onChange={e => setCustomerEdits(eds => ({ ...eds, [c.id]: { ...eds[c.id], [field]: e.target.value } }))}
                                    style={{ width: '100%', padding: '4px 8px', fontSize: 13, borderRadius: 4, boxSizing: 'border-box' }}
                                  />
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className='customer-detail-grid' style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, fontSize: 13 }}>
                              <div><span style={{ color: 'var(--text-muted)' }}>Address: </span>{c.address}, {c.suburb} {c.postcode}</div>
                              {c.crn && <div><span style={{ color: 'var(--text-muted)' }}>CRN: </span>{c.crn}</div>}
                              {c.licence_number && <div><span style={{ color: 'var(--text-muted)' }}>Licence: </span>{c.licence_number}</div>}
                              {c.date_of_birth && <div><span style={{ color: 'var(--text-muted)' }}>DOB: </span>{c.date_of_birth}</div>}
                            </div>
                          )}
                        </div>

                        <div className="section-label" style={{ marginBottom: 12 }}>Vehicles</div>
                        {c.vehicles?.map(v => (
                          <div key={v.id} style={{
                            background: v.booked_date ? '#0d1f0d' : 'var(--dark-3)',
                            border: `1px solid ${v.booked_date ? '#2a4a2a' : 'var(--border)'}`,
                            borderRadius: 8, padding: '14px 16px', marginBottom: 8,
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, gap: 8 }}>
                              <div>
                                <div style={{ fontWeight: 600, fontSize: 14 }}>{v.label || `${v.make} ${v.model} ${v.year}`}</div>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{v.make} {v.model} · {v.year} · {v.colour} · VIN: {v.vin}</div>
                              </div>
                              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                                {v.archived ? (
                                  <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 4, background: '#1a1200', border: '1px solid #4a3a00', color: '#C9A84C' }}>📦 ARCHIVED</span>
                                ) : (
                                  <span className={`badge ${v.active ? 'badge-active' : 'badge-inactive'}`}>{v.active ? '● ON' : '○ OFF'}</span>
                                )}
                                <button onClick={() => archiveVehicle(v.id, !!v.archived)} title={v.archived ? 'Unarchive vehicle' : 'Archive vehicle'} style={{
                                  padding: '3px 8px', borderRadius: 4, background: 'none',
                                  border: `1px solid ${v.archived ? '#2a4a2a' : '#4a3a1a'}`,
                                  color: v.archived ? '#5adb5a' : '#C9A84C',
                                  fontSize: 11, cursor: 'pointer', fontFamily: 'DM Sans',
                                }}>{v.archived ? '↩ Unarchive' : '📦'}</button>
                              </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8, fontSize: 12 }}>
                              <div style={{ background: 'var(--dark-4)', borderRadius: 6, padding: '8px 10px' }}>
                                <div style={{ color: 'var(--text-muted)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Original Booking</div>
                                <div style={{ fontWeight: 600 }}>{v.cutoff_date || '—'}</div>
                              </div>
                              {v.booked_date && (
                                <div style={{ background: '#0a1f0a', borderRadius: 6, padding: '8px 10px', border: '1px solid #2a4a2a' }}>
                                  <div style={{ color: '#5adb5a', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>✅ Booked</div>
                                  <div style={{ fontWeight: 600, color: '#5adb5a' }}>{v.booked_date}{v.booked_time ? ` · ${v.booked_time}` : ''}</div>
                                  {v.booked_location && <div style={{ color: 'var(--text-muted)', marginTop: 2 }}>{v.booked_location}</div>}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}

                        {/* Actions */}
                        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <button onClick={() => archiveCustomer(c.id, true)} style={{
                            background: 'none', border: '1px solid #2a4a2a', color: '#5adb5a',
                            padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontFamily: 'DM Sans',
                          }}>↩ Unarchive Customer</button>
                          <button onClick={() => deleteCustomer(c.id)} style={{
                            background: 'none', border: '1px solid #4a1a1a', color: '#ff6b6b',
                            padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontFamily: 'DM Sans',
                          }}>Delete Customer</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </main>
  )
}
