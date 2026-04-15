'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, BookOpen, Bookmark, BookMarked,
  Bell, Settings, CreditCard, Crown,
  BarChart2, Eye, Download, Trophy, Sparkles,
  Shield, Star,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ProSidebarProps {
  role: string
}

const proItems = [
  { href: '/pro/dashboard', label: 'Pro Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/pro/analytics', label: 'Analytics', icon: BarChart2 },
  { href: '/pro/profile-views', label: 'Profile Views', icon: Eye },
  { href: '/pro/export', label: 'Export Lists', icon: Download },
  { href: '/pro/leaderboard', label: 'Leaderboard', icon: Trophy },
]

const platformItems = [
  { href: '/pro/recommendations', label: 'My Comics', icon: BookOpen },
  { href: '/pro/saved', label: 'Saved Comics', icon: Bookmark },
  { href: '/pro/lists', label: 'Reading Lists', icon: BookMarked },
  { href: '/pro/reviews', label: 'My Reviews', icon: Star },
  { href: '/pro/notifications', label: 'Notifications', icon: Bell },
  { href: '/pro/settings', label: 'Settings', icon: Settings },
  { href: '/pro/billing', label: 'Billing', icon: CreditCard },
]

const adminItems = [
  { href: '/admin', label: 'Admin Panel', icon: Shield },
]

export function ProSidebar({ role }: ProSidebarProps) {
  const pathname = usePathname()
  const isAdmin = role === 'admin'

  return (
    <div className="flex flex-col gap-0.5 h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3 mb-1">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm shadow-amber-500/30">
            <Crown size={13} className="text-white" />
          </div>
          <div>
            <p className="text-xs font-black text-amber-600 leading-tight uppercase tracking-tight">Pro Hub</p>
            <p className="text-[10px] text-muted-foreground leading-tight">Premium Space</p>
          </div>
        </div>
        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full border bg-amber-500/10 text-amber-600 border-amber-500/20 capitalize">
          {isAdmin ? 'Admin' : 'Pro'}
        </span>
      </div>

      <nav className="flex flex-col gap-0.5 flex-1 overflow-y-auto">
        {/* Pro Tools */}
        {proItems.map(({ href, label, icon: Icon, exact }) => {
          const isActive = exact ? pathname === href : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-amber-500/10 text-amber-600 border border-amber-500/10'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
              )}
            >
              <div className={cn(
                'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all',
                isActive
                  ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-sm shadow-amber-500/30'
                  : 'bg-amber-500/5 group-hover:bg-amber-500/10'
              )}>
                <Icon size={14} />
              </div>
              <span className="truncate flex-1">{label}</span>
              {isActive && <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />}
            </Link>
          )
        })}

        <div className="my-3 border-t border-border/50" />

        <p className="text-[10px] font-black uppercase tracking-widest text-amber-600/60 px-3 py-1 mb-1">
          Platform
        </p>
        {platformItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-amber-500/10 text-amber-600 border border-amber-500/10'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
              )}
            >
              <div className={cn(
                'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all',
                isActive
                  ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-sm shadow-amber-500/30'
                  : 'bg-amber-500/5 group-hover:bg-amber-500/10'
              )}>
                <Icon size={14} />
              </div>
              <span className="truncate flex-1">{label}</span>
              {isActive && <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />}
            </Link>
          )
        })}

        {isAdmin && (
          <>
            <div className="my-3 border-t border-border/50" />
            <p className="text-[10px] font-black uppercase tracking-widest text-red-500/80 px-3 py-1 mb-1">
              Internal
            </p>
            {adminItems.map(({ href, label, icon: Icon }) => {
              const isActive = pathname.startsWith(href)
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                    isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
                  )}
                >
                  <div className={cn(
                    'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all',
                    isActive ? 'bg-primary text-primary-foreground' : 'bg-muted group-hover:bg-accent'
                  )}>
                    <Icon size={14} />
                  </div>
                  <span className="truncate flex-1">{label}</span>
                </Link>
              )
            })}
          </>
        )}
      </nav>

      <div className="mt-auto pt-3 border-t border-amber-500/10">
        <div className="flex items-center gap-2 px-3 py-2">
          <Sparkles size={12} className="text-amber-500/60 animate-pulse" />
          <p className="text-[10px] text-muted-foreground font-medium">
            {isAdmin ? 'System Access Active' : 'Pro Perks Active'}
          </p>
        </div>
      </div>
    </div>
  )
}