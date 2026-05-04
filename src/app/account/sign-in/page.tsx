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
            <GoogleLogo />
            <span>{busy === 'google' ? 'Redirecting…' : 'Continue with Google'}</span>
          </button>
          <button
            onClick={() => signInWithProvider('azure')}
            disabled={busy !== null}
            style={btn('#fff', '#000', '1px solid #ddd')}
          >
            <MicrosoftLogo />
            <span>{busy === 'azure' ? 'Redirecting…' : 'Continue with Microsoft'}</span>
          </button>
          <button
            onClick={() => signInWithProvider('apple')}
            disabled={busy !== null}
            style={btn('#000', '#fff', '1px solid #444')}
          >
            <AppleLogo />
            <span>{busy === 'apple' ? 'Redirecting…' : 'Continue with Apple'}</span>
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
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  }
}

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
      <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
    </svg>
  )
}
function MicrosoftLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 23 23" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="10" height="10" fill="#F25022"/>
      <rect x="12" y="1" width="10" height="10" fill="#7FBA00"/>
      <rect x="1" y="12" width="10" height="10" fill="#00A4EF"/>
      <rect x="12" y="12" width="10" height="10" fill="#FFB900"/>
    </svg>
  )
}
function AppleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
      <path d="M17.05 12.04c-.03-3.09 2.52-4.57 2.64-4.65-1.44-2.11-3.69-2.4-4.49-2.43-1.91-.19-3.73 1.13-4.7 1.13-.97 0-2.46-1.1-4.04-1.07-2.08.03-4 1.21-5.07 3.07-2.16 3.75-.55 9.31 1.55 12.36 1.03 1.49 2.25 3.17 3.85 3.11 1.55-.06 2.13-1 4-1 1.86 0 2.39 1 4.03.97 1.66-.03 2.71-1.52 3.73-3.02 1.17-1.74 1.66-3.42 1.69-3.51-.04-.02-3.24-1.24-3.27-4.96zM14.21 4.43c.85-1.04 1.43-2.47 1.27-3.91-1.23.05-2.72.82-3.61 1.85-.79.92-1.49 2.39-1.3 3.79 1.38.11 2.79-.7 3.64-1.73z"/>
    </svg>
  )
}
