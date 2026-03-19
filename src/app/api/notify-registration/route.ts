import { NextResponse } from 'next/server'

async function sendEmail(to: string, subject: string, body: string) {
  const gmailUser = process.env.GMAIL_ADDRESS!
  const gmailPass = process.env.GMAIL_APP_PASSWORD!

  const msg = [
    `From: ${process.env.ADMIN_NAME || 'AVIBM'} <${gmailUser}>`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `Content-Type: text/plain; charset=utf-8`,
    ``,
    body,
  ].join('\r\n')

  const encoded = Buffer.from(msg).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: '',
    }),
  })

  // Use SMTP via direct fetch to a mail relay isn't possible without a lib
  // Fallback: use a simple SMTP approach via nodemailer but with type bypass
  const nm = require('nodemailer')
  const t = nm.createTransport({ service: 'gmail', auth: { user: gmailUser, pass: gmailPass } })
  await t.sendMail({ from: gmailUser, to, subject, text: body })
}

export async function POST(request: Request) {
  try {
    const { name, email, phone, state, vehicles, tier } = await request.json()

    const adminEmail = process.env.ADMIN_NOTIFY_EMAIL!
    const adminName  = process.env.ADMIN_NAME || 'AVIBM'
    const tierPrices: Record<string, number> = { priority: 10, standard: 7.5, basic: 5 }
    const price = tierPrices[tier] || 7.5
    const total = (price * vehicles).toFixed(2)

    const adminSubject = `🆕 New AVIBM Registration — ${name} (${state})`
    const adminBody = `New registration received!\n\nName: ${name}\nEmail: ${email}\nPhone: ${phone}\nState: ${state}\nVehicles: ${vehicles}\nTier: ${tier}\nAmount: $${total}\n\nActivate at: https://avibm.vercel.app/admin\n\n— ${adminName}`

    await sendEmail(adminEmail, adminSubject, adminBody)

    const autoEmail = process.env.AUTO_PAYMENT_EMAIL === 'true'
    if (autoEmail) {
      const payid = process.env.PAYID || ''
      const customerSubject = `AVIBM — Payment Required to Activate Your Monitoring`
      const customerBody = `Hi ${name},\n\nThank you for registering with AVIBM!\n\nTo activate your monitoring please pay via PayID:\n\nPayID: ${payid}\nAmount: $${total} AUD\nReference: ${name.replace(' ', '')}AVIBM\n\nOnce payment is received your monitoring will be activated.\n\n— ${adminName}\navibm.vercel.app`
      await sendEmail(email, customerSubject, customerBody)
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Email failed:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
