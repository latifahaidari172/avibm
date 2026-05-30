import { NextResponse } from 'next/server'
import { getAuthToken, unauthorized } from '@/lib/auth'
import { one, updateById } from '@/lib/db'

export async function GET(request: Request) {
  if (!getAuthToken(request)) return unauthorized()
  try {
    const row = await one(`SELECT * FROM bot_settings WHERE id = $1`, ['main'])
    return NextResponse.json(row ?? {})
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  if (!getAuthToken(request)) return unauthorized()
  try {
    const body = await request.json()
    const updated = await updateById('bot_settings', 'main', {
      ...body,
      updated_at: new Date().toISOString(),
    })
    return NextResponse.json(updated)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
