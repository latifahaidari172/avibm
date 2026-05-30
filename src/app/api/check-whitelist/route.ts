import { NextRequest, NextResponse } from 'next/server'
import { one } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const { email, phone } = await req.json()

    const cleanEmail = (email || '').toLowerCase().trim()
    const cleanPhone = (phone || '').replace(/\s/g, '').trim()

    // Check email
    const emailRow = await one(
      `SELECT entry FROM free_customers WHERE entry = $1 LIMIT 1`,
      [cleanEmail],
    )
    if (emailRow) return NextResponse.json({ whitelisted: true })

    // Check phone
    const phoneRow = await one(
      `SELECT entry FROM free_customers WHERE entry = $1 LIMIT 1`,
      [cleanPhone],
    )
    return NextResponse.json({ whitelisted: phoneRow !== null })

  } catch (e) {
    console.error('Whitelist check error:', e)
    return NextResponse.json({ whitelisted: false })
  }
}
