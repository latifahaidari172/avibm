import { NextResponse } from 'next/server'
import { emailHtml } from '@/lib/emailTemplate'

export async function POST(request: Request) {
  try {
    const { name, email, phone, state, vehicles, tier } = await request.json()
    const gmailUser = process.env.GMAIL_ADDRESS!
    const gmailPass = process.env.GMAIL_APP_PASSWORD!
    const adminEmail = process.env.ADMIN_NOTIFY_EMAIL!
    const adminName  = process.env.ADMIN_NAME || 'AVIBM'
    const payid      = process.env.PAYID || ''

    const freeListRaw = process.env.FREE_CUSTOMER_LIST || '[]'
    const freeList: string[] = JSON.parse(freeListRaw)
    const isFree = freeList.some((e: string) =>
      e === email?.toLowerCase() || e === phone?.replace(/\s/g, '')
    )

    const tierPrices: Record<string, number> = { priority: 10, standard: 7.5, basic: 5 }
    const price = state === 'SA' ? 5 : (tierPrices[tier] || 7.5)
    const total = (price * vehicles).toFixed(2)
    const tierLabel: Record<string, string> = { priority: '🥇 Priority', standard: '🥈 Standard', basic: '🥉 Basic' }

    const nm = require('nodemailer')
    const t = nm.createTransport({ service: 'gmail', auth: { user: gmailUser, pass: gmailPass } })

    // ── FREE CUSTOMER ────────────────────────────────────────────────────────
    if (isFree) {
      // Auto-activate in DB
      const { createClient } = await import('@supabase/supabase-js')
      const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
      await sb.from('customers').update({ active: true, tier: 'priority' }).eq('email', email)

      // Notify admin
      const adminHtml = emailHtml(`
        <h1 style="margin:0 0 8px;font-size:28px;font-weight:900;color:#fff;">🎁 FREE REGISTRATION</h1>
        <p style="margin:0 0 24px;font-size:15px;color:#C9A84C;">${name} is on the free list — auto-activated on Priority.</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:8px;">
          <tr><td style="padding:20px 24px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td style="padding:5px 0;font-size:13px;color:#666;width:120px;">Name</td><td style="padding:5px 0;font-size:13px;color:#fff;">${name}</td></tr>
              <tr><td style="padding:5px 0;font-size:13px;color:#666;">Email</td><td style="padding:5px 0;font-size:13px;color:#fff;">${email}</td></tr>
              <tr><td style="padding:5px 0;font-size:13px;color:#666;">State</td><td style="padding:5px 0;font-size:13px;color:#fff;">${state}</td></tr>
              <tr><td style="padding:5px 0;font-size:13px;color:#666;">Vehicles</td><td style="padding:5px 0;font-size:13px;color:#fff;">${vehicles}</td></tr>
              <tr><td style="padding:5px 0;font-size:13px;color:#C9A84C;font-weight:700;">Status</td><td style="padding:5px 0;font-size:13px;color:#C9A84C;font-weight:700;">AUTO-ACTIVATED — PRIORITY — FREE</td></tr>
            </table>
          </td></tr>
        </table>
      `)
      await t.sendMail({
        from: `${adminName} <${gmailUser}>`,
        to: adminEmail,
        subject: `🎁 Free Registration Auto-Activated — ${name} (${state})`,
        html: adminHtml,
        text: `Free customer auto-activated: ${name}, ${email}, ${state}.`
      })

      // Welcome email to customer — no payment mention
      const welcomeHtml = emailHtml(`
        <h1 style="margin:0 0 8px;font-size:28px;font-weight:900;color:#fff;">MONITOR ACTIVATED</h1>
        <p style="margin:0 0 24px;font-size:15px;color:#C9A84C;">Welcome to AVIBM, ${name.split(' ')[0]}.</p>
        <p style="margin:0 0 24px;font-size:15px;color:#aaa;line-height:1.7;">Your vehicle inspection monitor is now active. We check for earlier inspection slots every minute and will automatically rebook you as soon as one becomes available.</p>
        <div style="padding:16px 20px;background:#1a1a0a;border:1px solid #C9A84C;border-radius:8px;margin-bottom:24px;">
          <p style="margin:0;font-size:13px;color:#C9A84C;line-height:1.6;">When an earlier slot is found, you will receive a confirmation email with your new booking details. No action needed — we handle everything automatically.</p>
        </div>
        <p style="margin:0;font-size:13px;color:#555;line-height:1.7;">If you have any questions, reply to this email.</p>
      `)
      await t.sendMail({
        from: `${adminName} <${gmailUser}>`,
        to: email,
        subject: 'AVIBM — Your Monitor is Active',
        html: welcomeHtml,
        text: `Hi ${name}, your AVIBM monitor is now active. We will notify you when an earlier inspection slot is found.`
      })

      return NextResponse.json({ ok: true, free: true })
    }

    // ── PAID CUSTOMER ────────────────────────────────────────────────────────

    // 1. Notify admin
    const adminHtml = emailHtml(`
      <h1 style="margin:0 0 8px;font-size:28px;font-weight:900;color:#fff;">NEW REGISTRATION</h1>
      <p style="margin:0 0 24px;font-size:15px;color:#C9A84C;">Action required — review and activate after payment.</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:8px;margin-bottom:24px;">
        <tr><td style="padding:20px 24px;">
          <div style="font-size:11px;letter-spacing:0.15em;color:#C9A84C;text-transform:uppercase;margin-bottom:14px;">Customer Details</div>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:5px 0;font-size:13px;color:#666;width:120px;">Name</td><td style="padding:5px 0;font-size:13px;color:#fff;">${name}</td></tr>
            <tr><td style="padding:5px 0;font-size:13px;color:#666;">Email</td><td style="padding:5px 0;font-size:13px;color:#fff;">${email}</td></tr>
            <tr><td style="padding:5px 0;font-size:13px;color:#666;">Phone</td><td style="padding:5px 0;font-size:13px;color:#fff;">${phone}</td></tr>
            <tr><td style="padding:5px 0;font-size:13px;color:#666;">State</td><td style="padding:5px 0;font-size:13px;color:#fff;">${state}</td></tr>
            <tr><td style="padding:5px 0;font-size:13px;color:#666;">Plan</td><td style="padding:5px 0;font-size:13px;color:#fff;">${state === 'SA' ? '🥇 Priority (SA flat rate)' : (tierLabel[tier] || tier)}</td></tr>
            <tr><td style="padding:5px 0;font-size:13px;color:#666;">Vehicles</td><td style="padding:5px 0;font-size:13px;color:#fff;">${vehicles}</td></tr>
            <tr style="border-top:1px solid #2a2a2a;">
              <td style="padding:10px 0 5px;font-size:14px;color:#fff;font-weight:700;">Amount Due</td>
              <td style="padding:10px 0 5px;font-size:14px;color:#C9A84C;font-weight:700;">$${total} AUD</td>
            </tr>
          </table>
        </td></tr>
      </table>
      <div style="padding:16px 20px;background:#1a1a0a;border:1px solid #C9A84C;border-radius:8px;">
        <p style="margin:0;font-size:13px;color:#C9A84C;line-height:1.6;">
          A payment request has been automatically sent to the customer.<br/>
          Once payment received, activate their monitoring:<br/>
          <a href="https://avibm.vercel.app/admin" style="color:#C9A84C;font-weight:700;">Open Admin Panel</a>
        </p>
      </div>
    `)
    await t.sendMail({
      from: `${adminName} <${gmailUser}>`,
      to: adminEmail,
      subject: `New AVIBM Registration — ${name} (${state})`,
      html: adminHtml,
      text: `New registration: ${name}, ${email}, ${phone}, ${state}, ${vehicles} vehicles, $${total}`
    })

    // 2. Auto-send payment request to customer
    const payHtml = emailHtml(`
      <h1 style="margin:0 0 8px;font-size:28px;font-weight:900;color:#fff;">PAYMENT REQUEST</h1>
      <p style="margin:0 0 24px;font-size:15px;color:#C9A84C;">One step away from activating your monitor, ${name.split(' ')[0]}.</p>
      <p style="margin:0 0 24px;font-size:15px;color:#aaa;line-height:1.7;">Thank you for registering with AVIBM. To activate your monitoring please make payment using the details below. Once confirmed, your monitor will be activated within the hour.</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1a0a;border:1px solid #C9A84C;border-radius:8px;margin-bottom:24px;">
        <tr><td style="padding:24px;">
          <div style="font-size:11px;letter-spacing:0.15em;color:#C9A84C;text-transform:uppercase;margin-bottom:16px;">Payment Details</div>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:6px 0;font-size:13px;color:#666;width:140px;">PayID</td><td style="padding:6px 0;font-size:15px;color:#C9A84C;font-weight:700;">${payid}</td></tr>
            <tr><td style="padding:6px 0;font-size:13px;color:#666;">Account Name</td><td style="padding:6px 0;font-size:13px;color:#fff;">${adminName}</td></tr>
            <tr><td style="padding:6px 0;font-size:13px;color:#666;">Amount</td><td style="padding:6px 0;font-size:22px;color:#fff;font-weight:900;">$${total} AUD</td></tr>
            <tr><td style="padding:6px 0;font-size:13px;color:#666;">Reference</td><td style="padding:6px 0;font-size:13px;color:#fff;">${name.replace(' ', '')}AVIBM</td></tr>
          </table>
        </td></tr>
      </table>
      <p style="margin:0;font-size:13px;color:#555;line-height:1.7;">Once payment is received your monitoring will be activated within the hour and you will receive a confirmation email. If you have any questions, reply to this email.</p>
    `)
    await t.sendMail({
      from: `${adminName} <${gmailUser}>`,
      to: email,
      subject: 'AVIBM — Payment Required to Activate Your Monitoring',
      html: payHtml,
      text: `Hi ${name}, please pay $${total} AUD via PayID: ${payid}. Reference: ${name.replace(' ', '')}AVIBM`
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('Notify registration failed:', e)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
