import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { DashboardNav } from '@/components/layout/DashboardNav'
import { DashboardMobileNav } from '@/components/layout/DashboardMobileNav'
import { AdminFloatingButton } from '@/components/admin/AdminFloatingButton'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isAdmin = ['admin', 'moderator'].includes(profile?.role ?? '')

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex flex-1 pt-14">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex flex-col w-56 shrink-0 border-r border-border p-3 gap-1">
          <DashboardNav />
        </aside>
        {/* Main content — extra bottom padding on mobile for nav */}
        <main className="flex-1 min-w-0 overflow-auto pb-20 md:pb-0">
          {children}
        </main>
      </div>
      {/* Mobile bottom nav */}
      <DashboardMobileNav />
      {isAdmin && <AdminFloatingButton />}
    </div>
  )
}