'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useRef } from 'react'
import {
  Radar, LayoutGrid, ScrollText, ShoppingBag,
  LayoutList, BookMarked, BookOpen, Crown,
  ChevronRight,
  Home,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItem {
  href:     string
  label:    string
  icon:     React.ElementType
  authOnly?: boolean
  proOnly?:  boolean
  accent?:   string
}

const NAV_ITEMS: NavItem[] = [
  { href: '/',        label: 'Home',        icon: Home,  accent: 'text-primary'     },
  { href: '/browse',      label: 'Browse',      icon: Radar,       accent: 'text-rose-500'    },
  { href: '/collections', label: 'Collections', icon: LayoutGrid,  accent: 'text-violet-500'  },
  { href: '/news',        label: 'News',        icon: ScrollText,  accent: 'text-blue-500'    },
  { href: '/affiliate',   label: 'Shop',        icon: ShoppingBag, accent: 'text-amber-500'   },
]

const AUTH_ITEMS: NavItem[] = [
  { href: '/feed',        label: 'Feed',        icon: LayoutList,  accent: 'text-primary'     },
]

interface Props {
  isLoggedIn:  boolean
  isPro:       boolean
  isCreator:   boolean
  listsHref:   string
  listsLabel:  string
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

  const items = [
    ...NAV_ITEMS,
    ...(isLoggedIn ? [
      ...AUTH_ITEMS,
      {
        href:   listsHref,
        label:  listsLabel,
        icon:   isCreator ? BookOpen : BookMarked,
        accent: isCreator ? 'text-teal-500' : 'text-teal-500',
      },
    ] : []),
    ...(!isPro ? [{
      href:   '/pricing',
      label:  'Go Pro',
      icon:   Crown,
      accent: 'text-amber-500',
    }] : []),
  ]

  return (
    <>
      {/* Backdrop — subtle, only on open */}
      {open && (
        <div
          className="fixed inset-0 z-40 lg:block hidden"
          onMouseEnter={handleMouseLeave}
        />
      )}

      {/* Rail */}
      <div
        className={cn(
          'fixed left-0 top-16 bottom-0 z-50',
          'hidden lg:flex flex-col',
          'transition-all duration-200 ease-out',
          open ? 'w-52' : 'w-12',
          'bg-background/98 backdrop-blur-xl border-r border-border/60 shadow-2xl shadow-black/20',
          'overflow-hidden',
        )}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Expand hint when collapsed */}
        {!open && (
          <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-30">
            <ChevronRight size={10} className="text-muted-foreground" />
          </div>
        )}

        <nav className="flex flex-col gap-0.5 p-1.5 flex-1 overflow-y-auto pt-3">
          {items.map(({ href, label, icon: Icon, accent }) => {
            const isActive = pathname === href || pathname.startsWith(href + '/')
            const isPricing = href === '/pricing'

            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={cn(
                  'group flex items-center gap-3 px-2.5 py-2.5 rounded-xl transition-all duration-150 relative overflow-hidden',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : isPricing
                    ? 'text-amber-500 hover:bg-amber-500/10'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
                )}
              >
                {/* Active indicator */}
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full bg-primary" />
                )}

                {/* Icon — always visible */}
                <div className={cn(
                  'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/30'
                    : isPricing
                    ? 'bg-amber-500/10 text-amber-500 group-hover:bg-amber-500/20'
                    : `bg-muted group-hover:bg-accent ${accent}`
                )}>
                  <Icon size={14} className={isActive ? 'text-primary-foreground' : ''} />
                </div>

                {/* Label — only visible when expanded */}
                <span className={cn(
                  'text-sm font-medium whitespace-nowrap transition-all duration-150',
                  open ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 pointer-events-none',
                )}>
                  {label}
                </span>

                {/* Pro crown badge */}
                {isPricing && open && (
                  <Crown size={10} className="ml-auto text-amber-500 fill-amber-500 shrink-0" />
                )}
              </Link>
            )
          })}
        </nav>

        {/* Bottom: expand label */}
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