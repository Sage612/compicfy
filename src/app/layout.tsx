import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { ThemeProvider } from '@/components/layout/ThemeProvider'
import { Toaster } from 'sonner'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://compicfy.com'),
  title: {
    default: 'Compicfy — Discover Your Next Favorite Comic',
    template: '%s | Compicfy',
  },
  description: 'Community-driven recommendations for manga, manhwa, manhua, and webtoons. Discover, vote, review, and share your favorite comics.',
  keywords: ['manga', 'manhwa', 'manhua', 'webtoon', 'comics', 'recommendations', 'community'],
  authors: [{ name: 'Compicfy' }],
  creator: 'Compicfy',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://compicfy.com',
    siteName: 'Compicfy',
    title: 'Compicfy — Discover Your Next Favorite Comic',
    description: 'Community-driven recommendations for manga, manhwa, manhua, and webtoons.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Compicfy' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Compicfy — Discover Your Next Favorite Comic',
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
      <body className={`${GeistSans.variable} ${GeistMono.variable} antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  )
}