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
    .select('role, user_type, is_pro, pro_expires_at')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'moderator'].includes(profile.role)) {
    // Redirect to the right dashboard based on pro status and user_type
    const isPro = profile?.is_pro &&
      (!profile?.pro_expires_at || new Date(profile.pro_expires_at) > new Date())
    const isCreator = profile?.user_type === 'creator'

    if (isPro || profile?.role === 'admin') {
      redirect(isCreator ? '/pro/creator/dashboard' : '/pro/reader/dashboard')
    } else {
      redirect(isCreator ? '/creator/dashboard' : '/reader/dashboard')
    }
  }

  const role      = profile.role as 'admin' | 'moderator'
  const userType  = (profile.user_type ?? 'reader') as string
  // Admins always get pro dashboard access
  const proDashHref = userType === 'creator'
    ? '/pro/creator/dashboard'
    : '/pro/reader/dashboard'

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex flex-1 pt-[104px] lg:pt-14">
        <AdminSidebar role={role} proDashHref={proDashHref} />
        <main className="flex-1 min-w-0 overflow-auto pb-24 md:pb-0">
          {children}
        </main>
      </div>
      <AdminMobileNav role={role} proDashHref={proDashHref} />
    </div>
  )
}