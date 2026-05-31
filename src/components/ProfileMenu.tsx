'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'

// Profile-avatar dropdown in the account header — the single home for Profile,
// Billing, the cross-site Auction Intel link, and Sign out. Closes on
// outside-click / Escape. Maximalist styling (rendered inside PreviewShell).
export default function ProfileMenu({ email, name }: { email?: string; name?: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey) }
  }, [open])

  const initial = (name || email || '?').trim().charAt(0).toUpperCase() || '?'
  const item: React.CSSProperties = { display: 'block', padding: '11px 14px', fontSize: 13, color: '#d3cebf', textDecoration: 'none', borderRadius: 12, cursor: 'pointer' }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button type="button" onClick={() => setOpen(o => !o)} aria-haspopup="menu" aria-expanded={open} aria-label="Account menu"
        style={{ width: 34, height: 34, borderRadius: 999, background: 'linear-gradient(135deg,var(--gold-2),var(--gold))', color: '#231900', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, border: 'none', cursor: 'pointer' }}>
        {initial}
      </button>
      {open && (
        <div role="menu" className="card" style={{ position: 'absolute', right: 0, top: 'calc(100% + 12px)', width: 220, padding: 8, zIndex: 60 }}>
          {email && (
            <div style={{ padding: '8px 14px 10px', borderBottom: '1px solid rgba(255,255,255,0.07)', marginBottom: 4 }}>
              <div style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Signed in as</div>
              <div style={{ fontSize: 13, marginTop: 3, color: '#efece5', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email}</div>
            </div>
          )}
          <Link href="/account" role="menuitem" style={item} onClick={() => setOpen(false)}>Profile</Link>
          <Link href="/account/edit-details" role="menuitem" style={item} onClick={() => setOpen(false)}>Edit details</Link>
          <Link href="/account/billing" role="menuitem" style={item} onClick={() => setOpen(false)}>Billing</Link>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', margin: '4px 0' }} />
          {/* One login, both sites — opens auction-intel already signed in. */}
          <a href="/api/auth/sso-out" target="_blank" rel="noopener" role="menuitem"
            style={{ ...item, color: 'var(--gold-2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            Auction Intel
            <span className="material-symbols-outlined" style={{ fontSize: 15 }}>open_in_new</span>
          </a>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', margin: '4px 0' }} />
          <form action="/auth/sign-out" method="post" style={{ margin: 0 }}>
            <button type="submit" role="menuitem" style={{ ...item, width: '100%', textAlign: 'left', background: 'none', border: 'none', font: 'inherit', color: '#f08a8a' }}>Sign out</button>
          </form>
        </div>
      )}
    </div>
  )
}
