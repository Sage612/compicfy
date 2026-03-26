'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  House, Compass, Plus, Newspaper, BookMarked, Search, Crown
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

const navItems = [
  { href: '/',                              label: 'Home',    icon: House,     exact: true   },
  { href: '/browse',                        label: 'Browse',  icon: Search                   },
  { href: '/dashboard/recommendations/new', label: 'Add',     icon: Plus,      isAdd: true   },
  { href: '/news',                          label: 'News',    icon: Newspaper                },
  { href: '/dashboard/lists',               label: 'Lists',   icon: BookMarked, authOnly: true },
  { href: '/pricing',                       label: 'Pro',     icon: Crown,      guestOnly: true },
]

export function MobileNav() {
  const pathname = usePathname()
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isPro, setIsPro] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setIsLoggedIn(!!user)

      if (user) {
        const { data: profile } = await (supabase as any)
          .from('profiles')
          .select('is_pro, pro_expires_at, role')
          .eq('id', user.id)
          .single()

        if (profile) {
          setIsAdmin(['admin', 'moderator'].includes(profile.role))
          setIsPro(
            profile.is_pro &&
            (!profile.pro_expires_at || new Date(profile.pro_expires_at) > new Date())
          )
        }
      }
    }
    checkAuth()
  }, [])

  const visibleItems = navItems.filter(item => {
    // authOnly — only show when logged in
    if (item.authOnly) return isLoggedIn
    // guestOnly — show when logged out OR logged in but not pro and not admin
    if ((item as any).guestOnly) return !isLoggedIn || (!isPro && !isAdmin)
    return true
  })

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-background/95 backdrop-blur-lg border-t border-border" />

      <div className="relative flex items-center justify-around px-2 h-16">
        {visibleItems.map(({ href, label, icon: Icon, exact, isAdd, authOnly, ...rest }) => {
          const isActive = exact ? pathname === href : pathname.startsWith(href)
          const isGuestOnly = (rest as any).guestOnly
          const target = (isAdd || authOnly) && !isLoggedIn ? '/login' : href
          const isPricingItem = href === '/pricing'

          // ── Add button ──────────────────────────────────────────────────
          if (isAdd) {
            return (
              <Link
                key={href}
                href={target}
                className="flex flex-col items-center justify-center gap-1 -mt-5"
              >
                <div className={cn(
                  'w-12 h-12 rounded-2xl flex items-center justify-center',
                  'bg-gradient-to-br from-primary to-violet-500',
                  'shadow-lg shadow-primary/30',
                  'active:scale-95 hover:shadow-primary/40 hover:scale-105',
                  'transition-all duration-200'
                )}>
                  <Icon size={20} className="text-white" strokeWidth={2.5} />
                </div>
                <span className="text-[10px] font-semibold text-muted-foreground">{label}</span>
              </Link>
            )
          }

          // ── Pro / Pricing button ────────────────────────────────────────
          if (isPricingItem) {
            return (
              <Link
                key={href}
                href={href}
                className="relative flex flex-col items-center justify-center gap-1 px-2 py-2 min-w-[44px]"
              >
                <div className={cn(
                  'w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-150',
                  isActive
                    ? 'bg-amber-500/20 text-amber-500'
                    : 'text-amber-500/70 hover:bg-amber-500/10'
                )}>
                  <Icon size={18} strokeWidth={isActive ? 2.5 : 1.75} />
                </div>
                <span className={cn(
                  'text-[10px] font-semibold leading-none',
                  isActive ? 'text-amber-500' : 'text-amber-500/70'
                )}>
                  {label}
                </span>
                {isActive && (
                  <span className="absolute -bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-amber-500" />
                )}
              </Link>
            )
          }

          // ── Regular nav items ───────────────────────────────────────────
          return (
            <Link
              key={href}
              href={target}
              className="relative flex flex-col items-center justify-center gap-1 px-2 py-2 min-w-[44px]"
            >
              <div className={cn(
                'w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-150',
                isActive
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground hover:bg-accent/60'
              )}>
                <Icon size={18} strokeWidth={isActive ? 2.5 : 1.75} />
              </div>

              <span className={cn(
                'text-[10px] font-semibold leading-none',
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

      <div className="h-safe-bottom bg-background/95" />
    </nav>
  )
}