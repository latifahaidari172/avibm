import { NextRequest, NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY!

const h = {
  'apikey':        serviceKey,
  'Authorization': `Bearer ${serviceKey}`,
  'Content-Type':  'application/json',
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)

    // ?type=monitor_status
    if (searchParams.get('type') === 'monitor_status') {
      const res = await fetch(`${supabaseUrl}/rest/v1/monitor_status?id=eq.main`, { headers: h })
      const data = await res.json()
      return NextResponse.json(data[0] || null)
    }

    // ?type=new_since&since=<iso>
    if (searchParams.get('type') === 'new_since') {
      const since = searchParams.get('since') || new Date().toISOString()
      const res = await fetch(
        `${supabaseUrl}/rest/v1/customers?select=id&created_at=gt.${encodeURIComponent(since)}`,
        { headers: h }
      )
      const data = await res.json()
      return NextResponse.json(Array.isArray(data) ? data : [])
    }

    // Default: all customers + vehicles
    const res = await fetch(
      `${supabaseUrl}/rest/v1/customers?select=*,vehicles(*)&order=created_at.desc`,
      { headers: h }
    )
    const data = await res.json()
    return NextResponse.json(Array.isArray(data) ? data : [])
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const { table, id, updates } = await request.json()
    if (!['customers', 'vehicles'].includes(table))
      return NextResponse.json({ error: 'Invalid table' }, { status: 400 })

    const res = await fetch(
      `${supabaseUrl}/rest/v1/${table}?id=eq.${id}`,
      { method: 'PATCH', headers: h, body: JSON.stringify(updates) }
    )
    if (!res.ok) return NextResponse.json({ error: await res.text() }, { status: 400 })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { table, id } = await request.json()
    if (!['customers', 'vehicles'].includes(table))
      return NextResponse.json({ error: 'Invalid table' }, { status: 400 })

    const res = await fetch(
      `${supabaseUrl}/rest/v1/${table}?id=eq.${id}`,
      { method: 'DELETE', headers: h }
    )
    if (!res.ok) return NextResponse.json({ error: await res.text() }, { status: 400 })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
