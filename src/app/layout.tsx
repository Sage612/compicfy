import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { ThemeProvider } from '@/components/layout/ThemeProvider'
import { Toaster } from 'sonner'
import { CookieBanner } from '@/components/ui/CookieBanner'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://compicfy.cloud'),
  title: {
    default: 'Compicfy — Find your next obsession',
    template: '%s | Compicfy',
  },
  description: 'Community-driven recommendations for manga, manhwa, manhua, and webtoons. Discover, vote, review, and share your favorite comics.',
  keywords: ['manga', 'manhwa', 'manhua', 'webtoon', 'comics', 'recommendations', 'community'],
  authors: [{ name: 'Compicfy' }],
  creator: 'Compicfy',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://compicfy.cloud',
    siteName: 'Compicfy',
    title: 'Compicfy — Find your next obsession',
    description: 'Community-driven recommendations for manga, manhwa, manhua, and webtoons.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Compicfy' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Compicfy — Find your next obsession',
    description: 'Community-driven recommendations for manga, manhwa, manhua, and webtoons.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/*
          width=device-width          — use actual device width, not layout width
          initial-scale=1             — don't zoom on load
          viewport-fit=cover          — respect notches/safe areas on modern phones
          interactive-widget=resizes-visual — keyboard doesn't push layout up
        */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-visual"
        />
      </head>
      <body className={`${GeistSans.variable} ${GeistMono.variable} antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
          <Toaster richColors position="top-right" />
          <CookieBanner />
        </ThemeProvider>
      </body>
    </html>
  )
}