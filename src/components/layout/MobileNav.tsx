'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  House, Plus, Newspaper, BookMarked, Search, Crown, Rss,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState, useRef } from 'react'

export function MobileNav() {
  const pathname = usePathname()
  const [isLoggedIn, setIsLoggedIn]   = useState(false)
  const [isPro, setIsPro]             = useState(false)
  const [role, setRole]               = useState<string>('user')
  const [authReady, setAuthReady]     = useState(false)
  const [visible, setVisible]         = useState(true)
  const lastScrollY                   = useRef(0)
  const supabase                      = createClient()

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
          setRole(profile.role)
          setIsPro(
            profile.role === 'admin' ||
            (profile.is_pro &&
              (!profile.pro_expires_at || new Date(profile.pro_expires_at) > new Date()))
          )
        }
      }
      setAuthReady(true)
    }
    checkAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setIsLoggedIn(false)
        setIsPro(false)
        setRole('user')
      } else {
        setIsLoggedIn(true)
      }
      setAuthReady(true)
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  // Hide on scroll down, show on scroll up
  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY
      if (currentY < 60) {
        setVisible(true)
      } else if (currentY > lastScrollY.current + 4) {
        setVisible(false)
      } else if (currentY < lastScrollY.current - 4) {
        setVisible(true)
      }
      lastScrollY.current = currentY
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Don't render anything until auth state is known — prevents flash
  if (!authReady) return null

  const firstSlot = !isLoggedIn
    ? { href: '/',     label: 'Home', icon: House, exact: true  }
    : { href: '/feed', label: 'Feed', icon: Rss,   exact: false }

  const lastSlot = !isLoggedIn
    ? { href: '/pricing',         label: 'Pro',   icon: Crown,      isProItem: true }
    : { href: '/dashboard/lists', label: 'Lists', icon: BookMarked                  }

  const navItems = [
    firstSlot,
    { href: '/browse', label: 'Browse', icon: Search    },
    { href: '/dashboard/recommendations/new', label: 'Add', icon: Plus, isAdd: true },
    { href: '/news',   label: 'News',   icon: Newspaper },
    lastSlot,
  ]

  return (
    <nav className={cn(
      'fixed bottom-0 left-0 right-0 z-50 md:hidden',
      'transition-transform duration-300',
      !visible && 'translate-y-full'
    )}>
      <div className="absolute inset-0 bg-background/95 backdrop-blur-lg border-t border-border" />

      <div className="relative flex items-center justify-around px-2 h-16">
        {navItems.map((item: any) => {
          const { href, label, icon: Icon, exact, isAdd, isProItem } = item
          const isActive = exact ? pathname === href : pathname.startsWith(href)
          const target = isAdd && !isLoggedIn ? '/login' : href

          if (isAdd) {
            return (
              <Link
                key={href}
                href={target}
                className="relative flex flex-col items-center justify-center gap-1 px-2 py-2 min-w-[44px]"
              >
                <div className={cn(
                  'w-9 h-9 rounded-xl flex items-center justify-center',
                  'bg-gradient-to-br from-primary to-violet-500',
                  'shadow-md shadow-primary/30',
                  'active:scale-95 hover:shadow-primary/40 hover:scale-105',
                  'transition-all duration-200'
                )}>
                  <Icon size={18} className="text-white" strokeWidth={2.5} />
                </div>
                <span className="text-[10px] font-semibold text-muted-foreground">{label}</span>
              </Link>
            )
          }

          if (isProItem) {
            return (
              <Link
                key={href}
                href={href}
                className="relative flex flex-col items-center justify-center gap-1 px-2 py-2 min-w-[44px]"
              >
                <div className={cn(
                  'w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-150',
                  isActive ? 'bg-amber-500/20 text-amber-500' : 'text-amber-500/70 hover:bg-amber-500/10'
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

          return (
            <Link
              key={href}
              href={href}
              className="relative flex flex-col items-center justify-center gap-1 px-2 py-2 min-w-[44px]"
            >
              <div className={cn(
                'w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-150',
                isActive ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-accent/60'
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