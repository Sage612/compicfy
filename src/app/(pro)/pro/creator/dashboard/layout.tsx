import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { AdminFloatingButton } from '@/components/admin/AdminFloatingButton'
import { IncompleteRecNudge } from '@/components/dashboard/IncompleteRecNudge'
import {
  Crown, BookOpen, Users, Link as LinkIcon,
  Bell, Settings, CreditCard, BarChart2, LayoutDashboard,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/pro/creator/dashboard',               label: 'Dashboard',      icon: LayoutDashboard },
  { href: '/pro/creator/dashboard/works',         label: 'My Works',       icon: BookOpen        },
  { href: '/pro/creator/dashboard/audience',      label: 'Audience',       icon: Users           },
  { href: '/pro/creator/dashboard/analytics',     label: 'Analytics',      icon: BarChart2       },
  { href: '/pro/creator/dashboard/links',         label: 'My Links',       icon: LinkIcon        },
  { href: '/pro/creator/dashboard/notifications', label: 'Notifications',  icon: Bell            },
  { href: '/pro/creator/dashboard/settings',      label: 'Settings',       icon: Settings        },
  { href: '/pro/creator/dashboard/billing',       label: 'Billing',        icon: CreditCard      },
]

export default async function ProCreatorDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_pro, pro_expires_at, user_type')
    .eq('id', user.id)
    .single() as { data: any }

  if (!profile) redirect('/login')

  if (profile.user_type === 'reader') redirect('/pro/reader/dashboard')

  const isAdmin = ['admin', 'moderator'].includes(profile?.role ?? '')
  const isPro   = isAdmin || (profile?.is_pro &&
    (!profile.pro_expires_at || new Date(profile.pro_expires_at) > new Date()))

  if (!isPro) redirect('/pricing?reason=pro_required')

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <div className="flex flex-1 pt-20">
        <aside className="dashboard-sidebar flex-col w-56 shrink-0 border-r border-border p-3 gap-1">
          {/* Pro creator identity pill */}
          <div className="flex items-center gap-2 px-3 py-2 mb-2 rounded-xl bg-gradient-to-r from-teal-500/15 to-amber-500/15 border border-teal-500/20">
            <div className="w-5 h-5 rounded-md bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center shrink-0">
              <Crown size={11} className="text-white" />
            </div>
            <span className="text-xs font-black bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">Pro Creator</span>
          </div>

          <div className="flex-1 space-y-0.5">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                )}
              >
                <Icon size={15} className="shrink-0" />
                {label}
              </Link>
            ))}
          </div>
        </aside>

        <main className="dashboard-main flex-1 min-w-0 overflow-auto">
          <div className="px-4 pt-4">
            <IncompleteRecNudge />
          </div>
          {children}
        </main>
      </div>

      {isAdmin && <AdminFloatingButton />}
    </div>
  )
}