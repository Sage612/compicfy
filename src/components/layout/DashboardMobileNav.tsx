'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, BookOpen, Bookmark,
  Star, Bell, Settings, BookMarked, CreditCard, Plus,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const items = [
  { href: '/dashboard',                     label: 'Home',    icon: LayoutDashboard, exact: true,  isSubmit: false },
  { href: '/dashboard/recommendations/new', label: 'Submit',  icon: Plus,            exact: true,  isSubmit: true  },
  { href: '/dashboard/recommendations',     label: 'My Recs', icon: BookOpen,        exact: false, isSubmit: false },
  { href: '/dashboard/saved',               label: 'Saved',   icon: Bookmark,        exact: false, isSubmit: false },
  { href: '/dashboard/lists',               label: 'Lists',   icon: BookMarked,      exact: false, isSubmit: false },
  { href: '/dashboard/notifications',       label: 'Alerts',  icon: Bell,            exact: false, isSubmit: false },
  { href: '/dashboard/reviews',             label: 'Reviews', icon: Star,            exact: false, isSubmit: false },
  { href: '/dashboard/settings',            label: 'Settings', icon: Settings,       exact: false, isSubmit: false },
  { href: '/dashboard/billing',             label: 'Billing', icon: CreditCard,      exact: false, isSubmit: false },
]

export function DashboardMobileNav() {
  const pathname = usePathname()

  return (
    /* Show on mobile portrait + landscape touch devices, hide on lg+ */
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden touch-land:flex lg:hidden bg-background/95 backdrop-blur-lg border-t border-border">
      <div className="flex overflow-x-auto no-scrollbar px-2 py-2 gap-1">
        {items.map(({ href, label, icon: Icon, exact, isSubmit }) => {
          const isActive = exact ? pathname === href : pathname.startsWith(href)

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'relative flex flex-col items-center gap-1 px-3 py-1.5 min-w-[56px] flex-none rounded-xl transition-all duration-150',
                isActive
                  ? 'text-primary'
                  : isSubmit
                  ? 'text-primary/80 hover:text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <div className={cn(
                'w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-150',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/30'
                  : isSubmit
                  ? 'bg-primary/10 hover:bg-primary/20'
                  : 'hover:bg-accent/60'
              )}>
                <Icon size={17} />
              </div>
              <span className={cn(
                'text-[9px] font-semibold whitespace-nowrap leading-none',
                isActive ? 'text-primary' : isSubmit ? 'text-primary/80' : 'text-muted-foreground'
              )}>
                {label}
              </span>
              {isActive && (
                <span className="absolute -bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
              )}
            </Link>
          )
        })}
      </div>
      <div style={{ height: 'env(safe-area-inset-bottom, 0px)' }} />
    </nav>
  )
}