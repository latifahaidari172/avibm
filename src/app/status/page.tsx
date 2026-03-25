'use client'
import { useState } from 'react'
import Link from 'next/link'

const TIER_LABEL: Record<string, string> = {
  priority: '🥇 Priority',
  standard: '🥈 Standard',
  basic: '🥉 Basic',
}

type Vehicle = {
  label: string
  active: boolean
  cutoff_date: string
  booked_date?: string
  booked_time?: string
  booked_location?: string
}

type StatusResult = {
  first_name: string
  state: string
  tier: string
  active: boolean
  pending_payment: boolean
  vehicles: Vehicle[]
}

export default function StatusPage() {
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<StatusResult | null>(null)

  const handleCheck = async () => {
    if (!email || !phone) { setError('Please enter both fields.'); return }
    setError(''); setLoading(true); setResult(null)
    try {
      const res = await fetch('/api/check-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, phone }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Not found.'); return }
      setResult(data)
    } catch { setError('Something went wrong. Please try again.') }
    finally { setLoading(false) }
  }

  const formatDate = (d?: string) => {
    if (!d) return '—'
    try { return new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) }
    catch { return d }
  }

  return (
    <main style={{ minHeight: '100vh', padding: '40px 20px' }}>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>

        <Link href="/" style={{ color: 'var(--text-muted)', fontSize: 13, textDecoration: 'none' }}>← Back</Link>

        <div style={{ marginTop: 24, marginBottom: 32 }}>
          <div className="section-label" style={{ marginBottom: 8 }}>Monitor Lookup</div>
          <h1 style={{ fontSize: 'clamp(32px,7vw,52px)', lineHeight: 1 }}>CHECK YOUR<br /><span className="gold">MONITOR STATUS</span></h1>
        </div>

        {/* Lookup form */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label>Email Address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value.toLowerCase())}
                placeholder="john@email.com"
                style={{ textTransform: 'lowercase' }}
                onKeyDown={e => e.key === 'Enter' && handleCheck()}
              />
            </div>
            <div>
              <label>Mobile Number</label>
              <input
                inputMode="numeric"
                value={phone}
                onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="0412345678"
                onKeyDown={e => e.key === 'Enter' && handleCheck()}
              />
            </div>
            {error && (
              <div style={{ background: '#2a0a0a', border: '1px solid #4a1a1a', borderRadius: 8, padding: '10px 14px', color: '#ff6b6b', fontSize: 13 }}>
                {error}
              </div>
            )}
            <button className="btn-gold" onClick={handleCheck} disabled={loading}>
              {loading ? 'CHECKING...' : 'CHECK STATUS'}
            </button>
          </div>
        </div>

        {/* Results */}
        {result && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Account status */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>Welcome back</div>
                  <div style={{ fontFamily: 'Bebas Neue', fontSize: 28, letterSpacing: '0.05em' }}>{result.first_name}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                  <div style={{
                    padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                    background: result.state === 'QLD' ? '#1a2a3a' : '#2a1a2a',
                    border: `1px solid ${result.state === 'QLD' ? '#2a3a4a' : '#3a2a3a'}`,
                    color: result.state === 'QLD' ? '#5ab0ff' : '#c080ff',
                  }}>{result.state}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{TIER_LABEL[result.tier] || result.tier}</div>
                </div>
              </div>

              {result.pending_payment ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#1a0a0a', border: '1px solid #4a2a2a', borderRadius: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff6b6b', flexShrink: 0 }} />
                  <div style={{ fontSize: 13, color: '#ff8888' }}>Payment pending — your monitor is not yet active. Check your email for a payment link.</div>
                </div>
              ) : result.active ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#1a2a1a', border: '1px solid #2a4a2a', borderRadius: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#5adb5a', flexShrink: 0 }} />
                  <div style={{ fontSize: 13, color: '#5adb5a', fontWeight: 600 }}>Monitor active — searching for earlier slots</div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--dark-3)', border: '1px solid var(--border)', borderRadius: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#555', flexShrink: 0 }} />
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Monitor inactive</div>
                </div>
              )}
            </div>

            {/* Vehicles */}
            {result.vehicles.map((v, i) => {
              const hasBooking = v.booked_date && v.cutoff_date && new Date(v.booked_date) < new Date(v.cutoff_date)
              return (
                <div key={i} className="card" style={{ borderColor: hasBooking ? '#2a4a2a' : undefined, boxShadow: hasBooking ? '0 0 12px rgba(90,219,90,0.1)' : undefined }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ fontFamily: 'Bebas Neue', fontSize: 20, letterSpacing: '0.05em' }}>{v.label}</div>
                    <div style={{
                      padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                      background: v.active ? '#1a2a1a' : 'var(--dark-3)',
                      border: `1px solid ${v.active ? '#2a4a2a' : 'var(--border)'}`,
                      color: v.active ? '#5adb5a' : 'var(--text-muted)',
                    }}>{v.active ? '● ACTIVE' : '○ PAUSED'}</div>
                  </div>

                  <table width="100%" cellPadding={0} cellSpacing={0}>
                    <tbody>
                      <tr>
                        <td style={{ padding: '5px 0', fontSize: 12, color: 'var(--text-muted)', width: '50%' }}>Current booking to beat</td>
                        <td style={{ padding: '5px 0', fontSize: 13, color: 'var(--text)', fontWeight: 600 }}>{formatDate(v.cutoff_date)}</td>
                      </tr>
                      {hasBooking ? (
                        <>
                          <tr><td colSpan={2} style={{ padding: '10px 0 4px' }}>
                            <div style={{ height: 1, background: '#2a4a2a' }} />
                          </td></tr>
                          <tr>
                            <td style={{ padding: '5px 0', fontSize: 12, color: '#5adb5a' }}>✅ Earlier slot found</td>
                            <td style={{ padding: '5px 0', fontSize: 13, color: '#5adb5a', fontWeight: 700 }}>{formatDate(v.booked_date)}</td>
                          </tr>
                          {v.booked_time && <tr>
                            <td style={{ padding: '5px 0', fontSize: 12, color: 'var(--text-muted)' }}>Time</td>
                            <td style={{ padding: '5px 0', fontSize: 13, color: 'var(--text)' }}>{v.booked_time}</td>
                          </tr>}
                          {v.booked_location && <tr>
                            <td style={{ padding: '5px 0', fontSize: 12, color: 'var(--text-muted)' }}>Location</td>
                            <td style={{ padding: '5px 0', fontSize: 13, color: 'var(--text)' }}>{v.booked_location}</td>
                          </tr>}
                        </>
                      ) : v.active ? (
                        <tr>
                          <td style={{ padding: '5px 0', fontSize: 12, color: 'var(--text-muted)' }}>Status</td>
                          <td style={{ padding: '5px 0', fontSize: 13, color: 'var(--gold)' }}>🔍 Searching for earlier slot...</td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              )
            })}

          </div>
        )}

      </div>
    </main>
  )
}
