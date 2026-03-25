import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { emailHtml } from '@/lib/emailTemplate'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

const TIER_PRICES: Record<string, { amount: number; label: string }> = {
  priority: { amount: 1049, label: 'Priority Monitoring' },
  standard: { amount: 794,  label: 'Standard Monitoring' },
  basic:    { amount: 540,  label: 'Basic Monitoring' },
}

export async function POST(request: Request) {
  try {
    const { customer_id, tier, state, coupon_code, customer_name, customer_email } = await request.json()
    const price = TIER_PRICES[tier] || TIER_PRICES.basic
    const origin = 'https://avibm.vercel.app'
    const firstName = (customer_name || '').split(' ')[0]

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'aud',
          product_data: {
            name: `AVIBM ${price.label} — ${state}`,
            description: 'One-time fee per vehicle. We automatically find and book your earliest available roadworthy inspection slot.',
          },
          unit_amount: price.amount,
        },
        quantity: 1,
      }],
      mode: 'payment',
      allow_promotion_codes: true,
      success_url: `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/register/${state.toLowerCase()}`,
      metadata: { customer_id: String(customer_id), tier, state },
    })

    const couponSection = coupon_code ? `
      <div style="padding:20px 24px;background:#1a1a0a;border:1px solid #C9A84C;border-radius:8px;margin-bottom:24px;text-align:center;">
        <div style="font-size:11px;letter-spacing:0.15em;color:#C9A84C;text-transform:uppercase;margin-bottom:10px;">Your Discount Code</div>
        <div style="font-size:32px;font-weight:900;color:#C9A84C;letter-spacing:0.25em;font-family:monospace;">${coupon_code}</div>
        <div style="font-size:12px;color:#888;margin-top:8px;">Enter this code at checkout to apply your discount</div>
      </div>
    ` : ''

    const html = emailHtml(`
      <h1 style="margin:0 0 8px;font-size:28px;font-weight:900;color:#ffffff;letter-spacing:0.05em;">COMPLETE YOUR REGISTRATION</h1>
      <p style="margin:0 0 28px;font-size:15px;color:#C9A84C;">One step left, ${firstName}.</p>
      <p style="margin:0 0 24px;font-size:15px;color:#aaaaaa;line-height:1.7;">Your vehicle details have been saved. Complete your payment to activate your AVIBM monitor and start searching for earlier inspection slots automatically.</p>
      ${couponSection}
      <a href="${session.url}" style="display:block;background:#C9A84C;color:#000;text-align:center;padding:16px 24px;border-radius:8px;font-weight:900;font-size:16px;text-decoration:none;letter-spacing:0.05em;margin-bottom:24px;">COMPLETE PAYMENT →</a>
      <p style="margin:0;font-size:12px;color:#555;line-height:1.7;text-align:center;">This link is unique to your registration. If you have any questions, reply to this email.</p>
    `)

    const nm = require('nodemailer')
    const t = nm.createTransport({
      service: 'gmail',
      auth: { user: process.env.GMAIL_ADDRESS, pass: process.env.GMAIL_APP_PASSWORD },
    })
    await t.sendMail({
      from: `${process.env.ADMIN_NAME || 'AVIBM'} <${process.env.GMAIL_ADDRESS}>`,
      to: customer_email,
      subject: 'AVIBM — Complete Your Payment to Go Live',
      html,
      text: `Hi ${firstName}, complete your payment here: ${session.url}${coupon_code ? ` Use code ${coupon_code} for a discount.` : ''}`,
    })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
