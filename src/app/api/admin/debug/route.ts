import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET() {
  const dbUrl = process.env.DATABASE_URL

  const checks: Record<string, unknown> = {
    databaseUrl: dbUrl ? `${dbUrl.slice(0, 30)}...` : 'MISSING',
  }

  if (!dbUrl) {
    return NextResponse.json({ error: 'Missing env vars', checks })
  }

  try {
    const rows = await query(`SELECT id FROM customers LIMIT 5`)
    checks.dbStatus = 200
    checks.dbResponse = rows
  } catch (e: any) {
    checks.dbError = e.message
  }

  return NextResponse.json(checks)
}
