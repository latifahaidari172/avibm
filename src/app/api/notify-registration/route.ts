import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { name, email, phone, state, vehicles, tier } = await request.json()

    const adminEmail = process.env.ADMIN_NOTIFY_EMAIL
    const gmailUser  = process.env.GMAIL_ADDRESS
    const gmailPass  = process.env.GMAIL_APP_PASSWORD

    if (!adminEmail || !gmailUser || !gmailPass) {
      return NextResponse.json({ error: 'Email not configured' }, { status: 500 })
    }

    const tierPrices: Record<string, string> = {
      priority: '$10',
      standard: '$7.50',
      basic:    '$5',
    }
    const price = tierPrices[tier] || '$7.50'
    const total = state === 'QLD'
      ? `${vehicles} vehicle${vehicles !== 1 ? 's' : ''} × ${price} = $${(vehicles * parseFloat(price.replace('$',''))).toFixed(2)}`
      : 'SA monitoring'

    const subject = `🆕 New AVIBM Registration — ${name} (${state})`
    const body = `New registration received on AVIBM!\n\n` +
      `Name:     ${name}\n` +
      `Email:    ${email}\n` +
      `Phone:    ${phone}\n` +
      `State:    ${state}\n` +
      `Vehicles: ${vehicles}\n` +
      `Tier:     ${tier}\n` +
      `Amount:   ${total}\n\n` +
      `Action required:\n` +
      `1. Invoice the customer via bank transfer / PayID\n` +
      `2. Once paid, activate them at: ${process.env.NEXT_PUBLIC_SITE_URL || 'https://avibm.vercel.app'}/admin\n\n` +
      `— AVIBM`

    // Send via Gmail SMTP using nodemailer
    const nodemailer = await import('nodemailer')
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: gmailUser, pass: gmailPass },
    })

    await transporter.sendMail({
      from: gmailUser,
      to: adminEmail,
      subject,
      text: body,
    })

    // Check if auto payment email is enabled globally
    const autoEmail = process.env.AUTO_PAYMENT_EMAIL === 'true'
    if (autoEmail) {
      const payid     = process.env.PAYID || ''
      const adminName = process.env.ADMIN_NAME || 'AVIBM'
      const tierPrices: Record<string, number> = { priority: 10, standard: 7.5, basic: 5 }
      const price = tierPrices[tier] || 7.5
      const total = (price * vehicles).toFixed(2)
      const tierLabel: Record<string, string> = {
        priority: '🥇 Priority', standard: '🥈 Standard', basic: '🥉 Basic',
      }

      const customerSubject = `AVIBM — Payment Required to Activate Your Monitoring`
      const customerBody = `Hi ${name},

Thank you for registering with AVIBM — Australian Vehicle Inspection Booking Monitor!

Your registration has been received. To activate your monitoring, please make payment via PayID:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PAYMENT DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PayID:       ${payid}
Name:        ${adminName}
Amount:      $${total} AUD
Reference:   ${name.replace(' ', '')}AVIBM

SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
State:       ${state}
Plan:        ${tierLabel[tier] || tier}
Vehicles:    ${vehicles}
Price:       $${price} per vehicle
Total:       $${total} AUD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Once payment is received your monitoring will be activated within the hour.

— ${adminName}
avibm.vercel.app`

      await transporter.sendMail({
        from: `${adminName} <${gmailUser}>`,
        to: email,
        subject: customerSubject,
        text: customerBody,
      })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Notification email failed:', error)
    return NextResponse.json({ error: 'Failed to send' }, { status: 500 })
  }
}
