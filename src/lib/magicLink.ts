import { createHash, randomBytes } from 'crypto'
import { query, one } from '@/lib/db'
import { emailHtml } from '@/lib/emailTemplate'

// Native magic-link login (replaces Supabase signInWithOtp). Raw token is
// emailed; only its sha256 hash is stored. Single-use, 10-minute TTL — same
// design as auction-intel's public magic-link.
const TTL_MS = 10 * 60 * 1000
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://avibm.com'

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex')

export async function issueMagicLink(email: string, next = '/account'): Promise<void> {
  const normalised = email.trim().toLowerCase()
  const raw = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + TTL_MS).toISOString()
  await query(
    `INSERT INTO magic_link_tokens (token_hash, email, intent, next, expires_at)
     VALUES ($1, $2, 'signin', $3, $4)`,
    [sha256(raw), normalised, next, expiresAt],
  )

  const link = `${SITE_URL}/auth/callback?t=${raw}&next=${encodeURIComponent(next)}`
  const html = emailHtml(`
    <p style="margin:0 0 16px;font-size:15px;color:#222;">Tap the button below to sign in to your AVIBM account. This link expires in 10 minutes and can only be used once.</p>
    <a href="${link}" style="display:block;background:#C9A84C;color:#000;text-align:center;padding:16px 24px;border-radius:8px;font-weight:900;font-size:16px;text-decoration:none;letter-spacing:0.05em;margin-bottom:24px;">SIGN IN →</a>
    <p style="margin:0;font-size:12px;color:#555;line-height:1.7;text-align:center;">If you didn't request this, you can ignore this email.</p>
  `)

  const nm = require('nodemailer')
  const t = nm.createTransport({
    service: 'gmail',
    auth: { user: process.env.GMAIL_ADDRESS, pass: process.env.GMAIL_APP_PASSWORD },
  })
  await t.sendMail({
    from: `${process.env.ADMIN_NAME || 'AVIBM'} <${process.env.GMAIL_ADDRESS}>`,
    to: normalised,
    subject: 'AVIBM — Your sign-in link',
    html,
    text: `Sign in to AVIBM: ${link} (expires in 10 minutes)`,
  })
}

// Consume a raw token: atomically mark it used and return its email + next.
// Returns null if missing / expired / already used.
export async function consumeMagicLink(raw: string): Promise<{ email: string; next: string } | null> {
  if (!raw) return null
  const row = await one<{ email: string; next: string | null }>(
    `UPDATE magic_link_tokens
        SET consumed_at = now()
      WHERE token_hash = $1
        AND consumed_at IS NULL
        AND expires_at > now()
      RETURNING email, next`,
    [sha256(raw)],
  )
  if (!row) return null
  return { email: row.email, next: row.next || '/account' }
}
