// SSE proxy: pipes the upstream tail stream through to the browser.
// Edge runtime is mandatory here — the Node serverless runtime closes
// the connection after the function returns, breaking SSE.
export const runtime = 'edge'

export async function GET() {
  const url = process.env.AVIBM_LOG_URL
  const secret = process.env.AVIBM_LOG_SECRET
  if (!url || !secret) {
    return new Response(': not configured\n\n', {
      status: 503,
      headers: { 'Content-Type': 'text/event-stream' },
    })
  }
  let upstream: Response
  try {
    upstream = await fetch(`${url.replace(/\/$/, '')}/stream`, {
      headers: { Authorization: `Bearer ${secret}` },
      // The server will hold this connection open as long as we want.
      // No cache.
      cache: 'no-store',
    })
  } catch {
    return new Response(': upstream unreachable\n\n', {
      status: 502,
      headers: { 'Content-Type': 'text/event-stream' },
    })
  }
  if (!upstream.ok || !upstream.body) {
    return new Response(`: upstream ${upstream.status}\n\n`, {
      status: 502,
      headers: { 'Content-Type': 'text/event-stream' },
    })
  }
  return new Response(upstream.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
