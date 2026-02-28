'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Search, PlusCircle, Newspaper, Bell } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

const navItems = [
  { href: '/', label: 'Home', icon: Home, exact: true },
  { href: '/browse', label: 'Browse', icon: Search },
  { href: '/dashboard/recommendations/new', label: 'Add', icon: PlusCircle, isAdd: true },
  { href: '/news', label: 'News', icon: Newspaper },
  { href: '/dashboard/notifications', label: 'Alerts', icon: Bell, authOnly: true },
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
      {/* Blur backdrop */}
      <div className="absolute inset-0 bg-background/95 backdrop-blur-md border-t border-border" />

      <div className="relative flex items-center justify-around px-2 h-16">
        {visibleItems.map(({ href, label, icon: Icon, exact, isAdd, authOnly }) => {
          const isActive = exact ? pathname === href : pathname.startsWith(href)

          if (isAdd) {
            return (
              <Link
                key={href}
                href={isLoggedIn ? href : '/login'}
                className="flex flex-col items-center justify-center -mt-5"
              >
                <div className={cn(
                  'w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95',
                  'bg-primary text-primary-foreground shadow-primary/30'
                )}>
                  <Icon size={22} />
                </div>
                <span className="text-[10px] text-muted-foreground mt-1">{label}</span>
              </Link>
            )
          }

          return (
            <Link
              key={href}
              href={authOnly && !isLoggedIn ? '/login' : href}
              className="flex flex-col items-center justify-center gap-0.5 px-3 py-2 min-w-[48px] relative"
            >
              <div className={cn(
                'w-8 h-8 rounded-xl flex items-center justify-center transition-colors',
                isActive ? 'bg-primary/10' : 'hover:bg-accent'
              )}>
                <Icon
                  size={20}
                  className={isActive ? 'text-primary' : 'text-muted-foreground'}
                />
                {/* Unread badge */}
                {label === 'Alerts' && unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
              <span className={cn(
                'text-[10px] font-medium',
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