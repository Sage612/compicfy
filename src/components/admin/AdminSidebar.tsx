'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, BookOpen, Newspaper,
  Users, Flag, ScrollText, Star, Mail, Shield, BarChart3,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props { role: 'admin' | 'moderator' }

const sharedItems = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/admin/analytics',        label: 'Analytics',       icon: BarChart3                 },
  { href: '/admin/recommendations',  label: 'Recommendations', icon: BookOpen                     },
  { href: '/admin/news',             label: 'News',            icon: Newspaper                    },
  { href: '/admin/reports',          label: 'Reports',         icon: Flag                         },
  { href: '/admin/reviews',          label: 'Reviews',         icon: Star                         },
]

const adminOnlyItems = [
  { href: '/admin/users',      label: 'Users',         icon: Users      },
  { href: '/admin/logs',       label: 'Activity Logs', icon: ScrollText },
  { href: '/admin/test-email', label: 'Test Emails',   icon: Mail       },
]

const mobileShared = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/admin/analytics',        label: 'Analytics',       icon: BarChart3                 },
  { href: '/admin/recommendations', label: 'Recs',     icon: BookOpen                     },
  { href: '/admin/news',            label: 'News',     icon: Newspaper                    },
  { href: '/admin/reports',         label: 'Reports',  icon: Flag                         },
  { href: '/admin/reviews',         label: 'Reviews',  icon: Star                         },
]

const mobileAdminOnly = [
  { href: '/admin/users',      label: 'Users',  icon: Users      },
  { href: '/admin/logs',       label: 'Logs',   icon: ScrollText },
  { href: '/admin/test-email', label: 'Emails', icon: Mail       },
]

export function AdminSidebar({ role }: Props) {
  const pathname = usePathname()
  const navItems = role === 'admin' ? [...sharedItems, ...adminOnlyItems] : sharedItems

  return (
    <aside className="hidden md:flex flex-col w-56 shrink-0 border-r border-border p-3 gap-0.5">
      {/* Panel header */}
      <div className="flex items-center justify-between px-3 py-2.5 mb-1">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center">
            <Shield size={11} className="text-white" />
          </div>
          <p className="text-xs font-black uppercase tracking-widest text-foreground">Admin</p>
        </div>
        <span className={cn(
          'text-[10px] font-bold px-2 py-0.5 rounded-full capitalize border',
          role === 'admin'
            ? 'bg-primary/10 text-primary border-primary/20'
            : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
        )}>
          {role}
        </span>
      </div>

      {navItems.map(({ href, label, icon: Icon, exact }: any) => {
        const isActive = exact ? pathname === href : pathname.startsWith(href)
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
            <span className="truncate">{label}</span>
            {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
          </Link>
        )
      })}
    </aside>
  )
}

export function AdminMobileNav({ role }: Props) {
  const pathname = usePathname()
  const items = role === 'admin' ? [...mobileShared, ...mobileAdminOnly] : mobileShared

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background/95 backdrop-blur-lg border-t border-border">
      <div className="flex overflow-x-auto no-scrollbar px-1 py-1.5">
        {items.map(({ href, label, icon: Icon, exact }: any) => {
          const isActive = exact ? pathname === href : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'relative flex flex-col items-center gap-1 px-3 py-1.5 min-w-[56px] flex-none rounded-xl transition-all duration-150',
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <div className={cn(
                'w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-150',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/30'
                  : 'hover:bg-accent/60'
              )}>
                <Icon size={17} />
              </div>
              <span className={cn(
                'text-[9px] font-semibold whitespace-nowrap leading-none',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}>
                {label}
              </span>
              {isActive && (
                <span className="absolute -bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}