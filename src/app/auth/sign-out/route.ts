import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServer()
  await supabase.auth.signOut()
  const { origin } = new URL(request.url)
  return NextResponse.redirect(`${origin}/account/sign-in`, { status: 303 })
}
