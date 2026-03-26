'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, BarChart2, Eye, Download,
  Palette, Trophy, CreditCard, Crown, Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/pro/dashboard',      label: 'Pro Dashboard',   icon: LayoutDashboard },
  { href: '/pro/analytics',      label: 'Analytics',       icon: BarChart2       },
  { href: '/pro/profile-views',  label: 'Profile Views',   icon: Eye             },
  { href: '/pro/export',         label: 'Export Lists',    icon: Download        },
  { href: '/pro/themes',         label: 'Profile Themes',  icon: Palette         },
  { href: '/pro/leaderboard',    label: 'Leaderboard',     icon: Trophy          },
  { href: '/pro/billing',        label: 'Billing',         icon: CreditCard      },
]

export function ProSidebar() {
  const pathname = usePathname()

  return (
    <div className="flex flex-col gap-0.5 h-full">
      {/* Pro header */}
      <div className="flex items-center gap-2.5 px-3 py-3 mb-1">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm shadow-amber-500/30">
          <Crown size={13} className="text-white" />
        </div>
        <div>
          <p className="text-xs font-black text-amber-600 leading-tight">Pro Hub</p>
          <p className="text-[10px] text-muted-foreground leading-tight">Your premium space</p>
        </div>
      </div>

      <nav className="flex flex-col gap-0.5 flex-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
              )}
            >
              <div className={cn(
                'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all',
                isActive
                  ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-sm shadow-amber-500/30'
                  : 'bg-muted group-hover:bg-accent'
              )}>
                <Icon size={14} />
              </div>
              <span className="truncate flex-1">{label}</span>
              {isActive && (
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Bottom sparkle */}
      <div className="mt-auto pt-3 border-t border-amber-500/10">
        <div className="flex items-center gap-2 px-3 py-2">
          <Sparkles size={12} className="text-amber-500/60" />
          <p className="text-[10px] text-muted-foreground">
            Pro perks active
          </p>
        </div>
      </div>
    </div>
  )
}