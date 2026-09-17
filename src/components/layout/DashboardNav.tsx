'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import {
  LayoutDashboard, BookOpen, Bookmark, Star, Bell,
  Settings, BookMarked, CreditCard, Crown, Plus,
  Users, Link as LinkIcon, Palette, Layers, Upload, Radar, Sparkles, ArrowLeftRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { isAdmin as isAdminCheck, isProUser } from '@/lib/access'

const READER_NAV = [
  { href: '/reader/dashboard',               label: 'Overview',      icon: LayoutDashboard, exact: true,  excludePaths: [] as string[] },
  { href: '/reader/dashboard/saved',         label: 'Saved Comics',  icon: Bookmark,        exact: false, excludePaths: [] as string[] },
  { href: '/reader/dashboard/lists',         label: 'Reading Lists', icon: BookMarked,      exact: false, excludePaths: [] as string[] },
  { href: '/reader/dashboard/release-radar', label: 'Release Radar', icon: Radar,           exact: false, excludePaths: [] as string[] },
  { href: '/reader/dashboard/import',        label: 'Import List',   icon: Upload,          exact: false, excludePaths: [] as string[] },
  { href: '/reader/dashboard/collections',   label: 'Collections',   icon: Layers,          exact: false, excludePaths: [] as string[] },
  { href: '/reader/dashboard/reviews',       label: 'My Reviews',    icon: Star,            exact: false, excludePaths: [] as string[] },
  { href: '/reader/dashboard/notifications', label: 'Notifications', icon: Bell,            exact: false, excludePaths: [] as string[] },
]

const CURATOR_NAV = [
  { href: '/reader/dashboard/recommendations/new', label: 'Submit a Rec', icon: Plus,      exact: true,  isSubmit: true },
  { href: '/reader/dashboard/recommendations',     label: 'My Recs',      icon: Sparkles,  exact: false, excludePaths: ['/reader/dashboard/recommendations/new'] },
]

const SETTINGS_NAV = [
  { href: '/reader/dashboard/settings', label: 'Settings', icon: Settings,   exact: false, excludePaths: [] as string[] },
  { href: '/reader/dashboard/billing',  label: 'Billing',  icon: CreditCard, exact: false, excludePaths: [] as string[] },
]

const CREATOR_NAV = [
  { href: '/creator/dashboard',               label: 'Studio',          icon: LayoutDashboard, exact: true,  isSubmit: false, excludePaths: [] as string[] },
  { href: '/creator/dashboard/works/new',     label: 'Add Work',        icon: Plus,            exact: true,  isSubmit: true,  excludePaths: [] as string[] },
  { href: '/creator/dashboard/works',         label: 'My Works',        icon: BookOpen,        exact: false, isSubmit: false, excludePaths: ['/creator/dashboard/works/new'] },
  { href: '/creator/dashboard/audience',      label: 'Audience',        icon: Users,           exact: false, isSubmit: false, excludePaths: [] as string[] },
  { href: '/creator/dashboard/links',         label: 'My Links',        icon: LinkIcon,        exact: false, isSubmit: false, excludePaths: [] as string[] },
  { href: '/creator/dashboard/notifications', label: 'Notifications',   icon: Bell,            exact: false, isSubmit: false, excludePaths: [] as string[] },
  { href: '/creator/dashboard/settings',      label: 'Settings',        icon: Settings,        exact: false, isSubmit: false, excludePaths: [] as string[] },
  { href: '/creator/dashboard/billing',       label: 'Billing',         icon: CreditCard,      exact: false, isSubmit: false, excludePaths: [] as string[] },
]

function isNavItemActive(pathname: string, href: string, exact: boolean, excludePaths: string[] = []): boolean {
  if (excludePaths.some(p => pathname === p || pathname.startsWith(p + '/'))) return false
  return exact ? pathname === href : (pathname === href || pathname.startsWith(href + '/'))
}

function NavItem({ href, label, icon: Icon, exact, isSubmit = false, excludePaths = [], pathname, isPro, isAdmin, isTeal }: any) {
  const isActive  = isNavItemActive(pathname, href, exact, excludePaths)
  const isBilling = href.endsWith('/billing')

  return (
    <Link
      href={href}
      className={cn(
        'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
        isSubmit && !isActive
          ? isTeal ? 'text-teal-500 hover:bg-teal-500/10' : 'text-primary hover:bg-primary/10'
          : isActive
          ? isTeal ? 'bg-teal-500/10 text-teal-600 dark:text-teal-400' : 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
      )}
    >
      <div className={cn(
        'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all',
        isActive
          ? isTeal ? 'bg-teal-500 text-white shadow-sm shadow-teal-500/30' : 'bg-primary text-primary-foreground shadow-sm shadow-primary/30'
          : isSubmit
          ? isTeal ? 'bg-teal-500/10 text-teal-500 group-hover:bg-teal-500/20' : 'bg-primary/10 text-primary group-hover:bg-primary/20'
          : 'bg-muted group-hover:bg-accent'
      )}>
        <Icon size={14} />
      </div>
      <span className="truncate flex-1">{label}</span>
      {isBilling && !isPro && !isAdmin && (
        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 text-[9px] font-black border border-amber-500/20 shrink-0">
          <Crown size={8} className="fill-amber-500" />Pro
        </span>
      )}
      {isActive && !isSubmit && <div className={cn('ml-auto w-1.5 h-1.5 rounded-full shrink-0', isTeal ? 'bg-teal-500' : 'bg-primary')} />}
    </Link>
  )
}

export function DashboardNav() {
  const pathname     = usePathname()
  const searchParams = useSearchParams()
  const [isPro,    setIsPro]    = useState(false)
  const [isAdmin,  setIsAdmin]  = useState(false)
  const [userType, setUserType] = useState<'reader' | 'creator'>('reader')
  const [isCurator, setIsCurator] = useState(false)
  const [loaded,   setLoaded]   = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const getProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoaded(true); return }

      const { data: profile } = await (supabase as any)
        .from('profiles')
        .select('is_pro, pro_expires_at, is_patron, patron_expires_at, role, user_type, is_curator')
        .eq('id', user.id)
        .single()

      if (profile) {
        setIsAdmin(isAdminCheck(profile))
        setIsPro(isProUser(profile))
        setUserType((profile.user_type as 'reader' | 'creator') ?? 'reader')
        setIsCurator(!!profile.is_curator)
      }
      setLoaded(true)
    }
    getProfile()
  }, [])

  if (userType === 'creator') {
    return (
      <nav className="flex flex-col gap-0.5">
        {loaded && (
          <div className="flex items-center gap-2 px-3 py-2 mb-2 rounded-xl border bg-teal-500/10 border-teal-500/20 text-teal-600 dark:text-teal-400 text-xs font-black">
            <Palette size={12} />Creator Studio
          </div>
        )}
        {CREATOR_NAV.map(item => (
          <NavItem key={item.href} {...item} pathname={pathname} isPro={isPro} isAdmin={isAdmin} isTeal />
        ))}
      </nav>
    )
  }

  // The real fix: which set renders depends on the actual active tab, read
  // from the same ?view= param DashboardViewTabs writes to — not a static
  // "show both, labeled" grouping.
  const onCuratorView = isCurator && searchParams.get('view') === 'curator'

  return (
    <nav className="flex flex-col gap-0.5">
      {loaded && (
        <div className={cn(
          'flex items-center justify-between gap-2 px-3 py-2 mb-2 rounded-xl border text-xs font-black',
          onCuratorView ? 'bg-violet-500/10 border-violet-500/20 text-violet-600 dark:text-violet-400' : 'bg-primary/10 border-primary/20 text-primary'
        )}>
          <span className="flex items-center gap-2">
            {onCuratorView ? <><Sparkles size={12} />Curator</> : <><BookOpen size={12} />Reader Dashboard</>}
          </span>
          {isCurator && (
            <Link
              href={onCuratorView ? '/reader/dashboard' : '/reader/dashboard?view=curator'}
              className="flex items-center gap-1 text-[10px] font-bold opacity-70 hover:opacity-100 transition-opacity"
            >
              <ArrowLeftRight size={10} />
              {onCuratorView ? 'Reader' : 'Curator'}
            </Link>
          )}
        </div>
      )}

      {(onCuratorView ? CURATOR_NAV : READER_NAV).map(item => (
        <NavItem key={item.href} {...item} pathname={pathname} isPro={isPro} isAdmin={isAdmin} isTeal={false} />
      ))}

      {SETTINGS_NAV.map(item => (
        <NavItem key={item.href} {...item} pathname={pathname} isPro={isPro} isAdmin={isAdmin} isTeal={false} />
      ))}
    </nav>
  )
}