import { NextResponse } from 'next/server'

const headers = () => ({
  apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
})
const BASE = () => process.env.NEXT_PUBLIC_SUPABASE_URL!

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const since = searchParams.get('since')
    if (!since) return NextResponse.json({ count: 0 })
    const res = await fetch(
      `${BASE()}/rest/v1/customers?created_at=gt.${encodeURIComponent(since)}&select=id`,
      { headers: headers() }
    )
    const rows = await res.json()
    return NextResponse.json({ count: Array.isArray(rows) ? rows.length : 0 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
