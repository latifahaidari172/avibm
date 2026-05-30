import { existsSync } from 'fs'
import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

// auction-intel's thumbnail directory (same VPS). A thumb exists only for
// listings whose photos were stored — so we pick the most-recent listing that
// actually HAS one, instead of blindly trusting the newest listing.
const THUMBS_DIR = process.env.THUMBS_DIR || '/var/lib/auction-intel/thumbs'

// VIN autofill for the Add Vehicle form. Now that AVIBM shares auction-intel's
// Postgres, this reads the scraped vehicle + listings DIRECTLY from the
// `public` schema — no outbound HTTP, so the Cloudflare bot-challenge that
// blocked the old admin.auction-intel.com proxy is gone entirely.
//
// Returns make/model/year/colour for autofill + photo_url (auction-intel's
// durable /thumbs image, served as a plain static GET, not the bot-gated API).
// Degrades to { found:false } on any error so the form falls back to manual.

// AU VINs/chassis can be 6–17 chars (pre-1989 + imports) — feedback_non_standard_vins.
const VIN_RE = /^[A-HJ-NPR-Z0-9]{6,17}$/i

export async function GET(request: Request) {
  const vin = (new URL(request.url).searchParams.get('vin') || '').trim().toUpperCase()
  if (!VIN_RE.test(vin)) {
    return NextResponse.json({ found: false, error: 'invalid_vin' }, { status: 400 })
  }
  try {
    const vehicles = await query<any>(
      'SELECT id, make, model, year, body_type, colour FROM public.vehicles WHERE vin = $1',
      [vin],
    )
    if (vehicles.length === 0) {
      return NextResponse.json({ vin, found: false, appearance_count: 0 })
    }
    const ids = vehicles.map((v) => v.id)
    const listings = await query<{ source: string; external_id: string }>(
      `SELECT source, external_id FROM public.auction_listings
        WHERE vehicle_id = ANY($1::int[])
        ORDER BY first_seen_at DESC NULLS LAST`,
      [ids],
    )
    const v = vehicles[0]
    // Use the most-recent listing whose durable thumbnail file actually exists
    // on disk (served from our own domain). Full source photos move to cold
    // storage and aren't reliably served, so the stored thumb is the only
    // dependable image — when none exists, the form shows details only.
    let photo_url: string | null = null
    for (const l of listings) {
      if (!l.source || !l.external_id) continue
      const name = `${l.source}_${l.external_id}.jpg`
      if (existsSync(`${THUMBS_DIR}/${name}`)) {
        photo_url = `https://admin.auction-intel.com/thumbs/${name}`
        break
      }
    }
    return NextResponse.json({
      vin,
      found: true,
      make: v.make ?? null,
      model: v.model ?? null,
      year: v.year ?? null,
      colour: v.colour ?? null,
      body_type: v.body_type ?? null,
      photo_url,
      appearance_count: listings.length,
    })
  } catch {
    return NextResponse.json({ found: false, error: 'lookup_failed' }, { status: 200 })
  }
}
