import { NextResponse } from 'next/server'
import { getAuthToken, unauthorized } from '@/lib/auth'

const headers = () => ({
  apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
})
const BASE = () => process.env.NEXT_PUBLIC_SUPABASE_URL!

export async function GET(request: Request) {
  if (!getAuthToken(request)) return unauthorized()
  try {
    const res = await fetch(`${BASE()}/rest/v1/monitor_status?id=eq.main&select=*`, { headers: headers() })
    const rows = await res.json()
    return NextResponse.json(Array.isArray(rows) && rows.length > 0 ? rows[0] : null)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
