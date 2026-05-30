import { NextResponse } from 'next/server'
import { getAuthToken, unauthorized } from '@/lib/auth'
import { query, insertRow } from '@/lib/db'

export async function GET(request: Request) {
  if (!getAuthToken(request)) return unauthorized()
  try {
    const { searchParams } = new URL(request.url)
    const username = searchParams.get('username')
    let rows
    if (username) {
      rows = await query(
        `SELECT * FROM admin_logs WHERE admin_username = $1 ORDER BY created_at DESC LIMIT 200`,
        [username],
      )
    } else {
      rows = await query(`SELECT * FROM admin_logs ORDER BY created_at DESC LIMIT 200`)
    }
    return NextResponse.json(rows)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  if (!getAuthToken(request)) return unauthorized()
  try {
    const { action, details, admin_username } = await request.json()
    if (!action) return NextResponse.json({ error: 'Missing action' }, { status: 400 })
    await insertRow('admin_logs', {
      action,
      details: details || null,
      admin_username: admin_username || null,
    })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
