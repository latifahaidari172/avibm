import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { emailHtml } from '@/lib/emailTemplate'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(request: Request) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')
  if (!sig) return NextResponse.json({ error: 'No signature' }, { status: 400 })

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (e: any) {
    return NextResponse.json({ error: `Webhook Error: ${e.message}` }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const { customer_id, state } = session.metadata || {}
    if (!customer_id) return NextResponse.json({ error: 'No customer_id' }, { status: 400 })

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const headers = {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
    }

    // Activate customer
    await fetch(`${supabaseUrl}/rest/v1/customers?id=eq.${customer_id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ active: true }),
    })

    // Fetch customer details for email
    const res = await fetch(
      `${supabaseUrl}/rest/v1/customers?id=eq.${customer_id}&select=*,vehicles(*)`,
      { headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` } }
    )
    const data = await res.json()
    const customer = data[0]

    if (customer) {
      const name = `${customer.first_name} ${customer.last_name}`
      const vehicleCount = customer.vehicles?.length || 1

      const html = emailHtml(`
        <div style="text-align:center;margin-bottom:28px;">
          <div style="display:inline-block;width:64px;height:64px;background:#1a2a1a;border:2px solid #5adb5a;border-radius:50%;line-height:64px;font-size:28px;margin-bottom:16px;">✅</div>
          <h1 style="margin:0 0 8px;font-size:28px;font-weight:900;color:#ffffff;letter-spacing:0.05em;">PAYMENT CONFIRMED</h1>
          <p style="margin:0;font-size:15px;color:#5adb5a;">Your monitor is now live, ${name.split(' ')[0]}.</p>
        </div>
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a2a1a;border:1px solid #2a4a2a;border-radius:8px;margin-bottom:28px;">
          <tr><td style="padding:20px 24px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td style="padding:5px 0;font-size:13px;color:#4a7a4a;width:140px;">State</td><td style="padding:5px 0;font-size:13px;color:#fff;">${state}</td></tr>
              <tr><td style="padding:5px 0;font-size:13px;color:#fff;">${vehicleCount} vehicle${vehicleCount !== 1 ? 's' : ''}</td></tr>
              <tr><td style="padding:5px 0;font-size:13px;color:#4a7a4a;">Status</td><td style="padding:5px 0;font-size:13px;color:#5adb5a;font-weight:700;">● ACTIVE — Searching now</td></tr>
            </table>
          </td></tr>
        </table>
        <p style="margin:0 0 20px;font-size:15px;color:#aaaaaa;line-height:1.7;">Our system is now actively monitoring for the earliest available inspection date. The moment a slot is found, we will automatically rebook it and send you a confirmation straight away.</p>
        <div style="padding:16px 20px;background:#1a1a0a;border:1px solid #3a3a00;border-radius:8px;margin-bottom:24px;">
          <p style="margin:0;font-size:13px;color:#C9A84C;line-height:1.6;">You don't need to do anything — just sit back and we'll handle it!</p>
        </div>
        <p style="margin:0;font-size:13px;color:#555;line-height:1.7;">Thank you for choosing AVIBM. If you have any questions, simply reply to this email.</p>
      `)

      const nm = require('nodemailer')
      const t = nm.createTransport({
        service: 'gmail',
        auth: { user: process.env.GMAIL_ADDRESS, pass: process.env.GMAIL_APP_PASSWORD },
      })
      await t.sendMail({
        from: `${process.env.ADMIN_NAME || 'AVIBM'} <${process.env.GMAIL_ADDRESS}>`,
        to: customer.email,
        subject: 'AVIBM — Payment Confirmed. Your Monitor is Live! 🟢',
        html,
        text: `Hi ${name}, your payment was received and your AVIBM monitor is now live. We'll notify you the moment an earlier slot is found and rebooked.`,
      })
    }
  }

  return NextResponse.json({ received: true })
}
