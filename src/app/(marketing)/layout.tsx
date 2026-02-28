import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { MobileNav } from '@/components/layout/MobileNav'
import { AdminFloatingButton } from '@/components/admin/AdminFloatingButton'
import { createClient } from '@/lib/supabase/server'

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let isAdmin = false
  if (user) {
    const { data: profile } = (await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()) as { data: { role: string } | null }
    isAdmin = ['admin', 'moderator'].includes(profile?.role ?? '')
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pt-14 pb-16 md:pb-0">
        {children}
      </main>
      <Footer />
      <MobileNav />
      {isAdmin && <AdminFloatingButton />}
    </div>
  )
}