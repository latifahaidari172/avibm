import { NextResponse } from 'next/server'
import { one } from '@/lib/db'

export async function GET(request: Request) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  let ok = false
  try {
    const row = await one(`SELECT id FROM bot_settings WHERE id = $1`, ['main'])
    ok = row !== null
  } catch {
    ok = false
  }
  return NextResponse.json({ ok, status: ok ? 200 : 500, at: new Date().toISOString() })
}
