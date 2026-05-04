'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

// Live tail of avibm.log via SSE.
//
// Initial backfill: GET /api/admin/logs/recent?lines=500 (proxied to the
// VPS via the edge runtime).
// Then opens an EventSource at /api/admin/logs/stream that holds open a
// long-lived connection, appending each incoming line to the pane.
export default function LogsPage() {
  const router = useRouter()
  const [authChecked, setAuthChecked] = useState(false)
  useEffect(() => {
    const t = localStorage.getItem('avibm_admin_token')
    if (!t) router.replace('/admin')
    else setAuthChecked(true)
  }, [router])
  if (!authChecked) return null
  return <LogsView />
}

function LogsView() {
  const [lines, setLines] = useState<string[]>([])
  const [status, setStatus] = useState<'connecting' | 'live' | 'disconnected' | 'error'>('connecting')
  const [errorMsg, setErrorMsg] = useState<string>('')
  const [autoScroll, setAutoScroll] = useState(true)
  const [filter, setFilter] = useState('')
  const [paused, setPaused] = useState(false)
  const paneRef = useRef<HTMLDivElement>(null)
  const bufferedRef = useRef<string[]>([])

  useEffect(() => {
    let cancelled = false
    let evtSrc: EventSource | null = null
    ;(async () => {
      // Backfill
      try {
        const r = await fetch('/api/admin/logs/recent?lines=500', { cache: 'no-store' })
        if (!r.ok) {
          const j = await r.json().catch(() => ({}))
          setErrorMsg(j.error || `Backfill failed (${r.status})`)
          setStatus('error')
          return
        }
        const j = await r.json()
        if (cancelled) return
        setLines(Array.isArray(j.lines) ? j.lines : [])
      } catch (e: any) {
        setErrorMsg(e?.message || 'Backfill failed')
        setStatus('error')
        return
      }

      // Live stream
      evtSrc = new EventSource('/api/admin/logs/stream')
      evtSrc.onopen = () => setStatus('live')
      evtSrc.onerror = () => setStatus('disconnected')
      evtSrc.onmessage = (e) => {
        if (!e.data) return
        if (paused) {
          bufferedRef.current.push(e.data)
          return
        }
        setLines(prev => {
          const next = [...prev, e.data]
          // Cap memory: drop the oldest if we exceed 5000 lines
          return next.length > 5000 ? next.slice(-5000) : next
        })
      }
    })()
    return () => {
      cancelled = true
      evtSrc?.close()
    }
    // We intentionally don't depend on `paused` — the EventSource keeps
    // running and we route via a ref instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Drain buffered lines when un-paused
  useEffect(() => {
    if (!paused && bufferedRef.current.length > 0) {
      const drained = bufferedRef.current
      bufferedRef.current = []
      setLines(prev => {
        const next = [...prev, ...drained]
        return next.length > 5000 ? next.slice(-5000) : next
      })
    }
  }, [paused])

  // Auto-scroll on new lines
  useEffect(() => {
    if (autoScroll && paneRef.current) {
      paneRef.current.scrollTop = paneRef.current.scrollHeight
    }
  }, [lines, autoScroll])

  const filtered = filter
    ? lines.filter(l => l.toLowerCase().includes(filter.toLowerCase()))
    : lines

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#eee', fontFamily: 'DM Sans, sans-serif', padding: '20px 16px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 12, flexWrap: 'wrap' }}>
          <h1 style={h1}>AVIBM live log</h1>
          <span style={statusPill(status)}>
            {status === 'live' && '● Live'}
            {status === 'connecting' && '○ Connecting…'}
            {status === 'disconnected' && '◌ Reconnecting…'}
            {status === 'error' && '✕ Error'}
          </span>
        </div>
        {status === 'error' && errorMsg && (
          <div style={errBox}>
            <strong>Stream not available:</strong> {errorMsg}<br />
            <span style={{ fontSize: 12, color: '#888' }}>
              Set <code>AVIBM_LOG_URL</code> and <code>AVIBM_LOG_SECRET</code> in your Vercel env vars and confirm the
              VPS service is running on port 8090.
            </span>
          </div>
        )}
        <div style={{ display: 'flex', gap: 10, marginBottom: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            placeholder="Filter (case-insensitive)"
            value={filter}
            onChange={e => setFilter(e.target.value)}
            style={inp}
          />
          <label style={{ fontSize: 12, color: '#888', display: 'flex', gap: 6, alignItems: 'center', cursor: 'pointer' }}>
            <input type="checkbox" checked={autoScroll} onChange={e => setAutoScroll(e.target.checked)} />
            Auto-scroll
          </label>
          <button onClick={() => setPaused(p => !p)} style={ghostBtn}>
            {paused ? `Resume (${bufferedRef.current.length} buffered)` : 'Pause'}
          </button>
          <button onClick={() => setLines([])} style={ghostBtn}>Clear</button>
          <span style={{ marginLeft: 'auto', fontSize: 12, color: '#888' }}>
            {filter ? `${filtered.length} / ` : ''}{lines.length} lines
          </span>
        </div>
        <div ref={paneRef} style={pane}>
          {filtered.map((line, i) => (
            <div key={i} style={{ color: lineColor(line), padding: '0', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              {line || ' '}
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ color: '#444', fontStyle: 'italic' }}>
              {filter ? 'No lines match the filter.' : 'Waiting for first line…'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function lineColor(line: string): string {
  if (/\b(error|exception|traceback|failed|fail|critical)\b/i.test(line)) return '#f87171'
  if (/\b(warn|warning|retry)\b/i.test(line)) return '#fbbf24'
  if (/\b(booked|success|✓)/i.test(line)) return '#5adb5a'
  if (/\b(debug)\b/i.test(line)) return '#666'
  return '#ddd'
}
function statusPill(status: string): React.CSSProperties {
  const map: Record<string, [string, string]> = {
    live:         ['#5adb5a', 'rgba(90,219,90,0.12)'],
    connecting:   ['#C9A84C', 'rgba(201,168,76,0.12)'],
    disconnected: ['#fbbf24', 'rgba(251,191,36,0.10)'],
    error:        ['#f87171', 'rgba(248,113,113,0.10)'],
  }
  const [color, bg] = map[status] || ['#888', '#1a1a1a']
  return {
    fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
    padding: '4px 10px', borderRadius: 999, border: `1px solid ${color}`, color, background: bg,
  }
}

const h1: React.CSSProperties = { fontFamily: 'Bebas Neue, sans-serif', fontSize: 26, letterSpacing: '0.05em', margin: 0 }
const inp: React.CSSProperties = { flex: '1 1 240px', padding: '8px 10px', borderRadius: 6, background: '#0a0a0a', border: '1px solid #222', color: '#eee', fontSize: 13, fontFamily: 'inherit' }
const ghostBtn: React.CSSProperties = { padding: '7px 12px', borderRadius: 6, background: '#111', color: '#888', border: '1px solid #333', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }
const pane: React.CSSProperties = {
  background: '#000', border: '1px solid #1a1a1a', borderRadius: 8,
  height: 'calc(100vh - 200px)', minHeight: 400,
  overflowY: 'auto', overflowX: 'hidden',
  padding: 12, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 12, lineHeight: 1.45,
}
const errBox: React.CSSProperties = { padding: 12, background: '#1f0c0c', border: '1px solid #3a1a1a', borderRadius: 6, color: '#f87171', fontSize: 13, marginBottom: 12 }
