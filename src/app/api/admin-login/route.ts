import { NextResponse } from 'next/server'

const getHeaders = () => ({
  apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
})
const BASE = () => `${process.env.NEXT_PUBLIC_SUPABASE_URL!}/rest/v1/admin_users`

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  if (searchParams.get('action') === 'list') {
    const res = await fetch(`${BASE()}?role=neq.owner&select=id,created_at,username,role,active&order=created_at.asc`, { headers: getHeaders() })
    return NextResponse.json(await res.json())
  }
  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}

export async function POST(request: Request) {
  const body = await request.json()
  const { action } = body

  if (!action) {
    // Login
    const { username, password } = body
    if (!username || !password) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    const res = await fetch(
      `${BASE()}?username=ilike.${encodeURIComponent(username.trim())}&password=eq.${encodeURIComponent(password.trim())}&active=eq.true&select=id,username,role`,
      { headers: getHeaders() }
    )
    const data = await res.json()
    if (!data || data.length === 0) return NextResponse.json({ error: 'Incorrect username or password' }, { status: 401 })
    return NextResponse.json(data[0])
  }

  if (action === 'add') {
    const { username, password } = body
    await fetch(BASE(), {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ username: username.trim(), password: password.trim(), role: 'admin', active: true }),
    })
    return NextResponse.json({ ok: true })
  }

  if (action === 'remove') {
    await fetch(`${BASE()}?id=eq.${body.id}`, { method: 'DELETE', headers: getHeaders() })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
