import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { CollectionDetailClient } from '@/components/collections/CollectionDetailClient'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await (supabase as any)
    .from('collections')
    .select('title, description')
    .eq('id', id)
    .single()
  return {
    title:       data?.title ?? 'Collection',
    description: data?.description ?? 'A curated comic collection on ComPicfy.',
  }
}

export default async function CollectionDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const res  = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/collections/${id}`, {
    cache: 'no-store',
    headers: { cookie: '' }, // server-side fetch — auth handled via supabase directly below
  })

  // Fetch directly via supabase for auth-aware results
  const { data: collection, error } = await (supabase as any)
    .from('collections')
    .select(`
      *,
      profiles!collections_user_id_fkey(username, display_name, avatar_url, verified_recommender),
      collection_items(
        id, position, note, added_at,
        recommendations(id, title, cover_url, type, status, genres, upvotes, downvotes, save_count, review_count, score, created_at, content_rating, is_ai_generated, ai_model, chapter_count, year_released, author, artist, description, why_recommend, official_platforms, official_links, is_official_only, is_featured, is_approved, featured_at, reviewed_by, reviewed_at, rejection_reason, appeal_status, appeal_text, appeal_submitted_at, alternative_titles, themes, content_warnings, publisher, original_language, cover_credit, banner_url, best_for, pros, cons, daily_votes, last_daily_reset, view_count, report_count, user_id)
      )
    `)
    .eq('id', id)
    .single()

  if (error || !collection) notFound()

  // Auth check
  if (!collection.is_published && collection.user_id !== user?.id) notFound()

  // Check if saved
  let isSaved = false
  if (user) {
    const { data: save } = await (supabase as any)
      .from('collection_saves')
      .select('id')
      .eq('user_id', user.id)
      .eq('collection_id', id)
      .maybeSingle()
    isSaved = !!save
  }

  // Sort items by position
  const sortedCollection = {
    ...collection,
    collection_items: (collection.collection_items ?? [])
      .sort((a: any, b: any) => a.position - b.position),
  }

  return (
    <CollectionDetailClient
      collection={sortedCollection}
      isSaved={isSaved}
      isOwner={user?.id === collection.user_id}
      isLoggedIn={!!user}
    />
  )
}