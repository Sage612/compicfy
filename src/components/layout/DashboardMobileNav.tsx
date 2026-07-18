'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, BookOpen, Bookmark, BookMarked,
  Bell, Settings, CreditCard, Star, Plus,
  Users, Link as LinkIcon, Layers,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

const READER_ITEMS = [
  { href: '/reader/dashboard',                     label: 'Home',       icon: LayoutDashboard, exact: true,  isSubmit: false, excludePaths: [] as string[] },
  { href: '/reader/dashboard/recommendations/new', label: 'Submit',     icon: Plus,            exact: true,  isSubmit: true,  excludePaths: [] as string[] },
  { href: '/reader/dashboard/recommendations',     label: 'My Recs',    icon: BookOpen,        exact: false, isSubmit: false, excludePaths: ['/reader/dashboard/recommendations/new'] },
  { href: '/reader/dashboard/saved',               label: 'Saved',      icon: Bookmark,        exact: false, isSubmit: false, excludePaths: [] as string[] },
  { href: '/reader/dashboard/lists',               label: 'Lists',      icon: BookMarked,      exact: false, isSubmit: false, excludePaths: [] as string[] },
  { href: '/reader/dashboard/collections',         label: 'Collections',icon: Layers,          exact: false, isSubmit: false, excludePaths: [] as string[] },
  { href: '/reader/dashboard/notifications',       label: 'Alerts',     icon: Bell,            exact: false, isSubmit: false, excludePaths: [] as string[] },
  { href: '/reader/dashboard/reviews',             label: 'Reviews',    icon: Star,            exact: false, isSubmit: false, excludePaths: [] as string[] },
  { href: '/reader/dashboard/settings',            label: 'Settings',   icon: Settings,        exact: false, isSubmit: false, excludePaths: [] as string[] },
  { href: '/reader/dashboard/billing',             label: 'Billing',    icon: CreditCard,      exact: false, isSubmit: false, excludePaths: [] as string[] },
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

export function DashboardMobileNav() {
  const pathname                  = usePathname()
  const [userType, setUserType]   = useState<'reader' | 'creator'>('reader')
  const supabase                  = createClient()

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

  const items       = userType === 'creator' ? CREATOR_ITEMS : READER_ITEMS
  const activeColor = userType === 'creator' ? 'text-teal-500' : 'text-primary'
  const activeBg    = userType === 'creator' ? 'bg-teal-500 shadow-teal-500/30' : 'bg-primary shadow-primary/30'
  const submitColor = userType === 'creator' ? 'text-teal-500/80' : 'text-primary/80'
  const submitBg    = userType === 'creator' ? 'bg-teal-500/10' : 'bg-primary/10'
  const dotColor    = userType === 'creator' ? 'bg-teal-500' : 'bg-primary'

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden touch-land:flex lg:hidden bg-background/95 backdrop-blur-lg border-t border-border">
      <div className="flex overflow-x-auto no-scrollbar px-2 py-2 gap-1">
        {items.map(({ href, label, icon: Icon, exact, isSubmit, excludePaths }) => {
          const isActive = isNavItemActive(pathname, href, exact, excludePaths)

          return (
            <Link
              key={href}
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
              {isActive && (
                <span className={cn('absolute -bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full', dotColor)} />
              )}
            </Link>
          )
        })}
      </div>
      <div style={{ height: 'env(safe-area-inset-bottom, 0px)' }} />
    </nav>
  )
}