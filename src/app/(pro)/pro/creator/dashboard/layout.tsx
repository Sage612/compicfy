import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { AdminFloatingButton } from '@/components/admin/AdminFloatingButton'
import { IncompleteRecNudge } from '@/components/dashboard/IncompleteRecNudge'
import { ProCreatorSidebar } from '@/components/pro/ProCreatorSidebar'
import { ProMobileNav } from '@/components/pro/ProMobileNav'
import { isAdmin as isAdminCheck, canAccessAdminDashboard, canAccessProDashboard } from '@/lib/access'

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

  // Admin has lifetime Pro and bypasses everything below.
  // Moderator is NOT Pro — moderator must NOT bypass this gate.
  const isAdmin = isAdminCheck(profile)
  const canSeeAdminUI = canAccessAdminDashboard(profile) // admin or moderator, for the floating admin button only

  if (!isAdmin) {
    // Non-admin: enforce user_type
    if (profile.user_type !== 'creator') redirect('/pro/reader/dashboard')

    // Non-admin: must be real Pro (moderator does NOT get a pass here)
    if (!canAccessProDashboard(profile)) redirect('/pricing?reason=pro_required')
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <div className="flex flex-1 pt-20">
        <ProCreatorSidebar />
        <main className="dashboard-main flex-1 min-w-0 overflow-auto pb-24 md:pb-0">
          <div className="px-4 pt-4 max-w-5xl mx-auto">
            <IncompleteRecNudge />
          </div>
          {children}
        </main>
      </div>
      <ProMobileNav userType="creator" />
      {canSeeAdminUI && <AdminFloatingButton />}
    </div>
  )
}