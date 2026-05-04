// Backfill: returns the last N lines of the avibm log as JSON.
// Edge runtime so the upstream call doesn't bake into a serverless cold-start.
export const runtime = 'edge'

export async function GET(req: Request) {
  const url = process.env.AVIBM_LOG_URL
  const secret = process.env.AVIBM_LOG_SECRET
  if (!url || !secret) {
    return new Response(JSON.stringify({ error: 'AVIBM_LOG_URL / AVIBM_LOG_SECRET not configured' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  const lines = new URL(req.url).searchParams.get('lines') || '500'
  let r: Response
  try {
    r = await fetch(`${url.replace(/\/$/, '')}/recent?lines=${encodeURIComponent(lines)}`, {
      headers: { Authorization: `Bearer ${secret}` },
      cache: 'no-store',
    })
  } catch {
    return new Response(JSON.stringify({ error: 'upstream unreachable' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  if (!r.ok) {
    return new Response(JSON.stringify({ error: `upstream ${r.status}` }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  return new Response(r.body, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  })
}
