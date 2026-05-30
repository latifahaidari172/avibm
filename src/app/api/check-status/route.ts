import { NextResponse } from 'next/server'
import { checkRateLimit, getIP, tooManyRequests } from '@/lib/rateLimit'
import { one, query } from '@/lib/db'

export async function POST(request: Request) {
  const ip = getIP(request)
  const { allowed } = checkRateLimit(`check-status:${ip}`, 10, 15 * 60 * 1000)
  if (!allowed) return tooManyRequests('Too many requests. Please try again later.')
  try {
    const { email, phone } = await request.json()
    const cleanEmail = (email || '').toLowerCase().trim()
    const cleanPhone = (phone || '').replace(/\D/g, '').trim()

    if (!cleanEmail || !cleanPhone)
      return NextResponse.json({ error: 'Please enter both email and phone number.' }, { status: 400 })

    const c = await one<any>(
      `SELECT id, first_name, state, tier, active, auto_payment_email
         FROM customers
        WHERE email = $1 AND phone = $2`,
      [cleanEmail, cleanPhone],
    )

    if (!c)
      return NextResponse.json({ error: 'No account found with those details. Please check your email and phone number.' }, { status: 404 })

    const vehicles = await query<any>(
      `SELECT label, make, model, year, active, cutoff_date, booked_date, booked_time, booked_location
         FROM vehicles WHERE customer_id = $1`,
      [c.id],
    )

    // Only return what's needed to display status — no sensitive fields
    return NextResponse.json({
      first_name: c.first_name,
      state: c.state,
      tier: c.tier,
      active: c.active,
      pending_payment: !c.active && c.auto_payment_email,
      vehicles: vehicles.map((v: any) => ({
        label: v.label || `${v.make} ${v.model} ${v.year}`.trim(),
        active: v.active,
        cutoff_date: v.cutoff_date,
        booked_date: v.booked_date,
        booked_time: v.booked_time,
        booked_location: v.booked_location,
      })),
    })
  } catch {
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
