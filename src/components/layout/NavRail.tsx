'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useRef } from 'react'
import {
  Radar, Layers, ScrollText, ShoppingBag,
  LayoutList, BookMarked, BookOpen, Crown,
  ChevronRight, House, Globe,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItem {
  href:    string
  label:   string
  icon:    React.ElementType
  accent?: string
  badge?:  string
}

const NAV_ITEMS: NavItem[] = [
  { href: '/',            label: 'Home',        icon: House,       accent: 'text-primary'   },
  { href: '/browse',      label: 'Browse',      icon: Radar,       accent: 'text-primary'   },
  { href: '/collections', label: 'Collections', icon: Layers,      accent: 'text-primary'   },
  // Public community lists — distinct from user's personal dashboard lists
  { href: '/lists',       label: 'Lists Hub',   icon: Globe,       accent: 'text-primary',  badge: 'Community' },
  { href: '/news',        label: 'News',        icon: ScrollText,  accent: 'text-primary'   },
  { href: '/affiliate',   label: 'Shop',        icon: ShoppingBag, accent: 'text-primary'   },
]

interface Props {
  isLoggedIn: boolean
  isPro:      boolean
  isCreator:  boolean
  listsHref:  string
  listsLabel: string
}

export function NavRail({ isLoggedIn, isPro, isCreator, listsHref, listsLabel }: Props) {
  const pathname        = usePathname()
  const [open, setOpen] = useState(false)
  const closeTimer      = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handleMouseEnter = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    setOpen(true)
  }

  const handleMouseLeave = () => {
    closeTimer.current = setTimeout(() => setOpen(false), 120)
  }

  const items: NavItem[] = [
    ...NAV_ITEMS,
    ...(isLoggedIn ? [
      { href: '/feed',   label: 'Feed',      icon: LayoutList,                         accent: 'text-primary'  },
      // Personal dashboard lists — labelled distinctly from /lists hub
      { href: listsHref, label: isCreator ? listsLabel : 'My Lists', icon: isCreator ? BookOpen : BookMarked, accent: 'text-teal-500' },
    ] : []),
    ...(!isPro ? [
      { href: '/pricing', label: 'Go Pro', icon: Crown, accent: 'text-amber-500' },
    ] : []),
  ]

  return (
    <>
      {/* Always-visible 48px collapsed strip */}
      <div className="hidden lg:block fixed left-0 top-16 bottom-0 w-12 z-40 bg-background border-r border-border/40" />

      {/* Expanding rail */}
      <div
        className={cn(
          'fixed left-0 top-16 bottom-0 z-50',
          'hidden lg:flex flex-col',
          'transition-all duration-200 ease-out',
          open ? 'w-52' : 'w-12',
          'bg-background backdrop-blur-xl border-r border-border/60',
          open && 'shadow-2xl shadow-black/20',
          'overflow-hidden',
        )}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {!open && (
          <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-20">
            <ChevronRight size={10} className="text-muted-foreground" />
          </div>
        )}

        <nav className="flex flex-col gap-0.5 p-1.5 flex-1 overflow-y-auto pt-3">
          {items.map(({ href, label, icon: Icon, accent, badge }) => {
            const isActive  = href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/')
            const isPricing = href === '/pricing'
            // /lists should only be active on exactly /lists or /lists/[id], not /reader/dashboard/lists
            const isListsHub = href === '/lists'
            const active = isListsHub
              ? pathname === '/lists' || (pathname.startsWith('/lists/') && !pathname.startsWith('/reader'))
              : isActive

            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={cn(
                  'group flex items-center gap-3 px-2.5 py-2.5 rounded-xl transition-all duration-150 relative overflow-hidden',
                  active
                    ? 'bg-primary/10 text-primary'
                    : isPricing
                    ? 'text-amber-500 hover:bg-amber-500/10'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
                )}
              >
                {active && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full bg-primary" />
                )}

                <div className={cn(
                  'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all',
                  active
                    ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/30'
                    : isPricing
                    ? 'bg-amber-500/10 text-amber-500 group-hover:bg-amber-500/20'
                    : `bg-muted group-hover:bg-accent ${accent}`
                )}>
                  <Icon size={14} className={active ? 'text-primary-foreground' : ''} />
                </div>

                <div className="flex items-center gap-1.5 min-w-0">
                  <span className={cn(
                    'text-sm font-medium whitespace-nowrap transition-all duration-150',
                    open ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 pointer-events-none',
                  )}>
                    {label}
                  </span>
                  {badge && open && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[8px] font-black bg-primary/10 text-primary border border-primary/20 shrink-0">
                      {badge}
                    </span>
                  )}
                </div>

                {isPricing && open && (
                  <Crown size={10} className="ml-auto text-amber-500 fill-amber-500 shrink-0" />
                )}
              </Link>
            )
          })}
        </nav>

        {open && (
          <div className="px-4 pb-4 pt-2 border-t border-border/50">
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">
              Navigation
            </p>
          </div>
        )}
      </div>
    </>
  )
}