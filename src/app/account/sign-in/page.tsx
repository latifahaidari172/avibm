'use client'

import { useState } from 'react'
import { createSupabaseBrowser } from '@/lib/supabase/client'

// Customer-facing sign-in. Three OAuth buttons (Google / Microsoft /
// Apple) and a magic-link email fallback for everything else (Yahoo,
// ProtonMail, BigPond, etc). No password storage anywhere — Supabase
// Auth handles all session state.
export default function SignInPage() {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const supabase = createSupabaseBrowser()

  async function signInWithProvider(provider: 'google' | 'azure' | 'apple') {
    setBusy(provider)
    setMsg(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: provider === 'azure' ? 'email profile openid' : undefined,
      },
    })
    if (error) {
      setBusy(null)
      setMsg({ kind: 'err', text: `${provider}: ${error.message}` })
    }
    // On success the browser is redirected to the OAuth provider — no
    // further code runs here.
  }

  async function signInWithMagicLink(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    setBusy('magic')
    setMsg(null)
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    setBusy(null)
    if (error) {
      setMsg({ kind: 'err', text: error.message })
    } else {
      setMsg({
        kind: 'ok',
        text: `Sign-in link sent to ${email}. Check your inbox (and spam folder) — click the link to continue.`,
      })
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: '#0a0a0a', color: '#eee', fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ maxWidth: 420, width: '100%', background: 'linear-gradient(135deg,#161616,#111)', border: '1px solid rgba(201,168,76,0.15)', borderRadius: 12, padding: 32 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <h1 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 32, letterSpacing: '0.08em', color: '#C9A84C', margin: 0 }}>SIGN IN</h1>
          <p style={{ color: '#888', fontSize: 14, marginTop: 8 }}>Continue to your AVIBM profile</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            onClick={() => signInWithProvider('google')}
            disabled={busy !== null}
            style={btn('#fff', '#000')}
          >
            {busy === 'google' ? 'Redirecting…' : 'Continue with Google'}
          </button>
          <button
            onClick={() => signInWithProvider('azure')}
            disabled={busy !== null}
            style={btn('#0078d4', '#fff')}
          >
            {busy === 'azure' ? 'Redirecting…' : 'Continue with Microsoft'}
          </button>
          <button
            onClick={() => signInWithProvider('apple')}
            disabled={busy !== null}
            style={btn('#000', '#fff', '1px solid #444')}
          >
            {busy === 'apple' ? 'Redirecting…' : 'Continue with Apple'}
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '24px 0', color: '#555', fontSize: 12 }}>
          <div style={{ flex: 1, height: 1, background: '#222' }} />
          OR
          <div style={{ flex: 1, height: 1, background: '#222' }} />
        </div>

        <form onSubmit={signInWithMagicLink} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <label style={{ fontSize: 12, color: '#888' }}>Sign in with email link (no password)</label>
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@email.com"
            required
            style={{ padding: '10px 12px', borderRadius: 6, background: '#0a0a0a', border: '1px solid #222', color: '#eee', fontSize: 14 }}
          />
          <button type="submit" disabled={busy !== null || !email} style={btn('#C9A84C', '#000')}>
            {busy === 'magic' ? 'Sending…' : 'Send sign-in link'}
          </button>
        </form>

        {msg && (
          <div style={{ marginTop: 16, padding: '10px 12px', borderRadius: 6, fontSize: 13, color: msg.kind === 'ok' ? '#5adb5a' : '#f87171', background: msg.kind === 'ok' ? '#0c1f0c' : '#1f0c0c', border: `1px solid ${msg.kind === 'ok' ? '#1a3a1a' : '#3a1a1a'}` }}>
            {msg.text}
          </div>
        )}

        <p style={{ marginTop: 24, fontSize: 12, color: '#555', textAlign: 'center' }}>
          We never store your password. Sign-in is handled by Google / Microsoft / Apple.
        </p>
      </div>
    </div>
  )
}

function btn(bg: string, color: string, border = 'none'): React.CSSProperties {
  return {
    padding: '11px 14px',
    borderRadius: 6,
    background: bg,
    color,
    border,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
  }
}
