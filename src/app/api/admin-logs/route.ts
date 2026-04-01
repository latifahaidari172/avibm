import { NextResponse } from 'next/server'

const getHeaders = () => ({
  apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
  'Content-Type': 'application/json',
})
const BASE = () => `${process.env.NEXT_PUBLIC_SUPABASE_URL!}/rest/v1/admin_logs`

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const username = searchParams.get('username')
    let url = `${BASE()}?select=*&order=created_at.desc&limit=200`
    if (username) url += `&admin_username=eq.${encodeURIComponent(username)}`
    const res = await fetch(url, { headers: getHeaders() })
    return NextResponse.json(await res.json())
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { action, details, admin_username } = await request.json()
    if (!action) return NextResponse.json({ error: 'Missing action' }, { status: 400 })
    await fetch(BASE(), {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ action, details: details || null, admin_username: admin_username || null }),
    })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
