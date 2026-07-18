import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { AdminFloatingButton } from '@/components/admin/AdminFloatingButton'
import { IncompleteRecNudge } from '@/components/dashboard/IncompleteRecNudge'
import { DashboardNav } from '@/components/layout/DashboardNav'
import { DashboardMobileNav } from '@/components/layout/DashboardMobileNav'
import { DashboardShell } from '@/components/layout/DashboardShell'
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
      <DashboardShell
        topOffset="80px"
        sidebarWidth="w-56"
        sidebarClassName="border-r border-border/70 p-3 gap-1"
        sidebar={<DashboardNav />}
      >
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