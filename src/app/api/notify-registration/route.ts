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

    const tierPrices: Record<string, number> = { priority: 10, standard: 7.5, basic: 5 }
    const price = state === 'SA' ? 5 : (tierPrices[tier] || 7.5)
    const total = (price * vehicles).toFixed(2)
    const tierLabel: Record<string, string> = { priority: '🥇 Priority', standard: '🥈 Standard', basic: '🥉 Basic' }

    const nm = require('nodemailer')
    const t = nm.createTransport({ service: 'gmail', auth: { user: gmailUser, pass: gmailPass } })

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
          <a href="https://avibm.vercel.app/admin" style="color:#C9A84C;font-weight:700;">→ Open Admin Panel</a>
        </p>
      </div>
    `)
    await t.sendMail({ from: `${adminName} <${gmailUser}>`, to: adminEmail, subject: `🆕 New AVIBM Registration — ${name} (${state})`, html: adminHtml, text: `New registration: ${name}, ${email}, ${phone}, ${state}, ${vehicles} vehicles, $${total}` })

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
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:8px;margin-bottom:24px;">
        <tr><td style="padding:20px 24px;">
          <div style="font-size:11px;letter-spacing:0.15em;color:#C9A84C;text-transform:uppercase;margin-bottom:14px;">Order Summary</div>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:5px 0;font-size:13px;color:#666;width:140px;">State</td><td style="padding:5px 0;font-size:13px;color:#fff;">${state}</td></tr>
            <tr><td style="padding:5px 0;font-size:13px;color:#666;">Plan</td><td style="padding:5px 0;font-size:13px;color:#fff;">${state === 'SA' ? '🥇 Priority (flat rate)' : (tierLabel[tier] || tier)}</td></tr>
            <tr><td style="padding:5px 0;font-size:13px;color:#666;">Vehicles</td><td style="padding:5px 0;font-size:13px;color:#fff;">${vehicles} × $${price}</td></tr>
            <tr style="border-top:1px solid #2a2a2a;">
              <td style="padding:10px 0 5px;font-size:14px;color:#fff;font-weight:700;">Total</td>
              <td style="padding:10px 0 5px;font-size:14px;color:#C9A84C;font-weight:700;">$${total} AUD</td>
            </tr>
          </table>
        </td></tr>
      </table>
      <p style="margin:0;font-size:13px;color:#555;line-height:1.7;">Once payment is received your monitoring will be activated within the hour and you'll receive a confirmation email. If you have any questions, reply to this email.</p>
    `)
    await t.sendMail({ from: `${adminName} <${gmailUser}>`, to: email, subject: 'AVIBM — Payment Required to Activate Your Monitoring', html: payHtml, text: `Hi ${name}, please pay $${total} AUD via PayID: ${payid}. Reference: ${name.replace(' ', '')}AVIBM` })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('Notify registration failed:', e)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
