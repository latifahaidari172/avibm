import { NextResponse } from 'next/server'
import { getAuthToken, unauthorized } from '@/lib/auth'
import { one } from '@/lib/db'

export async function GET(request: Request) {
  if (!getAuthToken(request)) return unauthorized()
  try {
    const row = await one(`SELECT * FROM monitor_status WHERE id = $1`, ['main'])
    return NextResponse.json(row)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
