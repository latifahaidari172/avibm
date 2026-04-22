import { NextResponse } from 'next/server'
import { getAuthToken, unauthorized } from '@/lib/auth'

const headers = () => ({
  apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
})
const BASE = () => `${process.env.NEXT_PUBLIC_SUPABASE_URL!}/rest/v1/bot_settings`

export async function GET(request: Request) {
  if (!getAuthToken(request)) return unauthorized()
  try {
    const res = await fetch(`${BASE()}?id=eq.main&select=*`, { headers: headers() })
    const rows = await res.json()
    if (Array.isArray(rows) && rows.length > 0) return NextResponse.json(rows[0])
    return NextResponse.json({})
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  if (!getAuthToken(request)) return unauthorized()
  try {
    const body = await request.json()
    const res = await fetch(`${BASE()}?id=eq.main`, {
      method: 'PATCH',
      headers: headers(),
      body: JSON.stringify({ ...body, updated_at: new Date().toISOString() }),
    })
    const data = await res.json()
    return NextResponse.json(Array.isArray(data) && data.length > 0 ? data[0] : data)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
