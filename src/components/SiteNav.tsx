import Link from 'next/link'

// Static top nav for content / legal pages (the landing page keeps its own
// scroll-aware nav). Logo returns home; primary CTA is sign-in.
export function SiteNav() {
  return (
    <nav className="w-full border-b border-outline-variant/10 bg-background/90 backdrop-blur-md sticky top-0 z-50">
      <div className="flex justify-between items-center px-grid-gutter max-w-container-max-width mx-auto h-20">
        <Link href="/" className="font-display-lg text-primary tracking-tighter text-[32px]">AVIBM</Link>
        <div className="flex items-center gap-6">
          <Link href="/about" className="hidden sm:block text-on-surface-variant hover:text-primary transition-colors text-body-md">About</Link>
          <Link href="/faq" className="hidden sm:block text-on-surface-variant hover:text-primary transition-colors text-body-md">FAQ</Link>
          <Link href="/account/sign-in" className="bg-primary text-on-primary px-6 py-2 rounded-lg font-label-bold text-label-bold uppercase tracking-widest hover:bg-primary/90 transition-all">
            Sign In
          </Link>
        </div>
      </div>
    </nav>
  )
}
