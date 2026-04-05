import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { ProSidebar } from '@/components/pro/ProSidebar'
import { ProMobileNav } from '@/components/pro/ProMobileNav'
import { AdminFloatingButton } from '@/components/admin/AdminFloatingButton'
import { ThemeSync } from '@/components/pro/ThemeSync'
import { ProfileThemeProvider } from '@/components/pro/ProfileThemeProvider'

export default async function ProLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('role, is_pro, pro_expires_at, theme_preference, profile_theme')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.role === 'admin'
  const isPro = isAdmin ||
    (profile?.is_pro &&
      (!profile?.pro_expires_at || new Date(profile.pro_expires_at) > new Date()))

  if (!isPro) redirect('/pricing?reason=pro_required')

  // theme_preference = dark/light/system (handled by ThemeSync)
  // profile_theme    = gold/rose/teal etc (handled by ProfileThemeProvider)
  const themePreference = profile?.theme_preference ?? 'system'
  const profileTheme    = profile?.profile_theme ?? 'default'

  return (
    <div className="min-h-screen flex flex-col">
      {/* Dark/light/system mode sync */}
      <ThemeSync themePreference={themePreference} />
      {/* Profile colour theme sync — applies data-theme to <html> */}
      <ProfileThemeProvider profileTheme={profileTheme} />

      <Header />
      <div className="flex flex-1 pt-14">
        <aside className="hidden md:flex flex-col w-60 shrink-0 border-r border-border p-3 gap-3">
          <ProSidebar role={profile?.role ?? 'user'} />
        </aside>
        <main className="flex-1 min-w-0 overflow-auto pb-20 md:pb-0">
          {children}
        </main>
      </div>
      <ProMobileNav role={profile?.role ?? 'user'} />
      {isAdmin && <AdminFloatingButton />}
    </div>
  )
}