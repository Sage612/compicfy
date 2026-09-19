'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import {
  LayoutDashboard, BookOpen, Bookmark, BookMarked,
  Bell, Settings, CreditCard, Star, Plus,
  Users, Link as LinkIcon, Layers, Upload, Radar, Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

const READER_ITEMS = [
  { href: '/reader/dashboard',               label: 'Home',        icon: LayoutDashboard, exact: true,  excludePaths: [] as string[] },
  { href: '/reader/dashboard/saved',         label: 'Saved',       icon: Bookmark,        exact: false, excludePaths: [] as string[] },
  { href: '/reader/dashboard/lists',         label: 'Lists',       icon: BookMarked,      exact: false, excludePaths: [] as string[] },
  { href: '/reader/dashboard/release-radar', label: 'Radar',       icon: Radar,           exact: false, excludePaths: [] as string[] },
  { href: '/reader/dashboard/import',        label: 'Import',      icon: Upload,          exact: false, excludePaths: [] as string[] },
  { href: '/reader/dashboard/collections',   label: 'Collections', icon: Layers,          exact: false, excludePaths: [] as string[] },
  { href: '/reader/dashboard/reviews',       label: 'Reviews',     icon: Star,            exact: false, excludePaths: [] as string[] },
  { href: '/reader/dashboard/notifications', label: 'Alerts',      icon: Bell,            exact: false, excludePaths: [] as string[] },
]

// Real curator content pages. "Switch to Curator" itself is not a link to
// one of these — it's the ?view=curator toggle, added separately below.
const CURATOR_ITEMS = [
  { href: '/reader/dashboard/recommendations', label: 'My Recs', icon: Sparkles, exact: false, isSubmit: false, excludePaths: ['/reader/dashboard/recommendations/new'] },
  { href: '/reader/dashboard/recommendations/new', label: 'Submit', icon: Plus, exact: true, isSubmit: true, excludePaths: [] as string[] },
]

const SETTINGS_ITEMS = [
  { href: '/reader/dashboard/settings', label: 'Settings', icon: Settings,    exact: false, excludePaths: [] as string[] },
  { href: '/reader/dashboard/billing',  label: 'Billing',  icon: CreditCard,  exact: false, excludePaths: [] as string[] },
]

const CREATOR_ITEMS = [
  { href: '/creator/dashboard',               label: 'Studio',     icon: LayoutDashboard, exact: true,  isSubmit: false, excludePaths: [] as string[] },
  { href: '/creator/dashboard/works/new',     label: 'Add Work',   icon: Plus,            exact: true,  isSubmit: true,  excludePaths: [] as string[] },
  { href: '/creator/dashboard/works',         label: 'Works',      icon: BookOpen,        exact: false, isSubmit: false, excludePaths: ['/creator/dashboard/works/new'] },
  { href: '/creator/dashboard/audience',      label: 'Audience',   icon: Users,           exact: false, isSubmit: false, excludePaths: [] as string[] },
  { href: '/creator/dashboard/links',         label: 'Links',      icon: LinkIcon,        exact: false, isSubmit: false, excludePaths: [] as string[] },
  { href: '/creator/dashboard/notifications', label: 'Alerts',     icon: Bell,            exact: false, isSubmit: false, excludePaths: [] as string[] },
  { href: '/creator/dashboard/settings',      label: 'Settings',   icon: Settings,        exact: false, isSubmit: false, excludePaths: [] as string[] },
  { href: '/creator/dashboard/billing',       label: 'Billing',    icon: CreditCard,      exact: false, isSubmit: false, excludePaths: [] as string[] },
]

function isNavItemActive(pathname: string, href: string, exact: boolean, excludePaths: string[] = []): boolean {
  if (excludePaths.some(p => pathname === p || pathname.startsWith(p + '/'))) return false
  return exact ? pathname === href : (pathname === href || pathname.startsWith(href + '/'))
}

function NavLink({ href, label, icon: Icon, exact, isSubmit = false, excludePaths = [], pathname, colors }: any) {
  const isActive = isNavItemActive(pathname, href, exact, excludePaths)
  return (
    <Link
      href={href}
      className={cn(
        'relative flex flex-col items-center gap-1 px-3 py-1.5 min-w-[56px] flex-none rounded-xl transition-all duration-150',
        isActive ? colors.activeColor : isSubmit ? colors.submitColor : 'text-foreground/70 hover:text-foreground'
      )}
    >
      <div className={cn(
        'w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-150',
        isActive ? `${colors.activeBg} shadow-sm text-white`
          : isSubmit ? `${colors.submitBg} text-foreground/80`
          : 'bg-muted/80 text-foreground/70 hover:bg-muted hover:text-foreground'
      )}>
        <Icon size={17} />
      </div>
      <span className={cn('text-[9px] font-semibold whitespace-nowrap leading-none', isActive ? colors.activeColor : isSubmit ? colors.submitColor : 'text-foreground/70')}>
        {label}
      </span>
      {isActive && <span className={cn('absolute -bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full', colors.dotColor)} />}
    </Link>
  )
}

export function DashboardMobileNav() {
  const pathname      = usePathname()
  const searchParams  = useSearchParams()
  const [userType, setUserType] = useState<'reader' | 'creator'>('reader')
  const [isCurator, setIsCurator] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const getProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await (supabase as any)
        .from('profiles').select('user_type, is_curator').eq('id', user.id).single()
      if (profile) {
        setUserType((profile.user_type as 'reader' | 'creator') ?? 'reader')
        setIsCurator(!!profile.is_curator)
      }
    }
    getProfile()
  }, [])

  if (userType === 'creator') {
    const colors = { activeColor: 'text-teal-500', activeBg: 'bg-teal-500 shadow-teal-500/30', submitColor: 'text-teal-500/80', submitBg: 'bg-teal-500/10', dotColor: 'bg-teal-500' }
    return (
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden touch-land:flex lg:hidden bg-background/95 backdrop-blur-lg border-t border-border">
        <div className="flex overflow-x-auto no-scrollbar px-2 py-2 gap-1">
          {CREATOR_ITEMS.map(item => <NavLink key={item.href} {...item} pathname={pathname} colors={colors} />)}
        </div>
        <div style={{ height: 'env(safe-area-inset-bottom, 0px)' }} />
      </nav>
    )
  }

  // The mode is curator if EITHER the ?view=curator param is set (set by the
  // dashboard-home tab switcher) OR the current path is itself one of the
  // curator-only routes. The second check is what keeps the nav correct
  // once you actually click into My Recs/Submit — those pages have no
  // ?view= param of their own, so relying on the param alone made the nav
  // silently revert to Reader the instant you left the dashboard home page.
  const CURATOR_ROUTE_PREFIXES = ['/reader/dashboard/recommendations']
  const onCuratorRoute = CURATOR_ROUTE_PREFIXES.some(p => pathname.startsWith(p))
  const onCuratorView = isCurator && (searchParams.get('view') === 'curator' || onCuratorRoute)
  const items = onCuratorView ? CURATOR_ITEMS : READER_ITEMS
  const colors = onCuratorView
    ? { activeColor: 'text-violet-500', activeBg: 'bg-violet-500 shadow-violet-500/30', submitColor: 'text-violet-500/80', submitBg: 'bg-violet-500/10', dotColor: 'bg-violet-500' }
    : { activeColor: 'text-primary',   activeBg: 'bg-primary shadow-primary/30',       submitColor: 'text-primary/80',   submitBg: 'bg-primary/10',   dotColor: 'bg-primary'   }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden touch-land:flex lg:hidden bg-background/95 backdrop-blur-lg border-t border-border">
      <div className="flex overflow-x-auto no-scrollbar px-2 py-2 gap-1 items-center">
        {isCurator && (
          <Link
            href={onCuratorView ? '/reader/dashboard' : '/reader/dashboard?view=curator'}
            className="flex flex-col items-center gap-1 px-3 py-1.5 min-w-[56px] flex-none rounded-xl text-foreground/70 hover:text-foreground"
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-muted/80 text-foreground/70 hover:bg-muted hover:text-foreground">
              {onCuratorView ? <LayoutDashboard size={17} /> : <Sparkles size={17} />}
            </div>
            <span className="text-[9px] font-semibold whitespace-nowrap leading-none">{onCuratorView ? 'Reader' : 'Curator'}</span>
          </Link>
        )}
        {items.map(item => <NavLink key={item.href} {...item} pathname={pathname} colors={colors} />)}
        <div className="w-px h-8 bg-border shrink-0 mx-1" />
        {SETTINGS_ITEMS.map(item => <NavLink key={item.href} {...item} pathname={pathname} colors={colors} />)}
      </div>
      <div style={{ height: 'env(safe-area-inset-bottom, 0px)' }} />
    </nav>
  )
}