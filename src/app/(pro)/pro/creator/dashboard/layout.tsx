import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { AdminFloatingButton } from '@/components/admin/AdminFloatingButton'
import { IncompleteRecNudge } from '@/components/dashboard/IncompleteRecNudge'
import { ProCreatorSidebar } from '@/components/pro/ProCreatorSidebar'
import { ProMobileNav } from '@/components/pro/ProMobileNav'

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

  // ── Check admin FIRST — admin bypasses everything ──
  const isAdmin = ['admin', 'moderator'].includes(profile?.role ?? '')

  if (!isAdmin) {
    // Non-admin: enforce user_type
    if (profile.user_type !== 'creator') redirect('/pro/reader/dashboard')

    // Non-admin: must be pro
    const isPro = profile?.is_pro &&
      (!profile.pro_expires_at || new Date(profile.pro_expires_at) > new Date())
    if (!isPro) redirect('/pricing?reason=pro_required')
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
      {isAdmin && <AdminFloatingButton />}
    </div>
  )
}