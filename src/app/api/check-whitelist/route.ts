import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { email, phone } = await req.json()

    const cleanEmail = (email || '').toLowerCase().trim()
    const cleanPhone = (phone || '').replace(/\s/g, '').trim()

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const headers = {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
    }

    // Check email
    const emailRes = await fetch(
      `${supabaseUrl}/rest/v1/free_customers?entry=eq.${encodeURIComponent(cleanEmail)}&select=entry&limit=1`,
      { headers }
    )
    const emailData = await emailRes.json()
    if (Array.isArray(emailData) && emailData.length > 0)
      return NextResponse.json({ whitelisted: true })

    // Check phone
    const phoneRes = await fetch(
      `${supabaseUrl}/rest/v1/free_customers?entry=eq.${encodeURIComponent(cleanPhone)}&select=entry&limit=1`,
      { headers }
    )
    const phoneData = await phoneRes.json()
    const whitelisted = Array.isArray(phoneData) && phoneData.length > 0

    // Temporary debug — remove after confirming
    return NextResponse.json({
      whitelisted,
      debug: {
        cleanEmail,
        cleanPhone,
        emailStatus: emailRes.status,
        phoneStatus: phoneRes.status,
        emailData,
        phoneData,
      }
    })

  } catch (e) {
    console.error('Whitelist check error:', e)
    return NextResponse.json({ whitelisted: false })
  }
}
