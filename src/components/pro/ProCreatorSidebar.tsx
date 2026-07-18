'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Crown, BookOpen, Users, Link as LinkIcon, Plus,
  Bell, Settings, CreditCard, BarChart2, LayoutDashboard,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/pro/creator/dashboard',               label: 'Dashboard',     icon: LayoutDashboard, exact: true,  isSubmit: false, excludePaths: [] as string[] },
  { href: '/pro/creator/dashboard/works/new',     label: 'Add Work',      icon: Plus,            exact: true,  isSubmit: true,  excludePaths: [] as string[] },
  { href: '/pro/creator/dashboard/works',         label: 'My Works',      icon: BookOpen,        exact: false, isSubmit: false, excludePaths: ['/pro/creator/dashboard/works/new'] },
  { href: '/pro/creator/dashboard/audience',      label: 'Audience',      icon: Users,           exact: false, isSubmit: false, excludePaths: [] as string[] },
  { href: '/pro/creator/dashboard/analytics',     label: 'Analytics',     icon: BarChart2,       exact: false, isSubmit: false, excludePaths: [] as string[] },
  { href: '/pro/creator/dashboard/links',         label: 'My Links',      icon: LinkIcon,        exact: false, isSubmit: false, excludePaths: [] as string[] },
  { href: '/pro/creator/dashboard/notifications', label: 'Notifications', icon: Bell,            exact: false, isSubmit: false, excludePaths: [] as string[] },
  { href: '/pro/creator/dashboard/settings',      label: 'Settings',      icon: Settings,        exact: false, isSubmit: false, excludePaths: [] as string[] },
  { href: '/pro/creator/dashboard/billing',       label: 'Billing',       icon: CreditCard,      exact: false, isSubmit: false, excludePaths: [] as string[] },
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

export function ProCreatorSidebar() {
  const pathname = usePathname()
  return (
    <div className="flex flex-col gap-1 w-full">
      {/* Identity pill */}
      <div className="flex items-center gap-2 px-3 py-2 mb-2 rounded-xl bg-gradient-to-r from-teal-500/15 to-cyan-500/10 border border-teal-500/20">
        <div className="w-5 h-5 rounded-md bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center shrink-0">
          <Crown size={11} className="text-white" />
        </div>
        <span className="text-xs font-black bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
          Pro Creator
        </span>
      </div>
      <div className="flex-1 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon, exact, isSubmit, excludePaths }) => {
          const isActive = isNavItemActive(pathname, href, exact, excludePaths)
          return (
            <Link key={href} href={href} className={cn(
              'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              isSubmit && !isActive
                ? 'text-teal-600 hover:bg-teal-500/10'
                : isActive
                ? 'bg-teal-500/10 text-teal-600 font-semibold'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            )}>
              <Icon size={15} className={cn('shrink-0', (isActive || isSubmit) ? 'text-teal-500' : 'text-muted-foreground')} />
              {label}
            </Link>
          )
        })}
      </div>
    </div>
  )
}