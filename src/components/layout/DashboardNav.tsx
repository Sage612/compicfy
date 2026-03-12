'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, BookOpen, Bookmark,
  Star, Bell, Settings, BookMarked,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard',                  label: 'Overview',          icon: LayoutDashboard, exact: true },
  { href: '/dashboard/recommendations',  label: 'My Recommendations', icon: BookOpen         },
  { href: '/dashboard/saved',            label: 'Saved Comics',       icon: Bookmark         },
  { href: '/dashboard/lists',            label: 'Reading Lists',      icon: BookMarked       },
  { href: '/dashboard/reviews',          label: 'My Reviews',         icon: Star             },
  { href: '/dashboard/notifications',    label: 'Notifications',      icon: Bell             },
  { href: '/dashboard/settings',         label: 'Settings',           icon: Settings         },
]

export function DashboardNav() {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col gap-0.5">
      {navItems.map(({ href, label, icon: Icon, exact }) => {
        const isActive = exact ? pathname === href : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
              isActive
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
            )}
          >
            <div className={cn(
              'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all',
              isActive
                ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/30'
                : 'bg-muted group-hover:bg-accent'
            )}>
              <Icon size={14} />
            </div>
            <span className="truncate">{label}</span>
            {isActive && (
              <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
            )}
          </Link>
        )
      })}
    </nav>
  )
}