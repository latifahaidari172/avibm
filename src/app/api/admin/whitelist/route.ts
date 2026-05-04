import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { getAuthToken, unauthorized } from '@/lib/auth'
import { emailHtml } from '@/lib/emailTemplate'

// Whitelist API. Backed by the existing public.free_customers Supabase
// table — bot's /api/check-whitelist endpoint already reads from this
// table, so the whole pipeline stays consistent.
//
// REQUIRED schema migration (run once in Supabase SQL editor):
//
//   ALTER TABLE public.free_customers
//     ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES public.customers(id) ON DELETE CASCADE,
//     ADD COLUMN IF NOT EXISTS notified_at timestamptz,
//     ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
//
// The `entry` column is preserved (still primary key) so the existing
// bot's whitelist check is unaffected. New entries gain a customer_id
// pointer when added via the customer picker; legacy / manual entries
// have customer_id = null.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const h = (extra: Record<string, string> = {}) => ({
  apikey: serviceKey,
  Authorization: `Bearer ${serviceKey}`,
  'Content-Type': 'application/json',
  ...extra,
})

type Customer = {
  id: string
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
  state?: string
}

async function fetchCustomer(id: string): Promise<Customer | null> {
  const r = await fetch(
    `${supabaseUrl}/rest/v1/customers?id=eq.${id}&select=id,first_name,last_name,email,phone,state&limit=1`,
    { headers: h(), cache: 'no-store' },
  )
  const arr = await r.json()
  return Array.isArray(arr) && arr[0] ? arr[0] : null
}

async function sendWhitelistEmail(c: Customer) {
  const gmailUser = process.env.GMAIL_ADDRESS
  const gmailPass = process.env.GMAIL_APP_PASSWORD
  if (!gmailUser || !gmailPass || !c.email) return false
  const adminName = process.env.ADMIN_NAME || 'AVIBM'
  const firstName = (c.first_name || '').split(' ')[0] || 'there'
  const t = nodemailer.createTransport({
    service: 'gmail', auth: { user: gmailUser, pass: gmailPass },
  })
  const html = emailHtml(`
    <h1 style="margin:0 0 8px;font-size:28px;font-weight:900;color:#ffffff;letter-spacing:0.05em;">FREE ACCESS GRANTED</h1>
    <p style="margin:0 0 28px;font-size:15px;color:#C9A84C;">Congratulations, ${firstName}.</p>
    <p style="margin:0 0 20px;font-size:15px;color:#aaaaaa;line-height:1.7;">
      You have been added to the AVIBM free-access list. From now on, every monitoring registration you submit is fully free — no payment required, monitoring goes live as soon as we activate it.
    </p>
    <p style="margin:0 0 24px;font-size:15px;color:#aaaaaa;line-height:1.7;">
      This applies forever, unless revoked by an admin. If you have any questions, just reply to this email.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:8px;margin-bottom:24px;">
      <tr><td style="padding:18px 22px;">
        <div style="font-size:11px;letter-spacing:0.15em;color:#C9A84C;text-transform:uppercase;margin-bottom:10px;">Account on file</div>
        <table width="100%" cellpadding="0" cellspacing="0">
          ${c.email ? `<tr><td style="padding:4px 0;font-size:13px;color:#666;width:90px;">Email</td><td style="padding:4px 0;font-size:13px;color:#fff;">${c.email}</td></tr>` : ''}
          ${c.phone ? `<tr><td style="padding:4px 0;font-size:13px;color:#666;">Mobile</td><td style="padding:4px 0;font-size:13px;color:#fff;">${c.phone}</td></tr>` : ''}
          ${c.state ? `<tr><td style="padding:4px 0;font-size:13px;color:#666;">State</td><td style="padding:4px 0;font-size:13px;color:#fff;">${c.state}</td></tr>` : ''}
        </table>
      </td></tr>
    </table>
    <p style="margin:0;font-size:13px;color:#666;line-height:1.6;">
      Need to register a new vehicle? Head to <a href="https://avibm.vercel.app" style="color:#C9A84C;">avibm.vercel.app</a> and submit as normal — your free status is recognised automatically.
    </p>
  `)
  await t.sendMail({
    from: `${adminName} <${gmailUser}>`,
    to: c.email,
    subject: 'AVIBM — Free access granted',
    html,
    text: `Hi ${firstName}, you have been added to the AVIBM free-access list. All future registrations are free. Reply to this email if you have any questions.`,
  })
  return true
}

// GET — list all whitelist entries, joined to customer if linked.
export async function GET(request: Request) {
  if (!getAuthToken(request)) return unauthorized()
  const r = await fetch(
    `${supabaseUrl}/rest/v1/free_customers?select=entry,customer_id,notified_at,created_at&order=created_at.desc`,
    { headers: h(), cache: 'no-store' },
  )
  if (!r.ok) return NextResponse.json({ error: await r.text() }, { status: 500 })
  const rows = await r.json()
  return NextResponse.json(rows)
}

// POST — add to whitelist. Two shapes:
//   { customer_id }  -> resolves customer, inserts each contact method
//                       as a row tied to the customer, sends email
//   { entry }        -> manual single-string entry, no customer link
export async function POST(request: Request) {
  if (!getAuthToken(request)) return unauthorized()
  const body = await request.json().catch(() => ({}))

  if (body.customer_id) {
    const c = await fetchCustomer(body.customer_id)
    if (!c) return NextResponse.json({ error: 'customer not found' }, { status: 404 })
    const entries: { entry: string; customer_id: string }[] = []
    if (c.email) entries.push({ entry: c.email.toLowerCase().trim(), customer_id: c.id })
    if (c.phone) {
      const phoneClean = (c.phone || '').replace(/\s/g, '').trim()
      if (phoneClean) entries.push({ entry: phoneClean, customer_id: c.id })
    }
    if (entries.length === 0) {
      return NextResponse.json({ error: 'customer has no email or phone' }, { status: 400 })
    }
    // Upsert (entry is primary key); the merge-duplicates resolves
    // existing rows so adding a customer who has a stray entry is OK.
    const r = await fetch(
      `${supabaseUrl}/rest/v1/free_customers?on_conflict=entry`,
      { method: 'POST', headers: h({ Prefer: 'resolution=merge-duplicates,return=representation' }), body: JSON.stringify(entries) },
    )
    if (!r.ok) return NextResponse.json({ error: await r.text() }, { status: 500 })

    // Send the welcome email — best effort, don't fail the API if it errors.
    let emailed = false
    try { emailed = await sendWhitelistEmail(c) } catch (e) { console.error('whitelist email failed:', e) }
    if (emailed) {
      await fetch(
        `${supabaseUrl}/rest/v1/free_customers?customer_id=eq.${c.id}`,
        { method: 'PATCH', headers: h(), body: JSON.stringify({ notified_at: new Date().toISOString() }) },
      ).catch(() => {})
    }
    return NextResponse.json({ ok: true, entries, emailed })
  }

  if (body.entry) {
    const cleaned = String(body.entry).toLowerCase().trim()
    if (!cleaned) return NextResponse.json({ error: 'empty entry' }, { status: 400 })
    const r = await fetch(
      `${supabaseUrl}/rest/v1/free_customers?on_conflict=entry`,
      { method: 'POST', headers: h({ Prefer: 'resolution=merge-duplicates' }), body: JSON.stringify([{ entry: cleaned }]) },
    )
    if (!r.ok) return NextResponse.json({ error: await r.text() }, { status: 500 })
    return NextResponse.json({ ok: true, entry: cleaned })
  }

  return NextResponse.json({ error: 'provide customer_id or entry' }, { status: 400 })
}

// DELETE — remove from whitelist. Either by customer_id (removes all
// entries linked to that customer) or by exact entry string.
export async function DELETE(request: Request) {
  if (!getAuthToken(request)) return unauthorized()
  const body = await request.json().catch(() => ({}))
  if (body.customer_id) {
    const r = await fetch(
      `${supabaseUrl}/rest/v1/free_customers?customer_id=eq.${body.customer_id}`,
      { method: 'DELETE', headers: h() },
    )
    if (!r.ok) return NextResponse.json({ error: await r.text() }, { status: 500 })
    return NextResponse.json({ ok: true })
  }
  if (body.entry) {
    const r = await fetch(
      `${supabaseUrl}/rest/v1/free_customers?entry=eq.${encodeURIComponent(String(body.entry).toLowerCase().trim())}`,
      { method: 'DELETE', headers: h() },
    )
    if (!r.ok) return NextResponse.json({ error: await r.text() }, { status: 500 })
    return NextResponse.json({ ok: true })
  }
  return NextResponse.json({ error: 'provide customer_id or entry' }, { status: 400 })
}
