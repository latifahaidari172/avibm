import { NextResponse } from 'next/server'

const getHeaders = () => ({
  apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
  'Content-Type': 'application/json',
})
const BASE = () => `${process.env.NEXT_PUBLIC_SUPABASE_URL!}/rest/v1/customers`

export async function PATCH(request: Request) {
  try {
    const { id, updates } = await request.json()
    if (!id || !updates) return NextResponse.json({ error: 'Missing id or updates' }, { status: 400 })
    await fetch(`${BASE()}?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(updates),
    })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json()
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    await fetch(`${BASE()}?id=eq.${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: getHeaders(),
    })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
