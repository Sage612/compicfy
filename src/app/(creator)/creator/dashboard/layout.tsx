import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { AdminFloatingButton } from '@/components/admin/AdminFloatingButton'
import { Crown, LayoutDashboard, BookOpen, Users, Link as LinkIcon, Bell, Settings, CreditCard, BarChart2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/creator/dashboard',               label: 'Dashboard', icon: LayoutDashboard },
  { href: '/creator/dashboard/works',         label: 'My Works',  icon: BookOpen        },
  { href: '/creator/dashboard/audience',      label: 'Audience',  icon: Users           },
  { href: '/creator/dashboard/links',         label: 'My Links',  icon: LinkIcon        },
  { href: '/creator/dashboard/notifications', label: 'Notifications', icon: Bell        },
  { href: '/creator/dashboard/settings',      label: 'Settings',  icon: Settings        },
  { href: '/creator/dashboard/billing',       label: 'Billing',   icon: CreditCard      },
]

export default async function CreatorDashboardLayout({
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

  // Readers don't belong here
  if (profile.user_type === 'reader') redirect('/reader/dashboard')

  const isAdmin = ['admin', 'moderator'].includes(profile?.role ?? '')
  const isPro   = profile?.is_pro &&
    (!profile.pro_expires_at || new Date(profile.pro_expires_at) > new Date())

  // Pro creators get the pro layout
  if (isPro && !isAdmin) redirect('/pro/creator/dashboard')

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <div className="flex flex-1 pt-20">
        <aside className="dashboard-sidebar flex-col w-56 shrink-0 border-r border-border p-3 gap-1">
          {/* Creator identity pill */}
          <div className="flex items-center gap-2 px-3 py-2 mb-2 rounded-xl bg-teal-500/10 border border-teal-500/20">
            <div className="w-5 h-5 rounded-md bg-teal-500 flex items-center justify-center shrink-0">
              <BookOpen size={11} className="text-white" />
            </div>
            <span className="text-xs font-black text-teal-600 dark:text-teal-400">Creator Studio</span>
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

          <div className="mt-auto pt-3 border-t border-border">
            <Link
              href="/pricing"
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-teal-500/8 border border-teal-500/20 hover:bg-teal-500/15 transition-colors group"
            >
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                <Crown size={12} className="text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black text-teal-600 leading-tight">Go Pro Creator</p>
                <p className="text-[10px] text-muted-foreground leading-tight truncate">Analytics + more</p>
              </div>
            </Link>
          </div>
        </aside>

        <main className="dashboard-main flex-1 min-w-0 overflow-auto">
          {children}
        </main>
      </div>

      {isAdmin && <AdminFloatingButton />}
    </div>
  )
}