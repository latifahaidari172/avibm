import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AVIBM — Australian Vehicle Inspection Booking Monitor',
  description: 'Automatically monitor and book the earliest available inspection slot for your written-off vehicle.',
  applicationName: 'AVIBM',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/apple-touch-icon.png',
  },
  // iOS standalone "Add to Home Screen" behaviour
  appleWebApp: {
    capable: true,
    title: 'AVIBM',
    statusBarStyle: 'black-translucent',
  },
}

export const viewport: Viewport = {
  themeColor: '#0A0A0A',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Material Symbols loaded via <link> — an @import in globals.css gets
            stripped by the CSS build, leaving icons as raw ligature text. */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block"
        />
      </head>
      <body>
        <div className="noise" />
        {children}
      </body>
    </html>
  )
}
