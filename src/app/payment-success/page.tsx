'use client'
import Link from 'next/link'

export default function PaymentSuccess() {
  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
      <div className="card" style={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
        <h2 style={{ fontSize: 36, marginBottom: 12 }}>PAYMENT CONFIRMED</h2>
        <p style={{ color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: 8 }}>
          Your monitor is now live and actively searching for earlier inspection slots.
        </p>
        <p style={{ color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: 24 }}>
          You&apos;ll receive a confirmation email shortly. The moment we find an earlier slot, we&apos;ll rebook it automatically and let you know.
        </p>
        <Link href="/" style={{ color: 'var(--gold)', fontSize: 14, textDecoration: 'none' }}>← Back to home</Link>
      </div>
    </main>
  )
}
