'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Crown, BookOpen, Bookmark, BookMarked, Bell, Plus,
  Settings, CreditCard, Star, BarChart2, Download, Trophy, Layers, Upload, Radar, Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const READER_NAV = [
  { href: '/pro/reader/dashboard',               label: 'Dashboard',     icon: Crown,      exact: true,  excludePaths: [] as string[] },
  { href: '/pro/reader/dashboard/saved',         label: 'Saved',         icon: Bookmark,   exact: false, excludePaths: [] as string[] },
  { href: '/pro/reader/dashboard/lists',         label: 'Reading Lists', icon: BookMarked, exact: false, excludePaths: [] as string[] },
  { href: '/pro/reader/dashboard/release-radar', label: 'Release Radar', icon: Radar,      exact: false, excludePaths: [] as string[] },
  { href: '/pro/reader/dashboard/import',        label: 'Import List',   icon: Upload,     exact: false, excludePaths: [] as string[] },
  { href: '/pro/reader/dashboard/collections',   label: 'Collections',   icon: Layers,     exact: false, excludePaths: [] as string[] },
  { href: '/pro/reader/dashboard/reviews',       label: 'My Reviews',    icon: Star,       exact: false, excludePaths: [] as string[] },
  { href: '/pro/reader/dashboard/notifications', label: 'Notifications', icon: Bell,       exact: false, excludePaths: [] as string[] },
]

const CURATOR_NAV = [
  { href: '/pro/reader/dashboard/recommendations/new', label: 'Submit a Rec', icon: Plus,      exact: true,  isSubmit: true },
  { href: '/pro/reader/dashboard/recommendations',     label: 'My Recs',      icon: Sparkles,  exact: false, excludePaths: ['/pro/reader/dashboard/recommendations/new'] },
  { href: '/pro/reader/dashboard/analytics',           label: 'Analytics',    icon: BarChart2, exact: false, excludePaths: [] as string[] },
  { href: '/pro/reader/dashboard/leaderboard',         label: 'Leaderboard',  icon: Trophy,    exact: false, excludePaths: [] as string[] },
  { href: '/pro/reader/dashboard/export',              label: 'Export',       icon: Download,  exact: false, excludePaths: [] as string[] },
]

const SETTINGS_NAV = [
  { href: '/pro/reader/dashboard/settings', label: 'Settings', icon: Settings,   exact: false, excludePaths: [] as string[] },
  { href: '/pro/reader/dashboard/billing',  label: 'Billing',  icon: CreditCard, exact: false, excludePaths: [] as string[] },
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

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="px-3 mt-3 mb-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">{children}</p>
}

function NavItem({ href, label, icon: Icon, exact, isSubmit = false, excludePaths = [], pathname }: any) {
  const isActive = isNavItemActive(pathname, href, exact, excludePaths)
  return (
    <Link href={href} className={cn(
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
        {READER_NAV.map(item => <NavItem key={item.href} {...item} pathname={pathname} />)}

        <SectionLabel>Curator</SectionLabel>
        {CURATOR_NAV.map(item => <NavItem key={item.href} {...item} pathname={pathname} />)}

        <SectionLabel>Account</SectionLabel>
        {SETTINGS_NAV.map(item => <NavItem key={item.href} {...item} pathname={pathname} />)}
      </div>
    </div>
  )
}