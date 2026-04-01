import { NextResponse } from 'next/server'
import { getAuthToken, unauthorized } from '@/lib/auth'

const headers = () => ({
  apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
  'Content-Type': 'application/json',
})
const BASE = () => process.env.NEXT_PUBLIC_SUPABASE_URL!

export async function GET(request: Request) {
  if (!getAuthToken(request)) return unauthorized()
  try {
    const [custsRes, statusRes] = await Promise.all([
      fetch(`${BASE()}/rest/v1/customers?select=*,vehicles(*)&order=created_at.desc`, { headers: headers() }),
      fetch(`${BASE()}/rest/v1/monitor_status?id=eq.main&select=*`, { headers: headers() }),
    ])
    const customers = await custsRes.json()
    const statusRows = await statusRes.json()
    return NextResponse.json({
      customers: Array.isArray(customers) ? customers : [],
      monitorStatus: Array.isArray(statusRows) && statusRows.length > 0 ? statusRows[0] : null,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
