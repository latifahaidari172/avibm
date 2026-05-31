import Link from 'next/link'
import { PreviewShell, Arrow } from '@/lib/previewDesign'
import { SiteFooter } from '@/components/SiteFooter'

// AVIBM landing page — maximalist "Ethereal Glass" design (ported from the
// account-preview prototype) wired to the real routes: Sign In → /account/sign-in,
// the QLD/SA cards → /register/{qld,sa}, CTAs scroll to the relevant sections.
const STEPS = [
  { n: '01', t: 'Register', d: 'Fill in your details and vehicle information for your state — VIN autofills the rest.', c: 'var(--gold-2)' },
  { n: '02', t: 'Activate', d: 'We review your registration and switch on round-the-clock monitoring.', c: 'var(--blue)' },
  { n: '03', t: 'Monitor', d: 'AVIBM checks the inspection booking system for an earlier slot every minute, 24/7.', c: 'var(--violet)' },
  { n: '04', t: 'Booked', d: 'The moment an earlier slot opens, we rebook it and email you instantly.', c: 'var(--green)' },
]
const STATES = [
  { code: 'QLD', city: 'Brisbane', href: '/register/qld', img: '/brisbane-skyline.jpg', title: 'Queensland', sub: 'WOVI · Brisbane · Burleigh Heads · Narangba · Yatala' },
  { code: 'SA', city: 'Adelaide', href: '/register/sa', img: '/adelaide-skyline-2022.jpg', title: 'South Australia', sub: 'Service SA · Regency Park Inspection Centre' },
]
const PRICING = [
  { name: 'Priority', price: '$5', desc: 'First in the queue — books the instant a slot opens.', feat: ['First in the queue', 'Checks every minute', 'All centres'], c: 'var(--gold-2)', hot: true },
  { name: 'Standard', price: '$3', desc: '30s delay after Priority monitoring.', feat: ['Fast rebooking', 'All centres', 'Email alerts'], c: '#cfcabb' },
  { name: 'Basic', price: '$1.50', desc: '60s delay after Standard monitoring.', feat: ['Automated rebooking', 'All centres', 'Email alerts'], c: '#b08d57' },
]

export default function Home() {
  return (
    <>
      <PreviewShell>
        {/* nav */}
        <div className="r card" style={{ borderRadius: 999, padding: '9px 9px 9px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 56 }}>
          <a href="#top" className="disp shimmer" style={{ fontSize: 21, textDecoration: 'none' }}>AVIBM</a>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <a href="#how" className="hide-sm navlink" style={{ marginRight: 8 }}>How it works</a>
            <a href="#pricing" className="hide-sm navlink" style={{ marginRight: 8 }}>Pricing</a>
            <div style={{ display: 'flex', alignItems: 'stretch', gap: 8 }}>
              <Link href="/account/sign-in" className="pill ghost" style={{ padding: '0 18px', textDecoration: 'none' }}>Sign in</Link>
              <a href="#regions" className="pill gold" style={{ padding: '9px 12px 9px 18px', textDecoration: 'none' }}>Register vehicle<span className="ibtn"><Arrow /></span></a>
            </div>
          </div>
        </div>

        {/* hero */}
        <div id="top" className="bento-l" style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 22, alignItems: 'center', marginBottom: 72 }}>
          <div className="r">
            <span className="eyebrow">Automated booking technology</span>
            <h1 className="disp" style={{ fontSize: 'clamp(46px,7vw,88px)', marginTop: 22 }}>Get inspected <span className="shimmer">sooner.</span></h1>
            <p style={{ color: 'var(--muted)', fontSize: 18, marginTop: 22, maxWidth: 480, lineHeight: 1.55 }}>
              AVIBM monitors written-off vehicle inspection systems around the clock and automatically rebooks the earliest slot that opens — so you&apos;re back on the road weeks ahead.
            </p>
            <div style={{ display: 'flex', gap: 12, marginTop: 30, flexWrap: 'wrap' }}>
              <a href="#regions" className="pill gold" style={{ fontSize: 15, textDecoration: 'none' }}>Register vehicle<span className="ibtn"><Arrow /></span></a>
              <a href="#how" className="pill ghost" style={{ padding: '13px 22px', textDecoration: 'none' }}>See how it works</a>
            </div>
          </div>
          <div className="r card" style={{ animationDelay: '.1s', padding: 28, minHeight: 240, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: 'radial-gradient(120% 100% at 100% 0%, rgba(98,227,106,0.16), transparent 55%), linear-gradient(180deg,rgba(20,18,16,0.86),rgba(11,10,9,0.92))' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="eyebrow" style={{ color: 'var(--green)', background: 'rgba(98,227,106,0.08)', borderColor: 'rgba(98,227,106,0.3)' }}>Live result</span>
              <span className="spill" style={{ color: 'var(--green)', background: 'rgba(98,227,106,0.14)', border: '1px solid rgba(98,227,106,0.4)' }}><span className="dot live" style={{ background: 'var(--green)' }} />Rebooked</span>
            </div>
            <div>
              <div className="disp" style={{ fontSize: 72, color: 'var(--green)' }}>38</div>
              <div style={{ fontSize: 15, color: 'var(--muted)', marginTop: 4 }}>days earlier than the original booking</div>
            </div>
          </div>
        </div>

        {/* how it works */}
        <div id="how" className="r" style={{ textAlign: 'center', marginBottom: 28, scrollMarginTop: 90 }}><span className="eyebrow">How it works</span></div>
        <div className="r" style={{ animationDelay: '.06s', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))', gap: 18, marginBottom: 80 }}>
          {STEPS.map(s => (
            <div key={s.n} className="card" style={{ padding: 26 }}>
              <div className="disp" style={{ fontSize: 38, color: s.c }}>{s.n}</div>
              <h3 className="disp" style={{ fontSize: 22, marginTop: 14 }}>{s.t}</h3>
              <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 10, lineHeight: 1.55 }}>{s.d}</p>
            </div>
          ))}
        </div>

        {/* state selection */}
        <div id="regions" className="r" style={{ textAlign: 'center', marginBottom: 28, scrollMarginTop: 90 }}>
          <span className="eyebrow">Select your state</span>
          <h2 className="disp" style={{ fontSize: 'clamp(30px,4vw,46px)', marginTop: 16 }}>Where&apos;s your inspection?</h2>
        </div>
        <div className="r" style={{ animationDelay: '.06s', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 18, marginBottom: 28 }}>
          {STATES.map(s => (
            <Link key={s.code} href={s.href} className="card" style={{ overflow: 'hidden', padding: 0, cursor: 'pointer', textDecoration: 'none', color: 'inherit', display: 'block' }}>
              <div style={{ position: 'relative', height: 230 }}>
                <img src={s.img} alt={`${s.city} skyline`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(6,6,6,0.96) 4%, transparent 62%)' }} />
                <span className="spill" style={{ position: 'absolute', top: 16, right: 16, color: 'var(--gold-2)', background: 'rgba(201,168,76,0.16)', border: '1px solid rgba(201,168,76,0.5)' }}>{s.code}</span>
                <div style={{ position: 'absolute', left: 22, right: 22, bottom: 18 }}>
                  <div className="disp" style={{ fontSize: 34, color: '#fff' }}>{s.title}</div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 6 }}>{s.sub}</div>
                </div>
              </div>
              <div style={{ padding: '16px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 14, color: 'var(--muted)' }}>Register in {s.city}</span>
                <span className="menu"><Arrow s={13} /></span>
              </div>
            </Link>
          ))}
        </div>
        <div className="r" style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 80 }}>
          {['VIC', 'NSW', 'WA', 'NT'].map(s => (
            <span key={s} className="chip" style={{ opacity: 0.5, cursor: 'default' }}>{s} — coming soon</span>
          ))}
        </div>

        {/* pricing */}
        <div id="pricing" className="r" style={{ textAlign: 'center', marginBottom: 28, scrollMarginTop: 90 }}><span className="eyebrow">Pricing · per vehicle</span></div>
        <div className="r" style={{ animationDelay: '.06s', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 18, marginBottom: 18 }}>
          {PRICING.map(p => (
            <div key={p.name} className="card" style={{ padding: 28, display: 'flex', flexDirection: 'column', ...(p.hot ? { boxShadow: '0 0 0 1px rgba(201,168,76,0.5), 0 40px 80px -28px rgba(0,0,0,0.95)' } : {}) }}>
              <div style={{ height: 24, marginBottom: 16 }}>{p.hot && <span className="eyebrow">Most popular</span>}</div>
              <div className="disp" style={{ fontSize: 22, color: p.c }}>{p.name}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 10 }}>
                <span className="disp" style={{ fontSize: 48 }}>{p.price}</span>
                <span style={{ color: 'var(--muted)', fontSize: 13 }}>/ vehicle</span>
              </div>
              <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 8 }}>{p.desc}</p>
              <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {p.feat.map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 14 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={p.c} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>{f}
                  </div>
                ))}
              </div>
              <div style={{ flex: 1, minHeight: 24 }} />
              <a href="#regions" className={p.hot ? 'pill gold' : 'pill ghost'} style={{ width: '100%', justifyContent: 'center', padding: '13px 0', textDecoration: 'none' }}>Choose {p.name}</a>
            </div>
          ))}
        </div>
        <p className="r" style={{ textAlign: 'center', marginBottom: 80, color: 'var(--muted)', fontSize: 13, letterSpacing: '0.04em' }}>
          South Australia · Service SA: <span style={{ color: 'var(--gold-2)', fontWeight: 700 }}>Free / always priority</span>
        </p>

        {/* final CTA */}
        <div className="r card" style={{ padding: 'clamp(32px,5vw,56px)', textAlign: 'center', background: 'radial-gradient(120% 140% at 50% 0%, rgba(201,168,76,0.14), transparent 60%), linear-gradient(180deg,rgba(20,18,16,0.86),rgba(11,10,9,0.92))' }}>
          <h2 className="disp" style={{ fontSize: 'clamp(32px,5vw,52px)' }}>Stop waiting. <span className="shimmer">Get inspected sooner.</span></h2>
          <p style={{ color: 'var(--muted)', fontSize: 16, marginTop: 16, maxWidth: 420, marginInline: 'auto' }}>Register your vehicle in under a minute and let the bot do the rest.</p>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 26 }}>
            <a href="#regions" className="pill gold" style={{ fontSize: 16, textDecoration: 'none' }}>Register vehicle<span className="ibtn"><Arrow /></span></a>
          </div>
        </div>

        <style dangerouslySetInnerHTML={{ __html: 'html{scroll-behavior:smooth}.navlink{font-size:13px;color:var(--muted);text-decoration:none;cursor:pointer;transition:color .3s var(--ease)}.navlink:hover{color:var(--ink)}@media(max-width:820px){.bento-l{grid-template-columns:1fr!important}}' }} />
      </PreviewShell>
      <SiteFooter />
    </>
  )
}
