import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createHash } from 'crypto'
import { one, query } from '@/lib/db'
import { getSessionFromCookies } from '@/lib/session'
import { PreviewShell, Arrow } from '@/lib/previewDesign'
import ProfileMenu from '@/components/ProfileMenu'
import VehicleCard from '@/components/VehicleCard'
import PastVehicles from '@/components/PastVehicles'

function customerRefOf(email?: string | null): string {
  if (!email) return 'P-??????'
  const h = createHash('sha256').update(email.trim().toLowerCase()).digest('hex')
  return 'P-' + h.slice(0, 6).toUpperCase()
}
function vehicleTypePrefix(t?: string | null): string {
  const v = (t || '').trim().toLowerCase()
  if (v.startsWith('motor') || v.startsWith('bike')) return 'M'
  if (v.startsWith('truck') || v.startsWith('bus') || v.startsWith('plant') || v.startsWith('heavy')) return 'H'
  if (v.startsWith('caravan') || v.startsWith('rv')) return 'R'
  if (v.startsWith('trailer')) return 'L'
  return 'C'
}
function vehicleRefOf(v: any): string {
  const parts = [v?.vin || '', v?.colour || '', v?.make || '', v?.model || '', String(v?.year || '')].join('|').toLowerCase()
  if (!parts.replace(/\|/g, '').trim()) return `${vehicleTypePrefix(v?.vehicle_type)}-??????`
  const h = createHash('sha256').update(parts).digest('hex')
  return `${vehicleTypePrefix(v?.vehicle_type)}-${h.slice(0, 6).toUpperCase()}`
}

// Customer profile dashboard. Server component — reads the signed-in customer
// straight from the shared Postgres (avibm schema) via the local pool; no
// service key, no self-fetch. Maximalist "Ethereal Glass" UI via PreviewShell.
export default async function AccountPage() {
  const session = await getSessionFromCookies()
  if (!session) redirect('/account/sign-in')

  const customerId = session.sub
  if (!customerId) redirect('/account/complete-profile')

  let customer: any = null
  try {
    customer = await one<any>('SELECT * FROM customers WHERE id = $1', [customerId])
    if (customer) {
      customer.vehicles = await query<any>('SELECT * FROM vehicles WHERE customer_id = $1 AND deleted_at IS NULL', [customerId])
    }
  } catch {}

  if (!customer) {
    return (
      <PreviewShell>
        <h1 className="disp" style={{ fontSize: 40 }}>Profile not found</h1>
        <p style={{ color: 'var(--muted)', marginTop: 12 }}>We couldn&apos;t load your profile. Try <Link href="/account/sign-in" style={{ color: 'var(--gold-2)' }}>signing in again</Link>.</p>
      </PreviewShell>
    )
  }

  customer.ref = customerRefOf(customer.email)
  if (Array.isArray(customer.vehicles)) {
    customer.vehicles = customer.vehicles.map((v: any) => ({ ...v, ref: vehicleRefOf(v) }))
  }
  const activeVehicles = (customer.vehicles || []).filter((v: any) => !v.archived)
  const archivedVehicles = (customer.vehicles || []).filter((v: any) => v.archived)
  const summary = {
    total:     activeVehicles.length,
    booked:    activeVehicles.filter((v: any) => v.booked_date).length,
    searching: activeVehicles.filter((v: any) => v.active && !v.booked_date && !v.booking_in_progress).length,
    booking:   activeVehicles.filter((v: any) => v.booking_in_progress).length,
    paused:    activeVehicles.filter((v: any) => !v.active).length,
  }

  const isSA = customer.state === 'SA'
  const idField = isSA ? { key: 'licence_number', label: 'Licence (SA)' } : { key: 'crn', label: 'CRN (QLD)' }
  const requiredPersonal: { key: string; label: string }[] = [
    { key: 'first_name', label: 'First name' },
    { key: 'last_name', label: 'Last name' },
    { key: 'phone', label: 'Phone' },
    { key: 'address', label: 'Address' },
    { key: 'suburb', label: 'Suburb' },
    { key: 'postcode', label: 'Postcode' },
    { key: 'date_of_birth', label: 'Date of birth' },
    idField,
  ]
  const has = (k: string) => String((customer as any)[k] ?? '').trim().length > 0
  const missingPersonal = requiredPersonal.filter(f => !has(f.key))
  const profileComplete = missingPersonal.length === 0

  const bestBooked = activeVehicles.find((v: any) => v.booked_date)
  const stats: { label: string; value: number; c: string; a: string; g: string }[] = [
    { label: 'Vehicles', value: summary.total, c: 'var(--gold-2)', a: 'rgba(201,168,76,0.6)', g: 'rgba(201,168,76,0.14)' },
    { label: 'Booked', value: summary.booked, c: 'var(--green)', a: 'rgba(98,227,106,0.6)', g: 'rgba(98,227,106,0.14)' },
    { label: 'Searching', value: summary.searching, c: 'var(--blue)', a: 'rgba(107,182,255,0.6)', g: 'rgba(107,182,255,0.12)' },
  ]
  if (summary.booking > 0) stats.push({ label: 'Booking', value: summary.booking, c: 'var(--violet)', a: 'rgba(169,135,255,0.6)', g: 'rgba(169,135,255,0.12)' })
  if (summary.paused > 0) stats.push({ label: 'Paused', value: summary.paused, c: '#aaa', a: 'rgba(170,170,170,0.5)', g: 'rgba(170,170,170,0.08)' })

  const locList = ((customer.preferred_locations as string[] | undefined)?.length ? customer.preferred_locations : (Array.isArray(customer.locations) ? customer.locations : [])) as string[]

  return (
    <PreviewShell>
      {session?.imp && (
        <div className="r card" style={{ marginBottom: 18, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', background: 'radial-gradient(120% 90% at 0% 0%, rgba(107,182,255,0.16), transparent 60%), linear-gradient(180deg,rgba(20,18,16,0.86),rgba(11,10,9,0.92))' }}>
          <span style={{ color: 'var(--blue)', fontSize: 13 }}>Admin view — you&apos;re seeing <strong>{customer.email}</strong>&apos;s account as they see it.</span>
          <form action="/auth/sign-out" method="post" style={{ margin: 0 }}>
            <button type="submit" className="pill ghost" style={{ padding: '8px 16px', fontSize: 12 }}>Exit admin view</button>
          </form>
        </div>
      )}

      {/* Floating glass nav */}
      <div className="r card" style={{ borderRadius: 999, padding: '9px 9px 9px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 40, position: 'relative', zIndex: 90 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <Link href="/" className="disp shimmer" style={{ fontSize: 20, textDecoration: 'none' }}>AVIBM</Link>
          <span style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Garage</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {(summary.searching + summary.booking) > 0 && (
            <span className="spill" style={{ color: 'var(--green)', background: 'rgba(98,227,106,0.12)', border: '1px solid rgba(98,227,106,0.4)' }}><span className="dot live" style={{ background: 'var(--green)' }} />Monitoring</span>
          )}
          <ProfileMenu email={customer.email} name={customer.first_name} />
        </div>
      </div>

      {/* Hero bento: greeting + status tile */}
      <div className="bento" style={{ display: 'grid', gridTemplateColumns: '1.55fr 1fr', gap: 18, marginBottom: 18 }}>
        <div className="r" style={{ animationDelay: '.06s', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <span className="eyebrow">My Garage</span>
          <h1 className="disp" style={{ fontSize: 'clamp(44px,6vw,76px)', marginTop: 20 }}>Hi, <span className="shimmer">{customer.first_name || 'there'}</span></h1>
          <p style={{ color: 'var(--muted)', fontSize: 16, marginTop: 16, maxWidth: 440, lineHeight: 1.5 }}>We&apos;re watching the inspection booking system around the clock and rebooking the moment an earlier slot opens.</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
            {customer.ref && <span style={{ fontFamily: 'ui-monospace,monospace', fontSize: 12, color: 'var(--gold)', background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.28)', padding: '4px 11px', borderRadius: 8 }}>{customer.ref}</span>}
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>{customer.email}</span>
          </div>
        </div>
        {bestBooked ? (
          <Link href={`/account/vehicle/${bestBooked.id}`} className="r card" style={{ animationDelay: '.12s', padding: 26, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 220, textDecoration: 'none', color: 'inherit', background: 'radial-gradient(120% 100% at 100% 0%, rgba(98,227,106,0.14), transparent 55%), linear-gradient(180deg,rgba(20,18,16,0.86),rgba(11,10,9,0.92))' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="eyebrow" style={{ color: 'var(--green)', background: 'rgba(98,227,106,0.08)', borderColor: 'rgba(98,227,106,0.3)' }}>Booked</span>
              <span className="spill" style={{ color: 'var(--green)', background: 'rgba(98,227,106,0.14)', border: '1px solid rgba(98,227,106,0.4)' }}><span className="dot" style={{ background: 'var(--green)' }} />Secured</span>
            </div>
            <div>
              <div className="disp" style={{ fontSize: 40, color: 'var(--green)', lineHeight: 1 }}>{fmtDate(bestBooked.booked_date)}</div>
              <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 10 }}>{[bestBooked.year, bestBooked.make, bestBooked.model].filter(Boolean).join(' ')}{bestBooked.booked_time ? ` · ${bestBooked.booked_time}` : ''}{bestBooked.booked_location ? ` · ${bestBooked.booked_location}` : ''}</p>
            </div>
          </Link>
        ) : (
          <div className="r card" style={{ animationDelay: '.12s', padding: 26, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 220, background: 'radial-gradient(120% 100% at 100% 0%, rgba(107,182,255,0.14), transparent 55%), linear-gradient(180deg,rgba(20,18,16,0.86),rgba(11,10,9,0.92))' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="eyebrow" style={{ color: 'var(--blue)', background: 'rgba(107,182,255,0.08)', borderColor: 'rgba(107,182,255,0.3)' }}>Status</span>
              {summary.total > 0 && <span className="spill" style={{ color: 'var(--blue)', background: 'rgba(107,182,255,0.14)', border: '1px solid rgba(107,182,255,0.4)' }}><span className="dot live" style={{ background: 'var(--blue)' }} />Watching</span>}
            </div>
            <div>
              <div className="disp" style={{ fontSize: 64, color: 'var(--blue)', lineHeight: 1 }}>{summary.searching + summary.booking}</div>
              <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 8 }}>{summary.total === 0 ? 'No vehicles yet — add one to start monitoring for earlier inspection slots.' : 'vehicle(s) being monitored for an earlier slot.'}</p>
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      {summary.total > 0 && (
        <div className="r" style={{ animationDelay: '.16s', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 18, marginBottom: 18 }}>
          {stats.map(s => (
            <div key={s.label} className="card" style={{ padding: '24px 26px', overflow: 'hidden', background: `radial-gradient(130% 130% at 50% -20%, ${s.g}, transparent 55%), linear-gradient(180deg,rgba(20,18,16,0.86),rgba(11,10,9,0.92))` }}>
              <div style={{ position: 'absolute', top: 1, left: 22, right: 22, height: 2, borderRadius: 2, background: `linear-gradient(90deg,transparent,${s.a},transparent)` }} />
              <div className="disp" style={{ fontSize: 54, color: s.c, lineHeight: 1 }}>{s.value}</div>
              <div className="fl" style={{ marginTop: 12 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Personal details */}
      <div className="r card" style={{ animationDelay: '.2s', padding: 28, marginBottom: 26 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span className="eyebrow">Personal details</span>
          <Link href="/account/edit-details" className="menu" style={{ textDecoration: 'none' }}>Edit details<Arrow s={13} /></Link>
        </div>
        {!profileComplete && (
          <div style={{ marginTop: 18, padding: '13px 16px', borderRadius: 14, background: 'rgba(240,169,60,0.08)', border: '1px solid rgba(240,169,60,0.4)', color: 'var(--amber)', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 9 }}>
            <span className="dot" style={{ background: 'var(--amber)' }} />Complete your details to start monitoring — your inspection can&apos;t be booked until then.
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: '22px 30px', marginTop: 24 }}>
          <PField label="First name" value={customer.first_name} missing={!has('first_name')} />
          <PField label="Last name" value={customer.last_name} missing={!has('last_name')} />
          <PField label="Phone" value={customer.phone} missing={!has('phone')} />
          <PField label="Date of birth" value={fmtDate(customer.date_of_birth)} missing={!has('date_of_birth')} />
          <PField label={idField.label} value={(customer as any)[idField.key]} missing={!has(idField.key)} />
          <div style={{ gridColumn: '1 / -1' }}>
            <PField label="Address" wide
              value={`${customer.address || ''}${customer.suburb ? ', ' + customer.suburb : ''} ${customer.postcode || ''}`.trim()}
              missing={!has('address') || !has('suburb') || !has('postcode')} />
          </div>
        </div>
      </div>

      {/* Vehicles */}
      <div className="r" style={{ animationDelay: '.24s', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
        <span className="eyebrow">Vehicles · {activeVehicles.length}</span>
        {profileComplete ? (
          <Link href="/account/add-vehicle" className="pill gold" style={{ textDecoration: 'none' }}><span style={{ paddingLeft: 2 }}>Add vehicle</span><span className="ibtn"><Arrow /></span></Link>
        ) : (
          <Link href="/account/edit-details" className="pill ghost" style={{ textDecoration: 'none', color: 'var(--amber)', borderColor: 'rgba(240,169,60,0.5)', padding: '11px 18px' }}>Complete details to add a vehicle</Link>
        )}
      </div>
      {activeVehicles.length === 0 ? (
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>No active vehicles. Add one to start monitoring for earlier inspection slots.</p>
      ) : (
        <div className="r" style={{ animationDelay: '.28s', display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 18 }}>
          {activeVehicles.map((v: any) => (
            <VehicleCard key={v.id} v={v} status={vehicleStatus(v)} />
          ))}
        </div>
      )}
      <PastVehicles vehicles={archivedVehicles} />

      {/* Preferred locations (QLD) */}
      {!isSA && (
        <div className="r card" style={{ animationDelay: '.3s', padding: 28, marginTop: 26 }}>
          <span className="eyebrow">Preferred inspection locations</span>
          <div style={{ marginTop: 18 }}>
            {locList.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {locList.map((loc: string) => <span key={loc} className="chip" style={{ cursor: 'default' }}>{loc}</span>)}
              </div>
            ) : (
              <p style={{ color: 'var(--muted)', fontSize: 14, margin: 0 }}>No preferred locations set yet.</p>
            )}
          </div>
        </div>
      )}
    </PreviewShell>
  )
}

// Display dd/mm/yyyy. Only reformats ISO (yyyy-mm-dd); leaves an already-
// localised string untouched so a dd/mm/yyyy value isn't mis-parsed.
function fmtDate(d?: string | null): string {
  if (!d) return ''
  if (/^\d{4}-\d{2}-\d{2}/.test(d)) {
    const dt = new Date(d)
    if (!isNaN(dt.getTime())) return dt.toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }
  return d
}
function PField({ label, value, missing, wide }: { label: string; value?: string | null; missing?: boolean; wide?: boolean }) {
  return (
    <div style={wide ? { gridColumn: '1 / -1' } : undefined}>
      <div className="fl">{label}</div>
      <div className="fv" style={{ wordBreak: 'break-word' }}>
        {missing ? <span className="req">Required</span> : (value || '—')}
      </div>
    </div>
  )
}
function vehicleStatus(v: any): { label: string; color: string; bg: string } {
  if (v.archived) return { label: 'Archived', color: '#8d8678', bg: 'rgba(141,134,120,0.12)' }
  if (v.booked_date) return { label: 'Booked', color: '#62e36a', bg: 'rgba(98,227,106,0.16)' }
  if (!v.active) return { label: 'Paused', color: '#aaa', bg: 'rgba(170,170,170,0.12)' }
  if (v.booking_in_progress) return { label: 'Booking now…', color: '#6bb6ff', bg: 'rgba(107,182,255,0.16)' }
  return { label: 'Searching', color: '#E9CE88', bg: 'rgba(201,168,76,0.16)' }
}
