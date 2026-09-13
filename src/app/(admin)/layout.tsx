import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { AdminSidebar, AdminMobileNav } from '@/components/admin/AdminSidebar'
import { DashboardShell } from '@/components/layout/DashboardShell'
import { isProUser } from '@/lib/access'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('role, user_type, is_pro, pro_expires_at, is_patron, patron_expires_at')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'moderator'].includes(profile.role)) {
    // Redirect to the right dashboard based on pro status and user_type.
    // Fixed: was hand-rolled `is_pro && not-expired` with no patron
    // awareness — a patron who isn't admin/mod would have been sent to
    // the free dashboard instead of the pro one. isProUser() from
    // @/lib/access already covers admin/patron/pro correctly (though
    // admin/mod never reach this branch at all, since it's gated above).
    const isPro = profile ? isProUser(profile) : false
    const isCreator = profile?.user_type === 'creator'

    if (isPro) {
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
    // lg:pl-12 reserves space for NavRail's fixed 48px collapsed strip,
    // which now renders on dashboard routes too instead of being hidden.
    <div className="min-h-screen flex flex-col lg:pl-12">
      <Header />
      <DashboardShell
        topOffset="104px"
        topOffsetLg="56px"
        sidebarWidth="w-56"
        sidebarClassName="border-r border-border/70 p-3 gap-0.5"
        sidebar={<AdminSidebar role={role} proDashHref={proDashHref} />}
      >
        {children}
      </DashboardShell>
      <AdminMobileNav role={role} proDashHref={proDashHref} />
    </div>
  )
}