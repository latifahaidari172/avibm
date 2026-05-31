import Link from 'next/link'

// Shared site footer used on the landing page and every content/legal page.
// Columns mirror Auction Intel's footer (Site · Navigation · Support) but the
// links and copy are AVIBM's own.
const linkCls = 'text-on-surface-variant hover:text-secondary transition-colors font-body-md'

export function SiteFooter() {
  return (
    <footer className="w-full pt-section-gap pb-10 bg-surface-container-lowest border-t border-outline-variant/10">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-grid-gutter max-w-container-max-width mx-auto px-grid-gutter">
        <div className="col-span-2 md:col-span-1">
          <div className="font-headline-md text-primary mb-4">AVIBM</div>
          <p className="text-on-surface-variant font-body-md">
            High-performance automated inspection monitoring for Australian written-off vehicles.
          </p>
        </div>
        <div>
          <h5 className="font-label-bold text-primary mb-6 uppercase tracking-widest">Site</h5>
          <ul className="space-y-4">
            <li><Link className={linkCls} href="/about">About</Link></li>
            <li><Link className={linkCls} href="/guides">Guides</Link></li>
            <li><Link className={linkCls} href="/faq">FAQ</Link></li>
            <li><Link className={linkCls} href="/sitemap">Sitemap</Link></li>
            <li><Link className={linkCls} href="/terms">Terms</Link></li>
            <li><Link className={linkCls} href="/privacy">Privacy</Link></li>
          </ul>
        </div>
        <div>
          <h5 className="font-label-bold text-primary mb-6 uppercase tracking-widest">Navigation</h5>
          <ul className="space-y-4">
            <li><Link className={linkCls} href="/#features">Monitoring</Link></li>
            <li><Link className={linkCls} href="/#process">Auto Booking</Link></li>
            <li><Link className={linkCls} href="/#regions">Regions</Link></li>
            <li><Link className={linkCls} href="/#pricing">Pricing</Link></li>
          </ul>
        </div>
        <div>
          <h5 className="font-label-bold text-primary mb-6 uppercase tracking-widest">Support</h5>
          <ul className="space-y-4">
            <li><a className={linkCls} href="mailto:navidhaidari12@gmail.com">Contact Support</a></li>
            <li><Link className={linkCls} href="/status">Monitor Status</Link></li>
            <li><Link className={linkCls} href="/account/sign-in">Account</Link></li>
            <li><a className={linkCls} href="https://auction-intel.com" target="_blank" rel="noopener noreferrer">Auction Intel ↗</a></li>
          </ul>
        </div>
      </div>
      <div className="max-w-container-max-width mx-auto px-grid-gutter mt-20 pt-8 border-t border-outline-variant/5 text-center">
        <p className="text-on-surface-variant font-body-md opacity-60">© 2026 AVIBM. High-Performance Inspection Monitoring.</p>
        <p className="text-on-surface-variant text-[12px] opacity-50 mt-2">
          A companion product to Auction Intel. Not affiliated with, or endorsed by, any state transport, road or motor-registry authority.
        </p>
        <p className="text-on-surface-variant text-[11px] opacity-40 mt-2">
          Adelaide skyline by <a className="hover:text-secondary" href="https://commons.wikimedia.org/wiki/File:Adelaide_2022_Skyline.jpg" target="_blank" rel="noopener noreferrer">Outoftheblue9</a>, <a className="hover:text-secondary" href="https://creativecommons.org/licenses/by-sa/4.0" target="_blank" rel="noopener noreferrer">CC BY-SA 4.0</a>
        </p>
      </div>
    </footer>
  )
}
