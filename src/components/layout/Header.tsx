'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from 'next-themes'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sun, Moon, Monitor, Radar, ScrollText,
  LayoutDashboard, Settings, LogOut, BookOpen,
  User as UserIcon, Bell,
  ShoppingBag, Crown, CreditCard, Sparkles, LayoutList, BookMarked,
} from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { GlobalSearch } from '@/components/layout/GlobalSearch'
import { NotificationBell } from '@/components/user/NotificationBell'

// ── Fixed: uses fill-primary-foreground with opacity variants
// so the logo adapts to both light and dark themes,
// matching the footer logo behaviour exactly.
function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <rect x="3"   y="18"    width="22"  height="5.5" rx="1.5" className="fill-primary-foreground/25" />
      <rect x="3"   y="18"    width="10"  height="5.5" rx="1.5" className="fill-primary-foreground/55" />
      <rect x="4.5" y="11.5"  width="19"  height="5.5" rx="1.5" className="fill-primary-foreground/45" />
      <rect x="4.5" y="11.5"  width="9"   height="5.5" rx="1.5" className="fill-primary-foreground/75" />
      <rect x="6"   y="5"     width="16"  height="5.5" rx="1.5" className="fill-primary-foreground"    />
      <rect x="6"   y="5"     width="7.5" height="5.5" rx="1.5" className="fill-primary-foreground/65" />
    </svg>
  )
}

export function Header() {
  const pathname = usePathname()
  const router   = useRouter()
  const { theme, setTheme } = useTheme()

  const [mounted, setMounted]         = useState(false)
  const [user, setUser]               = useState<User | null>(null)
  const [avatarUrl, setAvatarUrl]     = useState<string | null>(null)
  const [displayName, setDisplayName] = useState<string | null>(null)
  const [username, setUsername]       = useState<string | null>(null)
  const [visible, setVisible]         = useState(true)
  const [isPro, setIsPro]             = useState(false)
  const [role, setRole]               = useState<string>('user')
  const [authReady, setAuthReady]     = useState(false)
  const lastScrollY                   = useRef(0)
  const supabase                      = createClient()
  const [showPro, setShowPro]         = useState<null | boolean>(null)

  useEffect(() => setMounted(true), [])

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

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        router.push('/search')
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [router])

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const currentUser = session?.user ?? null
      setUser(currentUser)

      if (currentUser) {
        const { data: profile } = await (supabase as any)
          .from('profiles')
          .select('avatar_url, display_name, username, is_pro, pro_expires_at, role')
          .eq('id', currentUser.id)
          .single()

        if (profile) {
          setAvatarUrl(profile.avatar_url)
          setDisplayName(profile.display_name || profile.username)
          setUsername(profile.username)
          setRole(profile.role)

          const proActive =
            profile.role === 'admin' ||
            (profile.is_pro &&
              (!profile.pro_expires_at || new Date(profile.pro_expires_at) > new Date()))

          setIsPro(proActive)
          setShowPro(proActive || profile.role === 'admin' ? false : true)
        } else {
          setShowPro(true)
        }
      } else {
        setShowPro(true)
      }

      setAuthReady(true)
    }
    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (!session?.user) {
        setAvatarUrl(null)
        setDisplayName(null)
        setUsername(null)
        setIsPro(false)
        setRole('user')
        setShowPro(true)
      }
      setAuthReady(true)
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    toast.success('Signed out')
    router.push('/')
    router.refresh()
  }

  const dashboardHref     = isPro ? '/pro/dashboard'           : '/dashboard'
  const listsHref         = isPro ? '/pro/lists'               : '/dashboard/lists'
  const billingHref       = isPro ? '/pro/billing'             : '/dashboard/billing'
  const settingsHref      = isPro ? '/pro/settings'            : '/dashboard/settings'
  const notificationsHref = isPro ? '/pro/notifications'       : '/dashboard/notifications'
  const recommendHref     = isPro ? '/pro/recommendations/new' : '/dashboard/recommendations/new'
  const dashboardLabel    = isPro ? ' Dashboard'               : 'Dashboard'
  const billingLabel      = isPro ? ' Billing'                 : 'Billing'
  const listsLabel        = isPro ? ' Lists'                   : 'Lists'

  const publicNavLinks = [
    { href: '/browse',    label: 'Browse', icon: Radar       },
    { href: '/news',      label: 'News',   icon: ScrollText  },
    { href: '/affiliate', label: 'Shop',   icon: ShoppingBag },
  ]

  const authNavLinks = [
    { href: '/feed',   label: 'Feed',    icon: LayoutList },
    { href: listsHref, label: listsLabel, icon: BookMarked },
  ]

  const themeOptions = [
    { value: 'light',  label: 'Light',  icon: Sun     },
    { value: 'dark',   label: 'Dark',   icon: Moon    },
    { value: 'system', label: 'System', icon: Monitor },
  ] as const

  const initials = displayName
    ? displayName.slice(0, 2).toUpperCase()
    : user?.email?.slice(0, 2).toUpperCase() ?? 'U'

  const allNavLinks = [
    ...publicNavLinks,
    ...(authReady && user ? authNavLinks : []),
  ]

  return (
    <>
      {/* ── MOBILE HEADER ── */}
      <header className={cn(
        'fixed top-0 left-0 right-0 z-50 lg:hidden px-3 pt-3',
        'transition-transform duration-300',
        !visible && '-translate-y-full'
      )}>
        <div className={cn(
          'flex items-center justify-between gap-3 h-12 px-4',
          'bg-background/90 backdrop-blur-md',
          'border border-border/60',
          'rounded-full shadow-lg shadow-black/10',
        )}>

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center shrink-0">
              <LogoMark className="w-3.5 h-3.5" />
            </div>
            <span className="font-black text-[13px] tracking-tight leading-none">
              Compic<span className="text-primary">fy</span>
            </span>
          </Link>

          {/* Right side */}
          <div className="flex items-center gap-1">
            <GlobalSearch />

            {!authReady ? (
              <div className="flex items-center gap-1">
                <div className="h-6 w-10 rounded-full bg-muted/50 animate-pulse" />
                <div className="h-6 w-12 rounded-full bg-muted/50 animate-pulse" />
              </div>
            ) : !user ? (
              <div className="flex items-center gap-1">
                <Link href="/login">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-3 text-xs font-medium text-muted-foreground hover:text-foreground rounded-full"
                  >
                    Log in
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button
                    size="sm"
                    className="h-7 px-3 text-xs font-semibold bg-primary hover:bg-primary/90 border-0 rounded-full"
                  >
                    Sign up
                  </Button>
                </Link>
              </div>
            ) : (
              <NotificationBell userId={user.id} />
            )}
          </div>
        </div>
      </header>

      {/* ── DESKTOP HEADER ── */}
      <header className={cn(
        'fixed top-0 left-0 right-0 z-50 hidden lg:flex px-6 pt-3',
        'transition-transform duration-300',
        !visible && '-translate-y-full'
      )}>
        <div className={cn(
          'w-full max-w-6xl mx-auto',
          'flex items-center justify-between gap-4 h-12 px-4',
          'bg-background/90 backdrop-blur-md',
          'border border-border/60',
          'rounded-full shadow-lg shadow-black/10',
        )}>

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0 group">
            <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center shrink-0">
              <LogoMark className="w-3.5 h-3.5" />
            </div>
            <span className="font-black text-[14px] tracking-tight leading-none">
              Compic<span className="text-primary">fy</span>
            </span>
          </Link>

          {/* Center nav */}
          <nav className="flex items-center gap-0.5">
            {allNavLinks.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href || pathname.startsWith(href + '/')
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'relative flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-full transition-all duration-150',
                    isActive
                      ? 'text-foreground bg-primary/10'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                  )}
                >
                  {isActive && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-3 h-px bg-primary rounded-full" />
                  )}
                  <Icon size={13} strokeWidth={isActive ? 2.5 : 1.75} />
                  {label}
                </Link>
              )
            })}

            {/* Pro link */}
            {showPro === null ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 opacity-0 pointer-events-none select-none text-sm font-semibold">
                <Crown size={13} />Pro
              </span>
            ) : showPro === true ? (
              <Link
                href="/pricing"
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-full transition-all duration-150',
                  pathname === '/pricing'
                    ? 'bg-amber-500/15 text-amber-600'
                    : 'text-amber-500 hover:bg-amber-500/10'
                )}
              >
                <Crown size={13} className="fill-amber-500 shrink-0" />
                Pro
              </Link>
            ) : null}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-1">
            <GlobalSearch />

            {/* Theme toggle */}
            {mounted && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground rounded-full"
                    aria-label="Toggle theme"
                  >
                    {theme === 'light'
                      ? <Sun size={14} />
                      : theme === 'dark'
                      ? <Moon size={14} />
                      : <Monitor size={14} />
                    }
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-32 rounded-xl p-1">
                  {themeOptions.map(({ value, label, icon: Icon }) => (
                    <DropdownMenuItem
                      key={value}
                      onClick={() => setTheme(value)}
                      className={cn(
                        'gap-2 cursor-pointer rounded-lg text-sm',
                        theme === value && 'text-primary font-medium'
                      )}
                    >
                      <Icon size={13} />
                      {label}
                      {theme === value && (
                        <span className="ml-auto text-primary text-xs">✓</span>
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Auth area */}
            {!authReady ? (
              <div className="flex items-center gap-1.5">
                <div className="h-7 w-14 rounded-full bg-muted/50 animate-pulse hidden sm:block" />
                <div className="h-7 w-16 rounded-full bg-muted/50 animate-pulse" />
              </div>
            ) : !user ? (
              <div className="flex items-center gap-1.5 ml-1">
                <Link href="/login">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-sm font-medium text-muted-foreground hover:text-foreground rounded-full"
                  >
                    Log in
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button
                    size="sm"
                    className="h-8 px-4 text-sm font-semibold bg-primary hover:bg-primary/90 border-0 rounded-full"
                  >
                    Sign up
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-1 ml-1">

                {/* Rec a comic button */}
                <Link href={recommendHref}>
                  <Button
                    size="sm"
                    className="h-8 px-3 gap-1.5 text-sm font-semibold bg-primary hover:bg-primary/90 border-0 rounded-full"
                  >
                    <BookOpen size={13} strokeWidth={2.5} />
                    Rec a comic
                  </Button>
                </Link>

                <NotificationBell userId={user.id} />

                {/* Avatar dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="ml-0.5 rounded-full ring-2 ring-transparent hover:ring-primary/30 focus-visible:ring-primary/30 transition-all outline-none">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={avatarUrl ?? undefined} alt={displayName ?? 'User'} />
                        <AvatarFallback className="text-xs font-black bg-primary text-primary-foreground">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align="end" className="w-52 rounded-xl p-1">
                    <div className="px-2 py-2 border-b border-border mb-1">
                      <p className="font-bold text-sm truncate leading-tight">
                        {displayName ?? 'User'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate leading-tight mt-0.5">
                        {user.email}
                      </p>
                    </div>

                    {username && (
                      <DropdownMenuItem asChild className="cursor-pointer gap-2 rounded-lg text-sm">
                        <Link href={`/profile/${username}`}>
                          <UserIcon size={13} className="text-muted-foreground shrink-0" />
                          View Profile
                        </Link>
                      </DropdownMenuItem>
                    )}

                    <DropdownMenuItem asChild className="cursor-pointer gap-2 rounded-lg text-sm">
                      <Link
                        href={dashboardHref}
                        className={cn(isPro && 'text-amber-600 font-semibold')}
                      >
                        {isPro
                          ? <Crown size={13} className="text-amber-500 shrink-0" />
                          : <LayoutDashboard size={13} className="text-muted-foreground shrink-0" />
                        }
                        {dashboardLabel}
                      </Link>
                    </DropdownMenuItem>

                    <DropdownMenuSeparator className="my-1" />

                    <DropdownMenuItem asChild className="cursor-pointer gap-2 rounded-lg text-sm">
                      <Link href={notificationsHref}>
                        <Bell size={13} className="text-muted-foreground shrink-0" />
                        Notifications
                      </Link>
                    </DropdownMenuItem>

                    <DropdownMenuItem asChild className="cursor-pointer gap-2 rounded-lg text-sm">
                      <Link href={settingsHref}>
                        <Settings size={13} className="text-muted-foreground shrink-0" />
                        Settings
                      </Link>
                    </DropdownMenuItem>

                    <DropdownMenuItem asChild className="cursor-pointer gap-2 rounded-lg text-sm">
                      <Link
                        href={billingHref}
                        className={cn(isPro && 'text-amber-600 font-semibold')}
                      >
                        {isPro
                          ? <Crown size={13} className="text-amber-500 shrink-0" />
                          : <CreditCard size={13} className="text-muted-foreground shrink-0" />
                        }
                        {billingLabel}
                      </Link>
                    </DropdownMenuItem>

                    {showPro === true && (
                      <>
                        <DropdownMenuSeparator className="my-1" />
                        <DropdownMenuItem asChild className="cursor-pointer gap-2 rounded-lg text-sm">
                          <Link href="/pricing">
                            <Sparkles size={13} className="text-amber-500 shrink-0" />
                            <span className="text-amber-600 font-semibold">Upgrade to Pro</span>
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}

                    <DropdownMenuSeparator className="my-1" />

                    <DropdownMenuItem asChild className="rounded-lg text-sm">
                      <Link
                        href="https://discord.gg/7WPGMb696N"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="gap-2 cursor-pointer"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" className="text-[#5865F2] shrink-0">
                          <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057.102 18.08.114 18.1.141 18.115a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
                        </svg>
                        Join Discord
                      </Link>
                    </DropdownMenuItem>

                    <DropdownMenuSeparator className="my-1" />

                    <DropdownMenuItem
                      onClick={handleSignOut}
                      className="cursor-pointer gap-2 rounded-lg text-sm text-destructive focus:text-destructive"
                    >
                      <LogOut size={13} className="shrink-0" />
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  )
}