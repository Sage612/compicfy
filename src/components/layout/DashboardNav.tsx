'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, BookOpen, Bookmark,
  Star, Bell, Settings, BookMarked, CreditCard, Crown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

const baseNavItems = [
  { href: '/dashboard',                  label: 'Overview',           icon: LayoutDashboard, exact: true },
  { href: '/dashboard/recommendations',  label: 'My Recommendations', icon: BookOpen         },
  { href: '/dashboard/saved',            label: 'Saved Comics',       icon: Bookmark         },
  { href: '/dashboard/lists',            label: 'Reading Lists',      icon: BookMarked       },
  { href: '/dashboard/reviews',          label: 'My Reviews',         icon: Star             },
  { href: '/dashboard/notifications',    label: 'Notifications',      icon: Bell             },
  { href: '/dashboard/settings',         label: 'Settings',           icon: Settings         },
  { href: '/dashboard/billing',          label: 'Billing',            icon: CreditCard       },
]

export function DashboardNav() {
  const pathname = usePathname()
  const [isPro, setIsPro] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const getProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoaded(true); return }

      const { data: profile } = await (supabase as any)
        .from('profiles')
        .select('is_pro, pro_expires_at, role')
        .eq('id', user.id)
        .single()

      if (profile) {
        setIsAdmin(profile.role === 'admin')
        setIsPro(
          ['admin', 'moderator'].includes(profile.role) ||
          (profile.is_pro && (!profile.pro_expires_at || new Date(profile.pro_expires_at) > new Date()))
        )
      }
      setLoaded(true)
    }
    getProfile()
  }, [])

  return (
    <nav className="flex flex-col gap-0.5">
      {baseNavItems.map(({ href, label, icon: Icon, exact }) => {
        const isActive = exact ? pathname === href : pathname.startsWith(href)
        const isBilling = href === '/dashboard/billing'

        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
              isActive
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
            )}
          >
            <div className={cn(
              'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all',
              isActive
                ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/30'
                : 'bg-muted group-hover:bg-accent'
            )}>
              <Icon size={14} />
            </div>
            <span className="truncate flex-1">{label}</span>

            {/* Pro upgrade hint on billing for free users */}
            {isBilling && loaded && !isPro && !isAdmin && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 text-[9px] font-black border border-amber-500/20 shrink-0">
                <Crown size={8} className="fill-amber-500" />
                Pro
              </span>
            )}

            {isActive && (
              <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
            )}
          </Link>
        )
      })}
    </nav>
  )
}