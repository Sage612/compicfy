'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, BookOpen, Bookmark, BookMarked,
  Bell, Settings, CreditCard, Star, Plus,
  Users, Link as LinkIcon, Layers, Upload, Radar, Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

// Pure reader concerns — nothing here is about submitting/managing recommendations.
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

// Curator concerns — submitting recommendations of others' work and tracking them.
// "Submit" stays reachable for every reader (it's how curator status is earned in the
// first place); the rest only matters once you've actually submitted something.
const CURATOR_ITEMS = [
  { href: '/reader/dashboard/recommendations/new', label: 'Submit',  icon: Plus,     exact: true,  isSubmit: true, excludePaths: [] as string[] },
  { href: '/reader/dashboard/recommendations',     label: 'My Recs', icon: Sparkles, exact: false, isSubmit: false, excludePaths: ['/reader/dashboard/recommendations/new'] },
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

function isNavItemActive(
  pathname: string,
  href: string,
  exact: boolean,
  excludePaths: string[] = [],
): boolean {
  if (excludePaths.some(p => pathname === p || pathname.startsWith(p + '/'))) return false
  return exact ? pathname === href : (pathname === href || pathname.startsWith(href + '/'))
}

function NavLink({
  href, label, icon: Icon, exact, isSubmit = false, excludePaths = [], pathname,
  activeColor, activeBg, submitColor, submitBg, dotColor,
}: any) {
  const isActive = isNavItemActive(pathname, href, exact, excludePaths)
  return (
    <Link
      href={href}
      className={cn(
        'relative flex flex-col items-center gap-1 px-3 py-1.5 min-w-[56px] flex-none rounded-xl transition-all duration-150',
        isActive ? activeColor : isSubmit ? submitColor : 'text-foreground/70 hover:text-foreground'
      )}
    >
      <div className={cn(
        'w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-150',
        isActive
          ? `${activeBg} shadow-sm text-white`
          : isSubmit
            ? `${submitBg} text-foreground/80`
            : 'bg-muted/80 text-foreground/70 hover:bg-muted hover:text-foreground'
      )}>
        <Icon size={17} />
      </div>
      <span className={cn(
        'text-[9px] font-semibold whitespace-nowrap leading-none',
        isActive ? activeColor : isSubmit ? submitColor : 'text-foreground/70'
      )}>
        {label}
      </span>
      {isActive && <span className={cn('absolute -bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full', dotColor)} />}
    </Link>
  )
}

export function DashboardMobileNav() {
  const pathname                = usePathname()
  const [userType, setUserType] = useState<'reader' | 'creator'>('reader')
  const supabase                = createClient()

  useEffect(() => {
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
  }, [])

  if (userType === 'creator') {
    return (
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden touch-land:flex lg:hidden bg-background/95 backdrop-blur-lg border-t border-border">
        <div className="flex overflow-x-auto no-scrollbar px-2 py-2 gap-1">
          {CREATOR_ITEMS.map(item => (
            <NavLink key={item.href} {...item} pathname={pathname}
              activeColor="text-teal-500" activeBg="bg-teal-500 shadow-teal-500/30"
              submitColor="text-teal-500/80" submitBg="bg-teal-500/10" dotColor="bg-teal-500"
            />
          ))}
        </div>
        <div style={{ height: 'env(safe-area-inset-bottom, 0px)' }} />
      </nav>
    )
  }

  const colors = {
    activeColor: 'text-primary', activeBg: 'bg-primary shadow-primary/30',
    submitColor: 'text-primary/80', submitBg: 'bg-primary/10', dotColor: 'bg-primary',
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden touch-land:flex lg:hidden bg-background/95 backdrop-blur-lg border-t border-border">
      <div className="flex overflow-x-auto no-scrollbar px-2 py-2 gap-1 items-center">
        {READER_ITEMS.map(item => <NavLink key={item.href} {...item} pathname={pathname} {...colors} />)}
        <div className="w-px h-8 bg-border shrink-0 mx-1" />
        {CURATOR_ITEMS.map(item => <NavLink key={item.href} {...item} pathname={pathname} {...colors} />)}
        <div className="w-px h-8 bg-border shrink-0 mx-1" />
        {SETTINGS_ITEMS.map(item => <NavLink key={item.href} {...item} pathname={pathname} {...colors} />)}
      </div>
      <div style={{ height: 'env(safe-area-inset-bottom, 0px)' }} />
    </nav>
  )
}