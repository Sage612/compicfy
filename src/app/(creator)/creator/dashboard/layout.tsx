import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { AdminFloatingButton } from '@/components/admin/AdminFloatingButton'
import { IncompleteRecNudge } from '@/components/dashboard/IncompleteRecNudge'
import { DashboardNav } from '@/components/layout/DashboardNav'
import { DashboardMobileNav } from '@/components/layout/DashboardMobileNav'

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

  const isAdmin = ['admin', 'moderator'].includes(profile?.role ?? '')

  // Admin can access any dashboard — skip user_type redirect
  if (!isAdmin && profile.user_type === 'reader') redirect('/reader/dashboard')

  const isPro = profile?.is_pro && (!profile.pro_expires_at || new Date(profile.pro_expires_at) > new Date())

  // Admin stays here even if pro — QA access
  if (isPro && !isAdmin) redirect('/pro/creator/dashboard')

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