import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { AdminFloatingButton } from '@/components/admin/AdminFloatingButton'
import { IncompleteRecNudge } from '@/components/dashboard/IncompleteRecNudge'
import { DashboardNav } from '@/components/layout/DashboardNav'
import { DashboardMobileNav } from '@/components/layout/DashboardMobileNav'
import { isAdmin as isAdminCheck, isProUser } from '@/lib/access'

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

  const isAdmin = isAdminCheck(profile ?? { role: '' })

  if (!isAdmin) {
    // Non-admin: enforce user_type
    if (profile.user_type !== 'creator') redirect('/reader/dashboard')

    // Non-admin creator: if pro, send to pro creator
    const isPro = isProUser(profile ?? { role: '', is_pro: false, pro_expires_at: null })
    if (isPro) redirect('/pro/creator/dashboard')
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <div className="flex flex-1 pt-20">
        <aside className="dashboard-sidebar hidden md:flex flex-col w-56 shrink-0 border-r border-border p-3 gap-1">
          <DashboardNav />
        </aside>
        <main className="dashboard-main flex-1 min-w-0 overflow-auto pb-24 md:pb-0">
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