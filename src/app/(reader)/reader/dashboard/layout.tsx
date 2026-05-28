import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { AdminFloatingButton } from '@/components/admin/AdminFloatingButton'
import { IncompleteRecNudge } from '@/components/dashboard/IncompleteRecNudge'
import { UpgradeBanner } from '@/components/pro/UpgradeBanner'
import { DashboardNav } from '@/components/layout/DashboardNav'
import { DashboardMobileNav } from '@/components/layout/DashboardMobileNav'

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

  // ── Check admin FIRST — admin bypasses everything ──
  const isAdmin = ['admin', 'moderator'].includes(profile?.role ?? '')

  if (!isAdmin) {
    // Non-admin: enforce user_type
    if (profile.user_type === 'creator') redirect('/creator/dashboard')

    // Non-admin reader: if pro, send to pro reader
    const isPro = profile?.is_pro &&
      (!profile.pro_expires_at || new Date(profile.pro_expires_at) > new Date())
    if (isPro) redirect('/pro/reader/dashboard')
  }

  const recCount = profile?.recommendation_count_this_month ?? 0

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <div className="flex flex-1 pt-20">
        <aside className="dashboard-sidebar hidden md:flex flex-col w-56 shrink-0 border-r border-border p-3 gap-1">
          <DashboardNav />
        </aside>
        <main className="dashboard-main flex-1 min-w-0 overflow-auto pb-24 md:pb-0">
          {!isAdmin && recCount >= 20 && (
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
      <DashboardMobileNav />
      {isAdmin && <AdminFloatingButton />}
    </div>
  )
}