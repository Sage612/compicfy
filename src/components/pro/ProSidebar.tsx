'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, BookOpen, Bookmark, Bell,
  Settings, BookMarked, Trophy, Download, CreditCard,
  Star, Plus, Crown, Sparkles, Shield, BarChart2,
  Users, Link as LinkIcon, Eye, Palette,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

const PRO_READER_ITEMS = [
  { href: '/pro/reader/dashboard',                          label: 'Pro Dashboard', icon: LayoutDashboard, exact: true  },
  { href: '/pro/reader/dashboard/analytics',                label: 'Analytics',     icon: BarChart2                    },
  { href: '/pro/reader/dashboard/analytics',                label: 'Profile Views', icon: Eye                          },
  { href: '/pro/reader/dashboard/export',                   label: 'Export Lists',  icon: Download                     },
  { href: '/pro/reader/dashboard/leaderboard',              label: 'Leaderboard',   icon: Trophy                       },
]

const PRO_READER_PLATFORM = [
  { href: '/pro/reader/dashboard/recommendations/new', label: 'Submit a Rec',  icon: Plus,      isSubmit: true },
  { href: '/pro/reader/dashboard/recommendations',     label: 'My Recs',       icon: BookOpen   },
  { href: '/pro/reader/dashboard/saved',               label: 'Saved Comics',  icon: Bookmark   },
  { href: '/pro/reader/dashboard/lists',               label: 'Reading Lists', icon: BookMarked },
  { href: '/pro/reader/dashboard/reviews',             label: 'My Reviews',    icon: Star       },
  { href: '/pro/reader/dashboard/notifications',       label: 'Notifications', icon: Bell       },
  { href: '/pro/reader/dashboard/settings',            label: 'Settings',      icon: Settings   },
  { href: '/pro/reader/dashboard/billing',             label: 'Billing',       icon: CreditCard },
]

const PRO_CREATOR_ITEMS = [
  { href: '/pro/creator/dashboard',                    label: 'Studio',        icon: LayoutDashboard, exact: true },
  { href: '/pro/creator/dashboard/analytics',          label: 'Analytics',     icon: BarChart2                   },
  { href: '/pro/creator/dashboard/audience',           label: 'Audience',      icon: Users                       },
]

const PRO_CREATOR_PLATFORM = [
  { href: '/pro/creator/dashboard/works/new',          label: 'Add Work',      icon: Plus,      isSubmit: true },
  { href: '/pro/creator/dashboard/works',              label: 'My Works',      icon: BookOpen   },
  { href: '/pro/creator/dashboard/links',              label: 'My Links',      icon: LinkIcon   },
  { href: '/pro/creator/dashboard/notifications',      label: 'Notifications', icon: Bell       },
  { href: '/pro/creator/dashboard/settings',           label: 'Settings',      icon: Settings   },
  { href: '/pro/creator/dashboard/billing',            label: 'Billing',       icon: CreditCard },
]

const ADMIN_ITEMS = [
  { href: '/admin', label: 'Admin Panel', icon: Shield },
]

interface Props {
  role:      string
  userType?: 'reader' | 'creator'
}

export function ProSidebar({ role, userType: userTypeProp }: Props) {
  const pathname                  = usePathname()
  const isAdmin                   = ['admin', 'moderator'].includes(role)
  const [userType, setUserType]   = useState<'reader' | 'creator'>(userTypeProp ?? 'reader')
  const supabase                  = createClient()

  useEffect(() => {
    if (userTypeProp) return // already provided by server
    const getType = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await (supabase as any)
        .from('profiles')
        .select('user_type')
        .eq('id', user.id)
        .single()
      if (profile) setUserType((profile.user_type as 'reader' | 'creator') ?? 'reader')
    }
    getType()
  }, [userTypeProp])

  const isCreator    = userType === 'creator'
  const mainItems    = isCreator ? PRO_CREATOR_ITEMS    : PRO_READER_ITEMS
  const platformItems = isCreator ? PRO_CREATOR_PLATFORM : PRO_READER_PLATFORM

  const activeClass  = isCreator
    ? 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/10'
    : 'bg-amber-500/10 text-amber-600 border border-amber-500/10'
  const activeIcon   = isCreator
    ? 'bg-gradient-to-br from-teal-400 to-cyan-500 text-white shadow-sm shadow-teal-500/30'
    : 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-sm shadow-amber-500/30'
  const activeDot    = isCreator ? 'bg-teal-500' : 'bg-amber-500'
  const submitColor  = isCreator ? 'text-teal-600 hover:bg-teal-500/10' : 'text-amber-600 hover:bg-amber-500/10'
  const submitIcon   = isCreator ? 'bg-teal-500/10 text-teal-600 group-hover:bg-teal-500/20' : 'bg-amber-500/10 text-amber-600 group-hover:bg-amber-500/20'
  const sectionLabel = isCreator ? 'text-teal-600/60' : 'text-amber-600/60'

  return (
    <div className="flex flex-col gap-0.5 h-full">

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3 mb-1">
        <div className="flex items-center gap-2.5">
          <div className={cn(
            'w-7 h-7 rounded-lg flex items-center justify-center shadow-sm',
            isCreator
              ? 'bg-gradient-to-br from-teal-400 to-cyan-500 shadow-teal-500/30'
              : 'bg-gradient-to-br from-amber-400 to-orange-500 shadow-amber-500/30'
          )}>
            {isCreator ? <Palette size={13} className="text-white" /> : <Crown size={13} className="text-white" />}
          </div>
          <div>
            <p className={cn('text-xs font-black leading-tight uppercase tracking-tight', isCreator ? 'text-teal-600' : 'text-amber-600')}>
              {isCreator ? 'Pro Creator' : 'Pro Reader'}
            </p>
            <p className="text-[10px] text-muted-foreground leading-tight">Premium Space</p>
          </div>
        </div>
        <span className={cn(
          'text-[9px] font-bold px-2 py-0.5 rounded-full border capitalize',
          isCreator
            ? 'bg-teal-500/10 text-teal-600 border-teal-500/20'
            : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
        )}>
          {isAdmin ? 'Admin' : 'Pro'}
        </span>
      </div>

      <nav className="flex flex-col gap-0.5 flex-1 overflow-y-auto">

        {/* Main items */}
        {mainItems.map(({ href, label, icon: Icon, exact }) => {
          const isActive = exact ? pathname === href : pathname.startsWith(href)
          return (
            <Link key={href} href={href}
              className={cn(
                'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                isActive ? activeClass : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
              )}
            >
              <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all',
                isActive ? activeIcon : isCreator ? 'bg-teal-500/5 group-hover:bg-teal-500/10' : 'bg-amber-500/5 group-hover:bg-amber-500/10'
              )}>
                <Icon size={14} />
              </div>
              <span className="truncate flex-1">{label}</span>
              {isActive && <div className={cn('w-1.5 h-1.5 rounded-full shrink-0', activeDot)} />}
            </Link>
          )
        })}

        <div className="my-3 border-t border-border/50" />
        <p className={cn('text-[10px] font-black uppercase tracking-widest px-3 py-1 mb-1', sectionLabel)}>
          Platform
        </p>

        {/* Platform items */}
        {platformItems.map(({ href, label, icon: Icon, isSubmit }) => {
          const isActive = isSubmit ? pathname === href : pathname === href || pathname.startsWith(href + '/')
          return (
            <Link key={href} href={href}
              className={cn(
                'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                isSubmit && !isActive ? submitColor : isActive ? activeClass : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
              )}
            >
              <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all',
                isActive ? activeIcon : isSubmit ? submitIcon : isCreator ? 'bg-teal-500/5 group-hover:bg-teal-500/10' : 'bg-amber-500/5 group-hover:bg-amber-500/10'
              )}>
                <Icon size={14} />
              </div>
              <span className="truncate flex-1">{label}</span>
              {isActive && <div className={cn('w-1.5 h-1.5 rounded-full shrink-0', activeDot)} />}
            </Link>
          )
        })}

        {isAdmin && (
          <>
            <div className="my-3 border-t border-border/50" />
            <p className="text-[10px] font-black uppercase tracking-widest text-red-500/80 px-3 py-1 mb-1">Internal</p>
            {ADMIN_ITEMS.map(({ href, label, icon: Icon }) => {
              const isActive = pathname.startsWith(href)
              return (
                <Link key={href} href={href}
                  className={cn(
                    'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                    isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
                  )}
                >
                  <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all',
                    isActive ? 'bg-primary text-primary-foreground' : 'bg-muted group-hover:bg-accent'
                  )}>
                    <Icon size={14} />
                  </div>
                  <span className="truncate flex-1">{label}</span>
                </Link>
              )
            })}
          </>
        )}
      </nav>

      <div className="mt-auto pt-3 border-t border-border/50">
        <div className="flex items-center gap-2 px-3 py-2">
          <Sparkles size={12} className={cn('animate-pulse', isCreator ? 'text-teal-500/60' : 'text-amber-500/60')} />
          <p className="text-[10px] text-muted-foreground font-medium">
            {isAdmin ? 'System Access Active' : isCreator ? 'Creator Perks Active' : 'Pro Perks Active'}
          </p>
        </div>
      </div>
    </div>
  )
}