import { NextResponse } from 'next/server'
import { signToken, getAuthToken, unauthorized } from '@/lib/auth'

const getHeaders = () => ({
  apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
})
const BASE = () => `${process.env.NEXT_PUBLIC_SUPABASE_URL!}/rest/v1/admin_users`

export async function GET(request: Request) {
  try {
    if (!getAuthToken(request)) return unauthorized()
    const { searchParams } = new URL(request.url)
    if (searchParams.get('action') === 'list') {
      const res = await fetch(`${BASE()}?role=neq.owner&select=id,created_at,username,role,active&order=created_at.asc`, { headers: getHeaders() })
      return NextResponse.json(await res.json())
    }
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action } = body

    // Login — no auth token required
    if (!action) {
      const { username, password } = body
      if (!username || !password) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

      const url = `${BASE()}?select=id,username,password,role&active=eq.true`
      const res = await fetch(url, { headers: getHeaders() })
      const rows = await res.json()

      if (!Array.isArray(rows)) return NextResponse.json({ error: 'Database error' }, { status: 500 })

      const match = rows.find(
        (r: any) =>
          r.username?.toLowerCase() === username.trim().toLowerCase() &&
          r.password === password.trim()
      )

      if (!match) return NextResponse.json({ error: 'Incorrect username or password' }, { status: 401 })

      const token = signToken({ id: match.id, username: match.username, role: match.role })
      return NextResponse.json({ id: match.id, username: match.username, role: match.role, token })
    }

    // All other actions require a valid token
    if (!getAuthToken(request)) return unauthorized()

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

    if (action === 'update') {
      await fetch(`${BASE()}?id=eq.${body.id}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify(body.updates),
      })
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 })
  }
}
