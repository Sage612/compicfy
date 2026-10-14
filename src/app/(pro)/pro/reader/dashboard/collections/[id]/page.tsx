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

  const { data: collection } = await supabase
    .from('collections' as any)
    .select('id, user_id, title, description, cover_url, theme_color, is_published, save_count, view_count, created_at')
    .eq('id', id)
    .single()

  if (!collection) notFound()
  if ((collection as any).user_id !== user.id) redirect(`/collections/${id}`)

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, display_name, avatar_url, verified_recommender')
    .eq('id', (collection as any).user_id)
    .single()

  const { data: items } = await supabase
    .from('collection_items' as any)
    .select(`
      id, position, note,
      recommendations (
        id, title, cover_url, type, status, genres,
        upvotes, downvotes, score, author, year_released,
        description, is_approved, content_rating,
        save_count, review_count, view_count,
        official_platforms, why_recommend,
        created_at, updated_at, user_id
      )
    `)
    .eq('collection_id', id)
    .order('position', { ascending: true })

  const normalisedItems = ((items ?? []) as any[])
    .map((item: any) => ({
      ...item,
      recommendations: Array.isArray(item.recommendations)
        ? item.recommendations[0]
        : item.recommendations,
    }))
    .filter((item: any) => item.recommendations?.id != null)

  const assembled = {
    ...(collection as any),
    theme_color:      (collection as any).theme_color ?? 'primary',
    profiles:         profile ?? null,
    collection_items: normalisedItems,
  }

  const { data: saveRow } = await supabase
    .from('collection_saves' as any)
    .select('id')
    .eq('collection_id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  return (
    <CollectionDetailClient
      collection={assembled}
      isSaved={!!saveRow}
      isOwner={true}
      isLoggedIn={true}
      backHref="/pro/reader/dashboard/collections"
      backLabel="My Collections"
      isPro
    />
  )
}