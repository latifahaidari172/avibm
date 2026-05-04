// Typo-proof validation for AVIBM registration + add-vehicle forms.
// Returns null if valid, or an error string to display to the user.

// Street address — just street number + street name. Should NOT contain
// the suburb, postcode, or state — those go in their own fields.
// Catches the common mistake of pasting the full postal address.
export function validateStreetAddress(raw: string): string | null {
  const v = (raw || '').trim()
  if (!v) return 'Street address is required.'
  if (v.length < 5) return 'Street address looks too short.'
  if (/\b\d{4}\b/.test(v)) return 'Street address should not include a postcode — put the 4-digit postcode in its own field below.'
  if (/\b(NSW|VIC|QLD|SA|WA|TAS|ACT|NT)\b/i.test(v)) return 'Street address should not include a state abbreviation — the form already knows your state.'
  return null
}

// Suburb — letters, spaces, hyphens, apostrophes only. No digits.
// Customers commonly type "Brisbane 4125" thinking it's "city + postcode".
export function validateSuburb(raw: string): string | null {
  const v = (raw || '').trim()
  if (!v) return 'Suburb is required.'
  if (/\d/.test(v)) return 'Suburb should be just the suburb name (e.g. "Park Ridge") — no postcode, no numbers. Postcode goes in its own field.'
  if (v.length < 2) return 'Suburb name too short.'
  if (v.length > 60) return 'Suburb name too long.'
  return null
}

// VIN — Australian + global vehicle identifier rules.
// Modern (post-1981 worldwide): 17 chars, 0-9 + A-Z but never I, O, Q
// (those would be confused with 1, 0). Older AU vehicles + imports may
// have shorter chassis numbers (per feedback_non_standard_vins.md).
//
// We allow 6-17 chars overall:
//   - 17 chars  → strict modern: no I/O/Q allowed
//   - 6-16 chars → relaxed (older vehicle / chassis number / motorcycle)
export function validateVin(raw: string): string | null {
  const v = (raw || '').trim().toUpperCase()
  if (!v) return 'VIN is required.'
  if (v.length < 6) return 'VIN looks too short. AU vehicles use at least 6 characters.'
  if (v.length > 17) return 'VIN is too long. Max 17 characters.'
  if (!/^[A-Z0-9]+$/.test(v)) return 'VIN can only contain letters A–Z and digits 0–9 (no spaces, dashes, or symbols).'
  if (v.length === 17) {
    if (/[IOQ]/.test(v)) {
      return 'VIN looks wrong — modern 17-character VINs never contain I, O, or Q (to avoid confusion with 1, 0). Double-check against your rego papers.'
    }
  }
  return null
}

// Year — 4 digits, between 1900 and current year + 1 (allows new model
// year releases that happen ahead of the calendar year).
export function validateYear(raw: string): string | null {
  const v = (raw || '').trim()
  if (!v) return 'Year is required.'
  if (!/^\d{4}$/.test(v)) return 'Year must be 4 digits (e.g. 2023).'
  const y = parseInt(v, 10)
  const current = new Date().getFullYear()
  if (y < 1900) return 'Year too far in the past. Must be 1900 or later.'
  if (y > current + 1) return `Year too far in the future. Latest allowed is ${current + 1}.`
  return null
}

// Live input clamp for the year field. Strips non-digits, caps at 4
// chars, and clamps the numeric value to [1900, currentYear+1] once a
// full 4-digit number is entered. Partial entries (< 4 digits) are
// passed through so the user can still type "20" on the way to "2024".
export function clampYearInput(raw: string): string {
  const digits = (raw || '').replace(/\D/g, '').slice(0, 4)
  if (digits.length < 4) return digits
  const n = parseInt(digits, 10)
  const max = new Date().getFullYear() + 1
  if (n > max) return String(max)
  if (n < 1900) return '1900'
  return digits
}

// Make / Model — letters, digits, spaces, hyphens, slashes (handles
// "F-150", "MX-5", "S-Class"). Length 2-30. Catches single-letter junk
// like the user typing "f" or "a" by accident.
export function validateMake(raw: string): string | null {
  const v = (raw || '').trim()
  if (!v) return 'Make is required.'
  if (v.length < 2) return 'Make is too short — please enter the full make (e.g. Toyota).'
  if (v.length > 30) return 'Make is too long.'
  if (!/^[A-Za-z0-9\s\-/]+$/.test(v)) return 'Make should only contain letters (e.g. Toyota, Mercedes-Benz).'
  return null
}
export function validateModel(raw: string): string | null {
  const v = (raw || '').trim()
  if (!v) return 'Model is required.'
  if (v.length < 1) return 'Model is required.'
  if (v.length > 40) return 'Model is too long.'
  if (!/^[A-Za-z0-9\s\-/.]+$/.test(v)) return 'Model contains characters that don\'t belong (e.g. !, @). Use letters, numbers, hyphens.'
  return null
}

// AU postcode — exactly 4 digits, and (optionally) inside the official
// Australia Post range for the customer's state. Source: Australia Post
// Standard Postcode File (March 2026).
const POSTCODE_RANGES: Record<string, [number, number][]> = {
  NSW: [[1000, 2599], [2620, 2899], [2921, 2999]],
  VIC: [[3000, 3999], [8000, 8999]],
  QLD: [[4000, 4999], [9000, 9999]],
  SA:  [[5000, 5999]],
  WA:  [[6000, 6999]],
  TAS: [[7000, 7999]],
  ACT: [[200, 299], [2600, 2619], [2900, 2920]],
  NT:  [[800, 999]],
}

export function validatePostcode(raw: string, state?: string): string | null {
  const v = (raw || '').trim()
  if (!v) return 'Postcode is required.'
  if (!/^\d{4}$/.test(v)) return 'Postcode must be 4 digits.'
  if (state && POSTCODE_RANGES[state]) {
    const n = parseInt(v, 10)
    const ranges = POSTCODE_RANGES[state]
    const inAny = ranges.some(([lo, hi]) => n >= lo && n <= hi)
    if (!inAny) {
      const fmtRanges = ranges.map(([lo, hi]) => lo === hi ? String(lo) : `${lo.toString().padStart(4, '0')}–${hi.toString().padStart(4, '0')}`).join(', ')
      return `Postcode ${v} doesn't look like a ${state} postcode. ${state} postcodes are ${fmtRanges}.`
    }
  }
  return null
}

// AU mobile — 10 digits, starts with 04. Auto-converts a leading 61
// (or +61) to 0 first.
export function normaliseAuMobile(input: string): string {
  let p = (input || '').replace(/\D/g, '')
  if (p.startsWith('61') && p.length > 9) p = '0' + p.slice(2)
  return p.slice(0, 10)
}
export function validateAuMobile(raw: string): string | null {
  const v = (raw || '').trim()
  if (!v) return 'Mobile is required.'
  if (!/^04\d{8}$/.test(v)) return 'Mobile must be 10 digits starting with 04 (e.g. 0412345678).'
  return null
}

// Cutoff date — must be a real future date within ~14 months. The bot
// searches for slots BEFORE this date so a past cutoff is meaningless.
export function validateCutoffDate(raw: string): string | null {
  const v = (raw || '').trim()
  if (!v) return 'Latest acceptable date is required (your existing WOVI booking date).'
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return 'Date must be in YYYY-MM-DD format.'
  const d = new Date(v + 'T00:00:00')
  if (isNaN(d.getTime())) return 'Invalid date.'
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  if (d < now) return 'Date must be in the future — that’s your existing WOVI booking, the bot only books slots earlier than this.'
  const oneYear = new Date()
  oneYear.setMonth(oneYear.getMonth() + 14)
  if (d > oneYear) return 'Date is more than 14 months away. Did you mistype the year?'
  return null
}

// Email — basic syntax + domain typo (Mailcheck-style).
const COMMON_EMAIL_DOMAINS = [
  'gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'yahoo.com.au',
  'icloud.com', 'me.com', 'live.com', 'live.com.au', 'bigpond.com',
  'bigpond.net.au', 'optusnet.com.au', 'iinet.net.au', 'tpg.com.au',
  'protonmail.com', 'proton.me', 'aol.com', 'msn.com',
]
export function suggestEmailFix(email: string): string | null {
  const m = (email || '').match(/^(.+)@(.+)$/)
  if (!m) return null
  const [, local, domain] = m
  const d = domain.toLowerCase()
  if (COMMON_EMAIL_DOMAINS.includes(d)) return null
  function lev(a: string, b: string): number {
    const dp: number[][] = Array(a.length + 1).fill(null).map(() => Array(b.length + 1).fill(0))
    for (let i = 0; i <= a.length; i++) dp[i][0] = i
    for (let j = 0; j <= b.length; j++) dp[0][j] = j
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
      }
    }
    return dp[a.length][b.length]
  }
  let best: { dom: string; dist: number } | null = null
  for (const known of COMMON_EMAIL_DOMAINS) {
    const dist = lev(d, known)
    if (dist <= 2 && (best === null || dist < best.dist)) {
      best = { dom: known, dist }
    }
  }
  return best ? `${local}@${best.dom}` : null
}
export function validateEmail(raw: string): string | null {
  const v = (raw || '').trim()
  if (!v) return 'Email is required.'
  if (!/^\S+@\S+\.\S+$/.test(v)) return 'Email format invalid.'
  return null
}

// QLD Customer Reference Number — always numeric. Real CRNs are 8-9
// digits; accept 7-10 to leave a small buffer for format variations.
export function validateCrn(raw: string): string | null {
  const v = (raw || "").trim()
  if (!v) return "CRN is required for QLD."
  if (!/^\d+$/.test(v)) return "CRN must be digits only (no letters or spaces)."
  if (v.length < 7) return "CRN looks too short. QLD CRNs are 8-9 digits."
  if (v.length > 10) return "CRN looks too long. QLD CRNs are 8-9 digits."
  return null
}

