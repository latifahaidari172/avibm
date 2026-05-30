import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { signToken, getAuthToken, unauthorized } from '@/lib/auth'
import { checkRateLimit, getIP, tooManyRequests } from '@/lib/rateLimit'
import { query, insertRow, updateById, deleteById } from '@/lib/db'

/** Migrate a plaintext password to bcrypt hash in the DB */
async function migratePassword(id: string, plaintext: string) {
  const hash = await bcrypt.hash(plaintext, 12)
  await updateById('admin_users', id, { password: hash })
}

export async function GET(request: Request) {
  try {
    if (!getAuthToken(request)) return unauthorized()
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    if (action === 'list') {
      const rows = await query(
        `SELECT id, created_at, username, role, active FROM admin_users WHERE role <> $1 ORDER BY created_at ASC`,
        ['owner'],
      )
      return NextResponse.json(rows)
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

      let rows: any[]
      try {
        rows = await query(
          `SELECT id, username, password, role FROM admin_users WHERE active = $1`,
          [true],
        )
      } catch {
        return NextResponse.json({ error: 'Database error' }, { status: 500 })
      }

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
      await insertRow('admin_users', {
        username: username.trim(),
        password: hash,
        role: 'admin',
        active: true,
      })
      return NextResponse.json({ ok: true })
    }

    if (action === 'remove') {
      await deleteById('admin_users', body.id)
      return NextResponse.json({ ok: true })
    }

    if (action === 'update') {
      const updates = { ...body.updates }
      if (updates.password) updates.password = await bcrypt.hash(updates.password.trim(), 12)
      await updateById('admin_users', body.id, updates)
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 })
  }
}
