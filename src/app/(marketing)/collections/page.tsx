import { createClient } from '@/lib/supabase/server'
import { CollectionsClient } from '@/components/collections/CollectionsClient'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Collections',
  description: 'Browse curated comic collections from the ComPicfy community.',
}

export default async function CollectionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let isProUser = false
  let savedCollectionIds: string[] = []

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_pro, pro_expires_at, is_patron, patron_expires_at')
      .eq('id', user.id)
      .single()

    isProUser = (profile as any)?.role === 'admin' ||
      ((profile as any)?.is_pro &&
        (!(profile as any)?.pro_expires_at ||
          new Date((profile as any).pro_expires_at) > new Date()))

    // Fetch which collections this user has already saved
    const { data: saves } = await (supabase as any)
      .from('collection_saves')
      .select('collection_id')
      .eq('user_id', user.id)

    savedCollectionIds = (saves ?? []).map((s: any) => s.collection_id)
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <CollectionsClient
        userId={user?.id ?? null}
        isProUser={isProUser}
        basePath="/collections"
        savedCollectionIds={savedCollectionIds}
      />
    </div>
  )
}