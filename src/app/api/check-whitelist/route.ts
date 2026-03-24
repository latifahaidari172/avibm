// src/app/api/check-whitelist/route.ts
// Checks if an email or phone is on the free whitelist stored in Supabase
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { email, phone } = await req.json()

    const cleanEmail = (email || '').toLowerCase().trim()
    const cleanPhone = (phone || '').replace(/\s/g, '').trim()

    // Check whitelist table in Supabase
    const { data, error } = await supabase
      .from('free_customers')
      .select('entry')
      .or(`entry.eq.${cleanEmail},entry.eq.${cleanPhone}`)
      .limit(1)

    if (error) {
      console.error('Whitelist check error:', error)
      return NextResponse.json({ whitelisted: false })
    }

    return NextResponse.json({ whitelisted: data && data.length > 0 })
  } catch (e) {
    console.error('Whitelist check exception:', e)
    return NextResponse.json({ whitelisted: false })
  }
}
