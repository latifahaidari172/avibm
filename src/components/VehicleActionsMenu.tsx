'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { IconChevronDown, IconPencil, IconArchive, IconArrowUturnLeft, IconTrash } from '@/components/icons'

// Per-vehicle "Manage" menu. The dropdown is rendered in a PORTAL to
// document.body with position:fixed and a very high z-index — so it can never
// be painted over by a sibling card (each card is its own stacking context via
// backdrop-filter, which made an in-card dropdown unreliable). Self-contained
// styling (no dependence on the .ap design-system scope it's portalled out of).
export default function VehicleActionsMenu({ vehicleId, archived, onOpenChange }: {
  vehicleId: string; archived?: boolean; onOpenChange?: (open: boolean) => void
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [coords, setCoords] = useState<{ top: number; right: number } | null>(null)
  const [mounted, setMounted] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => { onOpenChange?.(open) }, [open, onOpenChange])

  function place() {
    const b = btnRef.current?.getBoundingClientRect()
    if (!b) return
    setCoords({ top: b.bottom + 8, right: Math.max(8, window.innerWidth - b.right) })
  }

  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      const t = e.target as Node
      if (btnRef.current?.contains(t) || menuRef.current?.contains(t)) return
      setOpen(false)
    }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    // Reposition (don't close) on scroll/resize so the fixed menu stays glued
    // to the button — closing on scroll dismissed it on the click's own
    // scroll-into-view.
    function reposition() { place() }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', reposition, true)
    window.addEventListener('resize', reposition)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', reposition, true)
      window.removeEventListener('resize', reposition)
    }
  }, [open])

  function toggle() {
    if (open) { setOpen(false); return }
    place(); setOpen(true)
  }

  async function setArchived(value: boolean, confirmMsg?: string) {
    if (confirmMsg && !confirm(confirmMsg)) return
    setOpen(false); setBusy(true)
    try {
      const r = await fetch(`/api/account/vehicle/${vehicleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived: value }),
      })
      if (!r.ok) throw new Error()
      router.refresh()
    } catch {
      setBusy(false); alert('Could not update the vehicle. Please try again.')
    }
  }

  async function del() {
    if (!confirm('Delete this vehicle? It will be removed from your account and monitoring will stop.')) return
    setOpen(false); setBusy(true)
    try {
      const r = await fetch(`/api/account/vehicle/${vehicleId}`, { method: 'DELETE' })
      if (!r.ok) throw new Error()
      router.refresh()
    } catch {
      setBusy(false); alert('Could not delete the vehicle. Please try again.')
    }
  }

  const item: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 9, width: '100%', textAlign: 'left',
    background: 'none', border: 'none', cursor: 'pointer', font: 'inherit',
    padding: '10px 12px', fontSize: 13, color: '#d3cebf', borderRadius: 10, textDecoration: 'none', boxSizing: 'border-box',
  }

  const menu = open && coords ? (
    <div ref={menuRef} role="menu" style={{
      position: 'fixed', top: coords.top, right: coords.right, zIndex: 99999, width: 208, padding: 6,
      boxSizing: 'border-box', borderRadius: 18,
      background: 'linear-gradient(180deg,rgba(22,20,17,0.97),rgba(11,10,9,0.99))',
      border: '1px solid rgba(233,206,136,0.32)',
      boxShadow: '0 24px 60px -18px rgba(0,0,0,0.92)', backdropFilter: 'blur(14px)',
      fontFamily: "'Plus Jakarta Sans',system-ui,sans-serif",
    }}>
      <Link href={`/account/vehicle/${vehicleId}`} role="menuitem" style={item} onClick={() => setOpen(false)}>
        <IconPencil size={15} /> Edit details
      </Link>
      {archived ? (
        <button role="menuitem" style={item} onClick={() => setArchived(false)}>
          <IconArrowUturnLeft size={14} /> Restore to active
        </button>
      ) : (
        <button role="menuitem" style={item}
          onClick={() => setArchived(true, 'Mark this vehicle as done and move it to Completed / Past? Monitoring will stop.')}>
          <IconArchive size={15} /> Mark as done
        </button>
      )}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', margin: '4px 0' }} />
      <button role="menuitem" style={{ ...item, color: '#f08a8a' }} onClick={del}>
        <IconTrash size={15} /> Delete
      </button>
    </div>
  ) : null

  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <button ref={btnRef} type="button" onClick={toggle} disabled={busy} aria-haspopup="menu" aria-expanded={open} className="menu">
        Manage <IconChevronDown size={13} />
      </button>
      {mounted && menu ? createPortal(menu, document.body) : null}
    </div>
  )
}
