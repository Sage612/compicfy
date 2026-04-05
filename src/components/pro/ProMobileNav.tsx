'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Crown, BarChart2, BookOpen, Bookmark,
  Settings, LayoutDashboard, BookMarked, Trophy, Star, Eye, Download, Palette,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ProMobileNavProps {
  role: string
}

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
  exact?: boolean
  isProItem?: boolean
}

// Pro-exclusive tools shown in amber
const proItems: NavItem[] = [
  { href: '/pro/dashboard',   label: 'Pro',       icon: Crown,    exact: true, isProItem: true },
  { href: '/pro/analytics', label: 'Analytics', icon: BarChart2, isProItem: true },
   { href: '/pro/profile-views', label: 'Profile Views',  icon: Eye },
    { href: '/pro/export',        label: 'Export Lists',   icon: Download },
    { href: '/pro/themes',        label: 'Profile Themes', icon: Palette },
  { href: '/pro/leaderboard', label: 'Ranks',     icon: Trophy,    isProItem: true },
]

// Pro versions of platform pages — shown in primary colour
const platformItems: NavItem[] = [
  { href: '/pro/recommendations', label: 'Comics',   icon: BookOpen },
  { href: '/pro/saved',           label: 'Saved',    icon: Bookmark },
  { href: '/pro/lists',           label: 'Lists',    icon: BookMarked },
  { href: '/pro/reviews',         label: 'Reviews',  icon: Star },
  { href: '/pro/settings',        label: 'Settings', icon: Settings },
]

export function ProMobileNav({ role }: ProMobileNavProps) {
  const pathname = usePathname()
  const allItems = [...proItems, ...platformItems]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background/95 backdrop-blur-lg border-t border-border">
      <div className="flex overflow-x-auto no-scrollbar px-1 py-1.5 gap-1">
        {allItems.map(({ href, label, icon: Icon, exact, isProItem }) => {
          const isActive = exact ? pathname === href : pathname.startsWith(href)

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'relative flex flex-col items-center gap-1 px-3 py-1.5 min-w-[64px] flex-none rounded-xl transition-all duration-150',
                isProItem
                  ? isActive ? 'text-amber-500' : 'text-amber-500/60'
                  : isActive ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <div className={cn(
                'w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-150',
                isProItem
                  ? isActive
                    ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-sm shadow-amber-500/30'
                    : 'bg-amber-500/5 hover:bg-amber-500/10'
                  : isActive
                    ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/30'
                    : 'hover:bg-accent/60'
              )}>
                <Icon size={18} />
              </div>
              <span className="text-[10px] font-bold whitespace-nowrap leading-none tracking-tight">
                {label}
              </span>
              {isActive && (
                <span className={cn(
                  'absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full',
                  isProItem ? 'bg-amber-500' : 'bg-primary'
                )} />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}