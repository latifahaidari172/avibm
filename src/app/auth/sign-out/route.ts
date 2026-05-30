import { NextResponse, type NextRequest } from 'next/server'
import { clearSessionCookie } from '@/lib/session'

export async function POST(request: NextRequest) {
  const { origin } = new URL(request.url)
  const res = NextResponse.redirect(`${origin}/account/sign-in`, { status: 303 })
  clearSessionCookie(res)
  return res
}
