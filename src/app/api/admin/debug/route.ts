import { NextResponse } from 'next/server'

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey     = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  const checks: Record<string, unknown> = {
    supabaseUrl:    supabaseUrl ? `${supabaseUrl.slice(0, 30)}...` : 'MISSING',
    serviceKey:     serviceKey  ? `${serviceKey.slice(0, 20)}...`  : 'MISSING',
    anonKey:        anonKey     ? `${anonKey.slice(0, 20)}...`     : 'MISSING',
  }

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Missing env vars', checks })
  }

  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/customers?select=id&limit=5`,
      {
        headers: {
          'apikey':        serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
        }
      }
    )
    const data = await res.json()
    checks.supabaseStatus = res.status
    checks.supabaseResponse = data
  } catch (e: any) {
    checks.supabaseError = e.message
  }

  return NextResponse.json(checks)
}
