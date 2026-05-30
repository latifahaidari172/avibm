import { NextResponse } from 'next/server'

// Server-side proxy to auction-intel's public VIN lookup.
// Keeps the call off the browser (no CORS, no exposed backend) and
// normalises the shape AVIBM's Add Vehicle form needs: make/model/year/
// colour for autofill, plus photo_url (auction-intel's durable /thumbs
// URL). Degrades gracefully — any failure returns { found:false } 200 so
// the form simply falls back to manual entry.
const AUCTION_INTEL_BASE = process.env.AUCTION_INTEL_BASE || 'https://admin.auction-intel.com'
// AU VINs/chassis can be 6–17 chars (pre-1989 + imports) — feedback_non_standard_vins.
const VIN_RE = /^[A-HJ-NPR-Z0-9]{6,17}$/i

export async function GET(request: Request) {
  const url = new URL(request.url)
  const debug = url.searchParams.get('debug') === '1'
  const vin = (url.searchParams.get('vin') || '').trim().toUpperCase()
  if (!VIN_RE.test(vin)) {
    return NextResponse.json({ found: false, error: 'invalid_vin' }, { status: 400 })
  }
  const upstreamUrl = `${AUCTION_INTEL_BASE}/api/public/vin/${encodeURIComponent(vin)}`
  try {
    const r = await fetch(upstreamUrl, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    })
    if (!r.ok) {
      if (debug) return NextResponse.json({ found: false, _debug: { base: AUCTION_INTEL_BASE, url: upstreamUrl, status: r.status, body: (await r.text()).slice(0, 400) } }, { status: 200 })
      return NextResponse.json({ found: false }, { status: 200 })
    }
    const d = await r.json()
    const v = d?.vehicle || null
    const found = !!v || (d?.appearance_count || 0) > 0
    return NextResponse.json({
      vin,
      found,
      make: v?.make ?? null,
      model: v?.model ?? null,
      year: v?.year ?? null,
      colour: v?.colour ?? null,
      body_type: v?.body_type ?? null,
      photo_url: d?.thumbnail_url ?? null,
      appearance_count: d?.appearance_count ?? 0,
    })
  } catch (e) {
    if (debug) return NextResponse.json({ found: false, error: 'lookup_failed', _debug: { base: AUCTION_INTEL_BASE, url: upstreamUrl, message: String(e) } }, { status: 200 })
    return NextResponse.json({ found: false, error: 'lookup_failed' }, { status: 200 })
  }
}
