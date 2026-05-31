import type { Metadata } from 'next'
import Link from 'next/link'
import { PageShell } from '@/components/legal'

export const metadata: Metadata = {
  title: 'Sitemap — AVIBM',
  description: 'All AVIBM pages in one place.',
}

const GROUPS: { heading: string; links: { label: string; href: string; external?: boolean }[] }[] = [
  {
    heading: 'Main',
    links: [
      { label: 'Home', href: '/' },
      { label: 'Sign in', href: '/account/sign-in' },
      { label: 'Your account', href: '/account' },
      { label: 'Monitor status', href: '/status' },
    ],
  },
  {
    heading: 'Register a vehicle',
    links: [
      { label: 'Queensland (WOVI)', href: '/register/qld' },
      { label: 'South Australia', href: '/register/sa' },
    ],
  },
  {
    heading: 'Site',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Guides', href: '/guides' },
      { label: 'FAQ', href: '/faq' },
      { label: 'Terms of Service', href: '/terms' },
      { label: 'Privacy Policy', href: '/privacy' },
    ],
  },
  {
    heading: 'Companion',
    links: [
      { label: 'Auction Intel ↗', href: 'https://auction-intel.com', external: true },
    ],
  },
]

export default function SitemapPage() {
  return (
    <PageShell
      eyebrow="Sitemap"
      title="Sitemap"
      intro="Every page on AVIBM, in one place."
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-grid-gutter gap-y-10">
        {GROUPS.map((g) => (
          <div key={g.heading}>
            <h2 className="font-label-bold text-primary mb-5 uppercase tracking-widest">{g.heading}</h2>
            <ul className="space-y-3">
              {g.links.map((l) => (
                <li key={l.href}>
                  {l.external
                    ? <a className="text-on-surface-variant hover:text-primary transition-colors" href={l.href} target="_blank" rel="noopener noreferrer">{l.label}</a>
                    : <Link className="text-on-surface-variant hover:text-primary transition-colors" href={l.href}>{l.label}</Link>}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </PageShell>
  )
}
