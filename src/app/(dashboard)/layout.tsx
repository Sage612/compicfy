import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { DashboardNav } from '@/components/layout/DashboardNav'
import { DashboardMobileNav } from '@/components/layout/DashboardMobileNav'
import { AdminFloatingButton } from '@/components/admin/AdminFloatingButton'
import { UpgradeBanner } from '@/components/pro/UpgradeBanner'
import { IncompleteRecNudge } from '@/components/dashboard/IncompleteRecNudge'
import { Crown } from 'lucide-react'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_pro, pro_expires_at, recommendation_count_this_month')
    .eq('id', user.id)
    .single() as { data: any }

  const isAdmin = ['admin', 'moderator'].includes(profile?.role ?? '')
  const isPro = profile?.is_pro &&
    (!profile.pro_expires_at || new Date(profile.pro_expires_at) > new Date())
  const isPrivileged = isAdmin || isPro
  const recCount = profile?.recommendation_count_this_month ?? 0

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex flex-1 pt-14">
        
        <aside className="hidden md:flex touch-land:hidden flex-col w-56 shrink-0 border-r border-border p-3 gap-3">
          <DashboardNav />

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

        <main className="flex-1 min-w-0 overflow-auto pb-20 md:pb-0 touch-land:pb-20">
          {!isPrivileged && recCount >= 20 && (
            <div className="px-4 pt-4">
              <UpgradeBanner
                current={recCount}
                limit={30}
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

      <DashboardMobileNav />
      {isAdmin && <AdminFloatingButton />}
    </div>
  )
}