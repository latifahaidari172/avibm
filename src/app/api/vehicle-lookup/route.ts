import { NextResponse } from 'next/server'

// VIN autofill — delegates to auction-intel's SMART LOOKUP (the same engine
// the check-listing page uses). It searches the aggregated DB across every
// auction source AND live-fetches (e.g. Pickles) for fresh data + photos,
// resolving images through auction-intel's own photo endpoints. Called on
// localhost (same VPS) so there's no Cloudflare hop and no per-customer quota.
const AUCTION_INTEL_LOCAL = process.env.AUCTION_INTEL_LOCAL || 'http://127.0.0.1:8000'
// avibm is a first-party product of auction-intel — this shared secret marks
// our server-side calls as trusted so the lookup returns the full, unredacted
// payload (damage, odometer, auction date) without burning a VIN quota.
const INTERNAL_KEY = process.env.AVIBM_INTERNAL_KEY || ''

// AU VINs/chassis can be 6–17 chars (pre-1989 + imports) — feedback_non_standard_vins.
const VIN_RE = /^[A-HJ-NPR-Z0-9]{6,17}$/i

// Map an auction listing's damage / condition text to one of avibm's WOVI
// damage-dropdown values. Conservative: returns a value only when confident.
// Category comes from the auction's own primary/secondary fields; impact
// position is read from the full condition report, and is left null when the
// side or position is ambiguous (e.g. "Left Front, Right Front") so the
// customer picks it themselves rather than us guessing wrong.
// (Strings returned MUST match the DAMAGES list in the add-vehicle page.)
function mapDamage(
  primary?: string | null, secondary?: string | null, report?: string | null,
): string | null {
  const cat = [primary, secondary].filter(Boolean).join(' ').toLowerCase()
  const all = [primary, secondary, report].filter(Boolean).join(' ').toLowerCase()
  if (!cat && !all) return null
  // Distinct categories take priority over impact (read from the auction's
  // own primary/secondary classification, not the free-text report).
  if (/\bhail\b/.test(cat)) return 'HAIL DAMAGE'
  if (/\b(water|flood|submerg|salt\s*water)\b/.test(cat)) return 'WATER DAMAGE'
  if (/\b(malicious|vandal)/.test(cat)) return 'MALICIOUS DAMAGE'
  if (/\b(fire|burn|burnt|smoke)\b/.test(cat)) return 'FIRE DAMAGE'

  const isImpact = /\b(impact|collision|accident|crash|hit|struck)\b/.test(cat)
    || /\b(front|rear|side)\b/.test(cat)
  if (isImpact) {
    // AU RHD: driver = right = offside, passenger = left = nearside.
    const driverKw = /\b(driver|drivers|driver'?s|rh|right|offside|o\/s)\b/.test(all)
    const passKw = /\b(passenger|passengers|lh|left|nearside|n\/s)\b/.test(all)
    const side = driverKw && passKw ? null : driverKw ? 'DRIVERS' : passKw ? 'PASSENGER' : null
    const front = /\b(front|nose|bonnet|fascia|bar)\b/.test(all)
    const rear = /\b(rear|back|boot|tailgate|tail)\b/.test(all)
    const sideHit = /\b(side|quarter|door|guard|fender|sill)\b/.test(all)
    const posCount = [front, rear, sideHit].filter(Boolean).length
    const pos = posCount === 1 ? (front ? 'FRONT' : rear ? 'REAR' : 'SIDE') : null
    if (side && pos) return `IMPACT DAMAGE ${side} ${pos}`
    // Impact but can't place it confidently → fall through.
  }
  if (/\bstructural\b/.test(cat)) return 'STRUCTURAL DAMAGE'
  return null // not confidently placeable — customer selects manually.
}

// Parse a build/compliance date into the WOVI build-month dropdown value
// (3-letter month). Handles "03/2016", "2016-03", "Mar 2016", "March 2016".
const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
function mapBuildMonth(build?: string | null): string | null {
  if (!build) return null
  const t = String(build).trim()
  let m: RegExpMatchArray | null
  if ((m = t.match(/^(\d{1,2})\s*\/\s*\d{4}$/))) {          // MM/YYYY
    const n = parseInt(m[1], 10); return n >= 1 && n <= 12 ? MONTH_ABBR[n - 1] : null
  }
  if ((m = t.match(/^\d{4}\s*-\s*(\d{1,2})/))) {            // YYYY-MM
    const n = parseInt(m[1], 10); return n >= 1 && n <= 12 ? MONTH_ABBR[n - 1] : null
  }
  const name = t.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i) // month name
  if (name) {
    const i = MONTH_ABBR.findIndex(a => a.toLowerCase() === name[1].slice(0, 3).toLowerCase())
    return i >= 0 ? MONTH_ABBR[i] : null
  }
  return null
}

// Map the auction body type / model to a WOVI vehicle-type dropdown value.
// Auction car listings default to "Car"; obvious non-cars are caught from the
// body type. (Must match VEHICLE_TYPES in the add-vehicle page.)
function mapVehicleType(...parts: (string | null | undefined)[]): string {
  const t = parts.filter(Boolean).join(' ').toLowerCase()
  if (/motorcycle|motorbike|\bscooter\b|moped/.test(t)) return 'Motorcycle'
  if (/caravan|camper|motorhome/.test(t)) return 'Caravan'
  if (/\btrailer\b/.test(t)) return 'Trailer'
  if (/\btruck\b|prime mover|tipper|\blorry\b/.test(t)) return 'Truck'
  return 'Car'
}

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
  const url = new URL(request.url)
  const vin = (url.searchParams.get('vin') || '').trim().toUpperCase()
  const wantHero = url.searchParams.get('hero') === '1'
  if (!VIN_RE.test(vin)) {
    return NextResponse.json({ found: false, error: 'invalid_vin' }, { status: 400 })
  }
  try {
    const r = await fetch(
      `${AUCTION_INTEL_LOCAL}/api/public/lookup?vin=${encodeURIComponent(vin)}`,
      {
        headers: {
          Accept: 'application/json',
          ...(INTERNAL_KEY ? { 'x-avibm-internal': INTERNAL_KEY } : {}),
        },
        cache: 'no-store',
      },
    )
    if (!r.ok) return NextResponse.json({ vin, found: false }, { status: 200 })
    const d = await r.json()
    if (!d?.found) return NextResponse.json({ vin, found: false }, { status: 200 })

    const veh = d.vehicle || {}
    const listing = d.listing || {}
    // main_photo is the best image auction-intel has: it's the full-res stored
    // hero ONLY when the gallery was downloaded to disk (then it points at the
    // /api/public/photo/ endpoint). Otherwise it's a live source CDN url. The
    // /photo/{id}/0 endpoint 404s for not-downloaded listings, so we must NOT
    // blindly construct it — derive from what main_photo actually is.
    const main: string | null = listing.photo_url || null
    const thumb: string | null = listing.thumbnail_url || null
    const stored = main && main.includes('/api/public/photo/') ? main : null   // full-res, loads
    const cdn = main && /^https?:\/\//i.test(main) && !main.includes('admin.auction-intel.com') ? main : null // ephemeral source
    // Display order: stored full-res → live CDN full-res → durable thumbnail.
    const candidates = [stored, cdn, thumb].filter((u, i, a) => !!u && a.indexOf(u) === i)
    // Resolve the exterior/hero index within the gallery (detail page only).
    // POST the EXACT photo list so the matched index aligns with what we return
    // (the lookup's order/source can differ from the DB's stored images).
    const galleryPhotos: string[] = Array.isArray(listing.photos)
      ? listing.photos.filter((u: unknown) => typeof u === 'string') : []
    let heroIndex = 0
    if (wantHero && listing.id && galleryPhotos.length) {
      try {
        const hr = await fetch(`${AUCTION_INTEL_LOCAL}/api/public/photo/hero-index/${listing.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(INTERNAL_KEY ? { 'x-avibm-internal': INTERNAL_KEY } : {}) },
          body: JSON.stringify({ photos: galleryPhotos }),
          cache: 'no-store',
        })
        if (hr.ok) { const hj = await hr.json(); heroIndex = Number(hj?.index) || 0 }
      } catch { /* default to 0 */ }
    }
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
      // WOVI vehicle type — auction listing tells us (defaults Car).
      vehicle_type: mapVehicleType(veh.body_type, veh.model, veh.make),
      // Build/compliance month for the WOVI form (e.g. "03/2016" → "Mar").
      build_month: mapBuildMonth(veh.build_date),
      build_date: veh.build_date ?? null,
      transmission: veh.transmission ?? null,
      odometer_km: veh.odometer_km ?? listing.odometer_km ?? null,
      source: auctionName(listing.source_url),
      auction_date: listing.auction_date || listing.sold_at || null,
      // Damage read from the auction damage fields + condition-report text
      // (damage_description holds the comments) and mapped to a WOVI dropdown
      // value (null if not confidently placeable).
      damage: mapDamage(
        listing.damage_primary, listing.damage_secondary, listing.damage_description,
      ),
      // Full gallery (auctioneer-style) — every photo we have for the listing,
      // for the vehicle detail page's main-photo + thumbnail-strip viewer.
      photos: galleryPhotos,
      // Index of the exterior/hero shot within `photos` (matches the YOLO
      // thumbnail). Source-agnostic. Only resolved when `?hero=1` (detail page),
      // since it can download images; add-vehicle skips it.
      hero_index: heroIndex,
      photo_candidates: candidates,
      photo_url: candidates[0] || null,
      photo_fallback: candidates[1] || null,
      // Durable URL persisted on the vehicle (the small garage card): the
      // THUMBNAIL only. The lookup sets thumbnail_url ONLY when the file exists
      // on hot-tier disk, so it's guaranteed to load and survive (full-res
      // heroes can 404 once they age to cold storage). If there's no thumbnail
      // we persist null → a clean "NO PHOTO", never a dead URL. (The big match
      // card still shows full-res via photo_candidates.)
      photo_durable: thumb || null,
    })
  } catch {
    return NextResponse.json({ vin, found: false, error: 'lookup_failed' }, { status: 200 })
  }
}
