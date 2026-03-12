'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, BookOpen, Bookmark,
  Star, Bell, Settings, BookMarked,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const items = [
  { href: '/dashboard',                 label: 'Home',     icon: LayoutDashboard, exact: true },
  { href: '/dashboard/recommendations', label: 'My Recs',  icon: BookOpen         },
  { href: '/dashboard/saved',           label: 'Saved',    icon: Bookmark         },
  { href: '/dashboard/lists',           label: 'Lists',    icon: BookMarked       },
  { href: '/dashboard/notifications',   label: 'Alerts',   icon: Bell             },
  { href: '/dashboard/reviews',         label: 'Reviews',  icon: Star             },
  { href: '/dashboard/settings',        label: 'Settings', icon: Settings         },
]

export function DashboardMobileNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background/95 backdrop-blur-md border-t border-border">
      <div className="flex overflow-x-auto no-scrollbar px-1 py-1">
        {items.map(({ href, label, icon: Icon, exact }) => {
          const isActive = exact ? pathname === href : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center gap-1 px-3 py-2 min-w-[56px] flex-none rounded-xl transition-all duration-150',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <div className={cn(
                'w-8 h-8 rounded-xl flex items-center justify-center transition-all',
                isActive ? 'bg-primary/10' : 'bg-transparent'
              )}>
                <Icon size={17} />
              </div>
              <span className={cn(
                'text-[9px] font-semibold whitespace-nowrap',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}