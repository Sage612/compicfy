'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useRef } from 'react'
import {
  Radar, Layers, ScrollText, ShoppingBag,
  LayoutList, BookMarked, BookOpen, Crown,
  ChevronRight, House, Globe, Sparkles,
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
    closeTimer.current = setTimeout(() => setOpen(false), 150) // slightly smoother delay
  }

  const items: NavItem[] = [
    ...NAV_ITEMS,
    ...(isLoggedIn ? [
      { href: '/feed',    label: 'Feed',    icon: LayoutList, accent: 'text-primary' },
      { href: '/matches', label: 'Matches', icon: Sparkles,   accent: 'text-primary' },
      // Personal dashboard lists — labelled distinctly from /lists hub
      { href: listsHref, label: isCreator ? listsLabel : 'My Lists', icon: isCreator ? BookOpen : BookMarked, accent: 'text-teal-500' },
    ] : []),
    ...(!isPro ? [
      { href: '/pricing', label: 'Go Pro', icon: Crown, accent: 'text-amber-500' },
    ] : []),
  ]

  return (
    <>
      {/* Always-visible 48px collapsed strip spacer */}
      <div className="hidden lg:block fixed left-0 top-16 bottom-0 w-12 z-40 bg-background/50 border-r border-border/40" />

      {/* Expanding rail */}
      <div
        className={cn(
          'fixed left-0 top-16 bottom-0 z-50',
          'hidden lg:flex flex-col',
          'transition-[width,box-shadow,background-color] duration-300 ease-in-out',
          open ? 'w-52 bg-background/95 shadow-2xl shadow-black/10 dark:shadow-black/40' : 'w-12 bg-background/60',
          'backdrop-blur-xl border-r border-border/50',
          'overflow-hidden',
        )}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Subtle expand hint */}
        {!open && (
          <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-30 transition-opacity duration-300 hover:opacity-100">
            <ChevronRight size={12} className="text-muted-foreground" />
          </div>
        )}

        <nav className="flex flex-col gap-1 p-1.5 flex-1 overflow-y-auto pt-4 scrollbar-none">
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
                  'group flex items-center gap-3 px-2 py-2 rounded-xl transition-all duration-200 relative overflow-hidden',
                  active
                    ? 'bg-primary/10 text-primary dark:bg-primary/15'
                    : isPricing
                    ? 'text-amber-600 dark:text-amber-500 hover:bg-amber-500/10'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
                )}
              >
                {/* Active Indicator Line */}
                {active && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-primary shadow-[0_0_8px_rgba(var(--primary),0.5)]" />
                )}

                {/* Icon Wrapper */}
                <div className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110',
                  active
                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25'
                    : isPricing
                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-500 group-hover:bg-amber-500/20'
                    : `bg-transparent group-hover:bg-muted-foreground/10 ${accent}`
                )}>
                  <Icon size={16} className={active ? 'text-primary-foreground' : ''} />
                </div>

                {/* Label & Badge */}
                <div className="flex items-center gap-2 min-w-0">
                  <span className={cn(
                    'text-sm font-semibold whitespace-nowrap transition-all duration-300',
                    open ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 pointer-events-none',
                  )}>
                    {label}
                  </span>
                  
                  {badge && open && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black tracking-wide uppercase bg-primary/10 text-primary border border-primary/20 shrink-0">
                      {badge}
                    </span>
                  )}
                </div>

                {/* Pricing Icon Right Aligned */}
                {isPricing && open && (
                  <Crown size={12} className="ml-auto text-amber-500 fill-amber-500/20 shrink-0 animate-pulse" />
                )}
              </Link>
            )
          })}
        </nav>

        {/* Footer Label */}
        <div className={cn(
          "transition-all duration-300 ease-in-out border-t border-border/50 bg-muted/20",
          open ? "px-4 py-3 opacity-100" : "px-0 py-0 opacity-0 h-0"
        )}>
          <p className="text-[10px] text-muted-foreground/80 font-bold uppercase tracking-[0.2em] whitespace-nowrap">
            Navigation
          </p>
        </div>
      </div>
    </>
  )
}