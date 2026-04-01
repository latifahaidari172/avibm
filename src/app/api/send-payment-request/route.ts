import { NextResponse } from 'next/server'
import { emailHtml } from '@/lib/emailTemplate'
import { getAuthToken, unauthorized } from '@/lib/auth'

export async function POST(request: Request) {
  if (!getAuthToken(request)) return unauthorized()
  try {
    const { customerEmail, customerName, vehicles, tier, price, total, state } = await request.json()
    const gmailUser = process.env.GMAIL_ADDRESS!
    const gmailPass = process.env.GMAIL_APP_PASSWORD!
    const payid = process.env.PAYID || ''
    const adminName = process.env.ADMIN_NAME || 'AVIBM'
    const tierLabel: Record<string, string> = { priority: '🥇 Priority', standard: '🥈 Standard', basic: '🥉 Basic' }

    const html = emailHtml(`
      <h1 style="margin:0 0 8px;font-size:28px;font-weight:900;color:#ffffff;letter-spacing:0.05em;">PAYMENT REQUEST</h1>
      <p style="margin:0 0 28px;font-size:15px;color:#C9A84C;">One step away from activating your monitor, ${customerName.split(' ')[0]}.</p>
      <p style="margin:0 0 24px;font-size:15px;color:#aaaaaa;line-height:1.7;">To activate your AVIBM monitoring, please make payment using the PayID details below. Once we confirm your payment, your monitor will be activated within the hour.</p>

      <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1a0a;border:1px solid #C9A84C;border-radius:8px;margin-bottom:24px;">
        <tr><td style="padding:24px;">
          <div style="font-size:11px;letter-spacing:0.15em;color:#C9A84C;text-transform:uppercase;margin-bottom:16px;">Payment Details</div>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:7px 0;font-size:13px;color:#666;width:140px;">PayID</td><td style="padding:7px 0;font-size:15px;color:#C9A84C;font-weight:700;">${payid}</td></tr>
            <tr><td style="padding:7px 0;font-size:13px;color:#666;">Account Name</td><td style="padding:7px 0;font-size:13px;color:#fff;">${adminName}</td></tr>
            <tr><td style="padding:7px 0;font-size:13px;color:#666;">Amount</td><td style="padding:7px 0;font-size:22px;color:#ffffff;font-weight:900;">$${total} AUD</td></tr>
            <tr><td style="padding:7px 0;font-size:13px;color:#666;">Reference</td><td style="padding:7px 0;font-size:13px;color:#fff;">${customerName.replace(' ', '')}AVIBM</td></tr>
          </table>
        </td></tr>
      </table>

      <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:8px;margin-bottom:28px;">
        <tr><td style="padding:20px 24px;">
          <div style="font-size:11px;letter-spacing:0.15em;color:#C9A84C;text-transform:uppercase;margin-bottom:14px;">Order Summary</div>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:5px 0;font-size:13px;color:#666;width:140px;">State</td><td style="padding:5px 0;font-size:13px;color:#fff;">${state}</td></tr>
            <tr><td style="padding:5px 0;font-size:13px;color:#666;">Plan</td><td style="padding:5px 0;font-size:13px;color:#fff;">${tierLabel[tier] || tier}</td></tr>
            <tr><td style="padding:5px 0;font-size:13px;color:#666;">Vehicles</td><td style="padding:5px 0;font-size:13px;color:#fff;">${vehicles} × $${price}</td></tr>
            <tr style="border-top:1px solid #2a2a2a;">
              <td style="padding:10px 0 5px;font-size:14px;color:#fff;font-weight:700;">Total</td>
              <td style="padding:10px 0 5px;font-size:14px;color:#C9A84C;font-weight:700;">$${total} AUD</td>
            </tr>
          </table>
        </td></tr>
      </table>

      <p style="margin:0;font-size:13px;color:#555;line-height:1.7;">Once payment is received your monitoring will be activated within the hour and you'll receive a confirmation email. If you have any questions, simply reply to this email.</p>
    `)

    const nm = require('nodemailer')
    const t = nm.createTransport({ service: 'gmail', auth: { user: gmailUser, pass: gmailPass } })
    await t.sendMail({ from: `${adminName} <${gmailUser}>`, to: customerEmail, subject: 'AVIBM — Payment Required to Activate Your Monitoring', html, text: `Hi ${customerName}, please pay $${total} AUD via PayID: ${payid}. Reference: ${customerName.replace(' ', '')}AVIBM` })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
