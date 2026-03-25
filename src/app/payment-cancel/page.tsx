'use client'
import Link from 'next/link'

export default function PaymentCancel() {
  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
      <div className="card" style={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>❌</div>
        <h2 style={{ fontSize: 36, marginBottom: 12 }}>PAYMENT CANCELLED</h2>
        <p style={{ color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: 24 }}>
          No payment was taken. You can go back and try again whenever you&apos;re ready.
        </p>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/register/qld" style={{ color: 'var(--gold)', fontSize: 14, textDecoration: 'none' }}>Register QLD</Link>
          <Link href="/register/sa" style={{ color: 'var(--gold)', fontSize: 14, textDecoration: 'none' }}>Register SA</Link>
          <Link href="/" style={{ color: 'var(--text-muted)', fontSize: 14, textDecoration: 'none' }}>← Home</Link>
        </div>
      </div>
    </main>
  )
}
