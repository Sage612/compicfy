'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Search, Plus, Newspaper, Bell } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

const navItems = [
  { href: '/',                               label: 'Home',   icon: Home,      exact: true               },
  { href: '/browse',                         label: 'Browse', icon: Search                               },
  { href: '/dashboard/recommendations/new',  label: 'Add',    icon: Plus,      isAdd: true               },
  { href: '/news',                           label: 'News',   icon: Newspaper                            },
  { href: '/dashboard/notifications',        label: 'Alerts', icon: Bell,      authOnly: true            },
]

export function MobileNav() {
  const pathname = usePathname()
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setIsLoggedIn(!!user)

      if (user) {
        const { count } = await supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('is_read', false)
        setUnreadCount(count ?? 0)
      }
    }
    checkAuth()
  }, [])

  const visibleItems = navItems.filter(item => !item.authOnly || isLoggedIn)

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-background/95 backdrop-blur-lg border-t border-border" />

      <div className="relative flex items-center justify-around px-3 h-16">
        {visibleItems.map(({ href, label, icon: Icon, exact, isAdd, authOnly }) => {
          const isActive = exact ? pathname === href : pathname.startsWith(href)
          const target = (isAdd || authOnly) && !isLoggedIn ? '/login' : href

          // ── Add button — elevated pill in the center ──────────────────────
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

          // ── Regular nav items ─────────────────────────────────────────────
          return (
            <Link
              key={href}
              href={target}
              className="relative flex flex-col items-center justify-center gap-1 px-3 py-2 min-w-[48px]"
            >
              <div className={cn(
                'w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-150',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/30'
                  : 'text-muted-foreground hover:bg-accent/60'
              )}>
                <Icon size={18} />

                {/* Unread badge */}
                {label === 'Alerts' && unreadCount > 0 && (
                  <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-black flex items-center justify-center leading-none">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>

              <span className={cn(
                'text-[10px] font-semibold leading-none',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}>
                {label}
              </span>

              {/* Active dot indicator */}
              {isActive && (
                <span className="absolute -bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
              )}
            </Link>
          )
        })}
      </div>

      {/* Safe area spacing for phones with home indicator */}
      <div className="h-safe-bottom bg-background/95" />
    </nav>
  )
}