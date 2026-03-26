'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, BarChart2, Eye,
  Download, Trophy, CreditCard,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const items = [
  { href: '/pro/dashboard',     label: 'Home',      icon: LayoutDashboard },
  { href: '/pro/analytics',     label: 'Analytics', icon: BarChart2       },
  { href: '/pro/profile-views', label: 'Views',     icon: Eye             },
  { href: '/pro/export',        label: 'Export',    icon: Download        },
  { href: '/pro/leaderboard',   label: 'Board',     icon: Trophy          },
  { href: '/pro/billing',       label: 'Billing',   icon: CreditCard      },
]

export function ProMobileNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background/95 backdrop-blur-lg border-t border-amber-500/20">
      <div className="flex overflow-x-auto no-scrollbar px-1 py-1.5">
        {items.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'relative flex flex-col items-center gap-1 px-3 py-1.5 min-w-[56px] flex-none rounded-xl transition-all duration-150',
                isActive ? 'text-amber-500' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <div className={cn(
                'w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-150',
                isActive
                  ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-sm shadow-amber-500/30'
                  : 'hover:bg-accent/60'
              )}>
                <Icon size={17} />
              </div>
              <span className={cn(
                'text-[9px] font-semibold whitespace-nowrap leading-none',
                isActive ? 'text-amber-500' : 'text-muted-foreground'
              )}>
                {label}
              </span>
              {isActive && (
                <span className="absolute -bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-amber-500" />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}