import type { ReactNode } from 'react'
import { SiteNav } from './SiteNav'
import { SiteFooter } from './SiteFooter'

// Presentational toolkit shared by the content / legal pages (about, terms,
// privacy, faq, sitemap, guides). Matches the site's Bebas-Neue + DM-Sans,
// gold-on-dark design.

export function PageShell({ eyebrow, title, meta, intro, narrow = true, children }: {
  eyebrow?: string
  title: ReactNode
  meta?: string
  intro?: ReactNode
  narrow?: boolean
  children: ReactNode
}) {
  return (
    <div className="bg-background text-on-background min-h-screen font-body-md text-body-md selection:bg-primary selection:text-on-primary">
      <SiteNav />
      <main className={`${narrow ? 'max-w-3xl' : 'max-w-container-max-width'} mx-auto px-grid-gutter pt-14 md:pt-20 pb-24`}>
        <header className="mb-12">
          {eyebrow && (
            <span className="inline-block bg-primary/10 border border-primary/20 text-primary px-3 py-1 rounded-full text-label-bold uppercase tracking-widest mb-6">{eyebrow}</span>
          )}
          <h1 className="font-display-lg text-[44px] md:text-[64px] leading-none text-on-background">{title}</h1>
          {meta && <p className="text-on-surface-variant/70 text-body-md mt-5">{meta}</p>}
          {intro && <p className="text-on-surface-variant text-body-lg mt-6 leading-relaxed">{intro}</p>}
        </header>
        {children}
      </main>
      <SiteFooter />
    </div>
  )
}

export function Section({ n, title, id, children }: { n?: string | number; title: string; id?: string; children: ReactNode }) {
  return (
    <section id={id} className="mb-10 scroll-mt-28">
      <h2 className="flex items-baseline gap-3 mb-4">
        {n != null && <span className="text-primary font-display-lg text-[24px] leading-none">{n}</span>}
        <span className="text-on-background font-semibold text-[20px] tracking-tight">{title}</span>
      </h2>
      <div className="text-on-surface-variant leading-relaxed">{children}</div>
    </section>
  )
}

export function P({ children }: { children: ReactNode }) {
  return <p className="mb-4 leading-relaxed">{children}</p>
}

export function Bullets({ items }: { items: ReactNode[] }) {
  return (
    <ul className="space-y-3 mb-4">
      {items.map((it, i) => (
        <li key={i} className="flex gap-3 leading-relaxed">
          <span className="text-primary mt-1.5 shrink-0 text-[10px]">●</span>
          <span>{it}</span>
        </li>
      ))}
    </ul>
  )
}

export function Callout({ children, tone = 'gold' }: { children: ReactNode; tone?: 'gold' | 'plain' }) {
  const cls = tone === 'gold'
    ? 'border-primary/30 bg-primary/[0.06]'
    : 'border-outline-variant/30 bg-surface-container-lowest'
  return <div className={`rounded-xl border ${cls} p-5 mb-4 leading-relaxed`}>{children}</div>
}

export function A({ href, children, external }: { href: string; children: ReactNode; external?: boolean }) {
  return (
    <a
      href={href}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      className="text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary transition"
    >
      {children}
    </a>
  )
}
