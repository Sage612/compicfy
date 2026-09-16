'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BarChart2, BookOpen, Bookmark, Bell,
  Settings, LayoutDashboard, BookMarked, Trophy, Download,
  CreditCard, Star, Plus, Users, Link as LinkIcon, Layers, Upload, Radar, Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

const PRO_READER_ITEMS = [
  { href: '/pro/reader/dashboard',                     label: 'Home',        icon: LayoutDashboard, exact: true,  excludePaths: [] as string[] },
  { href: '/pro/reader/dashboard/saved',               label: 'Saved',       icon: Bookmark,        exact: false, excludePaths: [] as string[] },
  { href: '/pro/reader/dashboard/lists',               label: 'Lists',       icon: BookMarked,      exact: false, excludePaths: [] as string[] },
  { href: '/pro/reader/dashboard/release-radar',       label: 'Radar',       icon: Radar,           exact: false, excludePaths: [] as string[] },
  { href: '/pro/reader/dashboard/import',              label: 'Import',      icon: Upload,          exact: false, excludePaths: [] as string[] },
  { href: '/pro/reader/dashboard/collections',         label: 'Collections', icon: Layers,          exact: false, excludePaths: [] as string[] },
  { href: '/pro/reader/dashboard/reviews',             label: 'Reviews',     icon: Star,            exact: false, excludePaths: [] as string[] },
  { href: '/pro/reader/dashboard/notifications',       label: 'Alerts',      icon: Bell,            exact: false, excludePaths: [] as string[] },
]

// Everything about submitting/managing/measuring recommendations lives here now.
const PRO_CURATOR_ITEMS = [
  { href: '/pro/reader/dashboard/recommendations/new', label: 'Submit',    icon: Plus,      exact: true,  isSubmit: true, excludePaths: [] as string[] },
  { href: '/pro/reader/dashboard/recommendations',     label: 'My Recs',   icon: Sparkles,  exact: false, excludePaths: ['/pro/reader/dashboard/recommendations/new'] },
  { href: '/pro/reader/dashboard/analytics',           label: 'Analytics', icon: BarChart2, exact: false, excludePaths: [] as string[] },
  { href: '/pro/reader/dashboard/export',              label: 'Export',    icon: Download,  exact: false, excludePaths: [] as string[] },
  { href: '/pro/reader/dashboard/leaderboard',         label: 'Ranks',     icon: Trophy,    exact: false, excludePaths: [] as string[] },
]

const PRO_SETTINGS_ITEMS = [
  { href: '/pro/reader/dashboard/settings', label: 'Settings', icon: Settings,   exact: false, excludePaths: [] as string[] },
  { href: '/pro/reader/dashboard/billing',  label: 'Billing',  icon: CreditCard, exact: false, excludePaths: [] as string[] },
]

const PRO_CREATOR_ITEMS = [
  { href: '/pro/creator/dashboard',               label: 'Studio',    icon: LayoutDashboard, exact: true,  isSubmit: false, excludePaths: [] as string[] },
  { href: '/pro/creator/dashboard/works/new',     label: 'Add Work',  icon: Plus,            exact: true,  isSubmit: true,  excludePaths: [] as string[] },
  { href: '/pro/creator/dashboard/works',         label: 'Works',     icon: BookOpen,        exact: false, isSubmit: false, excludePaths: ['/pro/creator/dashboard/works/new'] },
  { href: '/pro/creator/dashboard/audience',      label: 'Audience',  icon: Users,           exact: false, isSubmit: false, excludePaths: [] as string[] },
  { href: '/pro/creator/dashboard/analytics',     label: 'Analytics', icon: BarChart2,       exact: false, isSubmit: false, excludePaths: [] as string[] },
  { href: '/pro/creator/dashboard/links',         label: 'Links',     icon: LinkIcon,        exact: false, isSubmit: false, excludePaths: [] as string[] },
  { href: '/pro/creator/dashboard/notifications', label: 'Alerts',    icon: Bell,            exact: false, isSubmit: false, excludePaths: [] as string[] },
  { href: '/pro/creator/dashboard/settings',      label: 'Settings',  icon: Settings,        exact: false, isSubmit: false, excludePaths: [] as string[] },
  { href: '/pro/creator/dashboard/billing',       label: 'Billing',   icon: CreditCard,      exact: false, isSubmit: false, excludePaths: [] as string[] },
]

interface Props {
  userType?: 'reader' | 'creator'
}

function isNavItemActive(
  pathname: string,
  href: string,
  exact: boolean,
  excludePaths: string[] = [],
): boolean {
  if (excludePaths.some(p => pathname === p || pathname.startsWith(p + '/'))) return false
  return exact ? pathname === href : (pathname === href || pathname.startsWith(href + '/'))
}

function NavLink({ href, label, icon: Icon, exact, isSubmit = false, excludePaths = [], pathname, isCreator }: any) {
  const isActive    = isNavItemActive(pathname, href, exact, excludePaths)
  const activeColor = isCreator ? 'text-teal-500'   : 'text-amber-500'
  const activeBg    = isCreator ? 'bg-teal-500/20 text-teal-500 shadow-teal-500/20' : 'bg-amber-500/20 text-amber-500 shadow-amber-500/20'
  const submitColor = isCreator ? 'text-teal-500/80'  : 'text-amber-500/80'
  const submitBg    = isCreator ? 'bg-teal-500/15 hover:bg-teal-500/25' : 'bg-amber-500/15 hover:bg-amber-500/25'
  const idleColor   = isCreator ? 'text-teal-500/60'  : 'text-amber-500/60'
  const idleBg      = isCreator ? 'bg-teal-500/5 hover:bg-teal-500/10'  : 'bg-amber-500/5 hover:bg-amber-500/10'
  const dotColor    = isCreator ? 'bg-teal-500' : 'bg-amber-500'

  return (
    <Link
      key={`${href}-${label}`}
      href={href}
      className={cn(
        'relative flex flex-col items-center gap-1 px-3 py-1.5 min-w-[56px] flex-none rounded-xl transition-all duration-150',
        isActive ? activeColor : isSubmit ? submitColor : idleColor
      )}
    >
      <div className={cn(
        'w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-150',
        isActive ? `${activeBg} shadow-sm` : isSubmit ? submitBg : idleBg
      )}>
        <Icon size={18} />
      </div>
      <span className="text-[10px] font-bold whitespace-nowrap leading-none tracking-tight">{label}</span>
      {isActive && <span className={cn('absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full', dotColor)} />}
    </Link>
  )
}

export function ProMobileNav({ userType: userTypeProp }: Props = {}) {
  const pathname                = usePathname()
  const [userType, setUserType] = useState<'reader' | 'creator'>(userTypeProp ?? 'reader')
  const supabase                = createClient()

  useEffect(() => {
    if (userTypeProp) return
    const getType = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await (supabase as any)
        .from('profiles')
        .select('user_type')
        .eq('id', user.id)
        .single()
      if (profile) setUserType((profile.user_type as 'reader' | 'creator') ?? 'reader')
    }
    getType()
  }, [userTypeProp])

  const isCreator = userType === 'creator'

  if (isCreator) {
    return (
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden touch-land:flex lg:hidden bg-background/95 backdrop-blur-lg border-t border-border">
        <div className="flex overflow-x-auto no-scrollbar px-2 py-2 gap-1">
          {PRO_CREATOR_ITEMS.map(item => <NavLink key={item.href} {...item} pathname={pathname} isCreator />)}
        </div>
        <div style={{ height: 'env(safe-area-inset-bottom, 0px)' }} />
      </nav>
    )
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden touch-land:flex lg:hidden bg-background/95 backdrop-blur-lg border-t border-border">
      <div className="flex overflow-x-auto no-scrollbar px-2 py-2 gap-1 items-center">
        {PRO_READER_ITEMS.map(item => <NavLink key={item.href} {...item} pathname={pathname} isCreator={false} />)}
        <div className="w-px h-8 bg-border shrink-0 mx-1" />
        {PRO_CURATOR_ITEMS.map(item => <NavLink key={item.href} {...item} pathname={pathname} isCreator={false} />)}
        <div className="w-px h-8 bg-border shrink-0 mx-1" />
        {PRO_SETTINGS_ITEMS.map(item => <NavLink key={item.href} {...item} pathname={pathname} isCreator={false} />)}
      </div>
      <div style={{ height: 'env(safe-area-inset-bottom, 0px)' }} />
    </nav>
  )
}