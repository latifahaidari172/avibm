'use client'
import Link from 'next/link'

export default function Home() {
  return (
    <main style={{ minHeight: '100vh' }}>

      {/* Header */}
      <header style={{
        borderBottom: '1px solid var(--border)',
        padding: '16px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'sticky', top: 0,
        background: 'rgba(10,10,10,0.95)',
        backdropFilter: 'blur(10px)',
        zIndex: 100,
      }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontFamily: 'Bebas Neue', fontSize: 22, letterSpacing: '0.15em', color: 'var(--gold)' }}>AVIBM</span>
          <span style={{ color: 'var(--text-muted)', fontSize: 10, letterSpacing: '0.08em', lineHeight: 1 }}>VEHICLE INSPECTION BOOKING MONITOR</span>
        </div>
        <Link href="/status" style={{ color: 'var(--gold)', fontSize: 13, textDecoration: 'none', letterSpacing: '0.05em', border: '1px solid var(--gold)', padding: '6px 14px', borderRadius: 6 }}>
          Check Status
        </Link>
      </header>

      {/* Hero */}
      <section style={{ padding: 'clamp(40px,8vw,100px) 20px 40px', maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
        <div className="section-label" style={{ marginBottom: 16 }}>Automated Booking Technology</div>
        <h1 style={{ fontSize: 'clamp(40px,9vw,96px)', lineHeight: 1, marginBottom: 20, color: 'var(--text)' }}>
          NEVER MISS AN<br /><span className="gold">EARLIER SLOT</span><br />AGAIN
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 'clamp(14px,3.5vw,17px)', maxWidth: 540, margin: '0 auto 32px', lineHeight: 1.7, padding: '0 8px' }}>
          AVIBM monitors written-off vehicle inspection booking systems 24/7 and automatically reschedules your vehicle the moment an earlier date becomes available.
        </p>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 48, maxWidth: 500, margin: '0 auto 48px' }}>
          {[
            { n: '24/7', label: 'Monitoring' },
            { n: '~1 min', label: 'Check Interval' },
            { n: 'Auto', label: 'Booking' },
            { n: 'Instant', label: 'Email Alert' },
          ].map(s => (
            <div key={s.n} style={{
              background: 'var(--dark-2)',
              border: '1px solid var(--border)',
              padding: '16px 12px',
              borderRadius: 8,
              textAlign: 'center',
            }}>
              <div style={{ fontFamily: 'Bebas Neue', fontSize: 'clamp(22px,5vw,28px)', color: 'var(--gold)', letterSpacing: '0.05em' }}>{s.n}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* State Cards */}
      <section style={{ padding: '0 20px 60px', maxWidth: 900, margin: '0 auto' }}>
        <div className="section-label" style={{ textAlign: 'center', marginBottom: 24 }}>Select Your State</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>

          {/* QLD */}
          <Link href="/register/qld" style={{ textDecoration: 'none', display: 'block' }}>
            <div style={{
              background: 'var(--dark-2)', border: '1px solid var(--border)',
              borderRadius: 12, padding: '32px 24px', cursor: 'pointer',
              transition: 'border-color 0.2s, transform 0.2s', position: 'relative',
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--gold)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)' }}
            >
              <div style={{ fontSize: 40, marginBottom: 12 }}>🦘</div>
              <h2 style={{ fontSize: 'clamp(24px,5vw,36px)', color: 'var(--text)', marginBottom: 8 }}>QUEENSLAND</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.6, marginBottom: 40 }}>
                WOVI — Written Off Vehicle Inspections<br />
                Brisbane · Burleigh Heads · Narangba · Yatala
              </p>
              <div style={{ position: 'absolute', bottom: 20, right: 24, fontFamily: 'Bebas Neue', fontSize: 14, color: 'var(--gold)', letterSpacing: '0.1em' }}>REGISTER →</div>
            </div>
          </Link>

          {/* SA */}
          <Link href="/register/sa" style={{ textDecoration: 'none', display: 'block' }}>
            <div style={{
              background: 'var(--dark-2)', border: '1px solid var(--border)',
              borderRadius: 12, padding: '32px 24px', cursor: 'pointer',
              transition: 'border-color 0.2s, transform 0.2s', position: 'relative',
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--gold)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)' }}
            >
              <div style={{ fontSize: 40, marginBottom: 12 }}>🏜️</div>
              <h2 style={{ fontSize: 'clamp(24px,5vw,36px)', color: 'var(--text)', marginBottom: 8 }}>SOUTH AUSTRALIA</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.6, marginBottom: 40 }}>
                Service SA — Vehicle Inspection Bookings<br />
                Regency Park
              </p>
              <div style={{ position: 'absolute', bottom: 20, right: 24, fontFamily: 'Bebas Neue', fontSize: 14, color: 'var(--gold)', letterSpacing: '0.1em' }}>REGISTER →</div>
            </div>
          </Link>
        </div>

        {/* Coming soon */}
        <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {['VIC', 'NSW', 'WA', 'NT'].map(s => (
            <div key={s} style={{
              background: 'var(--dark-2)', border: '1px solid var(--border)',
              borderRadius: 8, padding: '12px 8px', textAlign: 'center', opacity: 0.4,
            }}>
              <div style={{ fontFamily: 'Bebas Neue', fontSize: 18, color: 'var(--text-muted)' }}>{s}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.08em' }}>COMING SOON</div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section style={{ borderTop: '1px solid var(--border)', padding: 'clamp(40px,6vw,80px) 20px', maxWidth: 900, margin: '0 auto' }}>
        <div className="section-label" style={{ textAlign: 'center', marginBottom: 8 }}>Pricing</div>
        <h2 style={{ fontSize: 'clamp(28px,6vw,48px)', textAlign: 'center', marginBottom: 32 }}>ONE-TIME FEE <span className="gold">PER VEHICLE</span></h2>

        {/* QLD Pricing */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <span style={{ fontFamily: 'Bebas Neue', fontSize: 13, letterSpacing: '0.2em', color: '#5ab0ff' }}>QUEENSLAND — WOVI</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, maxWidth: 700, margin: '0 auto' }}>
            {[
              { icon: '🥇', tier: 'Priority', price: '$5', color: 'var(--gold)', border: 'var(--gold)', desc: 'First in queue — books immediately' },
              { icon: '🥈', tier: 'Standard', price: '$3', color: '#aaa', border: 'var(--border)', desc: '30 second delay after Priority' },
              { icon: '🥉', tier: 'Basic', price: '$1.50', color: '#888', border: 'var(--border)', desc: '60 second delay after Standard' },
            ].map(t => (
              <div key={t.tier} style={{
                background: 'var(--dark-2)', border: `1px solid ${t.border}`,
                borderRadius: 10, padding: '24px 16px', textAlign: 'center',
              }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>{t.icon}</div>
                <div style={{ fontFamily: 'Bebas Neue', fontSize: 18, color: t.color, letterSpacing: '0.1em' }}>{t.tier}</div>
                <div style={{ fontFamily: 'Bebas Neue', fontSize: 40, color: t.color, lineHeight: 1, margin: '6px 0' }}>{t.price}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Per Vehicle</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>{t.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* SA Pricing */}
        <div style={{ maxWidth: 340, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <span style={{ fontFamily: 'Bebas Neue', fontSize: 13, letterSpacing: '0.2em', color: '#c080ff' }}>SOUTH AUSTRALIA — SERVICE SA</span>
          </div>
          <div style={{
            background: 'var(--dark-2)', border: '1px solid var(--gold)',
            borderRadius: 10, padding: '24px 16px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>🥇</div>
            <div style={{ fontFamily: 'Bebas Neue', fontSize: 18, color: 'var(--gold)', letterSpacing: '0.1em' }}>Priority</div>
            <div style={{ fontFamily: 'Bebas Neue', fontSize: 40, color: 'var(--gold)', lineHeight: 1, margin: '6px 0' }}>$5</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Per Vehicle</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>Flat rate — always priority, checks every minute 24/7</div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section style={{ borderTop: '1px solid var(--border)', padding: 'clamp(40px,6vw,80px) 20px', maxWidth: 900, margin: '0 auto' }}>
        <div className="section-label" style={{ textAlign: 'center', marginBottom: 32 }}>How It Works</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
          {[
            { n: '01', title: 'Register', desc: 'Fill in your details and vehicle information for your state.' },
            { n: '02', title: 'Activate', desc: 'We review your registration and activate your monitoring.' },
            { n: '03', title: 'Monitor', desc: 'AVIBM checks for earlier slots every minute, 24/7.' },
            { n: '04', title: 'Booked', desc: 'When a slot opens, we book it and email you instantly.' },
          ].map(s => (
            <div key={s.n} style={{
              background: 'var(--dark-2)', border: '1px solid var(--border)',
              borderRadius: 10, padding: '20px 16px',
            }}>
              <div style={{ fontFamily: 'Bebas Neue', fontSize: 36, color: 'var(--gold)', opacity: 0.3, lineHeight: 1 }}>{s.n}</div>
              <div style={{ fontFamily: 'Bebas Neue', fontSize: 20, marginTop: 8, marginBottom: 8 }}>{s.title}</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--border)', padding: '20px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8,
      }}>
        <span style={{ fontFamily: 'Bebas Neue', fontSize: 16, color: 'var(--gold)', letterSpacing: '0.15em' }}>AVIBM</span>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          <Link href="/status" style={{ fontSize: 12, color: 'var(--text-muted)', textDecoration: 'none' }}>Check Monitor Status</Link>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Australian Vehicle Inspection Booking Monitor</span>
        </div>
      </footer>

    </main>
  )
}
