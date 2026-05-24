import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { AdminFloatingButton } from '@/components/admin/AdminFloatingButton'
import { IncompleteRecNudge } from '@/components/dashboard/IncompleteRecNudge'
import { UpgradeBanner } from '@/components/pro/UpgradeBanner'
import { Crown, BookOpen, Bookmark, BookMarked, Bell, Settings, CreditCard, Star } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/reader/dashboard',                      label: 'Dashboard',        icon: BookOpen   },
  { href: '/reader/dashboard/recommendations',      label: 'My Recs',          icon: BookOpen   },
  { href: '/reader/dashboard/saved',                label: 'Saved',            icon: Bookmark   },
  { href: '/reader/dashboard/lists',                label: 'Reading Lists',    icon: BookMarked },
  { href: '/reader/dashboard/reviews',              label: 'My Reviews',       icon: Star       },
  { href: '/reader/dashboard/notifications',        label: 'Notifications',    icon: Bell       },
  { href: '/reader/dashboard/settings',             label: 'Settings',         icon: Settings   },
  { href: '/reader/dashboard/billing',              label: 'Billing',          icon: CreditCard },
]

export default async function ReaderDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_pro, pro_expires_at, recommendation_count_this_month, user_type')
    .eq('id', user.id)
    .single() as { data: any }

  if (!profile) redirect('/login')

  // Creators don't belong here
  if (profile.user_type === 'creator') redirect('/creator/dashboard')

  const isAdmin      = ['admin', 'moderator'].includes(profile?.role ?? '')
  const isPro        = profile?.is_pro &&
    (!profile.pro_expires_at || new Date(profile.pro_expires_at) > new Date())
  const isPrivileged = isAdmin || isPro
  const recCount     = profile?.recommendation_count_this_month ?? 0

  // Pro readers get the pro layout
  if (isPro && !isAdmin) redirect('/pro/reader/dashboard')

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <div className="flex flex-1 pt-20">
        <aside className="dashboard-sidebar flex-col w-56 shrink-0 border-r border-border p-3 gap-1">
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

          {!isPrivileged && (
            <div className="mt-auto pt-3 border-t border-border">
              <Link
                href="/pricing"
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-amber-500/8 border border-amber-500/20 hover:bg-amber-500/15 transition-colors group"
              >
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                  <Crown size={12} className="text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-black text-amber-600 leading-tight">Upgrade to Pro</p>
                  <p className="text-[10px] text-muted-foreground leading-tight truncate">Unlimited everything</p>
                </div>
              </Link>
            </div>
          )}
        </aside>

        <main className="dashboard-main flex-1 min-w-0 overflow-auto">
          {!isPrivileged && recCount >= 20 && (
            <div className="px-4 pt-4">
              <UpgradeBanner
                current={recCount}
                limit={50}
                feature="recommendations this month"
                message="You're getting close to your monthly limit"
                dismissible
              />
            </div>
          )}
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