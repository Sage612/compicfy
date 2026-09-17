'use client'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import {
  Crown, BookOpen, Bookmark, BookMarked, Bell, Plus,
  Settings, CreditCard, Star, BarChart2, Download, Trophy, Layers, Upload, Radar, Sparkles,
  ArrowLeftRight, LayoutDashboard,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

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

function isNavItemActive(pathname: string, href: string, exact: boolean, excludePaths: string[] = []): boolean {
  if (excludePaths.some(p => pathname === p || pathname.startsWith(p + '/'))) return false
  return exact ? pathname === href : (pathname === href || pathname.startsWith(href + '/'))
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
  const pathname     = usePathname()
  const searchParams = useSearchParams()
  const [isCurator, setIsCurator] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const getProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await (supabase as any)
        .from('profiles').select('is_curator').eq('id', user.id).single()
      if (profile) setIsCurator(!!profile.is_curator)
    }
    getProfile()
  }, [])

  const onCuratorView = isCurator && searchParams.get('view') === 'curator'

  return (
    <div className="flex flex-col gap-1 w-full">
      <div className="flex items-center justify-between gap-2 px-3 py-2 mb-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0">
            <Crown size={11} className="text-white" />
          </div>
          <span className="text-xs font-black text-amber-600">{onCuratorView ? 'Pro Curator' : 'Pro Reader'}</span>
        </div>
        {isCurator && (
          <Link
            href={onCuratorView ? '/pro/reader/dashboard' : '/pro/reader/dashboard?view=curator'}
            className="flex items-center gap-1 text-[10px] font-bold text-amber-600/70 hover:text-amber-600 transition-colors"
          >
            <ArrowLeftRight size={10} />
            {onCuratorView ? 'Reader' : 'Curator'}
          </Link>
        )}
      </div>

      <div className="flex-1 space-y-0.5">
        {(onCuratorView ? CURATOR_NAV : READER_NAV).map(item => (
          <NavItem key={item.href} {...item} pathname={pathname} />
        ))}
        {SETTINGS_NAV.map(item => (
          <NavItem key={item.href} {...item} pathname={pathname} />
        ))}
      </div>
    </div>
  )
}