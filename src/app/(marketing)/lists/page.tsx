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
  if (user) {
    const { data: stars } = await (supabase as any)
      .from('list_stars')
      .select('list_id')
      .eq('user_id', user.id)
    starredListIds = (stars ?? []).map((s: any) => s.list_id)
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <ListsClient
        userId={user?.id ?? null}
        starredListIds={starredListIds}
      />
    </div>
  )
}