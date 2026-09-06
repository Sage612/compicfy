'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Crown, BookOpen, Bookmark, BookMarked, Bell, Plus,
  Settings, CreditCard, Star, BarChart2, Download, Trophy, Layers, Upload, Radar,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/pro/reader/dashboard',                    label: 'Dashboard',     icon: Crown,      exact: true,  isSubmit: false, excludePaths: [] as string[] },
  { href: '/pro/reader/dashboard/recommendations/new', label: 'Submit a Rec',  icon: Plus,       exact: true,  isSubmit: true,  excludePaths: [] as string[] },
  { href: '/pro/reader/dashboard/recommendations',     label: 'My Recs',       icon: BookOpen,   exact: false, isSubmit: false, excludePaths: ['/pro/reader/dashboard/recommendations/new'] },
  { href: '/pro/reader/dashboard/saved',               label: 'Saved',         icon: Bookmark,   exact: false, isSubmit: false, excludePaths: [] as string[] },
  { href: '/pro/reader/dashboard/lists',               label: 'Reading Lists', icon: BookMarked, exact: false, isSubmit: false, excludePaths: [] as string[] },
  { href: '/pro/reader/dashboard/release-radar',       label: 'Release Radar', icon: Radar,      exact: false, isSubmit: false, excludePaths: [] as string[] },
  { href: '/pro/reader/dashboard/import',              label: 'Import List',   icon: Upload,     exact: false, isSubmit: false, excludePaths: [] as string[] },
  { href: '/pro/reader/dashboard/collections',         label: 'Collections',   icon: Layers,     exact: false, isSubmit: false, excludePaths: [] as string[] },
  { href: '/pro/reader/dashboard/reviews',              label: 'My Reviews',    icon: Star,       exact: false, isSubmit: false, excludePaths: [] as string[] },
  { href: '/pro/reader/dashboard/analytics',             label: 'Analytics',     icon: BarChart2,  exact: false, isSubmit: false, excludePaths: [] as string[] },
  { href: '/pro/reader/dashboard/leaderboard',           label: 'Leaderboard',   icon: Trophy,     exact: false, isSubmit: false, excludePaths: [] as string[] },
  { href: '/pro/reader/dashboard/export',                label: 'Export',        icon: Download,   exact: false, isSubmit: false, excludePaths: [] as string[] },
  { href: '/pro/reader/dashboard/notifications',         label: 'Notifications', icon: Bell,       exact: false, isSubmit: false, excludePaths: [] as string[] },
  { href: '/pro/reader/dashboard/settings',               label: 'Settings',      icon: Settings,   exact: false, isSubmit: false, excludePaths: [] as string[] },
  { href: '/pro/reader/dashboard/billing',                label: 'Billing',       icon: CreditCard, exact: false, isSubmit: false, excludePaths: [] as string[] },
]

function isNavItemActive(
  pathname: string,
  href: string,
  exact: boolean,
  excludePaths: string[] = [],
): boolean {
  if (excludePaths.some(p => pathname === p || pathname.startsWith(p + '/'))) return false
  return exact ? pathname === href : (pathname === href || pathname.startsWith(href + '/'))
}

export function ProReaderSidebar() {
  const pathname = usePathname()
  return (
    <div className="flex flex-col gap-1 w-full">
      <div className="flex items-center gap-2 px-3 py-2 mb-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
        <div className="w-5 h-5 rounded-md bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0">
          <Crown size={11} className="text-white" />
        </div>
        <span className="text-xs font-black text-amber-600">Pro Reader</span>
      </div>
      <div className="flex-1 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon, exact, isSubmit, excludePaths }) => {
          const isActive = isNavItemActive(pathname, href, exact, excludePaths)
          return (
            <Link key={href} href={href} className={cn(
              'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              isSubmit && !isActive
                ? 'text-amber-600 hover:bg-amber-500/10'
                : isActive
                ? 'bg-amber-500/10 text-amber-600 font-semibold'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            )}>
              <Icon size={15} className={cn('shrink-0', (isActive || isSubmit) ? 'text-amber-500' : '')} />
              {label}
            </Link>
          )
        })}
      </div>
    </div>
  )
}