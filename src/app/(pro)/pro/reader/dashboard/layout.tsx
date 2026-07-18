import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { ProMobileNav } from '@/components/pro/ProMobileNav'
import { AdminFloatingButton } from '@/components/admin/AdminFloatingButton'
import { IncompleteRecNudge } from '@/components/dashboard/IncompleteRecNudge'
import { ProReaderSidebar } from '@/components/pro/ProReaderSidebar'
import { DashboardShell } from '@/components/layout/DashboardShell'
import type { ReactNode } from 'react'
import { isAdmin as isAdminCheck, canAccessAdminDashboard, canAccessProDashboard } from '@/lib/access'

export default async function ProReaderDashboardLayout({
  children,
}: {
  children: ReactNode
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

  const isAdmin = isAdminCheck(profile)
  const canSeeAdminUI = canAccessAdminDashboard(profile) // admin or moderator, for the floating admin button only

  if (!isAdmin) {
    // Non-admin: enforce user_type
    if (profile.user_type === 'creator') redirect('/pro/creator/dashboard')
    if (!canAccessProDashboard(profile)) redirect('/pricing?reason=pro_required')
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <DashboardShell
        topOffset="80px"
        sidebarWidth="w-60"
        sidebarClassName="border-r border-border/70 p-3"
        sidebar={<ProReaderSidebar />}
      >
        <div className="px-4 pt-4 max-w-5xl mx-auto">
          <IncompleteRecNudge />
        </div>
        {children}
      </DashboardShell>
      <ProMobileNav userType="reader" />
      {canSeeAdminUI && <AdminFloatingButton />}
    </div>
  )
}