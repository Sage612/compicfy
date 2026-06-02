'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import {
  House, Layers, Newspaper, ShoppingBag, Crown,
  Users, HelpCircle, TrendingUp, Sparkles, Flame, BookOpen, Mail,
} from 'lucide-react'

// Discord SVG icon
function DiscordIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057.102 18.08.114 18.1.141 18.115a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
    </svg>
  )
}

interface TabItem {
  label: string
  href: string
  icon: React.ReactNode
  external?: boolean
  proOnly?: false
  hideWhenPro?: boolean
  accent?: string
}

interface MobileTabBarProps {
  isPro?: boolean
}

// Dashboard/admin route prefixes — "Home" chip appears here
const DASHBOARD_PREFIXES = [
  '/reader/dashboard',
  '/pro/reader/dashboard',
  '/pro/creator/dashboard',
  '/creator/dashboard',
  '/admin',
]

// Routes where this bar should render only with Home button
const HOME_ONLY_PREFIXES = [
  ...DASHBOARD_PREFIXES,
  '/admin',
]

export function MobileTabBar({ isPro = false }: MobileTabBarProps) {
  const pathname  = usePathname()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(true)
  const lastScrollY = useRef(0)

  // Hide/show with scroll — synced with header behaviour
  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY
      if (currentY < 60)                           setVisible(true)
      else if (currentY > lastScrollY.current + 4) setVisible(false)
      else if (currentY < lastScrollY.current - 4) setVisible(true)
      lastScrollY.current = currentY
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Check if on dashboard/admin pages
  const isOnDashboard = HOME_ONLY_PREFIXES.some(p => pathname.startsWith(p))

  // Show Home button only when on dashboard/admin
  const showHome = isOnDashboard

  const tabs: TabItem[] = [
    // Home — only on dashboard/admin routes
    ...(showHome ? [{
      label: 'Home',
      href:  '/',
      icon:  <House size={13} strokeWidth={2} />,
    }] : []),

    // All other tabs — only when NOT on dashboard/admin
    ...(!isOnDashboard ? [
      { label: 'Collections', href: '/collections',          icon: <Layers    size={13} strokeWidth={2} /> },
      { label: 'News',        href: '/news',                 icon: <Newspaper size={13} strokeWidth={2} /> },
      { label: 'Trending',    href: '/browse?sort=trending', icon: <Flame     size={13} strokeWidth={2} /> },
      { label: 'New Releases',href: '/browse?sort=recent',   icon: <TrendingUp size={13} strokeWidth={2} /> },
      { label: 'Shop & Merch',href: '/affiliate',            icon: <ShoppingBag size={13} strokeWidth={2} /> },
      {
        label:    'Discord',
        href:     'https://discord.gg/7WPGMb696N',
        icon:     <DiscordIcon size={13} />,
        external: true,
        accent:   'text-[#5865F2]',
      },
      { label: 'About',       href: '/about',            icon: <Users       size={13} strokeWidth={2} /> },
      { label: 'Guidelines',  href: '/guidelines',       icon: <BookOpen    size={13} strokeWidth={2} /> },
      { label: 'FAQ',         href: '/faq',              icon: <HelpCircle  size={13} strokeWidth={2} /> },
      {
        label:    'Support',
        href:     'mailto:support@compicfy.cloud',
        icon:     <Mail size={13} strokeWidth={2} />,
        external: true,
      },
      // Pricing — only for non-pro users
      ...(!isPro ? [{
        label:  'Go Pro',
        href:   '/pricing',
        icon:   <Sparkles size={13} strokeWidth={2} />,
        accent: 'text-amber-500',
      }] : []),
    ] : []),
  ]

  return (
    <div className={cn(
      'fixed top-[64px] left-0 right-0 z-40 lg:hidden',
      'transition-transform duration-300',
      !visible && '-translate-y-[calc(100%+64px)]',
    )}>
      {/* Fade edges */}
      <div className="relative">
        {/* Left fade */}
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-6 z-10 bg-gradient-to-r from-background/80 to-transparent" />
        {/* Right fade */}
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-6 z-10 bg-gradient-to-l from-background/80 to-transparent" />

        <div
          ref={scrollRef}
          className="flex items-center gap-1.5 px-3 py-2 overflow-x-auto no-scrollbar"
        >
          {tabs.map((tab) => {
            const isActive = !tab.external && (
              tab.href === '/'
                ? pathname === '/'
                : pathname.startsWith(tab.href.split('?')[0]) && tab.href.split('?')[0] !== '/'
            )

            return (
              <Link
                key={tab.href + tab.label}
                href={tab.href}
                target={tab.external ? '_blank' : undefined}
                rel={tab.external ? 'noopener noreferrer' : undefined}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-full whitespace-nowrap shrink-0',
                  'text-[11px] font-semibold border transition-all duration-200 active:scale-95',
                  isActive
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/20'
                    : tab.accent
                    ? cn('bg-background/80 backdrop-blur-sm border-border/50', tab.accent)
                    : 'bg-background/80 backdrop-blur-sm border-border/50 text-muted-foreground hover:text-foreground hover:border-border',
                )}
              >
                <span className={cn(
                  isActive ? 'text-primary-foreground' : tab.accent ?? 'text-muted-foreground'
                )}>
                  {tab.icon}
                </span>
                {tab.label}
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}