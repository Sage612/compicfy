'use client'

import { usePathname } from 'next/navigation'
import { Footer } from '@/components/layout/Footer'

const FOOTER_PATHS = [
  '/',
  '/about',
  '/faq',
  '/guidelines',
  '/disclaimer',
  '/terms',
  '/privacy',
  '/cookies',
  '/dmca',
  '/pricing',
  '/affiliate',
]

export function ConditionalFooter() {
  const pathname = usePathname()
  if (!FOOTER_PATHS.includes(pathname)) return null
  return <Footer />
}