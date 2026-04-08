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
  Sun, Moon, Monitor, BookOpen, Search, ScrollText,
  LayoutDashboard, Settings, LogOut, Plus,
  User as UserIcon, Bookmark, Bell,
  ShoppingBag, BookMarked, Crown, CreditCard, Sparkles, LayoutList,
} from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { NotificationBell } from '@/components/user/NotificationBell'

function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <rect x="3"   y="18"   width="22" height="5.5" rx="1.5" className="fill-primary-foreground/25" />
      <rect x="3"   y="18"   width="10" height="5.5" rx="1.5" className="fill-primary-foreground/55" />
      <rect x="4.5" y="11.5" width="19" height="5.5" rx="1.5" className="fill-primary-foreground/45" />
      <rect x="4.5" y="11.5" width="9"  height="5.5" rx="1.5" className="fill-primary-foreground/75" />
      <rect x="6"   y="5"    width="16" height="5.5" rx="1.5" className="fill-primary-foreground"    />
      <rect x="6"   y="5"    width="7.5"height="5.5" rx="1.5" className="fill-primary-foreground/65" />
    </svg>
  )
}

export function Header() {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted]         = useState(false)
  const [user, setUser]               = useState<User | null>(null)
  const [avatarUrl, setAvatarUrl]     = useState<string | null>(null)
  const [displayName, setDisplayName] = useState<string | null>(null)
  const [username, setUsername]       = useState<string | null>(null)
  const [scrolled, setScrolled]       = useState(false)
  const [visible, setVisible]         = useState(true)
  const [isPro, setIsPro]             = useState(false)
  const [isAdmin, setIsAdmin]         = useState(false)
  const [role, setRole]               = useState<string>('user')
  const [authReady, setAuthReady]     = useState(false)
  const lastScrollY                   = useRef(0)
  const supabase                      = createClient()

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY
      setScrolled(currentY > 8)
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
          setIsAdmin(['admin', 'moderator'].includes(profile.role))
          setIsPro(
            profile.role === 'admin' ||
            (profile.is_pro &&
              (!profile.pro_expires_at || new Date(profile.pro_expires_at) > new Date()))
          )
        }
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
        setIsAdmin(false)
        setRole('user')
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

  const showProLink = mounted && authReady && !isPro

  const dashboardHref  = isPro ? '/pro/dashboard' : '/dashboard'
  const dashboardLabel = isPro ? 'Pro Dashboard'  : 'Dashboard'

  const publicNavLinks = [
    { href: '/browse',    label: 'Browse', icon: Search      },
    { href: '/news',      label: 'News',   icon: ScrollText   },
    { href: '/affiliate', label: 'Shop',   icon: ShoppingBag },
  ]

  const authNavLinks = [
    { href: '/feed',            label: 'Feed',  icon: LayoutList   },     
    { href: '/dashboard/lists', label: 'Lists', icon: BookMarked },
  ]

  const themeOptions = [
    { value: 'light',  label: 'Light',  icon: Sun     },
    { value: 'dark',   label: 'Dark',   icon: Moon    },
    { value: 'system', label: 'System', icon: Monitor },
  ] as const

  const initials = displayName
    ? displayName.slice(0, 2).toUpperCase()
    : user?.email?.slice(0, 2).toUpperCase() ?? 'U'

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 h-14',
        'bg-background/90 backdrop-blur-lg border-b border-border',
        'transition-all duration-300',
        scrolled && 'shadow-sm shadow-black/5 border-border/80',
        !visible && '-translate-y-full'
      )}
    >
      <div className="max-w-7xl mx-auto h-full px-4 flex items-center justify-between gap-4">

        {/* ── Logo ── */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
          <div className={cn(
            'w-8 h-8 rounded-xl flex items-center justify-center',
            'bg-gradient-to-br from-primary to-violet-500',
            'shadow-md shadow-primary/20',
            'group-hover:shadow-lg group-hover:shadow-primary/30 group-hover:scale-105',
            'transition-all duration-200'
          )}>
            <LogoMark className="w-[18px] h-[18px]" />
          </div>
          <span className="hidden sm:inline font-black text-[15px] tracking-tight leading-none">
            Compic<span className="text-primary">fy</span>
          </span>
        </Link>

        {/* ── Center nav (desktop only) ── */}
        <nav className="hidden md:flex items-center gap-0.5">
          {publicNavLinks.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-sm font-medium transition-all duration-150',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
                )}
              >
                <Icon size={14} />
                {label}
              </Link>
            )
          })}

          {authReady && user && <div className="w-px h-4 bg-border mx-1" />}

          {authReady && user && authNavLinks.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-sm font-medium transition-all duration-150',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
                )}
              >
                <Icon size={14} />
                {label}
              </Link>
            )
          })}

          {showProLink && (
            <Link
              href="/pricing"
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold transition-all duration-150 ml-1 border',
                pathname === '/pricing'
                  ? 'bg-amber-500/15 text-amber-600 border-amber-500/30'
                  : 'text-amber-500 border-amber-500/25 bg-amber-500/5 hover:bg-amber-500/10 hover:border-amber-500/40'
              )}
            >
              <Crown size={13} className="fill-amber-500 shrink-0" />
              Pro
            </Link>
          )}
        </nav>

        {/* ── Right actions ── */}
        <div className="flex items-center gap-1">

          {/* Theme toggle */}
          {mounted && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost" size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  aria-label="Toggle theme"
                >
                  {theme === 'light' ? <Sun size={15} /> : theme === 'dark' ? <Moon size={15} /> : <Monitor size={15} />}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36">
                {themeOptions.map(({ value, label, icon: Icon }) => (
                  <DropdownMenuItem
                    key={value}
                    onClick={() => setTheme(value)}
                    className={cn('gap-2 cursor-pointer', theme === value && 'text-primary font-medium')}
                  >
                    <Icon size={13} />
                    {label}
                    {theme === value && <span className="ml-auto text-primary">✓</span>}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* ── Logged out ── */}
          {authReady && !user && (
            <div className="flex items-center gap-1.5 ml-1">
              <Link href="/login">
                <Button variant="ghost" size="sm" className="hidden sm:flex h-8 text-sm font-medium">
                  Log in
                </Button>
              </Link>
              <Link href="/signup">
                <Button size="sm" className="h-8 text-sm font-semibold bg-gradient-to-r from-primary to-violet-500 hover:opacity-90 border-0 shadow-md shadow-primary/20">
                  Sign up
                </Button>
              </Link>
            </div>
          )}

          {/* ── Logged in ── */}
          {authReady && user && (
            <div className="flex items-center gap-1 ml-0.5">

              <Link href="/dashboard/recommendations/new" className="hidden md:flex">
                <Button
                  size="sm"
                  className="h-8 px-3 gap-1.5 font-semibold bg-gradient-to-r from-primary to-violet-500 hover:opacity-90 border-0 shadow-md shadow-primary/20 flex items-center justify-center"
                >
                  <Plus size={14} strokeWidth={2.5} />
                  <span className="text-sm">Add</span>
                </Button>
              </Link>

              <NotificationBell userId={user.id} />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="ml-0.5 rounded-full ring-2 ring-transparent hover:ring-primary/40 focus-visible:ring-primary/40 transition-all outline-none">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={avatarUrl ?? undefined} alt={displayName ?? 'User'} />
                      <AvatarFallback className="text-xs font-black bg-gradient-to-br from-primary to-violet-500 text-white">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="w-56 rounded-2xl p-1.5">

                  <DropdownMenuLabel className="font-normal px-2 py-2 mb-0.5">
                    <div className="flex items-center gap-2.5">
                      <Avatar className="h-9 w-9 shrink-0">
                        <AvatarImage src={avatarUrl ?? undefined} />
                        <AvatarFallback className="text-xs font-black bg-gradient-to-br from-primary to-violet-500 text-white">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="font-black text-sm truncate leading-tight">{displayName ?? 'User'}</p>
                        <p className="text-xs text-muted-foreground truncate leading-tight mt-0.5">{user.email}</p>
                      </div>
                    </div>
                  </DropdownMenuLabel>

                  <DropdownMenuSeparator className="my-1" />

                  {username && (
                    <DropdownMenuItem asChild className="cursor-pointer gap-2 rounded-lg">
                      <Link href={`/profile/${username}`}>
                        <UserIcon size={13} className="text-muted-foreground" />
                        View Profile
                      </Link>
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuItem asChild className="cursor-pointer gap-2 rounded-lg">
                    <Link
                      href={dashboardHref}
                      className={cn(isPro && 'text-amber-600 font-semibold')}
                    >
                      {isPro ? (
                        <Crown size={13} className="text-amber-500 fill-amber-500/20 shrink-0" />
                      ) : (
                        <LayoutDashboard size={13} className="text-muted-foreground shrink-0" />
                      )}
                      {dashboardLabel}
                    </Link>
                  </DropdownMenuItem>

                  {role === 'admin' && (
                    <DropdownMenuItem asChild className="cursor-pointer gap-2 rounded-lg">
                      <Link href="/dashboard">
                        <LayoutDashboard size={13} className="text-muted-foreground shrink-0" />
                        Dashboard
                      </Link>
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuItem asChild className="cursor-pointer gap-2 rounded-lg">
                    <Link href="/dashboard/recommendations">
                      <BookOpen size={13} className="text-muted-foreground" />
                      My Recommendations
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuItem asChild className="cursor-pointer gap-2 rounded-lg">
                    <Link href="/dashboard/saved">
                      <Bookmark size={13} className="text-muted-foreground" />
                      Saved Comics
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator className="my-1" />

                  <DropdownMenuItem asChild className="cursor-pointer gap-2 rounded-lg">
                    <Link href="/dashboard/notifications">
                      <Bell size={13} className="text-muted-foreground" />
                      Notifications
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuItem asChild className="cursor-pointer gap-2 rounded-lg">
                    <Link href="/dashboard/settings">
                      <Settings size={13} className="text-muted-foreground" />
                      Settings
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuItem asChild className="cursor-pointer gap-2 rounded-lg">
                    <Link href="/dashboard/billing">
                      <CreditCard size={13} className="text-muted-foreground" />
                      Billing
                    </Link>
                  </DropdownMenuItem>

                  {showProLink && (
                    <>
                      <DropdownMenuSeparator className="my-1" />
                      <DropdownMenuItem asChild className="cursor-pointer gap-2 rounded-lg bg-amber-500/5 hover:bg-amber-500/10 focus:bg-amber-500/10">
                        <Link href="/pricing">
                          <Sparkles size={13} className="text-amber-500" />
                          <span className="text-amber-600 font-semibold">Upgrade to Pro</span>
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}

                  <DropdownMenuSeparator className="my-1" />

                  <DropdownMenuItem asChild className="rounded-lg">
                    <a href="https://discord.gg/7WPGMb696N" target="_blank" rel="noopener noreferrer" className="gap-2 cursor-pointer">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" className="text-[#5865F2] shrink-0">
                        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057.102 18.08.114 18.1.141 18.115a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
                      </svg>
                      Join Discord
                    </a>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator className="my-1" />

                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="cursor-pointer gap-2 rounded-lg text-destructive focus:text-destructive"
                  >
                    <LogOut size={13} />
                    Sign out
                  </DropdownMenuItem>

                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}