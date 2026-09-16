import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { UpdatesClient } from '@/components/user/UpdatesClient'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: "Updates | Pro" }


export default async function ProReaderUpdatesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // ── Chapter updates (mirrors the fixed /api/reading-progress/updates
  // logic - two-step list-id filter, NOT the broken nested-relation
  // filter this route originally had) ──
  const { data: userLists } = await supabase
    .from('reading_lists')
    .select('id')
    .eq('user_id', user.id)

  const listIds = (userLists ?? []).map((l: any) => l.id)

  let updates: any[] = []
  if (listIds.length > 0) {
    const { data: items } = await supabase
      .from('reading_list_items')
      .select(`
        list_id, status, progress_chapter, recommendation_id,
        recommendations!inner(id, title, cover_url, chapter_count)
      `)
      .in('list_id', listIds)
      .in('status', ['reading', 'plan_to_read'])
      .not('recommendation_id', 'is', null)

    const behind = (items ?? []).filter((item: any) => {
      const chapterCount = item.recommendations?.chapter_count
      if (chapterCount == null) return false
      return chapterCount > (item.progress_chapter ?? 0)
    })

    if (behind.length > 0) {
      const recIds = behind.map((item: any) => item.recommendation_id)
      const { data: sources } = await supabase
        .from('user_comic_sources')
        .select('recommendation_id, url, label')
        .eq('user_id', user.id)
        .in('recommendation_id', recIds)

      const sourceByRec = new Map<string, { url: string; label: string }>()
      for (const s of (sources ?? []) as any[]) {
        sourceByRec.set(s.recommendation_id, { url: s.url, label: s.label })
      }

      updates = behind.map((item: any) => {
        const src = sourceByRec.get(item.recommendation_id)
        return {
          list_id:           item.list_id,
          recommendation_id: item.recommendation_id,
          status:            item.status,
          title:             item.recommendations.title,
          cover_url:         item.recommendations.cover_url,
          chapter_count:     item.recommendations.chapter_count,
          progress_chapter:  item.progress_chapter,
          source_url:        src?.url ?? null,
          source_label:      src?.label ?? null,
        }
      })
    }
  }

  // ── Bakes (both active and fulfilled - fulfilled ones persist until
  // the user clears them, per the earlier decision to only hard-delete
  // on explicit clear) ──
  const { data: bakes } = await supabase
    .from('bake_requests')
    .select('*, recommendations(title, cover_url, chapter_count)')
    .eq('user_id', user.id)
    .in('status', ['active', 'fulfilled'])
    .order('created_at', { ascending: false })

  const fromReadBakes = (bakes ?? []).filter((bake: any) => bake.counting_mode === 'from_read')
  let progressByRecommendation = new Map<string, number>()

  if (fromReadBakes.length > 0) {
    const recommendationIds = fromReadBakes.map((bake: any) => bake.recommendation_id)
    const { data: userLists } = await supabase
      .from('reading_lists')
      .select('id')
      .eq('user_id', user.id)

    const listIds = (userLists ?? []).map((list: any) => list.id)

    if (listIds.length > 0) {
      const { data: progressRows } = await supabase
        .from('reading_list_items')
        .select('recommendation_id, progress_chapter, updated_at')
        .in('recommendation_id', recommendationIds)
        .in('list_id', listIds)
        .order('updated_at', { ascending: false })

      for (const row of (progressRows ?? []) as any[]) {
        if (!progressByRecommendation.has(row.recommendation_id)) {
          progressByRecommendation.set(row.recommendation_id, row.progress_chapter ?? 0)
        }
      }
    }
  }

  const bakesWithProgress = (bakes ?? []).map((bake: any) => ({
    ...bake,
    progress_chapter: bake.counting_mode === 'from_read'
      ? (progressByRecommendation.get(bake.recommendation_id) ?? 0)
      : null,
  }))

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <UpdatesClient
        initialUpdates={updates}
        initialBakes={bakesWithProgress as any}
      />
    </div>
  )
}