import { NextResponse } from 'next/server'
import { checkRateLimit, getIP, tooManyRequests } from '@/lib/rateLimit'
import { one } from '@/lib/db'

// Lightweight existence check used by the registration page to decide
// whether to sign an existing user in via magic link, or show the
// new-customer detail fields. "Exists" means the email is either a
// customer record OR a Supabase Auth account — anyone who has ever
// signed in counts, even if their customer row was since removed.
// Returns only a boolean — no data leaks beyond "registered / not".
// Rate limited to blunt enumeration.

// GoTrue's admin list-users endpoint ignores ?email=, so we page through
// and match client-side. Capped so a large user base can't stall the
// request — the customers check above already covers paying customers.
const AUTH_PAGE_SIZE = 1000
const AUTH_MAX_PAGES = 20

async function authUserExists(supabaseUrl: string, headers: Record<string, string>, email: string): Promise<boolean> {
  for (let page = 1; page <= AUTH_MAX_PAGES; page++) {
    const res = await fetch(
      `${supabaseUrl}/auth/v1/admin/users?page=${page}&per_page=${AUTH_PAGE_SIZE}`,
      { headers }
    )
    if (!res.ok) return false
    const data = await res.json()
    const users = Array.isArray(data) ? data : (data?.users || [])
    if (users.some((u: any) => (u?.email || '').toLowerCase() === email)) return true
    if (users.length < AUTH_PAGE_SIZE) break // last page
  }
  return false
}

export async function POST(request: Request) {
  const ip = getIP(request)
  const { allowed } = checkRateLimit(`check-email:${ip}`, 20, 15 * 60 * 1000)
  if (!allowed) return tooManyRequests('Too many requests. Please try again later.')
  try {
    const { email } = await request.json()
    const cleanEmail = (email || '').toLowerCase().trim()

    if (!cleanEmail || !/^\S+@\S+\.\S+$/.test(cleanEmail))
      return NextResponse.json({ error: 'Please enter a valid email.' }, { status: 400 })

    // Cheap indexed lookup first — most returning customers hit here.
    const row = await one(`SELECT id FROM customers WHERE email = $1 LIMIT 1`, [cleanEmail])
    if (row) return NextResponse.json({ exists: true })

    // Fall back to Auth — covers sign-in accounts with no customer row.
    // The GoTrue admin API has no avibm-schema equivalent; only query it
    // when Supabase env is still configured, otherwise treat as not-found.
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !supabaseKey) return NextResponse.json({ exists: false })
    const headers = {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
    }
    const exists = await authUserExists(supabaseUrl, headers, cleanEmail)
    return NextResponse.json({ exists })
  } catch {
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
