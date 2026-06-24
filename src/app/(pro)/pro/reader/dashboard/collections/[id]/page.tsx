import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { CollectionDetailClient } from '@/components/collections/CollectionDetailClient'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Collection' }

export default async function ProReaderDashboardCollectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id }   = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: collection } = await (supabase as any)
    .from('collections')
    .select(`
      id, user_id, title, description, cover_url, theme_color,
      is_published, save_count, view_count, created_at,
      profiles ( username, display_name, avatar_url, verified_recommender ),
      collection_items (
        id, position, note,
        recommendations (
          id, title, cover_url, type, status, genres,
          upvotes, downvotes, score, author, year_released
        )
      )
    `)
    .eq('id', id)
    .single()

  if (!collection) notFound()

  if (collection.user_id !== user.id) {
    redirect(`/collections/${id}`)
  }

  const sorted = {
    ...collection,
    collection_items: [...(collection.collection_items ?? [])].sort(
      (a: any, b: any) => (a.position ?? 0) - (b.position ?? 0)
    ),
  }

  const { data: saveRow } = await (supabase as any)
    .from('collection_saves')
    .select('id')
    .eq('collection_id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  return (
    <div className="pb-8">
      <CollectionDetailClient
        collection={sorted}
        isSaved={!!saveRow}
        isOwner={true}
        isLoggedIn={true}
        backHref="/pro/reader/dashboard/collections"
        backLabel="My Collections"
      />
    </div>
  )
}