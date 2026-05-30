import { NextResponse, type NextRequest } from 'next/server'
import { clearSessionCookie } from '@/lib/session'

export async function POST(_request: NextRequest) {
  // Relative Location — resolves against the browser host (avibm.com), not
  // the tunnel-forwarded localhost:3000.
  const res = new NextResponse(null, { status: 303, headers: { Location: '/account/sign-in' } })
  clearSessionCookie(res)
  return res
}
