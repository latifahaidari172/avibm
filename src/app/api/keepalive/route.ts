import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL!}/rest/v1/bot_settings?id=eq.main&select=id`
  const res = await fetch(url, {
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
    },
  })
  return NextResponse.json({ ok: res.ok, status: res.status, at: new Date().toISOString() })
}
