import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { ProMobileNav } from '@/components/pro/ProMobileNav'
import { AdminFloatingButton } from '@/components/admin/AdminFloatingButton'
import { IncompleteRecNudge } from '@/components/dashboard/IncompleteRecNudge'
import { ProReaderSidebar } from '@/components/pro/ProReaderSidebar'
import type { ReactNode } from 'react'

export default async function ProReaderDashboardLayout({ children }: { children: ReactNode }) {
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
  const isPro   = isAdmin || (profile?.is_pro && (!profile.pro_expires_at || new Date(profile.pro_expires_at) > new Date()))

  if (!isPro) redirect('/pricing?reason=pro_required')

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <div className="flex flex-1 pt-20">
        <ProReaderSidebar />
        <main className="dashboard-main flex-1 min-w-0 overflow-auto pb-24 md:pb-0">
          <div className="px-4 pt-4 max-w-5xl mx-auto">
            <IncompleteRecNudge />
          </div>
          {children}
        </main>
      </div>
      <ProMobileNav userType="reader" />
      {isAdmin && <AdminFloatingButton />}
    </div>
  )
}