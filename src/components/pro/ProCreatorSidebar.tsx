'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Crown, BookOpen, Users, Link as LinkIcon,
  Bell, Settings, CreditCard, BarChart2, LayoutDashboard,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/pro/creator/dashboard',               label: 'Dashboard',     icon: LayoutDashboard, exact: true  },
  { href: '/pro/creator/dashboard/works',         label: 'My Works',      icon: BookOpen,        exact: false },
  { href: '/pro/creator/dashboard/audience',      label: 'Audience',      icon: Users,           exact: false },
  { href: '/pro/creator/dashboard/analytics',     label: 'Analytics',     icon: BarChart2,       exact: false },
  { href: '/pro/creator/dashboard/links',         label: 'My Links',      icon: LinkIcon,        exact: false },
  { href: '/pro/creator/dashboard/notifications', label: 'Notifications', icon: Bell,            exact: false },
  { href: '/pro/creator/dashboard/settings',      label: 'Settings',      icon: Settings,        exact: false },
  { href: '/pro/creator/dashboard/billing',       label: 'Billing',       icon: CreditCard,      exact: false },
]

export function ProCreatorSidebar() {
  const pathname = usePathname()
  return (
    <aside className="dashboard-sidebar flex-col w-56 shrink-0 border-r border-border p-3 gap-1">
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
        {NAV.map(({ href, label, icon: Icon, exact }) => {
          const isActive = exact ? pathname === href : pathname.startsWith(href)
          return (
            <Link key={href} href={href} className={cn(
              'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              isActive
                ? 'bg-teal-500/10 text-teal-600 font-semibold'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            )}>
              <Icon size={15} className={cn('shrink-0', isActive ? 'text-teal-500' : 'text-muted-foreground')} />
              {label}
            </Link>
          )
        })}
      </div>
    </aside>
  )
}