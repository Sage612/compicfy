'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  House, BookOpen, ScrollText, Radar, Crown,
  Settings, LogOut, LayoutDashboard, Bell, CreditCard,
  Sparkles, X, ChevronRight, User as UserIcon, LayoutList,
  Palette,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState, useRef } from 'react'
import { AuthPromptModal } from '@/components/ui/auth-prompt-modal'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { toast } from 'sonner'
import type { User } from '@supabase/supabase-js'
import { getDashboardRoutes, getProfileRoute, type UserType } from '@/lib/utils/routes'
import {
  getCachedProfile, setCachedProfile, clearCachedProfile, deriveIsPro,
} from '@/lib/utils/profile-cache'

export function MobileNav() {
  const pathname                            = usePathname()
  const router                              = useRouter()
  const [user,           setUser]           = useState<User | null>(null)
  const [isPro,          setIsPro]          = useState(false)
  const [userType,       setUserType]       = useState<UserType>('reader')
  const [authReady,      setAuthReady]      = useState(false)
  const [visible,        setVisible]        = useState(true)
  const [showAuthPrompt, setShowAuthPrompt] = useState(false)
  const [profileOpen,    setProfileOpen]    = useState(false)
  const [avatarUrl,      setAvatarUrl]      = useState<string | null>(null)
  const [displayName,    setDisplayName]    = useState<string | null>(null)
  const [username,       setUsername]       = useState<string | null>(null)
  const [showPro,        setShowPro]        = useState<null | boolean>(null)
  const lastScrollY                         = useRef(0)
  const supabase                            = createClient()

  // ── Helper: apply a profile object to all state setters ──────────
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
    setUserType((profile.user_type as UserType) ?? 'reader')
    setIsPro(proActive)
    setShowPro(proActive || profile.role === 'admin' || profile.role === 'moderator' ? false : true)
  }

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      setUser(currentUser)

      if (currentUser) {
        // ── 1. Paint instantly from cache if available ────────────
        const cached = getCachedProfile()
        if (cached) {
          applyProfile(cached)
          setAuthReady(true)   // nav interactive immediately with correct routes
        }

        // ── 2. Always fetch fresh in background ───────────────────
        const { data: profile } = await (supabase as any)
          .from('profiles')
          .select('is_pro, pro_expires_at, role, avatar_url, display_name, username, user_type')
          .eq('id', currentUser.id)
          .single()

        if (profile) {
          setCachedProfile(profile)   // refresh cache
          applyProfile(profile)
        } else {
          setShowPro(true)
        }

        // If no cache existed, mark ready after fetch
        if (!cached) setAuthReady(true)
      } else {
        setShowPro(true)
        setAuthReady(true)
      }
    }
    checkAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        // Logout — clear cache immediately
        clearCachedProfile()
        setUser(null); setIsPro(false); setAvatarUrl(null)
        setDisplayName(null); setUsername(null); setShowPro(true)
        setUserType('reader')
        setAuthReady(true)
      } else {
        // Auth state changed — re-fetch profile so routes stay correct
        const fetchProfile = async () => {
          const { data: profile } = await (supabase as any)
            .from('profiles')
            .select('is_pro, pro_expires_at, role, avatar_url, display_name, username, user_type')
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

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY
      if (currentY < 60)                           setVisible(true)
      else if (currentY > lastScrollY.current + 4) setVisible(false)
      else if (currentY < lastScrollY.current - 4) setVisible(true)
      lastScrollY.current = currentY
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleSignOut = async () => {
    setProfileOpen(false)
    clearCachedProfile()
    await supabase.auth.signOut()
    toast.success('Signed out')
    router.push('/')
    router.refresh()
  }

  const routes       = getDashboardRoutes(userType, isPro)
  const profileRoute = username ? getProfileRoute(username, userType) : null
  const isCreator    = userType === 'creator'

  const initials = displayName
    ? displayName.slice(0, 2).toUpperCase()
    : user?.email?.slice(0, 2).toUpperCase() ?? 'U'

  const dashboardLabel = isPro
    ? isCreator ? 'Pro Studio'   : 'Pro Dashboard'
    : isCreator ? 'Studio'       : 'Dashboard'
  const billingLabel   = isPro ? 'Pro Billing' : 'Billing'

  if (!authReady) {
    return (
      <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden px-4 pb-4">
        <div className="flex items-center justify-around h-14 bg-background/90 backdrop-blur-md border border-border/60 rounded-full shadow-lg px-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1 px-2 py-2">
              <div className="w-5 h-5 rounded bg-muted/50 animate-pulse" />
              <div className="w-7 h-2 rounded bg-muted/40 animate-pulse" />
            </div>
          ))}
        </div>
        <div style={{ height: 'env(safe-area-inset-bottom, 0px)' }} />
      </nav>
    )
  }

  return (
    <>
      <AuthPromptModal
        open={showAuthPrompt}
        onClose={() => setShowAuthPrompt(false)}
        config={{ action: 'share a recommendation', icon: <BookOpen size={24} className="text-primary" /> }}
      />

      {/* Backdrop */}
      {profileOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 lg:hidden" onClick={() => setProfileOpen(false)} />
      )}

      {/* Profile sheet */}
      <div className={cn(
        'fixed bottom-0 left-0 right-0 z-[60] lg:hidden bg-background border-t border-border rounded-t-2xl overflow-y-auto max-h-[85vh]',
        'transition-transform duration-300 ease-in-out',
        profileOpen ? 'translate-y-0' : 'translate-y-full'
      )}>
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-8 h-1 rounded-full bg-muted-foreground/20" />
        </div>

        {user ? (
          <div className="px-4 space-y-1" style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}>
            {/* User header */}
            <div className="flex items-center gap-3 px-3 py-3 mb-2">
              <Avatar className="h-10 w-10 shrink-0">
                <AvatarImage src={avatarUrl ?? undefined} />
                <AvatarFallback className={cn(
                  'text-sm font-black',
                  isCreator ? 'bg-teal-500 text-white' : 'bg-primary text-primary-foreground'
                )}>
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <p className="font-black text-sm truncate">{displayName ?? 'User'}</p>
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
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
              <button onClick={() => setProfileOpen(false)} className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                <X size={13} className="text-muted-foreground" />
              </button>
            </div>

            {/* Nav items */}
            {[
              profileRoute ?
               { href: profileRoute,        label: 'View Profile',  icon: UserIcon,                              accent: false } : null,
              {               href: routes.dashboard,     label: dashboardLabel,  icon: isCreator ? Palette : LayoutDashboard, accent: isPro  },
              {               href: routes.notifications, label: 'Notifications', icon: Bell,                                  accent: false },
              {               href: routes.settings,      label: 'Settings',      icon: Settings,                              accent: false },
              {               href: routes.billing,       label: billingLabel,    icon: isPro ? Crown : CreditCard,            accent: isPro },
            ].filter(Boolean).map((item) => {
              if (!item) return null
              const { href, label, icon: Icon, accent } = item
              const accentColor = isCreator ? 'text-teal-600' : 'text-amber-600'
              const accentIcon  = isCreator ? 'text-teal-500' : 'text-amber-500'
              return (
                <Link key={href} href={href} onClick={() => setProfileOpen(false)}
                  className={cn('flex items-center gap-3 px-3 py-3 rounded-xl transition-colors hover:bg-muted/60 active:bg-muted', accent && accentColor)}
                >
                  <Icon size={16} className={cn('shrink-0', accent ? accentIcon : 'text-muted-foreground')} />
                  <span className={cn('text-sm font-medium flex-1', accent && 'font-semibold')}>{label}</span>
                  <ChevronRight size={13} className="text-muted-foreground/40" />
                </Link>
              )
            })}

            {showPro === true && (
              <>
                <div className="h-px bg-border mx-3 my-1" />
                <Link href="/pricing" onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-amber-500/5 transition-colors"
                >
                  <Sparkles size={16} className="text-amber-500 shrink-0" />
                  <span className="text-sm font-semibold text-amber-600 flex-1">Upgrade to Pro</span>
                  <ChevronRight size={13} className="text-amber-500/40" />
                </Link>
              </>
            )}

            <div className="h-px bg-border mx-3 my-1" />

            <Link href="https://discord.gg/7WPGMb696N" target="_blank" rel="noopener noreferrer"
              onClick={() => setProfileOpen(false)}
              className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-muted/60 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-[#5865F2] shrink-0">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057.102 18.08.114 18.1.141 18.115a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
              </svg>
              <span className="text-sm font-medium flex-1">Join Discord</span>
              <ChevronRight size={13} className="text-muted-foreground/40" />
            </Link>

            <div className="h-px bg-border mx-3 my-1" />

            <button onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-destructive/5 transition-colors text-destructive"
            >
              <LogOut size={16} className="shrink-0" />
              <span className="text-sm font-medium flex-1 text-left">Sign out</span>
            </button>
          </div>
        ) : (
          <div className="px-4 pb-8 pt-2 flex flex-col gap-3">
            <Link href="/login" onClick={() => setProfileOpen(false)}>
              <button className="w-full h-11 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-colors">Log in</button>
            </Link>
            <Link href="/signup" onClick={() => setProfileOpen(false)}>
              <button className="w-full h-11 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">Sign up</button>
            </Link>
          </div>
        )}
      </div>

      {/* ── FLOATING PILL NAV ── */}
      <nav className={cn(
        'fixed bottom-0 left-0 right-0 z-50 lg:hidden px-4 pb-4',
        'transition-transform duration-300 ease-in-out',
        !visible && 'translate-y-full'
      )}>
        <div className="flex items-center justify-around h-14 bg-background/90 backdrop-blur-md border border-border/60 rounded-full shadow-lg shadow-black/10 px-2">

          {user ? (
            <>
              <Link href="/" className="flex flex-col items-center gap-1 px-3 py-2 active:scale-95 transition-transform">
                <House size={19} strokeWidth={pathname === '/' ? 2.5 : 1.75}
                  className={cn(pathname === '/' ? 'text-primary' : 'text-muted-foreground')} />
                <span className={cn('text-[10px] font-semibold', pathname === '/' ? 'text-primary' : 'text-muted-foreground')}>Home</span>
              </Link>

              <Link href="/browse" className="flex flex-col items-center gap-1 px-3 py-2 active:scale-95 transition-transform">
                <Radar size={19} strokeWidth={pathname.startsWith('/browse') ? 2.5 : 1.75}
                  className={cn(pathname.startsWith('/browse') ? 'text-primary' : 'text-muted-foreground')} />
                <span className={cn('text-[10px] font-semibold', pathname.startsWith('/browse') ? 'text-primary' : 'text-muted-foreground')}>Browse</span>
              </Link>

              <Link href={routes.newRec} className="flex flex-col items-center gap-1 px-3 py-2 active:scale-95 transition-transform">
                <div className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center shadow-md',
                  isCreator
                    ? 'bg-teal-600 dark:bg-teal-500 shadow-teal-500/30'
                    : 'bg-primary shadow-primary/30'
                )}>
                  <BookOpen size={18} className={isCreator ? 'text-white dark:text-black' : 'text-primary-foreground'} strokeWidth={2.5} />
                </div>
                <span className={cn('text-[10px] font-bold', isCreator ? 'text-teal-500' : 'text-primary')}>
                  {isCreator ? 'Work' : 'Rec'}
                </span>
              </Link>

              <Link href="/feed" className="flex flex-col items-center gap-1 px-3 py-2 active:scale-95 transition-transform">
                <LayoutList size={19} strokeWidth={pathname.startsWith('/feed') ? 2.5 : 1.75}
                  className={cn(pathname.startsWith('/feed') ? 'text-primary' : 'text-muted-foreground')} />
                <span className={cn('text-[10px] font-semibold', pathname.startsWith('/feed') ? 'text-primary' : 'text-muted-foreground')}>Feed</span>
              </Link>

              <button onClick={() => setProfileOpen(true)} className="flex flex-col items-center gap-1 px-3 py-2 active:scale-95 transition-transform">
                <div className={cn('w-7 h-7 rounded-full overflow-hidden ring-2 transition-all',
                  profileOpen
                    ? isCreator ? 'ring-teal-500' : 'ring-primary'
                    : 'ring-border'
                )}>
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={avatarUrl ?? undefined} />
                    <AvatarFallback className={cn(
                      'text-[10px] font-black',
                      profileOpen
                        ? isCreator ? 'bg-teal-500 text-white' : 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    )}>
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <span className={cn('text-[10px] font-semibold',
                  profileOpen
                    ? isCreator ? 'text-teal-500' : 'text-primary'
                    : 'text-muted-foreground'
                )}>Profile</span>
              </button>
            </>
          ) : (
            <>
              <Link href="/" className="flex flex-col items-center gap-1 px-3 py-2 active:scale-95 transition-transform">
                <House size={19} strokeWidth={pathname === '/' ? 2.5 : 1.75}
                  className={cn(pathname === '/' ? 'text-primary' : 'text-muted-foreground')} />
                <span className={cn('text-[10px] font-semibold', pathname === '/' ? 'text-primary' : 'text-muted-foreground')}>Home</span>
              </Link>

              <Link href="/browse" className="flex flex-col items-center gap-1 px-3 py-2 active:scale-95 transition-transform">
                <Radar size={19} strokeWidth={pathname.startsWith('/browse') ? 2.5 : 1.75}
                  className={cn(pathname.startsWith('/browse') ? 'text-primary' : 'text-muted-foreground')} />
                <span className={cn('text-[10px] font-semibold', pathname.startsWith('/browse') ? 'text-primary' : 'text-muted-foreground')}>Browse</span>
              </Link>

              <button onClick={() => setShowAuthPrompt(true)} className="flex flex-col items-center gap-1 px-3 py-2 active:scale-95 transition-transform">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-md shadow-primary/30">
                  <BookOpen size={18} className="text-primary-foreground" strokeWidth={2.5} />
                </div>
                <span className="text-[10px] font-bold text-primary">Rec</span>
              </button>

              <Link href="/news" className="flex flex-col items-center gap-1 px-3 py-2 active:scale-95 transition-transform">
                <ScrollText size={19} strokeWidth={pathname.startsWith('/news') ? 2.5 : 1.75}
                  className={cn(pathname.startsWith('/news') ? 'text-primary' : 'text-muted-foreground')} />
                <span className={cn('text-[10px] font-semibold', pathname.startsWith('/news') ? 'text-primary' : 'text-muted-foreground')}>News</span>
              </Link>

              <Link href="/pricing" className="flex flex-col items-center gap-1 px-3 py-2 active:scale-95 transition-transform">
                <Crown size={19} strokeWidth={pathname.startsWith('/pricing') ? 2.5 : 1.75}
                  className={cn(pathname.startsWith('/pricing') ? 'text-amber-500' : 'text-amber-500/60')} />
                <span className={cn('text-[10px] font-semibold', pathname.startsWith('/pricing') ? 'text-amber-500' : 'text-amber-500/60')}>Go Pro</span>
              </Link>
            </>
          )}
        </div>
        <div style={{ height: 'env(safe-area-inset-bottom, 0px)' }} />
      </nav>
    </>
  )
}