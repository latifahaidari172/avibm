import { redirect } from 'next/navigation'
import { getSessionFromCookies } from '@/lib/session'
import { PreviewShell, Arrow, BackToGarage } from '@/lib/previewDesign'

// Billing — vehicle-monitoring charges are handled under the Auction Intel
// account (one account, one payment method across both sites). Placeholder
// until the payment system is built; reflects the locked model (PayID today,
// billing consolidated on the auction-intel side). Maximalist design.
export default async function BillingPage() {
  const session = await getSessionFromCookies()
  if (!session) redirect('/account/sign-in')

  return (
    <PreviewShell>
      <BackToGarage href="/account" />

      <div className="r" style={{ marginBottom: 26 }}>
        <span className="eyebrow">Billing</span>
        <h1 className="disp" style={{ fontSize: 'clamp(36px,5vw,58px)', marginTop: 16 }}>Billing &amp; <span className="shimmer">payments</span></h1>
      </div>

      <div className="r" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 18 }}>
        <div className="card" style={{ padding: 28 }}>
          <span className="eyebrow">Current plan</span>
          <div className="disp" style={{ fontSize: 30, marginTop: 18 }}>No active subscription</div>
          <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 12, lineHeight: 1.55 }}>You&apos;re only charged when you start a paid monitoring tier on a vehicle.</p>
          <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 9, fontSize: 13, color: 'var(--green)' }}>
            <span className="dot" style={{ background: 'var(--green)' }} />PayID — no card on file
          </div>
        </div>

        <div className="card" style={{ padding: 28, background: 'radial-gradient(120% 90% at 100% 0%, rgba(201,168,76,0.14), transparent 55%), linear-gradient(180deg,rgba(20,18,16,0.86),rgba(11,10,9,0.92))' }}>
          <span className="eyebrow">Managed via Auction Intel</span>
          <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 18, lineHeight: 1.6 }}>
            AVIBM and Auction Intel share one account. When paid monitoring launches, charges are handled on the Auction Intel side — one payment method across both sites.
          </p>
          <a href="/api/auth/sso-out?next=/dashboard" target="_blank" rel="noopener" className="pill gold" style={{ marginTop: 22, textDecoration: 'none' }}>Open Auction Intel<span className="ibtn"><Arrow /></span></a>
        </div>
      </div>

      <div className="r" style={{ animationDelay: '.1s', marginTop: 18 }}>
        <div className="card" style={{ padding: 28 }}>
          <span className="eyebrow">Recent activity</span>
          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0' }}>
            <div><div style={{ fontSize: 14 }}>No charges yet</div><div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>—</div></div>
            <div className="disp" style={{ fontSize: 18 }}>$0.00</div>
          </div>
        </div>
      </div>
    </PreviewShell>
  )
}
