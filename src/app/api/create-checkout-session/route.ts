import { NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

// Prices include Stripe fee pass-through so user nets exact amount
// Priority: nets $10.00 → charge $10.49
// Standard: nets $7.50 → charge $7.94
// Basic:    nets $5.00 → charge $5.40
const TIER_PRICES: Record<string, { amount: number; label: string }> = {
  priority: { amount: 1049, label: 'Priority Monitoring' },
  standard: { amount: 794,  label: 'Standard Monitoring' },
  basic:    { amount: 540,  label: 'Basic Monitoring' },
}

export async function POST(request: Request) {
  try {
    const { tier, customer_id, state } = await request.json()
    const price = TIER_PRICES[tier] || TIER_PRICES.basic
    const origin = request.headers.get('origin') || 'https://avibm.vercel.app'

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

    return NextResponse.json({ url: session.url })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
