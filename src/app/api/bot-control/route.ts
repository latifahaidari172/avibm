import { NextResponse } from 'next/server'

const headers = () => ({
  apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
  'Content-Type': 'application/json',
})
const BASE = () => `${process.env.NEXT_PUBLIC_SUPABASE_URL!}/rest/v1/bot_instances`

export async function GET() {
  try {
    const res = await fetch(`${BASE()}?select=*&order=last_seen.desc`, { headers: headers() })
    return NextResponse.json(await res.json())
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { id, action } = body

    if (action === 'delete') {
      await fetch(`${BASE()}?id=eq.${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: headers(),
      })
    } else if ('display_name' in body) {
      await fetch(`${BASE()}?id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: headers(),
        body: JSON.stringify({ display_name: body.display_name || null }),
      })
    } else {
      await fetch(`${BASE()}?id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: headers(),
        body: JSON.stringify({ enabled: body.enabled }),
      })
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
