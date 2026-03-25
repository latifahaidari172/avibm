import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { email, phone } = await request.json()
    const cleanEmail = (email || '').toLowerCase().trim()
    const cleanPhone = (phone || '').replace(/\D/g, '').trim()

    if (!cleanEmail || !cleanPhone)
      return NextResponse.json({ error: 'Please enter both email and phone number.' }, { status: 400 })

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const headers = {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
    }

    const res = await fetch(
      `${supabaseUrl}/rest/v1/customers?email=eq.${encodeURIComponent(cleanEmail)}&phone=eq.${encodeURIComponent(cleanPhone)}&select=first_name,state,tier,active,auto_payment_email,vehicles(label,make,model,year,active,cutoff_date,booked_date,booked_time,booked_location)`,
      { headers }
    )
    const data = await res.json()

    if (!Array.isArray(data) || data.length === 0)
      return NextResponse.json({ error: 'No account found with those details. Please check your email and phone number.' }, { status: 404 })

    const c = data[0]

    // Only return what's needed to display status — no sensitive fields
    return NextResponse.json({
      first_name: c.first_name,
      state: c.state,
      tier: c.tier,
      active: c.active,
      pending_payment: !c.active && c.auto_payment_email,
      vehicles: (c.vehicles || []).map((v: any) => ({
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
