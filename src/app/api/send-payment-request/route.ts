import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { customerEmail, customerName, vehicles, tier, price, total, state } = await request.json()

    const gmailUser = process.env.GMAIL_ADDRESS
    const gmailPass = process.env.GMAIL_APP_PASSWORD
    const payid     = process.env.PAYID        // your PayID e.g. your mobile or email
    const adminName = process.env.ADMIN_NAME || 'AVIBM'

    if (!gmailUser || !gmailPass || !payid) {
      return NextResponse.json({ error: 'Email not configured' }, { status: 500 })
    }

    const tierLabel: Record<string, string> = {
      priority: '🥇 Priority',
      standard: '🥈 Standard',
      basic:    '🥉 Basic',
    }

    const subject = `AVIBM — Payment Required to Activate Your Monitoring`

    const body = `Hi ${customerName},

Thank you for registering with AVIBM — Australian Vehicle Inspection Booking Monitor!

Your registration has been received and is ready to be activated. To get started, please make payment via PayID:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PAYMENT DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PayID:       ${payid}
Name:        ${adminName}
Amount:      $${total} AUD
Reference:   ${customerName.replace(' ', '')}AVIBM

SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
State:       ${state}
Plan:        ${tierLabel[tier] || tier}
Vehicles:    ${vehicles}
Price:       $${price} per vehicle
Total:       $${total} AUD

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Once your payment is received, your monitoring will be activated within the hour and you'll receive a confirmation email.

If you have any questions, please reply to this email.

— ${adminName}
Australian Vehicle Inspection Booking Monitor
avibm.vercel.app`

    const nodemailer = await import('nodemailer')
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: gmailUser, pass: gmailPass },
    })

    await transporter.sendMail({
      from: `${adminName} <${gmailUser}>`,
      to: customerEmail,
      subject,
      text: body,
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Payment request email failed:', error)
    return NextResponse.json({ error: 'Failed to send' }, { status: 500 })
  }
}
