import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { customerEmail, customerName, vehicles, tier, price, total, state } = await request.json()

    const gmailUser = process.env.GMAIL_ADDRESS!
    const gmailPass = process.env.GMAIL_APP_PASSWORD!
    const payid     = process.env.PAYID || ''
    const adminName = process.env.ADMIN_NAME || 'AVIBM'

    const tierLabel: Record<string, string> = {
      priority: '🥇 Priority', standard: '🥈 Standard', basic: '🥉 Basic',
    }

    const subject = `AVIBM — Payment Required to Activate Your Monitoring`
    const body = `Hi ${customerName},

Thank you for registering with AVIBM — Australian Vehicle Inspection Booking Monitor!

To activate your monitoring please make payment via PayID:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PAYMENT DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PayID:    ${payid}
Name:     ${adminName}
Amount:   $${total} AUD
Reference: ${customerName.replace(' ', '')}AVIBM

SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
State:    ${state}
Plan:     ${tierLabel[tier] || tier}
Vehicles: ${vehicles}
Price:    $${price} per vehicle
Total:    $${total} AUD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Once payment is received your monitoring will be activated within the hour.

— ${adminName}
avibm.vercel.app`

    const nm = require('nodemailer')
    const t = nm.createTransport({ service: 'gmail', auth: { user: gmailUser, pass: gmailPass } })
    await t.sendMail({ from: `${adminName} <${gmailUser}>`, to: customerEmail, subject, text: body })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Payment request failed:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
