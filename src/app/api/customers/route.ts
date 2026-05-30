import { NextResponse } from 'next/server'
import { getAuthToken, unauthorized } from '@/lib/auth'
import { updateById, deleteById } from '@/lib/db'

export async function PATCH(request: Request) {
  if (!getAuthToken(request)) return unauthorized()
  try {
    const { id, updates } = await request.json()
    if (!id || !updates) return NextResponse.json({ error: 'Missing id or updates' }, { status: 400 })
    await updateById('customers', id, updates)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  if (!getAuthToken(request)) return unauthorized()
  try {
    const { id } = await request.json()
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    await deleteById('customers', id)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
