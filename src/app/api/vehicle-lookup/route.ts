import { NextResponse } from 'next/server'

// VIN autofill — delegates to auction-intel's SMART LOOKUP (the same engine
// the check-listing page uses). It searches the aggregated DB across every
// auction source AND live-fetches (e.g. Pickles) for fresh data + photos,
// resolving images through auction-intel's own photo endpoints. Called on
// localhost (same VPS) so there's no Cloudflare hop and no per-customer quota.
const AUCTION_INTEL_LOCAL = process.env.AUCTION_INTEL_LOCAL || 'http://127.0.0.1:8000'

// AU VINs/chassis can be 6–17 chars (pre-1989 + imports) — feedback_non_standard_vins.
const VIN_RE = /^[A-HJ-NPR-Z0-9]{6,17}$/i

// Friendly auction name from the listing's source URL.
function auctionName(url: string | null | undefined): string | null {
  const u = (url || '').toLowerCase()
  if (!u) return null
  if (u.includes('pickles')) return 'Pickles'
  if (u.includes('manheim')) return 'Manheim'
  if (u.includes('iaai') || u.includes('iaa.')) return 'IAAI'
  if (u.includes('grays')) return 'Grays'
  if (u.includes('slattery')) return 'Slattery'
  return null
}

export async function GET(request: Request) {
  const vin = (new URL(request.url).searchParams.get('vin') || '').trim().toUpperCase()
  if (!VIN_RE.test(vin)) {
    return NextResponse.json({ found: false, error: 'invalid_vin' }, { status: 400 })
  }
  try {
    const r = await fetch(
      `${AUCTION_INTEL_LOCAL}/api/public/lookup?vin=${encodeURIComponent(vin)}`,
      { headers: { Accept: 'application/json' }, cache: 'no-store' },
    )
    if (!r.ok) return NextResponse.json({ vin, found: false }, { status: 200 })
    const d = await r.json()
    if (!d?.found) return NextResponse.json({ vin, found: false }, { status: 200 })

    const veh = d.vehicle || {}
    const listing = d.listing || {}
    // The reliable low-res option (curated hero thumb / live photo).
    const thumb = listing.thumbnail_url || listing.photo_url || null
    // Full-resolution version of that same hero (first stored photo) — sharp
    // on the banner instead of the pixelated 200×150 thumb. Falls back to the
    // thumb in the browser (via onError) if the full photo isn't available.
    const hero = listing.id ? `https://admin.auction-intel.com/api/public/photo/${listing.id}/0` : null
    return NextResponse.json({
      vin,
      found: true,
      make: veh.make ?? null,
      model: veh.model ?? null,
      year: veh.year ?? null,
      colour: veh.colour ?? null,
      // Extra detail shown in the match card to help confirm the vehicle.
      series: veh.series ?? null,
      badge: veh.badge ?? null,
      body_type: veh.body_type ?? null,
      transmission: veh.transmission ?? null,
      odometer_km: veh.odometer_km ?? listing.odometer_km ?? null,
      source: auctionName(listing.source_url),
      photo_url: hero || thumb,
      photo_fallback: thumb,
    })
  } catch {
    return NextResponse.json({ vin, found: false, error: 'lookup_failed' }, { status: 200 })
  }
}
