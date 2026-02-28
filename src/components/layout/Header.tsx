'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
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
  Sun,
  Moon,
  Monitor,
  BookOpen,
  Newspaper,
  LayoutDashboard,
  Settings,
  LogOut,
  Plus,
  User as UserIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

export function Header() {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState<string | null>(null)
  const [scrolled, setScrolled] = useState(false)
  const supabase = createClient()

  // Avoid hydration mismatch for theme
  useEffect(() => setMounted(true), [])

  // Track scroll for header shadow
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Auth state
  useEffect(() => {
   const getUser = async () => {
  const { data: { session } } = await supabase.auth.getSession()
const user = session?.user ?? null
  setUser(user)

  if (user) {
  type ProfileResult = {
    avatar_url: string | null
    display_name: string | null
    username: string
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('avatar_url, display_name, username')
    .eq('id', user.id)
    .single() as { data: ProfileResult | null; error: unknown }

  if (profile) {
    setAvatarUrl(profile.avatar_url)
    setDisplayName(profile.display_name || profile.username)
  }
}
}
    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (!session?.user) {
        setAvatarUrl(null)
        setDisplayName(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    toast.success('Signed out')
    router.push('/')
    router.refresh()
  }

  const navLinks = [
    { href: '/browse', label: 'Browse', icon: BookOpen },
    { href: '/news', label: 'News', icon: Newspaper },
  ]

  const themeOptions = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ] as const

  const initials = displayName
    ? displayName.slice(0, 2).toUpperCase()
    : user?.email?.slice(0, 2).toUpperCase() ?? 'U'

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 h-14 bg-background/80 backdrop-blur-md border-b border-border transition-shadow duration-200',
        scrolled && 'shadow-md'
      )}
    >
      <div className="max-w-7xl mx-auto h-full px-4 flex items-center justify-between gap-4">

        {/* Left: Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 font-bold text-lg text-primary hover:opacity-80 transition-opacity shrink-0"
        >
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <BookOpen size={14} className="text-primary-foreground" />
          </div>
          <span className="hidden sm:inline">Compicfy</span>
        </Link>

        {/* Center: Nav links (desktop only) */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                pathname === href || pathname.startsWith(href + '/')
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
              )}
            >
              <Icon size={15} />
              {label}
            </Link>
          ))}
        </nav>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">

          {/* Theme toggle */}
          {mounted && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Toggle theme" title="Toggle theme">
                  {theme === 'light' ? (
                    <Sun size={16} />
                  ) : theme === 'dark' ? (
                    <Moon size={16} />
                  ) : (
                    <Monitor size={16} />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36">
                {themeOptions.map(({ value, label, icon: Icon }) => (
                  <DropdownMenuItem
                    key={value}
                    onClick={() => setTheme(value)}
                    className={cn(
                      'gap-2 cursor-pointer',
                      theme === value && 'text-primary font-medium'
                    )}
                  >
                    <Icon size={14} />
                    {label}
                    {theme === value && <span className="ml-auto">✓</span>}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Logged out: Login + Signup */}
          {!user && (
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button variant="ghost" size="sm" className="hidden sm:flex">
                  Log in
                </Button>
              </Link>
              <Link href="/signup">
                <Button size="sm">
                  Sign up
                </Button>
              </Link>
            </div>
          )}

          {/* Logged in: Add + User menu */}
          {user && (
            <div className="flex items-center gap-2">
              {/* Add recommendation button */}
              <Link href="/dashboard/recommendations/new" className="hidden sm:block">
                <Button size="sm" className="gap-1.5">
                  <Plus size={14} />
                  Add
                </Button>
              </Link>

              {/* User dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="rounded-full ring-2 ring-transparent hover:ring-primary transition-all outline-none">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={avatarUrl ?? undefined} alt={displayName ?? 'User'} />
                      <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-semibold text-sm">{displayName ?? 'User'}</span>
                      <span className="text-xs text-muted-foreground truncate">{user.email}</span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild className="cursor-pointer gap-2">
                    <Link href="/dashboard">
                      <LayoutDashboard size={14} />
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="cursor-pointer gap-2">
                    <Link href="/dashboard/recommendations">
                      <BookOpen size={14} />
                      My Recommendations
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="cursor-pointer gap-2">
                    <Link href="/dashboard/saved">
                      <UserIcon size={14} />
                      Saved Comics
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild className="cursor-pointer gap-2">
                    <Link href="/dashboard/settings">
                      <Settings size={14} />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <a
                      href="https://discord.gg/FxQUqEdcQr"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="gap-2 cursor-pointer"
                    >
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057.102 18.08.114 18.1.141 18.115a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
    </svg>
    Join Discord
  </a>
</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                  >
                    <LogOut size={14} />
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