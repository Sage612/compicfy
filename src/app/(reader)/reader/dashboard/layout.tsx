import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { AdminFloatingButton } from '@/components/admin/AdminFloatingButton'
import { IncompleteRecNudge } from '@/components/dashboard/IncompleteRecNudge'
import { UpgradeBanner } from '@/components/pro/UpgradeBanner'
import { DashboardNav } from '@/components/layout/DashboardNav'
import { DashboardMobileNav } from '@/components/layout/DashboardMobileNav'
import { DashboardShell } from '@/components/layout/DashboardShell'
import { isAdmin as isAdminCheck, isProUser } from '@/lib/access'

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
    .select('role, is_pro, pro_expires_at, user_type')
    .eq('id', user.id)
    .single() as { data: any }

  if (!profile) redirect('/login')

  const isAdmin = isAdminCheck(profile ?? { role: '' })

  if (!isAdmin) {
    // Non-admin: enforce user_type
    if (profile.user_type === 'creator') redirect('/creator/dashboard')

    // Non-admin reader: if pro, send to pro reader
    const isPro = isProUser(profile ?? { role: '', is_pro: false, pro_expires_at: null })
    if (isPro) redirect('/pro/reader/dashboard')
  }

  let recCount = 0
  if (!isAdmin) {
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const { count } = await supabase
      .from('recommendations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', startOfMonth.toISOString())

    recCount = count ?? 0
  }

  const FREE_REC_LIMIT = 50
  const showBanner     = !isAdmin && recCount >= 20

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <DashboardShell
        topOffset="80px"
        sidebarWidth="w-56"
        sidebarClassName="border-r border-border/70 p-3 gap-1"
        sidebar={<DashboardNav />}
      >
        {showBanner && (
          <div className="px-4 pt-4">
            <UpgradeBanner
              current={recCount}
              limit={FREE_REC_LIMIT}
              feature="recommendations this month"
              message={
                recCount >= FREE_REC_LIMIT
                  ? `You've reached your monthly recommendation limit`
                  : `You're approaching your monthly recommendation limit`
              }
              dismissible
            />
          </div>
        )}
        <div className="px-4 pt-4">
          <IncompleteRecNudge />
        </div>
        {children}
      </DashboardShell>
      <DashboardMobileNav />
      {isAdmin && <AdminFloatingButton />}
    </div>
  )
}