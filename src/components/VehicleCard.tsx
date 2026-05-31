'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import VehicleActionsMenu from '@/components/VehicleActionsMenu'

type V = {
  id: string; label?: string | null; make?: string | null; model?: string | null
  year?: string | number | null; vin?: string | null
  booked_date?: string | null; booked_time?: string | null; booked_location?: string | null
  cutoff_date?: string | null; ref?: string | null; photo_url?: string | null
}
type Status = { label: string; color: string; bg: string }

// "2026-11-11" → "11/11/2026"; passes through non-ISO text unchanged.
function fmtDate(d?: string | null): string {
  if (!d) return ''
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return d
  return dt.toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

// "My Garage" vehicle card — maximalist glass card: photo banner with title +
// status overlaid, details underneath, and a Manage menu pinned bottom-right so
// cards line up across the grid. Rendered inside the PreviewShell `.ap` scope.
export default function VehicleCard({ v, status, archived }: { v: V; status: Status; archived?: boolean }) {
  const [imgErr, setImgErr] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const onOpenChange = useCallback((o: boolean) => setMenuOpen(o), [])
  const title = [v.year, v.make, v.model].filter(Boolean).join(' ') || v.label || 'Vehicle'
  const photo = v.photo_url && !imgErr ? v.photo_url : null
  const line = v.booked_date
    ? `Booked ${fmtDate(v.booked_date)}${v.booked_time ? ' · ' + v.booked_time : ''}${v.booked_location ? ' · ' + v.booked_location : ''}`
    : v.cutoff_date ? `Looking for slots before ${fmtDate(v.cutoff_date)}` : ''
  const lineColor = v.booked_date ? 'var(--green)' : 'var(--muted)'

  return (
    <div className="card" style={{ padding: 0, display: 'flex', flexDirection: 'column', zIndex: menuOpen ? 50 : undefined }}>
      <Link href={`/account/vehicle/${v.id}`} style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
        {/* overflow clipped on the photo only — NOT the whole card, or it hides the Manage dropdown. */}
        <div style={{ position: 'relative', height: 190, flexShrink: 0, borderRadius: '26px 26px 0 0', overflow: 'hidden', background: 'linear-gradient(135deg,#16140f,#0b0a09)' }}>
          {photo ? (
            <img src={photo} alt="" onError={() => setImgErr(true)} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: archived ? 'grayscale(0.45) brightness(0.72)' : undefined }} />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3a3833', fontSize: 12, letterSpacing: '0.12em' }}>NO PHOTO</div>
          )}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(6,6,6,0.95) 3%, transparent 52%)' }} />
          <span className="spill" style={{ position: 'absolute', top: 14, right: 14, color: status.color, background: status.bg, border: `1px solid ${status.color}` }}>
            <span className="dot" style={{ background: status.color }} />{status.label}
          </span>
          <div className="disp" style={{ position: 'absolute', left: 20, right: 20, bottom: 16, fontSize: 26, color: '#fff', textShadow: '0 2px 14px rgba(0,0,0,0.75)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{title}</div>
        </div>
      </Link>
      <div style={{ flex: 1, padding: '18px 20px', display: 'flex', justifyContent: 'space-between', gap: 12, borderRadius: '0 0 26px 26px' }}>
        <div style={{ minWidth: 0 }}>
          {v.vin && <div style={{ fontFamily: 'ui-monospace,monospace', fontSize: 11, color: 'var(--muted)' }}>VIN {v.vin}</div>}
          {line && <div style={{ fontSize: 13, marginTop: 9, color: lineColor }}>{line}</div>}
          {v.ref && <div style={{ marginTop: 9, fontFamily: 'ui-monospace,monospace', fontSize: 11, color: 'var(--blue)' }}>{v.ref}</div>}
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <VehicleActionsMenu vehicleId={v.id} archived={archived} onOpenChange={onOpenChange} />
        </div>
      </div>
    </div>
  )
}
