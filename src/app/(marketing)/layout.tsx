import React from 'react'
import { Header } from '@/components/layout/Header'
import { ConditionalFooter } from '@/components/layout/ConditionalFooter'
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
    <div className="min-h-screen flex flex-col overflow-x-hidden">
      <Header />
      {/* pt-[108px] on mobile = 64px header + 44px tab bar
          lg:pt-20 = back to normal, no tab bar on desktop  */}
      <main className="flex-1 pt-[108px] pb-24 lg:pt-20 lg:pb-0 lg:pl-12 overflow-x-hidden">
        {children}
      </main>
      <ConditionalFooter />
      <MobileNav />
      {isAdmin && <AdminFloatingButton />}
    </div>
  )
}