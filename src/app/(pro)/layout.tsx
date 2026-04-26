import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { ProSidebar } from '@/components/pro/ProSidebar'
import { ProMobileNav } from '@/components/pro/ProMobileNav'
import { AdminFloatingButton } from '@/components/admin/AdminFloatingButton'
import { IncompleteRecNudge } from '@/components/dashboard/IncompleteRecNudge'

type Profile = {
  role: string
  is_pro: boolean
  pro_expires_at: string | null
}

export default async function ProLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_pro, pro_expires_at')
    .eq('id', user.id)
    .single() as { data: Profile | null }

  if (!profile) redirect('/login')

  const isAdmin = profile.role === 'admin'
  const isPro = isAdmin ||
    (profile.is_pro &&
      (!profile.pro_expires_at || new Date(profile.pro_expires_at) > new Date()))

  if (!isPro) redirect('/pricing?reason=pro_required')

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex flex-1 pt-14">
        {/* Desktop sidebar — hidden on landscape touch phones */}
        <aside className="hidden md:flex touch-land:hidden flex-col w-60 shrink-0 border-r border-border p-3 gap-3">
          <ProSidebar role={profile.role ?? 'user'} />
        </aside>

        {/* Main content — restore bottom padding on landscape phones */}
        <main className="flex-1 min-w-0 overflow-auto pb-20 md:pb-0 touch-land:pb-20">
          <IncompleteRecNudge />
          {children}
        </main>
      </div>

      <ProMobileNav role={profile.role ?? 'user'} />
      {isAdmin && <AdminFloatingButton />}
    </div>
  )
}