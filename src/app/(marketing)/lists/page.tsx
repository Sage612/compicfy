import { createClient } from '@/lib/supabase/server'
import { ListsClient } from '@/components/lists/ListsClient'
import type { Metadata } from 'next'
import { isProUser as checkIsProUser, hasUnlimitedPerks } from '@/lib/access'

export const metadata: Metadata = {
  title: 'Reading Lists',
  description: 'Browse curated reading lists from the ComPicfy community.',
}

export default async function PublicListsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let starredListIds: string[] = []
  let myListsHref    = '/reader/dashboard/lists'
  let isProUser      = false
  let userListCount  = 0

  if (user) {
    const [starsResult, profileResult, countResult] = await Promise.all([
      (supabase as any).from('list_stars').select('list_id').eq('user_id', user.id),
      supabase.from('profiles').select('user_type, role, is_pro, pro_expires_at').eq('id', user.id).single(),
      (supabase as any).from('reading_lists').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    ])

    starredListIds = (starsResult.data ?? []).map((s: any) => s.list_id)
    userListCount  = countResult.count ?? 0

    const profile = profileResult.data as any
    if (profile) {
      const realPro = checkIsProUser(profile)
      isProUser = hasUnlimitedPerks(profile)
      const isCreator = profile.user_type === 'creator'
      if (isCreator) {
        myListsHref = realPro ? '/pro/creator/dashboard/works' : '/creator/dashboard/works'
      } else {
        myListsHref = realPro ? '/pro/reader/dashboard/lists' : '/reader/dashboard/lists'
      }
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <ListsClient
        userId={user?.id ?? null}
        starredListIds={starredListIds}
        myListsHref={myListsHref}
        isProUser={isProUser}
        userListCount={userListCount}
      />
    </div>
  )
}