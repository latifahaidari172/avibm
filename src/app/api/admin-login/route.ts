import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { signToken, getAuthToken, unauthorized } from '@/lib/auth'
import { checkRateLimit, getIP, tooManyRequests } from '@/lib/rateLimit'

const getHeaders = () => ({
  apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
})
const BASE = () => `${process.env.NEXT_PUBLIC_SUPABASE_URL!}/rest/v1/admin_users`

/** Migrate a plaintext password to bcrypt hash in the DB */
async function migratePassword(id: string, plaintext: string) {
  const hash = await bcrypt.hash(plaintext, 12)
  await fetch(`${BASE()}?id=eq.${id}`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify({ password: hash }),
  })
}

export async function GET(request: Request) {
  try {
    if (!getAuthToken(request)) return unauthorized()
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    if (action === 'list') {
      const res = await fetch(`${BASE()}?role=neq.owner&select=id,created_at,username,role,active&order=created_at.asc`, { headers: getHeaders() })
      return NextResponse.json(await res.json())
    }
    if (action === 'refresh') {
      const payload = getAuthToken(request) as { id: string; username: string; role: string }
      const token = signToken({ id: payload.id, username: payload.username, role: payload.role })
      return NextResponse.json({ token })
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

    // Login — rate limited, no token required
    if (!action) {
      const ip = getIP(request)
      const { allowed } = checkRateLimit(`login:${ip}`, 5, 15 * 60 * 1000)
      if (!allowed) return tooManyRequests('Too many login attempts. Try again in 15 minutes.')

      const { username, password } = body
      if (!username || !password) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

      const url = `${BASE()}?select=id,username,password,role&active=eq.true`
      const res = await fetch(url, { headers: getHeaders() })
      const rows = await res.json()
      if (!Array.isArray(rows)) return NextResponse.json({ error: 'Database error' }, { status: 500 })

      const user = rows.find((r: any) => r.username?.toLowerCase() === username.trim().toLowerCase())

      const fail = async () => {
        await new Promise(r => setTimeout(r, 500))
        return NextResponse.json({ error: 'Incorrect username or password' }, { status: 401 })
      }

      if (!user) return fail()

      const stored: string = user.password || ''
      const isHashed = stored.startsWith('$2')
      let valid = false

      if (isHashed) {
        valid = await bcrypt.compare(password.trim(), stored)
      } else {
        // Plaintext — compare then auto-migrate to hash
        valid = stored === password.trim()
        if (valid) migratePassword(user.id, password.trim()) // fire-and-forget migration
      }

      if (!valid) return fail()

      const token = signToken({ id: user.id, username: user.username, role: user.role })
      return NextResponse.json({ id: user.id, username: user.username, role: user.role, token })
    }

    // All other actions require a valid token
    if (!getAuthToken(request)) return unauthorized()

    if (action === 'add') {
      const { username, password } = body
      const hash = await bcrypt.hash(password.trim(), 12)
      await fetch(BASE(), {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ username: username.trim(), password: hash, role: 'admin', active: true }),
      })
      return NextResponse.json({ ok: true })
    }

    if (action === 'remove') {
      await fetch(`${BASE()}?id=eq.${body.id}`, { method: 'DELETE', headers: getHeaders() })
      return NextResponse.json({ ok: true })
    }

    if (action === 'update') {
      const updates = { ...body.updates }
      if (updates.password) updates.password = await bcrypt.hash(updates.password.trim(), 12)
      await fetch(`${BASE()}?id=eq.${body.id}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify(updates),
      })
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 })
  }
}
