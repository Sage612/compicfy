import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { AdminSidebar, AdminMobileNav } from '@/components/admin/AdminSidebar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'moderator'].includes(profile.role)) {
    redirect('/dashboard')
  }

  const role = profile.role as 'admin' | 'moderator'

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex flex-1 pt-14">
        <AdminSidebar role={role} />
        <main className="flex-1 min-w-0 overflow-auto pb-20 md:pb-0">
          {children}
        </main>
      </div>
      <AdminMobileNav role={role} />
    </div>
  )
}