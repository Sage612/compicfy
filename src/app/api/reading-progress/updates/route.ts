import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// SECURITY FIX: this route previously filtered with
// .eq('reading_lists.user_id', user.id) on a joined query - the exact
// nested-relation filter pattern already confirmed elsewhere in this
// codebase (see reading-progress/[comicId]/route.ts's own comment) to be
// SILENTLY IGNORED by PostgREST rather than erroring. That means this
// route could have been returning "comics with new chapters" across
// ALL users' reading_list_items, not just the current user's, with the
// !inner join on reading_lists doing nothing to actually scope by user -
// it only guarantees a reading_lists row exists, not that it belongs to
// this user. Fixed to the same two-step "fetch this user's list IDs,
// then filter by list_id IN (...)" pattern that file already uses
// correctly.

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ updates: [], count: 0 })

    // Step 1: this user's own list IDs - the actual scoping boundary.
    const { data: userLists } = await supabase
      .from('reading_lists')
      .select('id')
      .eq('user_id', user.id)

    const listIds = (userLists ?? []).map((l: any) => l.id)
    if (listIds.length === 0) {
      return NextResponse.json({ updates: [], count: 0 })
    }

    // Step 2: filter reading_list_items by list_id IN (...) instead of
    // the broken nested filter. No !inner join needed anymore since
    // list_id membership already proves ownership.
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

    if (behind.length === 0) {
      return NextResponse.json({ updates: [], count: 0 })
    }

    // Bulk-fetch saved source links for just these comics, so the dropdown
    // can offer "Read on {label}" the same way the chapter-update
    // notification does.
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

    const updates = behind.map((item: any) => {
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

    return NextResponse.json({ updates, count: updates.length })
  } catch {
    return NextResponse.json({ updates: [], count: 0 })
  }
}