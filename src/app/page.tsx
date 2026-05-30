'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

// AVIBM landing page. Dark/gold "Stitch" design ported to the app's Tailwind
// (tokens added in tailwind.config.js; Material Symbols + custom classes in
// globals.css). Wired to the real routes: Sign In → /account/sign-in, the
// QLD/SA cards → /register/{qld,sa}, CTAs scroll to the relevant sections.
export default function Home() {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const fill1 = { fontVariationSettings: "'FILL' 1" } as React.CSSProperties

  return (
    <div className="font-body-md text-body-md bg-background text-on-background min-h-screen selection:bg-primary selection:text-on-primary">
      {/* TopNavBar */}
      <nav className={`fixed top-0 w-full z-50 bg-background/80 backdrop-blur-md border-b border-outline-variant/10 h-20 transition-all ${scrolled ? 'bg-background/95 shadow-lg' : ''}`}>
        <div className="flex justify-between items-center px-grid-gutter max-w-container-max-width mx-auto h-full">
          <div className="font-display-lg text-primary tracking-tighter text-[32px]">AVIBM</div>
          <div className="hidden md:flex items-center gap-8">
            <a className="text-primary font-bold border-b-2 border-primary pb-1 text-body-md" href="#features">Monitoring</a>
            <a className="text-on-surface-variant hover:text-primary transition-colors duration-300 text-body-md" href="#process">Auto Booking</a>
            <a className="text-on-surface-variant hover:text-primary transition-colors duration-300 text-body-md" href="#regions">Regions</a>
            <a className="text-on-surface-variant hover:text-primary transition-colors duration-300 text-body-md" href="#pricing">Pricing</a>
            <a className="text-on-surface-variant hover:text-primary transition-colors duration-300 text-body-md" href="#process">Process</a>
          </div>
          <Link href="/account/sign-in" className="bg-primary text-on-primary px-6 py-2 rounded-lg font-label-bold text-label-bold uppercase tracking-widest hover:bg-primary/90 transition-all">
            Sign In
          </Link>
        </div>
      </nav>

      <main>
        {/* Hero */}
        <section className="relative h-screen flex items-center overflow-hidden pt-20">
          <div className="absolute inset-0 z-0">
            <img className="w-full h-full object-cover" alt="" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAcUZQa6lyqvIlvLhdig43uLymJUoeupWSifX-5LL7hkna067scSLc1d-6xcJqTUbaoDmjvD9yTzvBIUpUOG9L7_TxRqdXNtUL8UTZEN6tNo7_pVXAK7_LLUMTPekNJuTYoKD-3DkOgpJcqIM5eRsqvo1q5CfHCndQo-vMtIlwDz7Mam-w4se1LLkjUvU4p8xuqc9H1dNmR4eXrHjXi7S7QRXB02sz_I004ABBEP5GbKE66aJ-QwVGTvkN-qLATP6rqJGyP1waWmXg" />
            <div className="absolute inset-0 hero-gradient"></div>
          </div>
          <div className="relative z-10 max-w-container-max-width mx-auto px-grid-gutter w-full">
            <div className="max-w-2xl">
              <div className="inline-block bg-primary/10 border border-primary/20 text-primary px-3 py-1 rounded-full text-label-bold mb-6 tracking-widest">
                AUTOMATED BOOKING TECHNOLOGY
              </div>
              <h1 className="font-display-lg text-display-lg text-on-background mb-6 leading-none">
                NEVER MISS AN<br />
                <span className="text-primary">EARLIER SLOT</span><br />
                AGAIN
              </h1>
              <p className="font-body-lg text-body-lg text-on-surface-variant mb-10 max-w-lg">
                AVIBM monitors written-off vehicle inspection systems 24/7 and automatically reschedules your vehicle the moment an earlier date becomes available.
              </p>
              <div className="flex flex-wrap gap-4">
                <a href="#regions" className="bg-primary text-on-primary px-10 py-4 rounded-lg font-label-bold text-label-bold uppercase tracking-widest hover:scale-105 transition-transform gold-glow">
                  REGISTER VEHICLE
                </a>
                <a href="#pricing" className="border border-primary text-primary px-10 py-4 rounded-lg font-label-bold text-label-bold uppercase tracking-widest hover:bg-primary/5 transition-colors">
                  VIEW PRICING
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Grid */}
        <section id="features" className="landing-anchor py-section-gap max-w-container-max-width mx-auto px-grid-gutter">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-grid-gutter">
            {[
              { icon: 'schedule', title: '24/7 MONITORING', body: 'Constant surveillance of booking portals while you sleep.' },
              { icon: 'speed', title: '~1 MIN CHECK', body: "High-frequency polling ensures you're always first in line." },
              { icon: 'smart_toy', title: 'AUTO BOOKING', body: 'Instant automated rescheduling the millisecond a slot opens.' },
              { icon: 'notifications_active', title: 'INSTANT ALERTS', body: 'Receive email confirmation the moment your booking is secured.' },
            ].map((c) => (
              <div key={c.title} className="bg-surface-container-low lustre-border p-card-padding rounded-xl surface-lift group hover:bg-surface-container-high transition-all">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-6 text-primary group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined" style={fill1}>{c.icon}</span>
                </div>
                <h3 className="font-headline-md text-[24px] mb-2">{c.title}</h3>
                <p className="text-on-surface-variant font-body-md">{c.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Region Selection */}
        <section id="regions" className="landing-anchor py-section-gap bg-surface-container-lowest">
          <div className="max-w-container-max-width mx-auto px-grid-gutter">
            <h2 className="font-headline-md text-headline-md text-center mb-16 tracking-widest">SELECT YOUR STATE</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
              {/* QLD */}
              <Link href="/register/qld" className="relative group cursor-pointer overflow-hidden rounded-xl lustre-border h-64 block">
                <img className="w-full h-full object-cover grayscale opacity-40 group-hover:opacity-60 group-hover:scale-110 transition-all duration-700" alt="" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCz9XPltbN4kvXIWa0Qooa5hcqbePnzSxQJmdPkrrIZIzWGlg_mg42eFfXV0g0HDDbAEivtEtj9dZ-xJZmh2cXY-Bkp6OrKZmjZH7xKBHEfkAFHO8r0oSGnoFa3UvS0M2i1wMI43i4bxWmVpph2T6sx2Ld9xTYuzNW1lztkYko97GGkmSz0wwG3SzFYk7eYhqsmPc6U6CNPmZngaMOB0p4ErOqx_ZyZFQkC2ddObbouCvdZhUGmzdsPAqxQpOj1xhmwv-3uUHlXWs8" />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent p-card-padding flex flex-col justify-end">
                  <div className="flex justify-between items-end">
                    <div>
                      <span className="text-primary font-label-bold tracking-widest">QLD - QUEENSLAND</span>
                      <h3 className="font-display-lg text-[40px] leading-tight mt-2">WOVI INSPECTIONS</h3>
                      <p className="text-on-surface-variant text-sm mt-1">Brisbane · Burleigh Heads · Narangba · Yatala</p>
                    </div>
                    <span className="material-symbols-outlined text-primary text-4xl group-hover:translate-x-2 transition-transform">arrow_forward</span>
                  </div>
                </div>
              </Link>
              {/* SA */}
              <Link href="/register/sa" className="relative group cursor-pointer overflow-hidden rounded-xl lustre-border h-64 block">
                <img className="w-full h-full object-cover grayscale opacity-40 group-hover:opacity-60 group-hover:scale-110 transition-all duration-700" alt="" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDPuBJFSaa9yBWVhgXsfMxAv171LaIabPzowYhBoJWSiQJi-CUzLfgu8C7DLSV1yHx5C_2IlwarS1lkWm-y1VVS55d6HGCLnVFMNd79KQ_XyDmIhwoijiNBua-SDo4SC_iSqPIQqind26AvlosPszWfGnB4pWxD672XVAE9aWrqF4hn0firWK-fqyC7hYmno4lyDSAKHdNAOTRGwtF7LM0JReUjobcLYD8abmJUjDeLIxkq66fTSuNw9SoHmSut5nw2zia-8Mkd_4I" />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent p-card-padding flex flex-col justify-end">
                  <div className="flex justify-between items-end">
                    <div>
                      <span className="text-primary font-label-bold tracking-widest">SA - SOUTH AUSTRALIA</span>
                      <h3 className="font-display-lg text-[40px] leading-tight mt-2">SERVICE SA</h3>
                      <p className="text-on-surface-variant text-sm mt-1">Regency Park Inspection Centre</p>
                    </div>
                    <span className="material-symbols-outlined text-primary text-4xl group-hover:translate-x-2 transition-transform">arrow_forward</span>
                  </div>
                </div>
              </Link>
            </div>
            <div className="flex flex-wrap justify-center gap-4 opacity-50">
              {['VIC', 'NSW', 'WA', 'NT'].map((s) => (
                <span key={s} className="px-4 py-2 border border-outline-variant rounded-full text-label-bold uppercase">{s} - COMING SOON</span>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="landing-anchor py-section-gap max-w-container-max-width mx-auto px-grid-gutter">
          <div className="text-center mb-16">
            <span className="text-primary font-label-bold tracking-[0.3em] uppercase">Pricing</span>
            <h2 className="font-headline-md text-headline-md mt-4">ONE-TIME FEE PER VEHICLE</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-grid-gutter">
            {/* Basic */}
            <div className="bg-surface-container-low lustre-border p-10 rounded-xl surface-lift text-center flex flex-col h-full">
              <h3 className="font-display-lg text-[24px] mb-4 text-on-surface-variant">BASIC</h3>
              <div className="mb-6">
                <span className="text-[56px] font-display-lg">$1.50</span>
                <span className="text-on-surface-variant block font-label-bold">PER VEHICLE</span>
              </div>
              <div className="border-t border-outline-variant/10 my-6"></div>
              <p className="text-on-surface-variant mb-8 flex-grow">60 second delay after Standard monitoring</p>
              <a href="#regions" className="border border-outline text-on-surface-variant w-full py-3 rounded-lg font-label-bold hover:bg-white/5 transition-all">SELECT BASIC</a>
            </div>
            {/* Priority */}
            <div className="bg-surface-container-high border-2 border-primary p-10 rounded-xl surface-lift text-center relative flex flex-col h-full gold-glow transform md:-translate-y-4 md:scale-105">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-on-primary px-4 py-1 rounded-full text-label-bold uppercase">MOST POPULAR</div>
              <h3 className="font-display-lg text-[24px] mb-4 text-primary">PRIORITY</h3>
              <div className="mb-6">
                <span className="text-[56px] font-display-lg">$5</span>
                <span className="text-on-surface-variant block font-label-bold">PER VEHICLE</span>
              </div>
              <div className="border-t border-outline-variant/10 my-6"></div>
              <p className="text-on-surface-variant mb-8 flex-grow">First in queue — booking portal checks every minute and books immediately.</p>
              <a href="#regions" className="bg-primary text-on-primary w-full py-3 rounded-lg font-label-bold hover:bg-primary/90 transition-all">SELECT PRIORITY</a>
            </div>
            {/* Standard */}
            <div className="bg-surface-container-low lustre-border p-10 rounded-xl surface-lift text-center flex flex-col h-full">
              <h3 className="font-display-lg text-[24px] mb-4 text-on-surface-variant">STANDARD</h3>
              <div className="mb-6">
                <span className="text-[56px] font-display-lg">$3</span>
                <span className="text-on-surface-variant block font-label-bold">PER VEHICLE</span>
              </div>
              <div className="border-t border-outline-variant/10 my-6"></div>
              <p className="text-on-surface-variant mb-8 flex-grow">30 second delay after Priority monitoring</p>
              <a href="#regions" className="border border-outline text-on-surface-variant w-full py-3 rounded-lg font-label-bold hover:bg-white/5 transition-all">SELECT STANDARD</a>
            </div>
          </div>
          <p className="text-center mt-12 text-on-surface-variant font-label-bold uppercase tracking-widest">
            SOUTH AUSTRALIA - SERVICE SA: <span className="text-primary ml-2">FREE / ALWAYS PRIORITY</span>
          </p>
        </section>

        {/* Process Flow */}
        <section id="process" className="landing-anchor py-section-gap bg-surface-container-lowest border-t border-outline-variant/10 overflow-hidden">
          <div className="max-w-container-max-width mx-auto px-grid-gutter">
            <h2 className="font-headline-md text-headline-md text-center mb-24 tracking-widest">HOW IT WORKS</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-12 relative">
              <div className="hidden md:block absolute top-12 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent z-0"></div>
              {[
                { n: '01', icon: 'edit_note', title: 'REGISTER', body: 'Fill in your details and vehicle information for your state.', last: false },
                { n: '02', icon: 'verified_user', title: 'ACTIVATE', body: 'We review your registration and activate your monitoring.', last: false },
                { n: '03', icon: 'visibility', title: 'MONITOR', body: 'AVIBM checks for earlier slots every minute, 24/7.', last: false },
                { n: '04', icon: 'task_alt', title: 'BOOKED', body: 'When a slot opens, we book it and email you instantly.', last: true },
              ].map((s) => (
                <div key={s.n} className="relative z-10 text-center">
                  <div className="relative inline-block mb-8">
                    <span className="font-display-lg text-[100px] leading-none opacity-20 absolute -top-8 -left-4 step-number">{s.n}</span>
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto relative z-10 ${s.last ? 'bg-primary gold-glow' : 'bg-background border-2 border-primary'}`}>
                      <span className={`material-symbols-outlined ${s.last ? 'text-on-primary' : 'text-primary'}`}>{s.icon}</span>
                    </div>
                  </div>
                  <h4 className="font-display-lg text-[24px] mb-4 tracking-wider">{s.title}</h4>
                  <p className="text-on-surface-variant">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full pt-section-gap pb-10 bg-surface-container-lowest border-t border-outline-variant/10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-grid-gutter max-w-container-max-width mx-auto px-grid-gutter">
          <div className="col-span-1 md:col-span-1">
            <div className="font-headline-md text-primary mb-4">AVIBM</div>
            <p className="text-on-surface-variant font-body-md">High-performance automated inspection monitoring for Australian vehicles.</p>
          </div>
          <div>
            <h5 className="font-label-bold text-primary mb-6 uppercase tracking-widest">Navigation</h5>
            <ul className="space-y-4">
              <li><a className="text-on-surface-variant hover:text-secondary transition-colors font-body-md" href="#features">Monitoring</a></li>
              <li><a className="text-on-surface-variant hover:text-secondary transition-colors font-body-md" href="#process">Auto Booking</a></li>
              <li><a className="text-on-surface-variant hover:text-secondary transition-colors font-body-md" href="#regions">Regions</a></li>
            </ul>
          </div>
          <div>
            <h5 className="font-label-bold text-primary mb-6 uppercase tracking-widest">Support</h5>
            <ul className="space-y-4">
              <li><a className="text-on-surface-variant hover:text-secondary transition-colors font-body-md" href="mailto:navidhaidari12@gmail.com">Contact Support</a></li>
              <li><a className="text-on-surface-variant hover:text-secondary transition-colors font-body-md" href="/status">Monitor Status</a></li>
              <li><Link className="text-on-surface-variant hover:text-secondary transition-colors font-body-md" href="/account/sign-in">Account Management</Link></li>
            </ul>
          </div>
          <div>
            <h5 className="font-label-bold text-primary mb-6 uppercase tracking-widest">Legal</h5>
            <ul className="space-y-4">
              <li><a className="text-on-surface-variant hover:text-secondary transition-colors font-body-md" href="#">Terms of Service</a></li>
              <li><a className="text-on-surface-variant hover:text-secondary transition-colors font-body-md" href="#">Privacy Policy</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-container-max-width mx-auto px-grid-gutter mt-20 pt-8 border-t border-outline-variant/5 text-center">
          <p className="text-on-surface-variant font-body-md opacity-60">© 2026 AVIBM. High-Performance Inspection Monitoring.</p>
        </div>
      </footer>
    </div>
  )
}
