import { NextResponse } from 'next/server'
import { getAuthToken, unauthorized } from '@/lib/auth'
import { one } from '@/lib/db'

export async function GET(request: Request) {
  if (!getAuthToken(request)) return unauthorized()
  try {
    const { searchParams } = new URL(request.url)
    const since = searchParams.get('since')
    if (!since) return NextResponse.json({ count: 0 })
    const row = await one<{ count: number }>(
      `SELECT count(*)::int AS count FROM customers WHERE created_at > $1`,
      [since],
    )
    return NextResponse.json({ count: row?.count ?? 0 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
