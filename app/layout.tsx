import type { Metadata, Viewport } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { PWARegister } from '@/components/pwa-register'
import './globals.css'

export const metadata: Metadata = {
  title: 'Vortex Equality - Professional Trading Platform',
  description: 'Join Vortex Equality - Professional Stock and Gold Trading Platform with Daily 1-2% Profit Sharing. Start with just $50 and grow your wealth!',
  keywords: ['trading', 'investment', 'daily profit', 'passive income', 'stock trading', 'gold trading', 'crypto'],
  authors: [{ name: 'Vortex Equality' }],
  applicationName: 'Vortex Equality',
  
  // PWA Manifest
  manifest: '/manifest.json',
  
  icons: {
    icon: [
      { url: '/logo.jpg', sizes: '32x32', type: 'image/jpeg' },
      { url: '/icons/icon-192x192.jpg', sizes: '192x192', type: 'image/jpeg' },
      { url: '/icons/icon-512x512.jpg', sizes: '512x512', type: 'image/jpeg' },
    ],
    apple: [
      { url: '/icons/apple-touch-icon.jpg', sizes: '180x180', type: 'image/jpeg' },
    ],
    shortcut: '/logo.jpg',
  },
  
  // Apple PWA
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Vortex Equality',
    startupImage: [
      '/icons/splash-1242x2688.png',
    ],
  },
  
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://vortexequality.com',
    siteName: 'Vortex Equality',
    title: 'Vortex Equality - Join & Earn Daily Profit',
    description: 'Professional Trading Platform with Daily 1-2% Profit Sharing. Start with just $50! Join now and build your financial freedom.',
    images: [
      {
        url: 'https://vortexequality.com/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Vortex Equality investment dashboard',
        type: 'image/jpeg',
      },
    ],
  },
  
  // Twitter Card
  twitter: {
    card: 'summary_large_image',
    title: 'Vortex Equality - Join & Earn Daily Profit',
    description: 'Professional Trading Platform with Daily 1-2% Profit Sharing. Start with just $50!',
    images: ['https://vortexequality.com/og-image.jpg'],
    creator: '@vortexequality',
  },
  
  // Verification
  verification: {
    google: 'google-site-verification-code',
  },
  
  // Other
  category: 'finance',
  classification: 'Investment Platform',
  robots: {
    index: true,
    follow: true,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#0071E3' },
    { media: '(prefers-color-scheme: dark)', color: '#0071E3' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="bg-background w-full overflow-x-hidden" suppressHydrationWarning>
      <head>
        {/* PWA Meta Tags */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Vortex Equality" />
        <meta name="msapplication-TileColor" content="#0071E3" />
        <meta name="msapplication-TileImage" content="/icons/icon-192x192.jpg" />
        <meta name="msapplication-tap-highlight" content="no" />

        {/* Apple Touch Icon */}
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.jpg" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/apple-touch-icon.jpg" />
        <link rel="apple-touch-icon" sizes="144x144" href="/icons/apple-touch-icon.jpg" />
        <link rel="apple-touch-icon" sizes="120x120" href="/icons/apple-touch-icon.jpg" />
        <link rel="icon" type="image/jpeg" sizes="512x512" href="/icons/icon-512x512.jpg" />
        <link rel="icon" type="image/jpeg" sizes="192x192" href="/icons/icon-192x192.jpg" />
        <link rel="shortcut icon" href="/logo.jpg" />

        {/* Open Graph */}
        <meta property="og:image" content="https://vortexequality.com/og-image.jpg" />
        <meta property="og:image:secure_url" content="https://vortexequality.com/og-image.jpg" />
        <meta property="og:image:type" content="image/jpeg" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="Vortex Equality - Daily Profit Sharing Platform" />
        
      </head>
      <body className="font-sans antialiased w-full overflow-x-hidden" suppressHydrationWarning>
        <PWARegister />
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
