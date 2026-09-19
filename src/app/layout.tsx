import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { dashboardSerif } from '@/lib/fonts'
import { ThemeProvider } from '@/components/layout/ThemeProvider'
import { Toaster } from 'sonner'
import { CookieBanner } from '@/components/ui/CookieBanner'
import './globals.css'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://compicfy.com'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default:  'ComPicfy — Find your next obsession',
    template: '%s | ComPicfy',
  },
  description: 'Community-driven recommendations for manga, manhwa, manhua, and webtoons. Discover, vote, review, and share your favorite comics.',
  keywords: ['manga', 'manhwa', 'manhua', 'webtoon', 'comics', 'recommendations', 'community'],
  authors:  [{ name: 'ComPicfy' }],
  creator:  'ComPicfy',
  openGraph: {
    type:        'website',
    locale:      'en_US',
    url:         SITE_URL,
    siteName:    'ComPicfy',
    title:       'ComPicfy — Find your next obsession',
    description: 'Community-driven recommendations for manga, manhwa, manhua, and webtoons.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'ComPicfy' }],
  },
  twitter: {
    card:        'summary_large_image',
    title:       'ComPicfy — Find your next obsession',
    description: 'Community-driven recommendations for manga, manhwa, manhua, and webtoons.',
    images:      ['/og-image.png'],
  },
  robots: {
    index:     true,
    follow:    true,
    googleBot: { index: true, follow: true },
  },
}

const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type':    'WebSite',
  name:       'ComPicfy',
  url:         SITE_URL,
  description: 'Community-driven manga, manhwa, manhua, and webtoon recommendations.',
  publisher: {
    '@type': 'Organization',
    name:    'ComPicfy',
    url:      SITE_URL,
    logo: {
      '@type':  'ImageObject',
      url:      `${SITE_URL}/icons/icon-192.png`,
      width:    192,
      height:   192,
    },
  },
  potentialAction: {
    '@type':  'SearchAction',
    target: {
      '@type':     'EntryPoint',
      urlTemplate: `${SITE_URL}/browse?q={search_term_string}`,
    },
    'query-input': 'required name=search_term_string',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-visual"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
      </head>
      <body className={`${GeistSans.variable} ${GeistMono.variable} ${dashboardSerif.variable} antialiased bg-background text-foreground`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
          <Toaster richColors position="top-right" />
          <CookieBanner />
        </ThemeProvider>
      </body>
    </html>
  )
}