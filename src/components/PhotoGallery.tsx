'use client'

import { useState, type CSSProperties } from 'react'
import { IconChevronRight } from '@/components/icons'

// Auctioneer-style gallery: a large main photo with prev/next arrows, a photo
// counter, and a clickable thumbnail strip underneath. Tolerant of dead URLs —
// any photo that fails to load is dropped (auction CDN images can disappear).
export default function PhotoGallery({ photos, initialIndex = 0 }: { photos: string[]; initialIndex?: number }) {
  const [idx, setIdx] = useState(initialIndex >= 0 && initialIndex < photos.length ? initialIndex : 0)
  const [broken, setBroken] = useState<Set<number>>(new Set())

  const live = photos.map((u, i) => ({ u, i })).filter(({ i }) => !broken.has(i))
  if (live.length === 0) return null

  const current = broken.has(idx) ? live[0].i : idx
  const pos = Math.max(0, live.findIndex(x => x.i === current))

  function markBroken(i: number) {
    setBroken(prev => {
      const n = new Set(prev); n.add(i)
      if (i === idx) {
        const next = photos.findIndex((_, j) => j !== i && !n.has(j))
        if (next >= 0) setIdx(next)
      }
      return n
    })
  }
  function go(delta: number) {
    if (live.length < 2) return
    setIdx(live[(pos + delta + live.length) % live.length].i)
  }

  const arrow = (side: 'left' | 'right'): CSSProperties => ({
    position: 'absolute', top: '50%', [side]: 12, transform: 'translateY(-50%)',
    width: 42, height: 42, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.22)', color: '#fff', cursor: 'pointer', zIndex: 2,
  })

  return (
    <div>
      <div style={{ position: 'relative', background: '#000', border: '1px solid #222', borderRadius: 12, overflow: 'hidden' }}>
        <img
          src={photos[current]}
          alt=""
          onError={() => markBroken(current)}
          style={{ width: '100%', height: 460, objectFit: 'cover', display: 'block', background: '#000' }}
        />
        {live.length > 1 && (
          <>
            <button type="button" aria-label="Previous photo" onClick={() => go(-1)} style={arrow('left')}>
              <span style={{ display: 'flex', transform: 'rotate(180deg)' }}><IconChevronRight size={22} /></span>
            </button>
            <button type="button" aria-label="Next photo" onClick={() => go(1)} style={arrow('right')}>
              <IconChevronRight size={22} />
            </button>
            <div style={{ position: 'absolute', bottom: 12, right: 14, fontSize: 12, color: '#fff', background: 'rgba(0,0,0,0.6)', borderRadius: 999, padding: '3px 11px' }}>
              {pos + 1} / {live.length}
            </div>
          </>
        )}
      </div>
      {live.length > 1 && (
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingTop: 10, paddingBottom: 4 }}>
          {live.map(({ u, i }) => (
            <button key={i} type="button" onClick={() => setIdx(i)}
              style={{
                flexShrink: 0, width: 84, height: 62, padding: 0, borderRadius: 6, overflow: 'hidden', cursor: 'pointer',
                background: '#111', border: `2px solid ${i === current ? '#C9A84C' : '#2a2a2a'}`,
                opacity: i === current ? 1 : 0.65,
              }}>
              <img src={u} alt="" loading="lazy" onError={() => markBroken(i)}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            </button>
          ))}
        </div>
      )}
      <p style={{ color: '#666', fontSize: 11, marginTop: 6 }}>{live.length} photo{live.length !== 1 ? 's' : ''} from the auction listing</p>
    </div>
  )
}
