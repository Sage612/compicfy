'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Crown, BarChart2, BookOpen, Bookmark, Bell,
  Settings, LayoutDashboard, BookMarked, Trophy, Eye, Download, CreditCard, Star
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
}

// Full sync with Sidebar links
const allProItems: NavItem[] = [
  { href: '/pro/dashboard', label: 'Pro', icon: LayoutDashboard, exact: true },
  { href: '/pro/analytics', label: 'Analytics', icon: BarChart2 },
  { href: '/pro/profile-views', label: 'Views', icon: Eye },
  { href: '/pro/export', label: 'Export', icon: Download },
  { href: '/pro/leaderboard', label: 'Ranks', icon: Trophy },
  { href: '/pro/recommendations', label: 'Comics', icon: BookOpen },
  { href: '/pro/saved', label: 'Saved', icon: Bookmark },
  { href: '/pro/lists', label: 'Lists', icon: BookMarked },
  { href: '/pro/reviews', label: 'Reviews', icon: Star },
  { href: '/pro/notifications', label: 'Alerts', icon: Bell },
  { href: '/pro/settings', label: 'Settings', icon: Settings },
  { href: '/pro/billing', label: 'Billing', icon: CreditCard },
]

export function ProMobileNav({ role }: ProMobileNavProps) {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background/95 backdrop-blur-lg border-t border-border">
      <div className="flex overflow-x-auto no-scrollbar px-1 py-1.5 gap-1">
        {allProItems.map(({ href, label, icon: Icon, exact }) => {
          const isActive = exact ? pathname === href : pathname.startsWith(href)

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'relative flex flex-col items-center gap-1 px-3 py-1.5 min-w-[64px] flex-none rounded-xl transition-all duration-150',
                isActive ? 'text-amber-500' : 'text-amber-500/60'
              )}
            >
              <div className={cn(
                'w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-150',
                isActive
                  ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-sm shadow-amber-500/30'
                  : 'bg-amber-500/5 hover:bg-amber-500/10'
              )}>
                <Icon size={18} />
              </div>
              <span className="text-[10px] font-bold whitespace-nowrap leading-none tracking-tight">
                {label}
              </span>
              {isActive && (
                <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-amber-500" />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}