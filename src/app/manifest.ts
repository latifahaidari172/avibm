import type { MetadataRoute } from 'next'

// Web app manifest — makes avibm.com installable to a phone home screen
// ("Add to Home Screen" / install prompt). Served at /manifest.webmanifest
// and auto-linked by Next from the root layout.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'AVIBM — Vehicle Inspection Booking Monitor',
    short_name: 'AVIBM',
    description: 'Monitor and auto-book the earliest available WOVI inspection slot for your vehicle.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#0A0A0A',
    theme_color: '#0A0A0A',
    orientation: 'portrait',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
