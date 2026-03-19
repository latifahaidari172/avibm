'use client'
import { useState } from 'react'
import Link from 'next/link'

export default function Home() {
  return (
    <main style={{ minHeight: '100vh' }}>
      {/* Header */}
      <header style={{
        borderBottom: '1px solid var(--border)',
        padding: '20px 40px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'sticky', top: 0,
        background: 'rgba(10,10,10,0.95)',
        backdropFilter: 'blur(10px)',
        zIndex: 100,
      }}>
        <div>
          <span style={{ fontFamily: 'Bebas Neue', fontSize: 22, letterSpacing: '0.15em', color: 'var(--gold)' }}>AVIBM</span>
          <span style={{ color: 'var(--text-muted)', fontSize: 12, marginLeft: 12, letterSpacing: '0.1em' }}>AUSTRALIAN VEHICLE INSPECTION BOOKING MONITOR</span>
        </div>
        <Link href="/admin" style={{ color: 'var(--text-muted)', fontSize: 13, textDecoration: 'none', letterSpacing: '0.05em' }}>
          Admin →
        </Link>
      </header>

      {/* Hero */}
      <section style={{
        padding: '100px 40px 60px',
        maxWidth: 900,
        margin: '0 auto',
        textAlign: 'center',
      }}>
        <div className="section-label" style={{ marginBottom: 20 }}>Automated Booking Technology</div>
        <h1 style={{ fontSize: 'clamp(52px, 8vw, 96px)', lineHeight: 1, marginBottom: 24, color: 'var(--text)' }}>
          NEVER MISS AN<br /><span className="gold">EARLIER SLOT</span><br />AGAIN
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 17, maxWidth: 540, margin: '0 auto 48px', lineHeight: 1.7 }}>
          AVIBM monitors written-off vehicle inspection booking systems 24/7 and automatically reschedules your vehicle the moment an earlier date becomes available.
        </p>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 2, justifyContent: 'center', marginBottom: 64 }}>
          {[
            { n: '24/7', label: 'Monitoring' },
            { n: '~1 min', label: 'Check Interval' },
            { n: 'Auto', label: 'Booking' },
            { n: 'Instant', label: 'Email Alert' },
          ].map(s => (
            <div key={s.n} style={{
              background: 'var(--dark-2)',
              border: '1px solid var(--border)',
              padding: '20px 28px',
              borderRadius: 8,
              minWidth: 120,
            }}>
              <div style={{ fontFamily: 'Bebas Neue', fontSize: 28, color: 'var(--gold)', letterSpacing: '0.05em' }}>{s.n}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* State Cards */}
      <section style={{ padding: '0 40px 80px', maxWidth: 900, margin: '0 auto' }}>
        <div className="section-label" style={{ textAlign: 'center', marginBottom: 32 }}>Select Your State</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* QLD */}
          <Link href="/register/qld" style={{ textDecoration: 'none' }}>
            <div style={{
              background: 'var(--dark-2)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: '40px 32px',
              cursor: 'pointer',
              transition: 'border-color 0.2s, transform 0.2s',
              position: 'relative',
              overflow: 'hidden',
            }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--gold)'
                ;(e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'
                ;(e.currentTarget as HTMLElement).style.transform = 'translateY(0)'
              }}
            >
              <div style={{ fontSize: 48, marginBottom: 16 }}>🦘</div>
              <h2 style={{ fontSize: 42, color: 'var(--text)', marginBottom: 8 }}>QUEENSLAND</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
                WOVI — Written Off Vehicle Inspections<br />
                Brisbane · Burleigh Heads · Narangba · Yatala
              </p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {['Brisbane', 'Burleigh Heads', 'Narangba', 'Yatala'].map(l => (
                  <span key={l} style={{
                    background: 'var(--dark-4)',
                    border: '1px solid var(--border)',
                    padding: '4px 10px',
                    borderRadius: 4,
                    fontSize: 12,
                    color: 'var(--text-muted)',
                  }}>{l}</span>
                ))}
              </div>
              <div style={{
                position: 'absolute', bottom: 20, right: 24,
                fontFamily: 'Bebas Neue', fontSize: 14, color: 'var(--gold)', letterSpacing: '0.1em',
              }}>REGISTER →</div>
            </div>
          </Link>

          {/* SA */}
          <Link href="/register/sa" style={{ textDecoration: 'none' }}>
            <div style={{
              background: 'var(--dark-2)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: '40px 32px',
              cursor: 'pointer',
              transition: 'border-color 0.2s, transform 0.2s',
              position: 'relative',
              overflow: 'hidden',
            }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--gold)'
                ;(e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'
                ;(e.currentTarget as HTMLElement).style.transform = 'translateY(0)'
              }}
            >
              <div style={{ fontSize: 48, marginBottom: 16 }}>🏜️</div>
              <h2 style={{ fontSize: 42, color: 'var(--text)', marginBottom: 8 }}>SOUTH AUSTRALIA</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
                Service SA — Vehicle Inspection Bookings<br />
                Regency Park
              </p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {['Regency Park'].map(l => (
                  <span key={l} style={{
                    background: 'var(--dark-4)',
                    border: '1px solid var(--border)',
                    padding: '4px 10px',
                    borderRadius: 4,
                    fontSize: 12,
                    color: 'var(--text-muted)',
                  }}>{l}</span>
                ))}
              </div>
              <div style={{
                position: 'absolute', bottom: 20, right: 24,
                fontFamily: 'Bebas Neue', fontSize: 14, color: 'var(--gold)', letterSpacing: '0.1em',
              }}>REGISTER →</div>
            </div>
          </Link>
        </div>

        {/* Coming soon states */}
        <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {['VIC', 'NSW', 'WA', 'NT'].map(s => (
            <div key={s} style={{
              background: 'var(--dark-2)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '16px',
              textAlign: 'center',
              opacity: 0.4,
            }}>
              <div style={{ fontFamily: 'Bebas Neue', fontSize: 20, color: 'var(--text-muted)' }}>{s}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.1em' }}>COMING SOON</div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section style={{
        borderTop: '1px solid var(--border)',
        padding: '80px 40px',
        maxWidth: 900,
        margin: '0 auto',
      }}>
        <div className="section-label" style={{ textAlign: 'center', marginBottom: 8 }}>Pricing — Queensland Only</div>
        <h2 style={{ fontSize: 48, textAlign: 'center', marginBottom: 8 }}>ONE-TIME FEE <span className="gold">PER VEHICLE</span></h2>
        <p style={{ color: 'var(--text-muted)', textAlign: 'center', fontSize: 14, marginBottom: 40 }}>SA monitoring is included free with QLD registration.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, maxWidth: 700, margin: '0 auto' }}>
          {[
            { icon: '🥇', tier: 'Priority', price: '$10', color: 'var(--gold)', border: 'var(--gold)', desc: 'First in queue — books immediately' },
            { icon: '🥈', tier: 'Standard', price: '$7.50', color: '#aaa', border: 'var(--border)', desc: '30 second delay after Priority' },
            { icon: '🥉', tier: 'Basic',    price: '$5',    color: '#888', border: 'var(--border)', desc: '60 second delay after Standard' },
          ].map(t => (
            <div key={t.tier} style={{
              background: 'var(--dark-2)',
              border: `1px solid ${t.border}`,
              borderRadius: 10,
              padding: '28px 24px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>{t.icon}</div>
              <div style={{ fontFamily: 'Bebas Neue', fontSize: 20, color: t.color, letterSpacing: '0.1em' }}>{t.tier}</div>
              <div style={{ fontFamily: 'Bebas Neue', fontSize: 48, color: t.color, lineHeight: 1, margin: '8px 0' }}>{t.price}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>Per Vehicle</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>{t.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section style={{
        borderTop: '1px solid var(--border)',
        padding: '80px 40px',
        maxWidth: 900,
        margin: '0 auto',
      }}>
        <div className="section-label" style={{ textAlign: 'center', marginBottom: 48 }}>How It Works</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {[
            { n: '01', title: 'Register', desc: 'Fill in your details and vehicle information for your state.' },
            { n: '02', title: 'Activate', desc: 'We review your registration and activate your monitoring.' },
            { n: '03', title: 'Monitor', desc: 'AVIBM checks for earlier slots every minute, 24/7.' },
            { n: '04', title: 'Booked', desc: 'When a slot opens up, we book it and email you instantly.' },
          ].map(s => (
            <div key={s.n} style={{
              background: 'var(--dark-2)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: '24px 20px',
            }}>
              <div style={{ fontFamily: 'Bebas Neue', fontSize: 40, color: 'var(--gold)', opacity: 0.3, lineHeight: 1 }}>{s.n}</div>
              <div style={{ fontFamily: 'Bebas Neue', fontSize: 22, marginTop: 8, marginBottom: 8 }}>{s.title}</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--border)',
        padding: '24px 40px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{ fontFamily: 'Bebas Neue', fontSize: 16, color: 'var(--gold)', letterSpacing: '0.15em' }}>AVIBM</span>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Australian Vehicle Inspection Booking Monitor</span>
      </footer>
    </main>
  )
}
