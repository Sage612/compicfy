import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardNav } from '@/components/layout/DashboardNav'
import { Header } from '@/components/layout/Header'
import { MobileNav } from '@/components/layout/MobileNav'
import { AdminFloatingButton } from '@/components/admin/AdminFloatingButton'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')
  let isAdmin = false
  if (user) {
    const { data: profile } = await (supabase as any)
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    isAdmin = ['admin', 'moderator'].includes(profile?.role ?? '')
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex flex-1 pt-14">
        <DashboardNav />
        <main className="flex-1 min-w-0 pb-16 md:pb-0">
          {children}
        </main>
      </div>
      <MobileNav />
      {isAdmin && <AdminFloatingButton />}
    </div>
  )
}