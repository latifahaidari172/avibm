'use client'
import { useState, useEffect } from 'react'

import Link from 'next/link'

type Customer = {
  id: string
  created_at: string
  active: boolean
  archived?: boolean
  pending_deletion?: boolean
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

type AdminLog = { id: string; created_at: string; action: string; details: string | null; admin_username: string | null }
type AdminUser = { id: string; created_at: string; username: string; role: string; active: boolean }
type BotInstance = { id: string; hostname: string; display_name?: string; last_seen: string; enabled: boolean; status: string; created_at: string }

export default function Admin() {
  const [authed, setAuthed] = useState(() => typeof window !== 'undefined' && !!localStorage.getItem('avibm_admin_user'))
  const [authedAdmin, setAuthedAdmin] = useState<{ id: string; username: string; role: string } | null>(() => {
    if (typeof window === 'undefined') return null
    try { return JSON.parse(localStorage.getItem('avibm_admin_user') || 'null') } catch { return null }
  })
  const [username, setUsername] = useState('')
  const [pw, setPw] = useState('')
  const [pwError, setPwError] = useState('')
  const [adminLogs, setAdminLogs] = useState<AdminLog[]>([])
  const [showLogsPanel, setShowLogsPanel] = useState(true)
  const [admins, setAdmins] = useState<AdminUser[]>([])
  const [showAdminPanel, setShowAdminPanel] = useState(false)
  const [selectedAdmin, setSelectedAdmin] = useState<AdminUser | null>(null)
  const [addingAdmin, setAddingAdmin] = useState(false)
  const [newAdminForm, setNewAdminForm] = useState({ username: '', password: '' })
  const [showMenu, setShowMenu] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [settingsForm, setSettingsForm] = useState({ username: '', newPassword: '', confirmPassword: '' })
  const [settingsError, setSettingsError] = useState('')
  const [settingsSuccess, setSettingsSuccess] = useState(false)

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
  const [botInstances, setBotInstances] = useState<BotInstance[]>([])
  const [showDevicesPanel, setShowDevicesPanel] = useState(true)
  const [editingDeviceName, setEditingDeviceName] = useState<string | null>(null)
  const [deviceNameDraft, setDeviceNameDraft] = useState('')

  const isOwner = authedAdmin?.role === 'owner'

  const login = async () => {
    if (!username.trim()) { setPwError('Enter your username'); return }
    if (!pw.trim()) { setPwError('Enter your password'); return }
    setPwError('')
    try {
      const res = await fetch('/api/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password: pw.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setPwError(data.error || 'Incorrect username or password'); return }
      const adminUser = { id: data.id, username: data.username, role: data.role }
      localStorage.setItem('avibm_admin_last_seen', new Date().toISOString())
      localStorage.setItem('avibm_admin_user', JSON.stringify(adminUser))
      setAuthedAdmin(adminUser)
      setAuthed(true)
      loadData()
      if (data.role === 'owner') { loadLogs(); loadAdmins() }
    } catch (e) {
      setPwError('Connection error — try again')
    }
  }

  const loadLogs = async (filterUsername?: string) => {
    const url = filterUsername
      ? `/api/admin-logs?username=${encodeURIComponent(filterUsername)}`
      : '/api/admin-logs'
    const res = await fetch(url)
    if (res.ok) { const data = await res.json(); if (Array.isArray(data)) setAdminLogs(data) }
  }

  const loadAdmins = async () => {
    const res = await fetch('/api/admin-login?action=list')
    if (res.ok) { const data = await res.json(); setAdmins(data) }
  }

  const loadBotInstances = async () => {
    const res = await fetch('/api/bot-control')
    if (res.ok) { const data = await res.json(); if (Array.isArray(data)) setBotInstances(data) }
  }

  const toggleBotInstance = async (id: string, enabled: boolean) => {
    await fetch('/api/bot-control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, enabled }),
    })
    setBotInstances(bs => bs.map(b => b.id === id ? { ...b, enabled } : b))
  }

  const renameDevice = async (id: string, display_name: string) => {
    await fetch('/api/bot-control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, display_name: display_name.trim() || null }),
    })
    setBotInstances(bs => bs.map(b => b.id === id ? { ...b, display_name: display_name.trim() || undefined } : b))
    setEditingDeviceName(null)
  }

  const deleteDevice = async (id: string, name: string) => {
    if (!confirm(`Remove "${name}" from the device list?`)) return
    await fetch('/api/bot-control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'delete' }),
    })
    setBotInstances(bs => bs.filter(b => b.id !== id))
  }

  const addAdmin = async () => {
    if (!newAdminForm.username.trim() || !newAdminForm.password.trim()) return
    await fetch('/api/admin-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add', username: newAdminForm.username.trim(), password: newAdminForm.password.trim() }),
    })
    setNewAdminForm({ username: '', password: '' })
    setAddingAdmin(false)
    loadAdmins()
  }

  const removeAdmin = async (id: string) => {
    if (!confirm('Remove this admin?')) return
    await fetch('/api/admin-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'remove', id }),
    })
    loadAdmins()
    if (selectedAdmin?.id === id) setSelectedAdmin(null)
  }

  const logAction = async (action: string, details?: string) => {
    if (isOwner || !authedAdmin) return
    await fetch('/api/admin-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, details: details || null, admin_username: authedAdmin.username }),
    })
  }

  const logout = () => {
    localStorage.removeItem('avibm_admin_user')
    localStorage.removeItem('avibm_admin_last_seen')
    setAuthed(false)
    setAuthedAdmin(null)
    setShowMenu(false)
  }

  const changeCredentials = async () => {
    setSettingsError('')
    setSettingsSuccess(false)
    if (!settingsForm.username.trim() && !settingsForm.newPassword.trim()) {
      setSettingsError('Enter a new username or password'); return
    }
    if (settingsForm.newPassword && settingsForm.newPassword !== settingsForm.confirmPassword) {
      setSettingsError('Passwords do not match'); return
    }
    const updates: Record<string, string> = {}
    if (settingsForm.username.trim()) updates.username = settingsForm.username.trim()
    if (settingsForm.newPassword.trim()) updates.password = settingsForm.newPassword.trim()
    await fetch('/api/admin-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update', id: authedAdmin!.id, updates }),
    })
    if (updates.username) {
      const updated = { ...authedAdmin!, username: updates.username }
      setAuthedAdmin(updated)
      localStorage.setItem('avibm_admin_user', JSON.stringify(updated))
    }
    setSettingsSuccess(true)
    setSettingsForm({ username: '', newPassword: '', confirmPassword: '' })
  }

  const loadData = async () => {
    setLoading(true)
    const res = await fetch('/api/admin-data')
    if (res.ok) {
      const { customers: custs, monitorStatus: status } = await res.json()
      setCustomers(custs || [])
      if (status) setMonitorStatus(status)
    }
    setLoading(false)
  }

  useEffect(() => {
    if (authed) {
      loadData()
      loadBotInstances()
      if (authedAdmin?.role === 'owner') { loadLogs(); loadAdmins() }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!authed) return
    const interval = setInterval(async () => {
      const res = await fetch('/api/monitor-status')
      if (res.ok) { const data = await res.json(); if (data) setMonitorStatus(data) }
      loadBotInstances()
    }, 30000)
    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed])

  // Poll for new registrations and update tab title
  useEffect(() => {
    if (!authed) return
    const lastSeenKey = 'avibm_admin_last_seen'
    const getLastSeen = () => localStorage.getItem(lastSeenKey) || new Date().toISOString()

    const check = async () => {
      const lastSeen = getLastSeen()
      const res = await fetch(`/api/new-registrations?since=${encodeURIComponent(lastSeen)}`)
      if (res.ok) { const { count } = await res.json(); if (count > 0) setNewRegCount(n => n + count) }
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
    await fetch('/api/customers', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, updates: { active: !current } }) })
    setCustomers(cs => cs.map(c => c.id === id ? { ...c, active: !current } : c))
    const customer = customers.find(c => c.id === id)
    await logAction(
      current ? 'Deactivated customer' : 'Activated customer',
      customer ? `${customer.first_name} ${customer.last_name} (${customer.state})` : id
    )
    if (!current) {
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
    await fetch('/api/vehicles', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: vid, updates: { active: !current } }) })
    setCustomers(cs => cs.map(c => ({
      ...c,
      vehicles: c.vehicles?.map(v => v.id === vid ? { ...v, active: !current } : v)
    })))
    const vehicle = customers.flatMap(c => c.vehicles || []).find(v => v.id === vid)
    await logAction(
      current ? 'Deactivated vehicle' : 'Activated vehicle',
      vehicle ? vehicle.label : vid
    )
  }

  const updateTier = async (id: string, tier: string) => {
    await fetch('/api/customers', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, updates: { tier } }) })
    setCustomers(cs => cs.map(c => c.id === id ? { ...c, tier: tier as any } : c))
    const customer = customers.find(c => c.id === id)
    await logAction('Changed tier', `${customer ? `${customer.first_name} ${customer.last_name}` : id} → ${tier}`)
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
    await fetch('/api/vehicles', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: vid, updates: { cutoff_date: date, previous_cutoff: oldDate, booked_date: null, booked_time: null, booked_location: null } }) })
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
    const vehicle = customers.flatMap(c => c.vehicles || []).find(v => v.id === vid)
    await logAction('Updated cutoff date', `${vehicle ? vehicle.label : vid}: ${oldDate} → ${date}`)
  }

  const updateManualBooking = async (vid: string, date: string, time: string, location: string) => {
    await fetch('/api/vehicles', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: vid, updates: { booked_date: date || null, booked_time: time || null, booked_location: location || null } }) })
    setCustomers(cs => cs.map(c => ({
      ...c,
      vehicles: c.vehicles?.map(v => v.id === vid ? {
        ...v,
        booked_date: date || undefined,
        booked_time: time || undefined,
        booked_location: location || undefined,
      } : v)
    })))
    const vehicle = customers.flatMap(c => c.vehicles || []).find(v => v.id === vid)
    await logAction('Set manual booking', `${vehicle ? vehicle.label : vid}: ${date} ${time} @ ${location}`)
  }

  const updateSearchAfter = async (vid: string, date: string | null, active: boolean) => {
    await fetch('/api/vehicles', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: vid, updates: { search_after_date: date, search_after_active: active } }) })
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
    await fetch('/api/vehicles', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: vid, updates: { locations: locs } }) })
    setCustomers(cs => cs.map(c => ({
      ...c,
      vehicles: c.vehicles?.map(v => v.id === vid ? { ...v, locations: locs } : v)
    })))
  }

  const updatePriorityLocations = async (vid: string, locs: string[]) => {
    await fetch('/api/vehicles', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: vid, updates: { priority_locations: locs } }) })
    setCustomers(cs => cs.map(c => ({
      ...c,
      vehicles: c.vehicles?.map(v => v.id === vid ? { ...v, priority_locations: locs } : v)
    })))
  }

  const saveCustomerEdits = async (id: string) => {
    const edits = customerEdits[id]
    if (!edits) return
    await fetch('/api/customers', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, updates: edits }) })
    setCustomers(cs => cs.map(c => c.id === id ? { ...c, ...edits } : c))
    setEditingCustomer(null)
    const customer = customers.find(c => c.id === id)
    await logAction('Edited customer details', customer ? `${customer.first_name} ${customer.last_name}` : id)
  }

  const saveVehicleEdits = async (vid: string) => {
    const edits = vehicleEdits[vid]
    if (!edits) return
    await fetch('/api/vehicles', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: vid, updates: edits }) })
    setCustomers(cs => cs.map(c => ({
      ...c,
      vehicles: c.vehicles?.map(v => v.id === vid ? { ...v, ...edits } : v)
    })))
    setEditingVehicle(null)
    const vehicle = customers.flatMap(c => c.vehicles || []).find(v => v.id === vid)
    await logAction('Edited vehicle details', vehicle ? vehicle.label : vid)
  }

  const updateNotes = async (vid: string, notes: string) => {
    await fetch('/api/vehicles', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: vid, updates: { notes } }) })
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
    const customer = customers.find(c => c.id === id)
    await fetch('/api/customers', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setCustomers(cs => cs.filter(c => c.id !== id))
    await logAction('Deleted customer', customer ? `${customer.first_name} ${customer.last_name} (${customer.state})` : id)
  }

  const requestDelete = async (id: string) => {
    if (!confirm('Request deletion? The owner will need to approve it.')) return
    const customer = customers.find(c => c.id === id)
    await fetch('/api/customers', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, updates: { pending_deletion: true, active: false } }) })
    setCustomers(cs => cs.map(c => c.id === id ? { ...c, pending_deletion: true, active: false } : c))
    await logAction('Requested customer deletion', customer ? `${customer.first_name} ${customer.last_name} (${customer.state})` : id)
  }

  const approveDelete = async (id: string) => {
    if (!confirm('Permanently delete this customer and all their vehicles?')) return
    await fetch('/api/customers', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setCustomers(cs => cs.filter(c => c.id !== id))
  }

  const reinstateFromDeletion = async (id: string) => {
    await fetch('/api/customers', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, updates: { pending_deletion: false, active: true } }) })
    setCustomers(cs => cs.map(c => c.id === id ? { ...c, pending_deletion: false, active: true } : c))
  }

  const archiveCustomer = async (id: string, current: boolean) => {
    await fetch('/api/customers', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, updates: { archived: !current, active: false } }) })
    setCustomers(cs => cs.map(c => c.id === id ? { ...c, archived: !current, active: false } : c))
    const customer = customers.find(c => c.id === id)
    await logAction(current ? 'Unarchived customer' : 'Archived customer', customer ? `${customer.first_name} ${customer.last_name}` : id)
  }

  const archiveVehicle = async (vid: string, current: boolean) => {
    await fetch('/api/vehicles', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: vid, updates: { archived: !current, active: false } }) })
    setCustomers(cs => cs.map(c => ({
      ...c,
      vehicles: c.vehicles?.map(v => v.id === vid ? { ...v, archived: !current, active: false } : v)
    })))
    const vehicle = customers.flatMap(c => c.vehicles || []).find(v => v.id === vid)
    await logAction(current ? 'Unarchived vehicle' : 'Archived vehicle', vehicle ? vehicle.label : vid)
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

  // Monitor is only truly "active" if it ran within the last 2 hours
  const monitorIsLive = (lastRun?: string) => {
    if (!lastRun) return false
    return (Date.now() - new Date(lastRun).getTime()) < 2 * 60 * 60 * 1000
  }
  const monitorLive = monitorIsLive(monitorStatus?.last_run)

  // Bot instance is "online" if last_seen within 3 minutes
  const instanceIsOnline = (lastSeen: string) =>
    (Date.now() - new Date(lastSeen).getTime()) < 3 * 60 * 1000
  const onlineInstances = botInstances.filter(b => instanceIsOnline(b.last_seen))
  const activeInstances = onlineInstances.filter(b => b.enabled)

  // 'running' = online + enabled, 'paused' = online but all disabled, 'offline' = none online
  const monitorState: 'running' | 'paused' | 'offline' =
    activeInstances.length > 0 && monitorLive ? 'running'
    : onlineInstances.length > 0 ? 'paused'
    : 'offline'

  const monitorStateConfig = {
    running: { color: '#4ecb4e', label: 'RUNNING',  cardClass: 'active',   dotShadow: 'rgba(78,203,78,0.5)',   bg: '#040e04', border: '#1a3a1a' },
    paused:  { color: '#C9A84C', label: 'PAUSED',   cardClass: 'inactive', dotShadow: 'rgba(201,168,76,0.5)',  bg: '#0e0a00', border: '#3a2a00' },
    offline: { color: '#e74c3c', label: 'OFFLINE',  cardClass: 'inactive', dotShadow: 'rgba(231,76,60,0.4)',   bg: '#080606', border: '#2a1010' },
  }

  const formatLastRun = (lastRun?: string) => {
    if (!lastRun) return 'Never'
    const d = new Date(lastRun)
    const diffMs = Date.now() - d.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHrs = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHrs / 24)
    if (diffDays >= 1) return `${diffDays}d ago`
    if (diffHrs >= 1) return `${diffHrs}h ago`
    if (diffMins >= 1) return `${diffMins}m ago`
    return 'Just now'
  }

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
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, background: 'radial-gradient(ellipse at 50% 40%, rgba(201,168,76,0.06) 0%, transparent 70%)' }}>
      <div className="card" style={{ maxWidth: 360, width: '100%', background: 'linear-gradient(135deg, #161616, #111)', border: '1px solid rgba(201,168,76,0.2)', boxShadow: '0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(201,168,76,0.05)' }}>
        <div className="section-label" style={{ marginBottom: 8 }}>Admin Access</div>
        <h2 style={{ fontSize: 32, marginBottom: 24 }}>AVIBM ADMIN</h2>
        <div style={{ marginBottom: 12 }}>
          <label>Username</label>
          <input
            value={username}
            onChange={e => { setUsername(e.target.value); setPwError('') }}
            onKeyDown={e => e.key === 'Enter' && login()}
            placeholder="Enter username"
            autoComplete="username"
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label>Password</label>
          <input
            type="password" value={pw}
            onChange={e => { setPw(e.target.value); setPwError('') }}
            onKeyDown={e => e.key === 'Enter' && login()}
            placeholder="Enter password"
            autoComplete="current-password"
            style={{ borderColor: pwError ? '#ff4444' : undefined }}
          />
          {pwError && <p style={{ color: '#ff4444', fontSize: 12, marginTop: 6 }}>{pwError}</p>}
        </div>
        <button className="btn-gold" onClick={login}>ENTER</button>
        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <Link href="/" style={{ color: 'var(--text-muted)', fontSize: 13, textDecoration: 'none' }}>← Back to home</Link>
        </div>
      </div>
    </main>
  )

  return (
    <main style={{ minHeight: '100vh', padding: '0 0 80px', background: '#030303' }}>
      <header className='admin-header' style={{
        borderBottom: '1px solid #111', padding: '14px 40px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        position: 'sticky', top: 0,
        background: 'rgba(3,3,3,0.98)',
        backdropFilter: 'blur(20px)',
        zIndex: 100,
        boxShadow: '0 1px 0 rgba(201,168,76,0.06)',
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
          {/* Account menu */}
          <div style={{ position: 'relative' }}>
            <button onClick={() => setShowMenu(p => !p)} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'none', border: `1px solid ${isOwner ? 'var(--gold)' : '#2a4a2a'}`,
              color: isOwner ? 'var(--gold)' : '#5adb5a',
              padding: '6px 12px', borderRadius: 20, cursor: 'pointer', fontSize: 12, fontFamily: 'DM Sans',
            }}>{isOwner ? '👑' : '👤'} {authedAdmin?.username} ▾</button>
            {showMenu && (
              <>
                <div onClick={() => setShowMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 199 }} />
                <div style={{
                  position: 'absolute', top: '110%', right: 0, zIndex: 200, minWidth: 200,
                  background: 'var(--dark-2)', border: '1px solid var(--border)',
                  borderRadius: 10, overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                }}>
                  {isOwner && (
                    <button onClick={() => { setShowMenu(false); setShowAdminPanel(true); document.getElementById('admin-panel')?.scrollIntoView({ behavior: 'smooth' }) }} style={{
                      width: '100%', padding: '12px 16px', background: 'none', border: 'none',
                      borderBottom: '1px solid var(--border)', color: 'var(--gold)',
                      cursor: 'pointer', fontFamily: 'DM Sans', fontSize: 13, textAlign: 'left',
                    }}>👥 Manage Admins</button>
                  )}
                  {isOwner && <button onClick={() => { setShowMenu(false); setSettingsSuccess(false); setSettingsError(''); setShowSettingsModal(true) }} style={{
                    width: '100%', padding: '12px 16px', background: 'none', border: 'none',
                    borderBottom: '1px solid var(--border)', color: 'var(--text)',
                    cursor: 'pointer', fontFamily: 'DM Sans', fontSize: 13, textAlign: 'left',
                  }}>⚙️ Change Username / Password</button>}
                  <button onClick={logout} style={{
                    width: '100%', padding: '12px 16px', background: 'none', border: 'none',
                    color: '#ff6b6b', cursor: 'pointer', fontFamily: 'DM Sans', fontSize: 13, textAlign: 'left',
                  }}>↩ Log Out</button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <div className='admin-body' style={{ padding: 'clamp(14px,3vw,28px) clamp(12px,4vw,40px)' }}>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 10, marginBottom: 24 }}>
          {[
            { label: 'Total', value: stats.total },
            { label: 'Active', value: stats.active, gold: true },
            { label: 'QLD', value: stats.qld },
            { label: 'SA', value: stats.sa },
            { label: '🥇 Priority', value: stats.priority },
            { label: '🥈 Standard', value: stats.standard },
            { label: '🥉 Basic', value: stats.basic },
          ].map(s => (
            <div key={s.label} className={`admin-stat-card${s.gold ? ' gold' : ''}`}>
              <div style={{ fontFamily: 'Bebas Neue', fontSize: 34, lineHeight: 1, color: s.gold ? 'var(--gold)' : 'var(--text)', marginBottom: 4 }}>{s.value}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', lineHeight: 1.3 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Monitor Status */}
        {(() => {
          const cfg = monitorStateConfig[monitorState]
          return (
            <div className='monitor-grid' style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10, marginBottom: 20 }}>
              {[{ label: 'QLD', count: stats.qld }, { label: 'SA', count: stats.sa }].map(m => (
                <div key={m.label} style={{
                  borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14,
                  background: cfg.bg, border: `1px solid ${cfg.border}`, transition: 'border-color 0.2s',
                }}>
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: cfg.color, boxShadow: `0 0 8px ${cfg.dotShadow}` }} />
                    {monitorState === 'running' && (
                      <div style={{ position: 'absolute', top: 0, left: 0, width: 12, height: 12, borderRadius: '50%', background: cfg.color, opacity: 0.4, animation: 'pulse 2s infinite' }} />
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'Bebas Neue', fontSize: 14, letterSpacing: '0.06em', color: cfg.color }}>
                      {m.label} {monitorState === 'running' ? '● RUNNING' : monitorState === 'paused' ? '◐ PAUSED' : '○ OFFLINE'}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      {monitorState === 'paused'
                        ? `Terminal connected · disabled by admin · ${m.count} customer(s)`
                        : monitorStatus
                          ? `${m.count} customer(s) · ${formatLastRun(monitorStatus.last_run)}`
                          : 'No data yet'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        })()}

        <style>{`
          @keyframes pulse {
            0% { transform: scale(1); opacity: 0.4; }
            50% { transform: scale(2); opacity: 0; }
            100% { transform: scale(1); opacity: 0; }
          }
        `}</style>

        {/* Admin Management — owner only */}
        {/* Connected Devices */}
        <div className="admin-section" style={{ marginBottom: 16, borderColor: onlineInstances.length > 0 ? '#1a3a1a' : '#2a1a1a' }}>
          <div className={`admin-section-header ${onlineInstances.length > 0 ? 'green-border' : 'red-border'}${showDevicesPanel ? ' open' : ''}`}
            style={{ background: onlineInstances.length > 0 ? '#040e04' : '#0e0404' }}
            onClick={() => setShowDevicesPanel(p => !p)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ position: 'relative' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: onlineInstances.length > 0 ? '#4ecb4e' : '#c0392b', boxShadow: onlineInstances.length > 0 ? '0 0 8px rgba(78,203,78,0.5)' : '0 0 6px rgba(192,57,43,0.4)' }} />
                {onlineInstances.length > 0 && <div style={{ position: 'absolute', top: 0, left: 0, width: 10, height: 10, borderRadius: '50%', background: '#4ecb4e', opacity: 0.4, animation: 'pulse 2s infinite' }} />}
              </div>
              <div>
                <div style={{ fontFamily: 'Bebas Neue', fontSize: 14, letterSpacing: '0.06em', color: onlineInstances.length > 0 ? '#4ecb4e' : '#e74c3c' }}>
                  TERMINALS — {onlineInstances.length} ONLINE
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {botInstances.length === 0 ? 'No devices registered yet' : `${botInstances.length} device${botInstances.length !== 1 ? 's' : ''} known · click to manage`}
                </div>
              </div>
            </div>
            <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{showDevicesPanel ? '▲' : '▼'}</span>
          </div>
          {showDevicesPanel && (
            <div className="admin-section-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {botInstances.length === 0 ? (
                <div style={{ fontSize: 12, color: '#444', textAlign: 'center', padding: '12px 0' }}>
                  No terminals have connected yet. Start the bot and it will appear here.
                </div>
              ) : botInstances.map(b => {
                const online = instanceIsOnline(b.last_seen)
                return (
                  <div key={b.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                    background: online ? '#040e04' : '#080808',
                    border: `1px solid ${online ? '#1a3a1a' : '#1a1a1a'}`,
                    borderRadius: 8, flexWrap: 'wrap',
                  }}>
                    {/* Status dot */}
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: online ? '#4ecb4e' : '#333', boxShadow: online ? '0 0 6px rgba(78,203,78,0.4)' : 'none' }} />
                      {online && <div style={{ position: 'absolute', top: 0, left: 0, width: 10, height: 10, borderRadius: '50%', background: '#4ecb4e', opacity: 0.4, animation: 'pulse 2s infinite' }} />}
                    </div>

                    {/* Name */}
                    <div style={{ flex: 1, minWidth: 140 }}>
                      {editingDeviceName === b.id ? (
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                          <input
                            value={deviceNameDraft}
                            onChange={e => setDeviceNameDraft(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') renameDevice(b.id, deviceNameDraft); if (e.key === 'Escape') setEditingDeviceName(null) }}
                            placeholder={b.hostname}
                            autoFocus
                            style={{ fontSize: 13, padding: '4px 8px', width: 160, height: 28 }}
                          />
                          <button className="admin-btn admin-btn-gold" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => renameDevice(b.id, deviceNameDraft)}>Save</button>
                          <button className="admin-btn admin-btn-outline" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => setEditingDeviceName(null)}>Cancel</button>
                        </div>
                      ) : (
                        <div style={{ fontSize: 14, fontWeight: 600, color: online ? 'var(--text)' : '#555' }}>
                          💻 {b.display_name || b.hostname}
                          {b.display_name && <span style={{ fontSize: 10, color: '#444', marginLeft: 5 }}>({b.hostname})</span>}
                        </div>
                      )}
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        {online ? `Online · ${formatLastRun(b.last_seen)}` : `Last seen ${formatLastRun(b.last_seen)}`}
                        {!b.enabled && online && <span style={{ color: '#C9A84C', marginLeft: 8 }}>● Paused by admin</span>}
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, flexWrap: 'wrap' }}>
                      {editingDeviceName !== b.id && (
                        <button
                          className="admin-btn admin-btn-outline"
                          style={{ padding: '5px 10px', fontSize: 11 }}
                          onClick={() => { setEditingDeviceName(b.id); setDeviceNameDraft(b.display_name || '') }}
                        >Rename</button>
                      )}
                      {online && b.enabled && (
                        <>
                          <button
                            onClick={() => toggleBotInstance(b.id, !b.enabled)}
                            className={`admin-toggle ${b.enabled ? 'on' : 'off'}`}
                            style={{ fontSize: 11 }}
                          >
                            {b.enabled ? '● ENABLED' : '○ DISABLED'}
                          </button>
                          <button
                            className="admin-btn admin-btn-red"
                            style={{ padding: '5px 10px', fontSize: 11 }}
                            onClick={() => {
                              if (confirm(`Stop the terminal on ${b.display_name || b.hostname}? This will kill the running process.`)) {
                                toggleBotInstance(b.id, false)
                              }
                            }}
                          >■ Stop</button>
                        </>
                      )}
                      {!online && (
                        <button
                          className="admin-btn admin-btn-red"
                          style={{ padding: '5px 10px', fontSize: 11 }}
                          onClick={() => deleteDevice(b.id, b.display_name || b.hostname)}
                        >Delete</button>
                      )}
                    </div>
                  </div>
                )
              })}
              <div style={{ fontSize: 11, color: '#333', paddingTop: 4 }}>
                Devices check in every 10–60 seconds. Stop kills the terminal process within 10s. Delete is only available for offline devices.
              </div>
            </div>
          )}
        </div>

        {/* Admin tools row — compact side-by-side panels */}
        <div style={{ display: 'grid', gridTemplateColumns: isOwner ? '1fr 1fr' : '1fr', gap: 10, marginBottom: 16 }}>

        {isOwner && (
          <div className="admin-section" style={{ borderColor: 'rgba(201,168,76,0.2)', margin: 0 }} id="admin-panel">
            <div className={`admin-section-header gold-border${showAdminPanel ? ' open' : ''}`} style={{ padding: '10px 16px' }} onClick={() => setShowAdminPanel(p => !p)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14 }}>👥</span>
                <div>
                  <div style={{ fontFamily: 'Bebas Neue', fontSize: 14, letterSpacing: '0.05em', color: 'var(--gold)' }}>ADMIN USERS</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{admins.filter(a => a.role !== 'owner').length} admin{admins.filter(a => a.role !== 'owner').length !== 1 ? 's' : ''}</div>
                </div>
              </div>
              <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{showAdminPanel ? '▲' : '▼'}</span>
            </div>
            {showAdminPanel && (
              <div className="admin-section-body" style={{ padding: '12px 14px' }}>

                {/* Admin list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                  {admins.filter(a => a.role !== 'owner').length === 0 && (
                    <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>No other admins yet.</p>
                  )}
                  {admins.filter(a => a.role !== 'owner').map(a => (
                    <div key={a.id} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 14px', background: selectedAdmin?.id === a.id ? '#1a1800' : '#111',
                      border: `1px solid ${selectedAdmin?.id === a.id ? 'var(--gold)' : 'var(--border)'}`,
                      borderRadius: 8,
                    }}>
                      <button onClick={() => {
                        if (selectedAdmin?.id === a.id) { setSelectedAdmin(null); return }
                        setSelectedAdmin(a)
                        loadLogs(a.username)
                      }} style={{
                        background: 'none', border: 'none', color: 'var(--gold)', cursor: 'pointer',
                        fontFamily: 'DM Sans', fontSize: 14, fontWeight: 600, padding: 0, textAlign: 'left',
                      }}>👤 {a.username}</button>
                      <span style={{
                        fontSize: 11, padding: '2px 8px', borderRadius: 10,
                        background: a.active ? '#1a2a1a' : '#2a1a1a',
                        border: `1px solid ${a.active ? '#2a4a2a' : '#4a2a2a'}`,
                        color: a.active ? '#5adb5a' : '#ff6b6b',
                      }}>{a.active ? 'Active' : 'Inactive'}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>
                        Added {new Date(a.created_at).toLocaleDateString('en-AU')}
                      </span>
                      <button onClick={() => removeAdmin(a.id)} className="admin-btn admin-btn-red" style={{ fontSize: 11 }}>Remove</button>
                    </div>
                  ))}
                </div>

                {/* Activity log for selected admin */}
                {selectedAdmin && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gold)' }}>
                        Activity log — {selectedAdmin.username}
                        <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: 8 }}>({adminLogs.length} action{adminLogs.length !== 1 ? 's' : ''})</span>
                      </div>
                      <button onClick={() => { setSelectedAdmin(null); setAdminLogs([]) }} style={{
                        background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12,
                      }}>✕ Close</button>
                    </div>
                    {adminLogs.length === 0 ? (
                      <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0, textAlign: 'center', padding: '12px 0' }}>No activity recorded for this admin yet.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, maxHeight: 300, overflowY: 'auto' }}>
                        {adminLogs.map(log => (
                          <div key={log.id} style={{
                            display: 'flex', gap: 12, alignItems: 'flex-start',
                            padding: '7px 12px', background: 'var(--dark-2)', borderRadius: 6, border: '1px solid var(--border)',
                          }}>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', minWidth: 120 }}>
                              {new Date(log.created_at).toLocaleString('en-AU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </div>
                            <div style={{ flex: 1 }}>
                              <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600 }}>{log.action}</span>
                              {log.details && <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>{log.details}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Add admin form */}
                {addingAdmin ? (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <input placeholder="Username" value={newAdminForm.username}
                      onChange={e => setNewAdminForm(p => ({ ...p, username: e.target.value }))}
                      style={{ flex: 1, minWidth: 120, padding: '7px 12px', borderRadius: 6, fontSize: 13 }} />
                    <input placeholder="Password" value={newAdminForm.password}
                      onChange={e => setNewAdminForm(p => ({ ...p, password: e.target.value }))}
                      style={{ flex: 1, minWidth: 120, padding: '7px 12px', borderRadius: 6, fontSize: 13 }} />
                    <button onClick={addAdmin} className="admin-btn admin-btn-gold">Add</button>
                    <button onClick={() => { setAddingAdmin(false); setNewAdminForm({ username: '', password: '' }) }} className="admin-btn admin-btn-outline">Cancel</button>
                  </div>
                ) : (
                  <button onClick={() => setAddingAdmin(true)} className="admin-btn admin-btn-amber" style={{ fontSize: 13 }}>+ Add Admin</button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Free Customers Panel — sits beside Admin Users in the grid */}
        <div className="admin-section" style={{ borderColor: 'rgba(201,168,76,0.2)', margin: 0 }}>
          <div className={`admin-section-header gold-border${showFreePanel ? ' open' : ''}`} style={{ padding: '10px 16px' }} onClick={() => setShowFreePanel(p => !p)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14 }}>🎁</span>
              <div>
                <div style={{ fontFamily: 'Bebas Neue', fontSize: 14, letterSpacing: '0.05em' }}>FREE CUSTOMERS</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{freeList.length} whitelisted</div>
              </div>
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>{showFreePanel ? '▲' : '▼'}</div>
          </div>
          {showFreePanel && (
            <div className="admin-section-body" style={{ padding: '12px 14px' }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <input type="text" placeholder="email or phone" value={newFreeEntry}
                  onChange={e => setNewFreeEntry(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addFreeEntry(newFreeEntry)}
                  style={{ flex: 1, padding: '6px 10px', borderRadius: 6, fontSize: 12 }} />
                <button onClick={() => addFreeEntry(newFreeEntry)} className="admin-btn admin-btn-gold">+ Add</button>
              </div>
              {freeList.length === 0 ? (
                <div style={{ fontSize: 11, color: '#444' }}>No entries yet</div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {freeList.map(entry => (
                    <div key={entry} style={{
                      display: 'flex', alignItems: 'center', gap: 5, padding: '3px 8px',
                      borderRadius: 20, fontSize: 11, background: '#1a1200',
                      border: '1px solid rgba(201,168,76,0.3)', color: 'var(--gold)',
                    }}>
                      {entry}
                      <span onClick={() => removeFreeEntry(entry)} style={{ cursor: 'pointer', color: '#ff6b6b', fontWeight: 700 }}>×</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        </div>{/* end admin tools row */}

        {/* Pending Deletions — owner only */}
        {isOwner && customers.filter(c => c.pending_deletion).length > 0 && (
          <div className="admin-section" style={{ marginBottom: 16, borderColor: '#6a1a1a' }}>
            <div className="admin-section-header red-border open" style={{ background: 'linear-gradient(90deg,#1a0808,#140606)', cursor: 'default' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                <span style={{ fontSize: 16 }}>⚠️</span>
                <div>
                  <div style={{ fontFamily: 'Bebas Neue', fontSize: 16, letterSpacing: '0.05em', color: '#ff6b6b' }}>
                    PENDING DELETIONS — {customers.filter(c => c.pending_deletion).length} awaiting approval
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Requested by another admin — confirm to delete permanently or reinstate</div>
                </div>
              </div>
            </div>
            <div className="admin-section-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {customers.filter(c => c.pending_deletion).map(c => (
                <div key={c.id} style={{ background: 'var(--dark-2)', border: '1px solid #4a1a1a', borderRadius: 8, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <span className={`pill ${c.state === 'QLD' ? 'pill-qld' : 'pill-sa'}`}>{c.state}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{c.first_name} {c.last_name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.email} · {c.phone}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => reinstateFromDeletion(c.id)} className="admin-btn admin-btn-green">↩ Reinstate</button>
                    <button onClick={() => approveDelete(c.id)} className="admin-btn admin-btn-red" style={{ fontWeight: 700 }}>Confirm Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pending Payment Section */}
        {pendingPayment.length > 0 && (
          <div className="admin-section" style={{ marginBottom: 16, borderColor: '#4a2020' }}>
            <div className={`admin-section-header orange-border${showPendingPanel ? ' open' : ''}`} style={{ background: showPendingPanel ? 'linear-gradient(90deg,#1a0a0a,#140808)' : 'linear-gradient(90deg,#1a0a0a,#140808)' }} onClick={() => setShowPendingPanel(p => !p)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 16 }}>⏳</span>
                <div>
                  <div style={{ fontFamily: 'Bebas Neue', fontSize: 16, letterSpacing: '0.05em', color: '#ff9966' }}>PENDING PAYMENT</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{pendingPayment.length} customer{pendingPayment.length !== 1 ? 's' : ''} registered but not yet paid</div>
                </div>
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{showPendingPanel ? '▲' : '▼'}</div>
            </div>
            {showPendingPanel && (
              <div className="admin-section-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {pendingPayment.map(c => (
                  <div key={c.id} style={{ background: 'var(--dark-2)', border: '1px solid #2a2020', borderRadius: 10, padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
                      <span className={`pill ${c.state === 'QLD' ? 'pill-qld' : 'pill-sa'}`}>{c.state}</span>
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
                        className="admin-btn admin-btn-gold"
                        style={{ opacity: sendingReminder === c.id ? 0.6 : 1, whiteSpace: 'nowrap' }}
                      >{sendingReminder === c.id ? 'Sending...' : '📧 Send Link'}</button>
                      {isOwner ? (
                        <button onClick={() => deleteCustomer(c.id)} className="admin-btn admin-btn-red">🗑</button>
                      ) : (
                        <button onClick={() => requestDelete(c.id)} className="admin-btn admin-btn-orange">🗑</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Auto payment email info */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16,
          background: '#050e05', border: '1px solid #1a2a1a', borderRadius: 8, padding: '10px 16px',
        }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#5adb5a', flexShrink: 0, boxShadow: '0 0 8px rgba(90,219,90,0.5)' }} />
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Payment request emails are <strong style={{ color: '#5adb5a' }}>automatically sent</strong> to every new registration. Use the button below to send reminders.
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, gap: 8 }}>
          <div style={{ fontFamily: 'Bebas Neue', fontSize: 20, letterSpacing: '0.08em', color: 'var(--text)' }}>
            CUSTOMERS <span style={{ color: 'var(--text-muted)', fontSize: 14, fontFamily: 'DM Sans', letterSpacing: 0, fontWeight: 400 }}>{filtered.length} shown</span>
          </div>
        </div>
        <div className='filters-row' style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
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
              <div key={c.id} className={`admin-customer-card ${c.state === 'QLD' ? 'qld' : 'sa'}${c.active ? ' active-customer' : ''}`}
                style={{ boxShadow: c.vehicles?.some(v => v.booked_date && new Date(v.booked_date) < new Date(v.cutoff_date)) ? '0 0 16px rgba(90,219,90,0.2)' : 'none' }}>
                {/* Customer row */}
                <div className='admin-customer-row customer-row' onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}>
                  <span className={`pill ${c.state === 'QLD' ? 'pill-qld' : 'pill-sa'}`} style={{ minWidth: 42, textAlign: 'center' }}>{c.state}</span>
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
                  <div onClick={e => { e.stopPropagation(); fetch('/api/customers', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: c.id, updates: { auto_payment_email: !c.auto_payment_email } }) }).then(() => setCustomers(cs => cs.map(x => x.id === c.id ? { ...x, auto_payment_email: !c.auto_payment_email } : x))) }} title="Auto-send payment request email when customer registers">
                    <button className={`admin-toggle ${c.auto_payment_email ? 'on' : 'off'}`}>
                      {c.auto_payment_email ? '● AUTO' : '○ MANUAL'}
                    </button>
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
                  <div style={{ borderTop: '1px solid #111', padding: '18px', background: '#030303' }}>
                    {/* Customer Details — view / edit */}
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <div className="section-label" style={{ marginBottom: 0 }}>Customer Details</div>
                        {editingCustomer === c.id ? (
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={() => saveCustomerEdits(c.id)} className="admin-btn admin-btn-gold">✓ Save</button>
                            <button onClick={() => setEditingCustomer(null)} className="admin-btn admin-btn-outline">Cancel</button>
                          </div>
                        ) : (
                          <button onClick={() => { setEditingCustomer(c.id); setCustomerEdits(e => ({ ...e, [c.id]: { first_name: c.first_name, last_name: c.last_name, email: c.email, phone: c.phone, address: c.address, suburb: c.suburb, postcode: c.postcode, crn: c.crn, licence_number: c.licence_number, date_of_birth: c.date_of_birth } })) }} className="admin-btn admin-btn-outline">✏️ Edit</button>
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
                        background: (v.booked_date && new Date(v.booked_date) < new Date(v.cutoff_date)) ? '#040e04' : '#070707',
                        border: `1px solid ${(v.booked_date && new Date(v.booked_date) < new Date(v.cutoff_date)) ? '#1a3a1a' : '#141414'}`,
                        borderRadius: 10, padding: '14px 16px', marginBottom: 8,
                        boxShadow: (v.booked_date && new Date(v.booked_date) < new Date(v.cutoff_date)) ? '0 0 12px rgba(78,203,78,0.07)' : 'none',
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
                                  <button onClick={() => saveVehicleEdits(v.id)} className="admin-btn admin-btn-gold">✓ Save</button>
                                  <button onClick={() => setEditingVehicle(null)} className="admin-btn admin-btn-outline">✕</button>
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
                              <button onClick={() => { setEditingVehicle(v.id); setVehicleEdits(eds => ({ ...eds, [v.id]: { make: v.make, model: v.model, year: v.year, colour: v.colour || '', vin: v.vin, label: v.label || '', vehicle_type: v.vehicle_type || '', build_month: v.build_month || '', damage: v.damage || '', purchase_method: v.purchase_method || '', purchased_from: v.purchased_from || '' } })) }} className="admin-btn admin-btn-outline" style={{ fontSize: 11 }}>✏️</button>
                            )}
                            <div onClick={() => toggleVehicle(v.id, v.active)} style={{ cursor: 'pointer' }}>
                              <span className={`badge ${v.active ? 'badge-active' : 'badge-inactive'}`}>
                                {v.active ? '● ON' : '○ OFF'}
                              </span>
                            </div>
                            <button onClick={() => archiveVehicle(v.id, !!v.archived)} title="Archive vehicle" className="admin-btn admin-btn-amber" style={{ fontSize: 11 }}>📦</button>
                          </div>
                        </div>

                        {/* Booking info grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
                          {/* Cutoff Date */}
                          <div style={{ background: '#0a0a0a', borderRadius: 6, padding: '10px 12px', border: '1px solid #141414' }}>
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
                            <div style={{ background: '#0a0a0a', border: '1px solid #141414', borderRadius: 6, padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <div style={{ fontSize: 12, color: '#444', textAlign: 'center' }}>
                                <div style={{ fontSize: 16, marginBottom: 4 }}>🔍</div>
                                Searching...
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Manual Booking Entry — admin only */}
                        <div style={{ marginTop: 10, background: '#070707', border: '1px solid #141414', borderRadius: 6, padding: '10px 12px' }}>
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
                          background: v.search_after_active ? '#0e0a00' : '#070707',
                          border: `1px solid ${v.search_after_active ? 'rgba(201,168,76,0.4)' : '#141414'}`,
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
                          <div style={{ marginTop: 10, padding: '10px 12px', background: '#070707', borderRadius: 6, border: '1px solid #141414' }}>
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
                          <div style={{ marginTop: 10, padding: '10px 12px', background: '#070707', borderRadius: 6, border: '1px solid #141414' }}>
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
                        <div style={{ marginTop: 10, padding: '10px 12px', background: '#070707', borderRadius: 6, border: '1px solid #141414' }}>
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
                                background: '#0a0a0a', border: '1px solid #1a1a1a', color: 'var(--text)',
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
                    <div className='actions-row' style={{ marginTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                      {!c.active ? (
                        <button onClick={() => sendPaymentRequest(c)} className="admin-btn admin-btn-gold" style={{ fontSize: 13, padding: '10px 20px', letterSpacing: '0.05em' }}>📧 Send Payment Request</button>
                      ) : (
                        <div style={{ fontSize: 13, color: '#5adb5a', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#5adb5a', display: 'inline-block', boxShadow: '0 0 6px rgba(90,219,90,0.6)' }} />
                          Active — monitoring running
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => archiveCustomer(c.id, !!c.archived)} className="admin-btn admin-btn-amber">📦 Archive</button>
                        {isOwner ? (
                          <button onClick={() => deleteCustomer(c.id)} className="admin-btn admin-btn-red">Delete</button>
                        ) : (
                          <button onClick={() => requestDelete(c.id)} className="admin-btn admin-btn-orange">🗑 Request Delete</button>
                        )}
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
          <div className="admin-section" style={{ marginTop: 40, borderColor: '#3a2a0a' }}>
            <div className={`admin-section-header gold-border${showArchivedPanel ? ' open' : ''}`}
              style={{ background: 'linear-gradient(90deg, #151005, #111)', cursor: 'pointer' }}
              onClick={() => setShowArchivedPanel(p => !p)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span>📦</span>
                <span style={{ fontFamily: 'Bebas Neue', fontSize: 17, letterSpacing: '0.08em', color: '#C9A84C' }}>ARCHIVED ({archived.length})</span>
              </div>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{showArchivedPanel ? '▲ HIDE' : '▼ SHOW'}</span>
            </div>

            {showArchivedPanel && (
              <div className="admin-section-body" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {archived.map(c => (
                  <div key={c.id} className={`admin-customer-card ${c.state === 'QLD' ? 'qld' : 'sa'}`} style={{ opacity: 0.7 }}>
                    {/* Header row — clickable to expand */}
                    <div
                      className='admin-customer-row customer-row'
                      onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
                    >
                      <span className={`pill ${c.state === 'QLD' ? 'pill-qld' : 'pill-sa'}`} style={{ minWidth: 42, textAlign: 'center' }}>{c.state}</span>
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
                      <div style={{ borderTop: '1px solid #111', padding: '18px', background: '#030303' }}>
                        {/* Customer Details */}
                        <div style={{ marginBottom: 20 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                            <div className="section-label" style={{ marginBottom: 0 }}>Customer Details</div>
                            {editingCustomer === c.id ? (
                              <div style={{ display: 'flex', gap: 8 }}>
                                <button onClick={() => saveCustomerEdits(c.id)} className="admin-btn admin-btn-gold">✓ Save</button>
                                <button onClick={() => setEditingCustomer(null)} className="admin-btn admin-btn-outline">Cancel</button>
                              </div>
                            ) : (
                              <button onClick={() => { setEditingCustomer(c.id); setCustomerEdits(e => ({ ...e, [c.id]: { first_name: c.first_name, last_name: c.last_name, email: c.email, phone: c.phone, address: c.address, suburb: c.suburb, postcode: c.postcode, crn: c.crn, licence_number: c.licence_number, date_of_birth: c.date_of_birth } })) }} className="admin-btn admin-btn-outline">✏️ Edit</button>
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
                        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                          <button onClick={() => archiveCustomer(c.id, true)} className="admin-btn admin-btn-green">↩ Unarchive</button>
                          {isOwner ? (
                            <button onClick={() => deleteCustomer(c.id)} className="admin-btn admin-btn-red">Delete Customer</button>
                          ) : (
                            <button onClick={() => requestDelete(c.id)} className="admin-btn admin-btn-orange">🗑 Request Delete</button>
                          )}
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

      {/* Settings Modal */}
      {showSettingsModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }}>
          <div className="card" style={{ maxWidth: 400, width: '100%', background: 'linear-gradient(135deg,#161616,#111)', border: '1px solid rgba(201,168,76,0.2)', boxShadow: '0 24px 64px rgba(0,0,0,0.7)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 22 }}>ACCOUNT SETTINGS</h3>
              <button onClick={() => setShowSettingsModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>Leave blank to keep unchanged.</div>
            <div style={{ marginBottom: 12 }}>
              <label>New Username</label>
              <input value={settingsForm.username} onChange={e => setSettingsForm(p => ({ ...p, username: e.target.value }))}
                placeholder={`Current: ${authedAdmin?.username}`} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label>New Password</label>
              <input type="password" value={settingsForm.newPassword} onChange={e => setSettingsForm(p => ({ ...p, newPassword: e.target.value }))}
                placeholder="Enter new password" />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label>Confirm New Password</label>
              <input type="password" value={settingsForm.confirmPassword} onChange={e => setSettingsForm(p => ({ ...p, confirmPassword: e.target.value }))}
                placeholder="Confirm new password" />
            </div>
            {settingsError && <p style={{ color: '#ff6b6b', fontSize: 13, marginBottom: 12 }}>{settingsError}</p>}
            {settingsSuccess && <p style={{ color: '#5adb5a', fontSize: 13, marginBottom: 12 }}>✅ Updated successfully</p>}
            <button className="btn-gold" onClick={changeCredentials}>SAVE CHANGES</button>
          </div>
        </div>
      )}
    </main>
  )
}
