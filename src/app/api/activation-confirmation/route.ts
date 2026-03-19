import { NextResponse } from 'next/server'
import { emailHtml } from '@/lib/emailTemplate'

export async function POST(request: Request) {
  try {
    const { name, email, state, vehicles } = await request.json()
    const gmailUser = process.env.GMAIL_ADDRESS!
    const gmailPass = process.env.GMAIL_APP_PASSWORD!
    const adminName = process.env.ADMIN_NAME || 'AVIBM'

    const html = emailHtml(`
      <div style="text-align:center;margin-bottom:28px;">
        <div style="display:inline-block;width:64px;height:64px;background:#1a2a1a;border:2px solid #5adb5a;border-radius:50%;line-height:64px;font-size:28px;margin-bottom:16px;">✅</div>
        <h1 style="margin:0 0 8px;font-size:28px;font-weight:900;color:#ffffff;letter-spacing:0.05em;">YOUR MONITOR IS LIVE</h1>
        <p style="margin:0;font-size:15px;color:#5adb5a;">Active and searching right now, ${name.split(' ')[0]}.</p>
      </div>

      <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a2a1a;border:1px solid #2a4a2a;border-radius:8px;margin-bottom:28px;">
        <tr><td style="padding:20px 24px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:5px 0;font-size:13px;color:#4a7a4a;width:140px;">State</td><td style="padding:5px 0;font-size:13px;color:#fff;">${state}</td></tr>
            <tr><td style="padding:5px 0;font-size:13px;color:#4a7a4a;">Vehicles</td><td style="padding:5px 0;font-size:13px;color:#fff;">${vehicles}</td></tr>
            <tr><td style="padding:5px 0;font-size:13px;color:#4a7a4a;">Status</td><td style="padding:5px 0;font-size:13px;color:#5adb5a;font-weight:700;">● ACTIVE — Searching now</td></tr>
            <tr><td style="padding:5px 0;font-size:13px;color:#4a7a4a;">Check frequency</td><td style="padding:5px 0;font-size:13px;color:#fff;">Every minute, 24/7</td></tr>
          </table>
        </td></tr>
      </table>

      <p style="margin:0 0 20px;font-size:15px;color:#aaaaaa;line-height:1.7;">Our system is now actively monitoring for the earliest available inspection date. You don't need to do anything — just sit back and we'll handle it!</p>

      <div style="padding:16px 20px;background:#1a1a0a;border:1px solid #3a3a00;border-radius:8px;margin-bottom:24px;">
        <p style="margin:0;font-size:13px;color:#C9A84C;line-height:1.6;"><strong style="color:#C9A84C;">The moment an earlier slot becomes available</strong>, we will automatically rebook it for you and send you an email confirmation with the new date and location straight away.</p>
      </div>

      <p style="margin:0;font-size:13px;color:#555;line-height:1.7;">Thank you for choosing AVIBM. We're working hard around the clock to get you the earliest possible appointment. If you have any questions, simply reply to this email.</p>
    `)

    const nm = require('nodemailer')
    const t = nm.createTransport({ service: 'gmail', auth: { user: gmailUser, pass: gmailPass } })
    await t.sendMail({ from: `${adminName} <${gmailUser}>`, to: email, subject: 'AVIBM — Your Monitor is Now Active! 🟢', html, text: `Hi ${name}, your AVIBM monitor is now live and searching every minute for the earliest inspection date. We'll notify you the moment a slot is found and rebooked.` })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
