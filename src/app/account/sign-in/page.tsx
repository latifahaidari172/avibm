'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { createSupabaseBrowser } from '@/lib/supabase/client'
import { IconArrowLeft } from '@/components/icons'

// Customer-facing sign-in. Google OAuth + a magic-link email fallback
// (covers everyone else — Outlook, Hotmail, Yahoo, ProtonMail, BigPond,
// iCloud, etc., all just type their address and get a one-click link).
// Microsoft / Apple buttons removed — too much setup overhead (Azure
// tenant config / paid Apple Developer Program) for marginal gain. No
// password storage anywhere — Supabase Auth handles all session state.
//
// Supports ?next=/some/path — that path is forwarded through OAuth and
// magic-link flows so callers (e.g. /register/qld) can drop the
// customer back where they wanted to land after sign-in.
export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInInner />
    </Suspense>
  )
}

function SignInInner() {
  const searchParams = useSearchParams()
  const next = searchParams.get('next') || '/account'
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const supabase = createSupabaseBrowser()

  async function signInWithProvider(provider: 'google') {
    setBusy(provider)
    setMsg(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
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
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
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
      <div style={{ maxWidth: 420, width: '100%' }}>
        <p style={{ marginBottom: 16 }}>
          <Link
            href="/"
            style={{ color: '#888', fontSize: 13, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <IconArrowLeft size={14} />Back to home
          </Link>
        </p>
        <div style={{ background: 'linear-gradient(135deg,#161616,#111)', border: '1px solid rgba(201,168,76,0.15)', borderRadius: 12, padding: 32 }}>
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
          We never store your password. Sign-in is handled by Google or a one-time email link.
        </p>
        </div>
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
