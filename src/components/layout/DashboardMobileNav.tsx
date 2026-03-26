'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, BookOpen, Bookmark,
  Star, Bell, Settings, BookMarked, CreditCard,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const items = [
  { href: '/dashboard',                 label: 'Home',     icon: LayoutDashboard, exact: true },
  { href: '/dashboard/recommendations', label: 'My Recs',  icon: BookOpen                     },
  { href: '/dashboard/saved',           label: 'Saved',    icon: Bookmark                     },
  { href: '/dashboard/lists',           label: 'Lists',    icon: BookMarked                   },
  { href: '/dashboard/notifications',   label: 'Alerts',   icon: Bell                         },
  { href: '/dashboard/reviews',         label: 'Reviews',  icon: Star                         },
  { href: '/dashboard/settings',        label: 'Settings', icon: Settings                     },
  { href: '/dashboard/billing',         label: 'Billing',  icon: CreditCard                   },
]

export function DashboardMobileNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background/95 backdrop-blur-lg border-t border-border">
      <div className="flex overflow-x-auto no-scrollbar px-1 py-1.5">
        {items.map(({ href, label, icon: Icon, exact }) => {
          const isActive = exact ? pathname === href : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'relative flex flex-col items-center gap-1 px-3 py-1.5 min-w-[56px] flex-none rounded-xl transition-all duration-150',
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <div className={cn(
                'w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-150',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/30'
                  : 'hover:bg-accent/60'
              )}>
                <Icon size={17} />
              </div>
              <span className={cn(
                'text-[9px] font-semibold whitespace-nowrap leading-none',
                isActive ? 'text-primary' : 'text-muted-foreground'
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
    </nav>
  )
}