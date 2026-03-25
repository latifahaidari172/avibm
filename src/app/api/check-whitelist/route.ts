import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const { email, phone } = await req.json()

    const cleanEmail = (email || '').toLowerCase().trim()
    const cleanPhone = (phone || '').replace(/\s/g, '').trim()

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Check email
    const { data: emailMatch } = await supabase
      .from('free_customers')
      .select('entry')
      .eq('entry', cleanEmail)
      .limit(1)

    if (emailMatch && emailMatch.length > 0)
      return NextResponse.json({ whitelisted: true })

    // Check phone
    const { data: phoneMatch } = await supabase
      .from('free_customers')
      .select('entry')
      .eq('entry', cleanPhone)
      .limit(1)

    return NextResponse.json({ whitelisted: phoneMatch != null && phoneMatch.length > 0 })
  } catch (e) {
    console.error('Whitelist check error:', e)
    return NextResponse.json({ whitelisted: false })
  }
}
