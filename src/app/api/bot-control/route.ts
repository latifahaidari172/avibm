import { NextResponse } from 'next/server'
import { getAuthToken, unauthorized } from '@/lib/auth'
import { query, updateById, deleteById } from '@/lib/db'

export async function GET(request: Request) {
  if (!getAuthToken(request)) return unauthorized()
  try {
    const rows = await query(`SELECT * FROM bot_instances ORDER BY last_seen DESC`)
    return NextResponse.json(rows)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  if (!getAuthToken(request)) return unauthorized()
  try {
    const body = await request.json()
    const { id, action } = body

    if (action === 'delete') {
      await deleteById('bot_instances', id)
    } else if ('display_name' in body) {
      await updateById('bot_instances', id, { display_name: body.display_name || null })
    } else {
      await updateById('bot_instances', id, { enabled: body.enabled })
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
