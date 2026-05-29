import { NextResponse } from 'next/server'
import { checkRateLimit, getIP, tooManyRequests } from '@/lib/rateLimit'

// Lightweight existence check used by the registration page to decide
// whether to sign an existing customer in via magic link, or show the
// new-customer detail fields. Returns only a boolean — no customer data
// leaks out beyond "this email is/ isn't registered". Rate limited to
// blunt enumeration.
export async function POST(request: Request) {
  const ip = getIP(request)
  const { allowed } = checkRateLimit(`check-email:${ip}`, 20, 15 * 60 * 1000)
  if (!allowed) return tooManyRequests('Too many requests. Please try again later.')
  try {
    const { email } = await request.json()
    const cleanEmail = (email || '').toLowerCase().trim()

    if (!cleanEmail || !/^\S+@\S+\.\S+$/.test(cleanEmail))
      return NextResponse.json({ error: 'Please enter a valid email.' }, { status: 400 })

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const headers = {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
    }

    const res = await fetch(
      `${supabaseUrl}/rest/v1/customers?email=eq.${encodeURIComponent(cleanEmail)}&select=id&limit=1`,
      { headers }
    )
    const data = await res.json()
    const exists = Array.isArray(data) && data.length > 0

    return NextResponse.json({ exists })
  } catch {
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
