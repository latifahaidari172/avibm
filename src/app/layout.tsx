import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AVIBM — Australian Vehicle Inspection Booking Monitor',
  description: 'Automatically monitor and book the earliest available inspection slot for your written-off vehicle.',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <div className="noise" />
        {children}
      </body>
    </html>
  )
}
