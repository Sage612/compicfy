import React from 'react'
import { Header } from '@/components/layout/Header'
import { ConditionalFooter } from '@/components/layout/ConditionalFooter'
import { MobileNav } from '@/components/layout/MobileNav'
import { AdminFloatingButton } from '@/components/admin/AdminFloatingButton'
import { SpeedDialFAB } from '@/components/layout/SpeedDialFAB'
import { createClient } from '@/lib/supabase/server'
import { isProUser as checkIsProUser, hasUnlimitedPerks } from '@/lib/access'

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let isAdmin             = false
  let isProUser           = false
  let userListCount       = 0
  let userCollectionCount = 0
  let myListsHref         = '/reader/dashboard/lists'

  if (user) {
    const [profileResult, listCountResult, collectionCountResult] = await Promise.all([
      supabase.from('profiles').select('role, is_pro, pro_expires_at, is_patron, patron_expires_at, user_type').eq('id', user.id).single(),
      (supabase as any).from('reading_lists').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      (supabase as any).from('collections').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    ])

    const profile = profileResult.data as any
    if (profile) {
      isAdmin = ['admin', 'moderator'].includes(profile.role)
      isProUser = hasUnlimitedPerks(profile)

      const realPro = checkIsProUser(profile)
      const isCreator = profile.user_type === 'creator'
      if (isCreator) {
        myListsHref = realPro ? '/pro/creator/dashboard/works' : '/creator/dashboard/works'
      } else {
        myListsHref = realPro ? '/pro/reader/dashboard/lists' : '/reader/dashboard/lists'
      }
    }

    userListCount       = listCountResult.count       ?? 0
    userCollectionCount = collectionCountResult.count ?? 0
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

      {/* Desktop-only admin button */}
      {isAdmin && <AdminFloatingButton />}

      {/* Mobile speed dial — handles create (list/collection) + admin nav in one FAB */}
      <SpeedDialFAB
        userId={user?.id ?? null}
        isAdmin={isAdmin}
        isProUser={isProUser}
        userListCount={userListCount}
        userCollectionCount={userCollectionCount}
        myListsHref={myListsHref}
      />
    </div>
  )
}