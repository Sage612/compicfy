'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  House, BookOpen, ScrollText, BookMarked, Radar, Crown, LayoutList
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState, useRef } from 'react'
import { AuthPromptModal } from '@/components/ui/auth-prompt-modal'

export function MobileNav() {
  const pathname                        = usePathname()
  const [isLoggedIn, setIsLoggedIn]     = useState(false)
  const [isPro, setIsPro]               = useState(false)
  const [authReady, setAuthReady]       = useState(false)
  const [visible, setVisible]           = useState(true)
  const [showAuthPrompt, setShowAuthPrompt] = useState(false)
  const lastScrollY                     = useRef(0)
  const supabase                        = createClient()

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
      } else {
        setIsLoggedIn(true)
      }
      setAuthReady(true)
    })

    return () => subscription.unsubscribe()
  }, [supabase])

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

  // ── Slot definitions ─────────────────────────────────────────────

  const firstSlot = !isLoggedIn
    ? { href: '/',     label: 'Home', icon: House,      exact: true,  isRec: false, isProItem: false }
    : { href: '/feed', label: 'Feed', icon: LayoutList, exact: false, isRec: false, isProItem: false }

  const recSlot = {
    href:  isPro ? '/pro/recommendations/new' : '/dashboard/recommendations/new',
    label: 'Rec',
    icon:  BookOpen,
    isRec: true,
    isProItem: false,
    exact: false,
  }

  const lastSlot = !isLoggedIn
    ? { href: '/pricing',                                label: 'Go Pro', icon: Crown,      isProItem: true,  isRec: false, exact: false }
    : { href: isPro ? '/pro/lists' : '/dashboard/lists', label: 'Lists',  icon: BookMarked, isProItem: false, isRec: false, exact: false }

  const navItems = [
    firstSlot,
    { href: '/browse', label: 'Browse', icon: Radar,      isRec: false, isProItem: false, exact: false },
    recSlot,
    { href: '/news',   label: 'News',   icon: ScrollText, isRec: false, isProItem: false, exact: false },
    lastSlot,
  ]

  if (!authReady) {
    return (
      <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">
        <div className="absolute inset-0 bg-background/95 backdrop-blur-lg border-t border-border" />
        <div className="relative flex items-center justify-around px-1 h-16">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center justify-center gap-1.5 px-2 py-2 min-w-[44px]">
              <div className="w-10 h-10 rounded-xl bg-muted/50 animate-pulse" />
              <div className="w-8 h-2 rounded bg-muted/40 animate-pulse" />
            </div>
          ))}
        </div>
        <div className="bg-background/95" style={{ height: 'env(safe-area-inset-bottom, 0px)' }} />
      </nav>
    )
  }

  return (
    <>
      <AuthPromptModal
        open={showAuthPrompt}
        onClose={() => setShowAuthPrompt(false)}
        config={{
          action: 'share a recommendation',
          icon: <BookOpen size={24} className="text-primary" />,
        }}
      />

      <nav className={cn(
        'fixed bottom-0 left-0 right-0 z-50 lg:hidden',
        'transition-transform duration-300 ease-in-out',
        !visible && 'translate-y-full'
      )}>
        <div className="absolute inset-0 bg-background/95 backdrop-blur-lg border-t border-border" />

        <div className="relative flex items-center justify-around px-1 h-16">
          {navItems.map((item) => {
            const { href, label, icon: Icon, exact, isRec, isProItem } = item
            const isActive = exact ? pathname === href : pathname.startsWith(href)

            /* ── Centre Recommend button ── */
            if (isRec) {
              // Guest → show auth modal instead of hard redirect
              if (!isLoggedIn) {
                return (
                  <button
                    key="rec-guest"
                    onClick={() => setShowAuthPrompt(true)}
                    className="relative flex flex-col items-center justify-center gap-1 px-2 py-2 min-w-[44px] active:scale-95 transition-transform duration-100"
                  >
                    <div className={cn(
                      'w-11 h-11 rounded-2xl flex items-center justify-center',
                      'bg-gradient-to-br from-primary to-violet-500',
                      'shadow-lg shadow-primary/30',
                      'active:opacity-80 hover:opacity-90',
                      'transition-all duration-200 ease-out'
                    )}>
                      <Icon size={20} className="text-white" strokeWidth={2.5} />
                    </div>
                    <span className="text-[10px] font-bold text-primary leading-none">{label}</span>
                  </button>
                )
              }

              // Logged in → normal link
              return (
                <Link
                  key={href}
                  href={href}
                  className="relative flex flex-col items-center justify-center gap-1 px-2 py-2 min-w-[44px] active:scale-95 transition-transform duration-100"
                >
                  <div className={cn(
                    'w-11 h-11 rounded-2xl flex items-center justify-center',
                    'bg-gradient-to-br from-primary to-violet-500',
                    'shadow-lg shadow-primary/30',
                    'active:opacity-80 hover:opacity-90',
                    'transition-all duration-200 ease-out'
                  )}>
                    <Icon size={20} className="text-white" strokeWidth={2.5} />
                  </div>
                  <span className="text-[10px] font-bold text-primary leading-none">{label}</span>
                </Link>
              )
            }

            /* ── Go Pro item (visitors only) ── */
            if (isProItem) {
              return (
                <Link
                  key={href}
                  href={href}
                  className="relative flex flex-col items-center justify-center gap-1 px-2 py-2 min-w-[44px] active:scale-95 transition-transform duration-100"
                >
                  <div className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200',
                    isActive
                      ? 'bg-amber-500/20 text-amber-500 scale-110'
                      : 'text-amber-500/70 hover:bg-amber-500/10'
                  )}>
                    <Icon size={19} strokeWidth={isActive ? 2.5 : 1.75} />
                  </div>
                  <span className={cn(
                    'text-[10px] font-semibold leading-none transition-colors duration-150',
                    isActive ? 'text-amber-500' : 'text-amber-500/70'
                  )}>
                    {label}
                  </span>
                  {isActive && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full bg-amber-500" />
                  )}
                </Link>
              )
            }

            /* ── Regular nav items ── */
            return (
              <Link
                key={href}
                href={href}
                className="relative flex flex-col items-center justify-center gap-1 px-2 py-2 min-w-[44px] active:scale-95 transition-transform duration-100"
              >
                <div className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200',
                  isActive
                    ? 'bg-primary/15 text-primary scale-110'
                    : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
                )}>
                  <Icon size={19} strokeWidth={isActive ? 2.5 : 1.75} />
                </div>
                <span className={cn(
                  'text-[10px] font-semibold leading-none transition-colors duration-150',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )}>
                  {label}
                </span>
                {isActive && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full bg-primary" />
                )}
              </Link>
            )
          })}
        </div>

        <div className="bg-background/95" style={{ height: 'env(safe-area-inset-bottom, 0px)' }} />
      </nav>
    </>
  )
}