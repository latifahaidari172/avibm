import { NextResponse } from 'next/server'
import { emailHtml } from '@/lib/emailTemplate'
import { checkRateLimit, getIP, tooManyRequests } from '@/lib/rateLimit'

export async function POST(request: Request) {
  const ip = getIP(request)
  const { allowed } = checkRateLimit(`reg-confirm:${ip}`, 3, 60 * 60 * 1000)
  if (!allowed) return tooManyRequests('Too many requests. Please try again later.')
  try {
    const { name, email, state, vehicles, tier } = await request.json()
    const gmailUser = process.env.GMAIL_ADDRESS!
    const gmailPass = process.env.GMAIL_APP_PASSWORD!
    const adminName = process.env.ADMIN_NAME || 'AVIBM'
    const tierLabel: Record<string, string> = { priority: '🥇 Priority', standard: '🥈 Standard', basic: '🥉 Basic' }

    const html = emailHtml(`
      <h1 style="margin:0 0 8px;font-size:28px;font-weight:900;color:#ffffff;letter-spacing:0.05em;">REGISTRATION RECEIVED</h1>
      <p style="margin:0 0 28px;font-size:15px;color:#C9A84C;">We've got you covered, ${name.split(' ')[0]}.</p>
      <p style="margin:0 0 24px;font-size:15px;color:#aaaaaa;line-height:1.7;">Thank you for registering with AVIBM. We have received your details and are reviewing your registration now. You will receive a separate email shortly with payment instructions to activate your monitoring.</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:8px;margin-bottom:28px;">
        <tr><td style="padding:20px 24px;">
          <div style="font-size:11px;letter-spacing:0.15em;color:#C9A84C;text-transform:uppercase;margin-bottom:14px;">Registration Summary</div>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:5px 0;font-size:13px;color:#666;width:120px;">State</td><td style="padding:5px 0;font-size:13px;color:#fff;">${state}</td></tr>
            <tr><td style="padding:5px 0;font-size:13px;color:#666;">Vehicles</td><td style="padding:5px 0;font-size:13px;color:#fff;">${vehicles}</td></tr>
            <tr><td style="padding:5px 0;font-size:13px;color:#666;">Plan</td><td style="padding:5px 0;font-size:13px;color:#fff;">${tierLabel[tier] || tier}</td></tr>
          </table>
        </td></tr>
      </table>
      <div style="font-size:11px;letter-spacing:0.15em;color:#C9A84C;text-transform:uppercase;margin-bottom:14px;">What Happens Next</div>
      <table width="100%" cellpadding="0" cellspacing="0">
        ${[
          'You will receive a payment request email with our PayID details.',
          'Once payment is confirmed, we will activate your monitoring.',
          'You will receive a confirmation when your monitor goes live.',
          'The moment an earlier slot is found, we automatically rebook it and notify you instantly.',
        ].map((s, i) => `<tr>
          <td style="padding:8px 0;vertical-align:top;width:32px;"><div style="width:24px;height:24px;background:#C9A84C;border-radius:50%;text-align:center;line-height:24px;font-size:12px;font-weight:700;color:#000;">${i+1}</div></td>
          <td style="padding:8px 0 8px 12px;font-size:14px;color:#aaa;line-height:1.6;">${s}</td>
        </tr>`).join('')}
      </table>
      <div style="margin-top:28px;padding:16px 20px;background:#1a1a0a;border:1px solid #3a3a00;border-radius:8px;">
        <p style="margin:0;font-size:13px;color:#C9A84C;line-height:1.6;">Our system checks for new slots <strong>every minute, 24 hours a day</strong>. Thank you for your patience — we look forward to helping you get inspected sooner!</p>
      </div>
    `)

    const nm = require('nodemailer')
    const t = nm.createTransport({ service: 'gmail', auth: { user: gmailUser, pass: gmailPass } })
    await t.sendMail({ from: `${adminName} <${gmailUser}>`, to: email, subject: 'AVIBM — Registration Received', html, text: `Hi ${name}, thank you for registering with AVIBM. Payment instructions coming soon.` })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
