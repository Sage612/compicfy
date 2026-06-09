import { createClient } from '@/lib/supabase/server'
import { ListsClient } from '@/components/lists/ListsClient'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Reading Lists',
  description: 'Browse curated reading lists from the Compicfy community.',
}

export default async function PublicListsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let starredListIds: string[] = []
  let myListsHref = '/reader/dashboard/lists' // default

  if (user) {
    const { data: stars } = await (supabase as any)
      .from('list_stars')
      .select('list_id')
      .eq('user_id', user.id)
    starredListIds = (stars ?? []).map((s: any) => s.list_id)

    // Resolve the correct dashboard path based on user type and pro status
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_type, role, is_pro, pro_expires_at')
      .eq('id', user.id)
      .single()

    if (profile) {
      const isAdmin   = ['admin', 'moderator'].includes((profile as any).role)
      const isPro     = isAdmin || (
        (profile as any).is_pro &&
        (!(profile as any).pro_expires_at || new Date((profile as any).pro_expires_at) > new Date())
      )
      const isCreator = (profile as any).user_type === 'creator'

      if (isCreator) {
        myListsHref = isPro ? '/pro/creator/dashboard/works' : '/creator/dashboard/works'
      } else {
        myListsHref = isPro ? '/pro/reader/dashboard/lists' : '/reader/dashboard/lists'
      }
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <ListsClient
        userId={user?.id ?? null}
        starredListIds={starredListIds}
        myListsHref={myListsHref}
      />
    </div>
  )
}