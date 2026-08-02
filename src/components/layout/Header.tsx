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
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  LayoutDashboard, Settings, LogOut, BookOpen,
  User as UserIcon, Bell, Crown, CreditCard,
  Sparkles, Palette, Sun, Moon, Monitor,
} from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { GlobalSearch } from '@/components/layout/GlobalSearch'
import { NotificationBell } from '@/components/user/NotificationBell'
import { MobileTabBar } from '@/components/layout/MobileTabBar'
import { NotificationSoftPrompt } from '@/components/user/NotificationSoftPrompt'
import { getDashboardRoutes, getProfileRoute, type UserType } from '@/lib/utils/routes'
import { NavRail } from '@/components/layout/NavRail'
import {
  getCachedProfile, setCachedProfile, clearCachedProfile, deriveIsPro,
} from '@/lib/utils/profile-cache'
import { shouldHideProUpsell } from '@/lib/access'

function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 44 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect x="2" y="2" width="36" height="30" rx="8" className="fill-[#0ea5b0]" />
      <path d="M9 32 L5 43 L20 33.5" className="fill-[#0ea5b0]" />
      <path
        d="M28 11.5 C25 9 19.5 9 16.5 12 C13.5 15 13.5 20.5 16.5 23.5 C19.5 26.5 25 26.5 28 24"
        stroke="#111111" strokeWidth="3.5" strokeLinecap="round" fill="none"
      />
      <circle cx="30" cy="24.5" r="2.2" fill="#111111" />
    </svg>
  )
}

export function Header() {
  const pathname            = usePathname()
  const router              = useRouter()
  const { theme, setTheme } = useTheme()

  const [mounted,       setMounted]       = useState(false)
  const [user,          setUser]          = useState<User | null>(null)
  const [avatarUrl,     setAvatarUrl]     = useState<string | null>(null)
  const [displayName,   setDisplayName]   = useState<string | null>(null)
  const [username,      setUsername]      = useState<string | null>(null)
  const [mobileVisible, setMobileVisible] = useState(true)
  const [isPro,         setIsPro]         = useState(false)
  const [role,          setRole]          = useState<string>('user')
  const [userType,      setUserType]      = useState<UserType>('reader')
  const [authReady,     setAuthReady]     = useState(false)
  const [showPro,       setShowPro]       = useState<null | boolean>(null)
  const lastScrollY                       = useRef(0)
  const supabase                          = createClient()

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    const handleScroll = (e: Event) => {
      const target   = e.target as Document | HTMLElement
      const currentY = target === document
        ? window.scrollY
        : (target as HTMLElement).scrollTop ?? window.scrollY

      if (currentY < 60)                           setMobileVisible(true)
      else if (currentY > lastScrollY.current + 4) setMobileVisible(false)
      else if (currentY < lastScrollY.current - 4) setMobileVisible(true)
      lastScrollY.current = currentY
    }
    document.addEventListener('scroll', handleScroll, { passive: true, capture: true })
    return () => document.removeEventListener('scroll', handleScroll, true)
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

  const applyProfile = (profile: {
    avatar_url: string | null
    display_name: string | null
    username: string
    role: string
    user_type: string
    is_pro: boolean | null
    pro_expires_at: string | null
  }) => {
    const proActive = deriveIsPro(profile)
    setAvatarUrl(profile.avatar_url)
    setDisplayName(profile.display_name || profile.username)
    setUsername(profile.username)
    setRole(profile.role)
    setUserType((profile.user_type as UserType) ?? 'reader')
    setIsPro(proActive)
    setShowPro(shouldHideProUpsell(profile) ? false : true)
  }

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const currentUser = session?.user ?? null
      setUser(currentUser)

      if (currentUser) {
        const cached = getCachedProfile()
        if (cached) {
          applyProfile(cached)
          setAuthReady(true)
        }

        const { data: profile } = await (supabase as any)
          .from('profiles')
          .select('avatar_url, display_name, username, is_pro, pro_expires_at, is_patron, patron_expires_at, role, user_type')
          .eq('id', currentUser.id)
          .single()

        if (profile) {
          setCachedProfile(profile)
          applyProfile(profile)
        } else {
          setShowPro(true)
        }

        if (!cached) setAuthReady(true)
      } else {
        setShowPro(true)
        setAuthReady(true)
      }
    }
    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        clearCachedProfile()
        setUser(null)
        setAvatarUrl(null)
        setDisplayName(null)
        setUsername(null)
        setIsPro(false)
        setRole('user')
        setUserType('reader')
        setShowPro(true)
        setAuthReady(true)
      } else {
        const fetchProfile = async () => {
          const { data: profile } = await (supabase as any)
            .from('profiles')
            .select('avatar_url, display_name, username, is_pro, pro_expires_at, is_patron, patron_expires_at, role, user_type')
            .eq('id', session.user.id)
            .single()
          if (profile) {
            setCachedProfile(profile)
            setUser(session.user)
            applyProfile(profile)
          } else {
            setUser(session.user)
            setShowPro(true)
          }
          setAuthReady(true)
        }
        fetchProfile()
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  const handleSignOut = async () => {
    clearCachedProfile()
    await supabase.auth.signOut()
    toast.success('Signed out')
    router.push('/')
    router.refresh()
  }

  const routes        = getDashboardRoutes(userType, isPro)
  const profileRoute  = username ? getProfileRoute(username, userType) : null
  const isCreator     = userType === 'creator'

  const dashboardLabel = isPro
    ? isCreator ? 'Pro Studio'  : 'Pro Dashboard'
    : isCreator ? 'Studio'      : 'Dashboard'
  const billingLabel   = isPro ? 'Pro Billing' : 'Billing'
  const listsLabel     = isCreator ? 'My Works' : 'Lists'
  const listsHref      = isCreator ? routes.works : (routes as any).lists

  const themeOptions = [
    { value: 'light',  label: 'Light',  icon: Sun     },
    { value: 'dark',   label: 'Dark',   icon: Moon    },
    { value: 'system', label: 'System', icon: Monitor },
  ] as const

  const initials = displayName
    ? displayName.slice(0, 2).toUpperCase()
    : user?.email?.slice(0, 2).toUpperCase() ?? 'U'

  return (
    <>
      {/* MOBILE HEADER */}
      <header className={cn(
        'fixed top-0 left-0 right-0 z-50 lg:hidden px-3 pt-3',
        'transition-transform duration-300',
        !mobileVisible && '-translate-y-full'
      )}>
        <div className={cn(
          'flex items-center justify-between gap-2 h-12 px-3',
          'bg-background/90 backdrop-blur-md',
          'border border-border/60',
          'rounded-full shadow-lg shadow-black/10',
        )}>
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <LogoMark className="w-6 h-6" />
            <span className="font-black text-[13px] tracking-tight leading-none">
              ComPic<span className="text-[#0ea5b0]">fy</span>
            </span>
          </Link>

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
                  <Button variant="ghost" size="sm" className="h-7 px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground rounded-lg">
                    Log in
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button size="sm" className="h-7 px-2.5 text-xs font-semibold bg-primary hover:bg-primary/90 border-0 rounded-lg">
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

      {/* DESKTOP HEADER */}
      <header className="fixed top-0 left-0 right-0 z-50 hidden lg:flex px-6 pt-3">
        <div className={cn(
          'w-full max-w-6xl mx-auto',
          'flex items-center justify-between gap-4 h-12 px-4',
          'bg-background/90 backdrop-blur-md',
          'border border-border/60',
          'rounded-full shadow-lg shadow-black/10',
        )}>
          <Link href="/" className="flex items-center gap-2 shrink-0 group">
            <LogoMark className="w-7 h-7" />
            <span className="font-black text-[14px] tracking-tight leading-none">
              ComPic<span className="text-[#0ea5b0]">fy</span>
            </span>
          </Link>

          <div className="flex-1" />

          <div className="flex items-center gap-1">
            <GlobalSearch />

            {mounted && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost" size="icon"
                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground rounded-full"
                    aria-label="Toggle theme"
                  >
                    {theme === 'light' ? <Sun size={14} /> : theme === 'dark' ? <Moon size={14} /> : <Monitor size={14} />}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-32 rounded-xl p-1">
                  {themeOptions.map(({ value, label, icon: Icon }) => (
                    <DropdownMenuItem
                      key={value}
                      onClick={() => setTheme(value)}
                      className={cn('gap-2 cursor-pointer rounded-lg text-sm', theme === value && 'text-primary font-medium')}
                    >
                      <Icon size={13} />
                      {label}
                      {theme === value && <span className="ml-auto text-primary text-xs">✓</span>}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {!authReady ? (
              <div className="flex items-center gap-1.5">
                <div className="h-7 w-14 rounded-full bg-muted/50 animate-pulse hidden sm:block" />
                <div className="h-7 w-16 rounded-full bg-muted/50 animate-pulse" />
              </div>
            ) : !user ? (
              <div className="flex items-center gap-1.5 ml-1">
                <Link href="/login">
                  <Button variant="ghost" size="sm" className="h-8 text-sm font-medium text-muted-foreground hover:text-foreground rounded-full">
                    Log in
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button size="sm" className="h-8 px-4 text-sm font-semibold bg-primary hover:bg-primary/90 border-0 rounded-full">
                    Sign up
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-1 ml-1">

                <Link href={routes.newRec}>
                  <Button
                    size="sm"
                    className={cn(
                      'h-8 px-3 gap-1.5 text-sm font-semibold border-0 rounded-lg',
                      isCreator
                        ? 'bg-teal-500 hover:bg-teal-600 text-white'
                        : 'bg-primary hover:bg-primary/90 text-primary-foreground'
                    )}
                  >
                    {isCreator
                      ? <><Palette size={13} strokeWidth={2.5} />Add Work</>
                      : <><BookOpen size={13} strokeWidth={2.5} />Rec a comic</>
                    }
                  </Button>
                </Link>

                <NotificationBell userId={user.id} />

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className={cn(
                      'ml-0.5 rounded-full ring-2 ring-transparent transition-all outline-none',
                      isCreator ? 'hover:ring-teal-500/30 focus-visible:ring-teal-500/30' : 'hover:ring-primary/30 focus-visible:ring-primary/30'
                    )}>
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={avatarUrl ?? undefined} alt={displayName ?? 'User'} />
                        <AvatarFallback className={cn(
                          'text-xs font-black',
                          isCreator ? 'bg-teal-500 text-white' : 'bg-primary text-primary-foreground'
                        )}>
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align="end" className="w-52 rounded-xl p-1">
                    <div className="px-2 py-2 border-b border-border mb-1">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <p className="font-bold text-sm truncate leading-tight">{displayName ?? 'User'}</p>
                        <span className={cn(
                          'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-black border shrink-0',
                          isCreator
                            ? 'bg-teal-500/10 text-teal-600 border-teal-500/20'
                            : 'bg-primary/10 text-primary border-primary/20'
                        )}>
                          {isCreator ? <Palette size={8} /> : <BookOpen size={8} />}
                          {isCreator ? 'Creator' : 'Reader'}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate leading-tight">{user.email}</p>
                    </div>

                    {profileRoute && (
                      <DropdownMenuItem asChild className="cursor-pointer gap-2 rounded-lg text-sm">
                        <Link href={profileRoute}>
                          <UserIcon size={13} className="text-muted-foreground shrink-0" />
                          View Profile
                        </Link>
                      </DropdownMenuItem>
                    )}

                    <DropdownMenuItem asChild className="cursor-pointer gap-2 rounded-lg text-sm">
                      <Link
                        href={routes.dashboard}
                        className={cn(
                          isPro && isCreator && 'text-teal-600 font-semibold',
                          isPro && !isCreator && 'text-amber-600 font-semibold'
                        )}
                      >
                        {isPro && isCreator
                          ? <Palette size={13} className="text-teal-500 shrink-0" />
                          : isPro
                          ? <Crown size={13} className="text-amber-500 shrink-0" />
                          : <LayoutDashboard size={13} className="text-muted-foreground shrink-0" />
                        }
                        {dashboardLabel}
                      </Link>
                    </DropdownMenuItem>

                    <DropdownMenuSeparator className="my-1" />

                    <DropdownMenuItem asChild className="cursor-pointer gap-2 rounded-lg text-sm">
                      <Link href={routes.notifications}>
                        <Bell size={13} className="text-muted-foreground shrink-0" />
                        Notifications
                      </Link>
                    </DropdownMenuItem>

                    <DropdownMenuItem asChild className="cursor-pointer gap-2 rounded-lg text-sm">
                      <Link href={routes.settings}>
                        <Settings size={13} className="text-muted-foreground shrink-0" />
                        Settings
                      </Link>
                    </DropdownMenuItem>

                    <DropdownMenuItem asChild className="cursor-pointer gap-2 rounded-lg text-sm">
                      <Link
                        href={routes.billing}
                        className={cn(isPro && (isCreator ? 'text-teal-600 font-semibold' : 'text-amber-600 font-semibold'))}
                      >
                        {isPro && isCreator
                          ? <Palette size={13} className="text-teal-500 shrink-0" />
                          : isPro
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
                      <Link href="https://discord.gg/7WPGMb696N" target="_blank" rel="noopener noreferrer" className="gap-2 cursor-pointer">
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

      {authReady && (
        <NavRail
          isLoggedIn={!!user}
          isPro={isPro}
          isCreator={isCreator}
          listsHref={listsHref}
          listsLabel={listsLabel}
        />
      )}

      {/* Pass isLoggedIn so MobileTabBar can conditionally show/hide News tab */}
      <MobileTabBar isPro={isPro} isLoggedIn={!!user} />

      {authReady && user && <NotificationSoftPrompt />}
    </>
  )
}