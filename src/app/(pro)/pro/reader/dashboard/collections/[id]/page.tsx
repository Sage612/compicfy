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
            upvotes, downvotes, score, author, year_released,
            description, is_approved, content_rating,
            save_count, review_count, view_count,
            official_platforms, why_recommend,
            created_at, updated_at, user_id,
            rejection_reason, appeal_status,
            is_pro_submission, is_featured,
            is_ai_generated, ai_model,
            alternative_titles, themes, content_warnings,
            chapter_count, artist, publisher,
            original_language, cover_credit, banner_url,
            best_for, pros, cons, daily_votes,
            last_daily_reset, report_count,
            official_links, is_official_only,
            year_ended, featured_at, reviewed_by,
            reviewed_at, appeal_text, appeal_submitted_at,
            mangaupdates_id, anilist_id, mal_id,
            mangadex_id, mangabaka_id, kuroiru_id,
            is_draft, draft_saved_at
          )
      )
    `)
    .eq('id', id)
    .single()

  if (!collection) notFound()
  if (collection.user_id !== user.id) redirect(`/collections/${id}`)

  const normaliseItem = (item: any) => {
    const rec = Array.isArray(item.recommendations)
      ? item.recommendations[0]
      : item.recommendations
    return { ...item, recommendations: rec }
  }

  const sorted = {
    ...collection,
    theme_color: collection.theme_color ?? 'primary',
    collection_items: [...(collection.collection_items ?? [])]
      .map(normaliseItem)
      .filter((item: any) => item.recommendations?.id != null)
      .sort((a: any, b: any) => (a.position ?? 0) - (b.position ?? 0)),
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