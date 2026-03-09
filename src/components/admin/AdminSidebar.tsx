'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  BookOpen,
  Newspaper,
  Users,
  Flag,
  ScrollText,
  Star,
  Mail,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  role: 'admin' | 'moderator'
}

const sharedItems = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/admin/recommendations', label: 'Recommendations', icon: BookOpen },
  { href: '/admin/news', label: 'News', icon: Newspaper },
  { href: '/admin/reports', label: 'Reports', icon: Flag },
  { href: '/admin/reviews', label: 'Reviews', icon: Star },
]

const adminOnlyItems = [
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/logs', label: 'Activity Logs', icon: ScrollText },
  { href: '/admin/test-email', label: 'Test Emails', icon: Mail },
]

const mobileSharedItems = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/admin/recommendations', label: 'Recs', icon: BookOpen },
  { href: '/admin/news', label: 'News', icon: Newspaper },
  { href: '/admin/reports', label: 'Reports', icon: Flag },
  { href: '/admin/reviews', label: 'Reviews', icon: Star },
]

const mobileAdminOnlyItems = [
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/logs', label: 'Logs', icon: ScrollText },
  { href: '/admin/test-email', label: 'Emails', icon: Mail },
]

export function AdminSidebar({ role }: Props) {
  const pathname = usePathname()
  const navItems = role === 'admin'
    ? [...sharedItems, ...adminOnlyItems]
    : sharedItems

  return (
    <aside className="hidden md:flex flex-col w-56 shrink-0 border-r border-border p-3 gap-1">
      <div className="px-3 py-2 flex items-center justify-between">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          Admin Panel
        </p>
        <span className={cn(
          'text-[10px] font-semibold px-1.5 py-0.5 rounded capitalize',
          role === 'admin'
            ? 'bg-primary/10 text-primary'
            : 'bg-yellow-500/10 text-yellow-600'
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
              'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors',
              isActive
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
            )}
          >
            <Icon size={16} />
            {label}
          </Link>
        )
      })}
    </aside>
  )
}

export function AdminMobileNav({ role }: Props) {
  const pathname = usePathname()
  const items = role === 'admin'
    ? [...mobileSharedItems, ...mobileAdminOnlyItems]
    : mobileSharedItems

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background/95 backdrop-blur-md border-t border-border">
      <div className="flex overflow-x-auto no-scrollbar">
        {items.map(({ href, label, icon: Icon, exact }: any) => {
          const isActive = exact ? pathname === href : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center gap-0.5 px-3 py-3 min-w-[56px] flex-none transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon size={18} />
              <span className="text-[9px] font-medium">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}