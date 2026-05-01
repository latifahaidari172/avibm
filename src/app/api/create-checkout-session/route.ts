import { NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

// Customer-facing price = exact amount charged. Stripe fees absorbed by us.
// Priority: $5.00 / Standard: $3.00 / Basic: $1.50
const TIER_PRICES: Record<string, { amount: number; label: string }> = {
  priority: { amount: 500, label: 'Priority Monitoring' },
  standard: { amount: 300, label: 'Standard Monitoring' },
  basic:    { amount: 150, label: 'Basic Monitoring' },
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
