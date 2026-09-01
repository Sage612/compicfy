// app/api/bakes/route.ts
//
// Item #29 "Let It Bake". POST creates a new active bake (or updates the
// existing active one for the same comic, rather than erroring - re-baking
// a comic you're already baking should just adjust the target). GET lists
// the current user's active bakes. DELETE clears one.
//
// Tier gating: uses hasUnlimitedPerks() from src/lib/access.ts per the
// Pro-gating warning in the roadmap doc - NOT the has_feature_access RPC
// (11 of 12 branches there have zero real callers) and NOT
// useFeatureAccess/ProGate (confirmed zero real callers anywhere). Adding
// a case to either of those would just grow the exact fragmentation
// already flagged as a blocking prerequisite for new Pro-gated work.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server' // confirmed real path/signature against the actual file - async function, matches usage here
import { hasUnlimitedPerks } from '@/lib/access'

const FREE_MAX_ACTIVE_BAKES = 3
const MIN_TARGET_CHAPTERS = 1
const MAX_TARGET_CHAPTERS = 500

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const recommendationId = body?.recommendation_id
  const targetChapterCount = Number(body?.target_chapter_count)
  const countingMode = body?.counting_mode

  if (!recommendationId || typeof recommendationId !== 'string') {
    return NextResponse.json({ error: 'recommendation_id is required' }, { status: 400 })
  }
  if (!Number.isInteger(targetChapterCount) || targetChapterCount < MIN_TARGET_CHAPTERS || targetChapterCount > MAX_TARGET_CHAPTERS) {
    return NextResponse.json({ error: `target_chapter_count must be an integer between ${MIN_TARGET_CHAPTERS} and ${MAX_TARGET_CHAPTERS}` }, { status: 400 })
  }
  if (countingMode !== 'from_now' && countingMode !== 'from_read') {
    return NextResponse.json({ error: "counting_mode must be 'from_now' or 'from_read'" }, { status: 400 })
  }

  // CONFIRMED against src/app/api/comic-sources/route.ts's own POST
  // handler: hasUnlimitedPerks()/isProUser() take a synchronous profile
  // object, not (supabase, userId) - they do no DB fetching themselves.
  // The caller fetches the profile row first. My original
  // `await hasUnlimitedPerks(supabase, user.id)` was calling this with
  // the wrong signature entirely - would have failed to compile, not
  // just misbehaved. Fixed to match the confirmed real pattern exactly.
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_pro, pro_expires_at, is_patron, patron_expires_at')
    .eq('id', user.id)
    .single()

  const isPro = !!profile && hasUnlimitedPerks(profile as any)

  // Free-tier cap: 3 active bakes, enforced here rather than relying on a
  // client-side check alone. Skip this query entirely for Pro users -
  // no need to count what isn't capped.
  if (!isPro) {
    const { count, error: countError } = await supabase
      .from('bake_requests')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'active')

    if (countError) {
      console.error('Bake count check failed:', countError)
      return NextResponse.json({ error: 'Failed to check bake limit' }, { status: 500 })
    }

    // If this request is updating an already-active bake on the same
    // comic (see upsert logic below), it doesn't count against the cap -
    // only check the cap when this would be a genuinely NEW active bake.
    const { data: existingBake } = await supabase
      .from('bake_requests')
      .select('id')
      .eq('user_id', user.id)
      .eq('recommendation_id', recommendationId)
      .eq('status', 'active')
      .maybeSingle()

    if (!existingBake && (count ?? 0) >= FREE_MAX_ACTIVE_BAKES) {
      return NextResponse.json({
        error: `Free tier allows up to ${FREE_MAX_ACTIVE_BAKES} active bakes at a time. Upgrade to Pro for unlimited bakes.`,
        code: 'BAKE_LIMIT_REACHED',
      }, { status: 403 })
    }
  }

  // Determine chapter_count_at_bake_start based on the chosen mode.
  let chapterCountAtBakeStart: number

  if (countingMode === 'from_now') {
    const { data: comic, error: comicError } = await supabase
      .from('recommendations')
      .select('chapter_count')
      .eq('id', recommendationId)
      .single()

    if (comicError || !comic) {
      return NextResponse.json({ error: 'Comic not found' }, { status: 404 })
    }
    chapterCountAtBakeStart = comic.chapter_count ?? 0
  } else {
    // from_read: use the user's own last-read progress on this comic.
    //
    // CONFIRMED against src/app/api/reading-progress/[comicId]/route.ts:
    // a nested-relation filter like .eq('reading_lists.user_id', user.id)
    // is EXPLICITLY documented in that file as broken - PostgREST ignores
    // it silently rather than erroring, which would make this mode look
    // like it works while actually returning the wrong (or no) row for
    // every user. That file's own comment: "filter by user's list IDs
    // directly instead of relying on joined-table filter which PostgREST
    // ignores." Using that exact two-step pattern here instead of the
    // single-query join I originally guessed.
    const { data: userLists } = await supabase
      .from('reading_lists')
      .select('id')
      .eq('user_id', user.id)

    const listIds = (userLists ?? []).map((l: any) => l.id)

    let progressChapter: number | null = null
    if (listIds.length > 0) {
      const { data: trackedItem } = await supabase
        .from('reading_list_items')
        .select('progress_chapter')
        .eq('recommendation_id', recommendationId)
        .in('list_id', listIds)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      progressChapter = trackedItem?.progress_chapter ?? null
    }

    // Falls back to 0 if the comic isn't tracked yet at all - a bake can
    // be created on an untracked comic, it just starts counting from
    // zero read.
    chapterCountAtBakeStart = progressChapter ?? 0
  }

  // Upsert: if the user already has an active bake on this comic, update
  // its target/mode rather than creating a duplicate (the partial unique
  // index on (user_id, recommendation_id) WHERE status = 'active' would
  // reject a duplicate insert anyway, but doing this explicitly gives a
  // cleaner response than surfacing a raw constraint violation).
  const { data: bake, error: upsertError } = await supabase
    .from('bake_requests')
    .upsert(
      {
        user_id: user.id,
        recommendation_id: recommendationId,
        target_chapter_count: targetChapterCount,
        counting_mode: countingMode,
        chapter_count_at_bake_start: chapterCountAtBakeStart,
        status: 'active',
      },
      { onConflict: 'user_id,recommendation_id', ignoreDuplicates: false }
    )
    .select()
    .single()

  if (upsertError) {
    console.error('Bake upsert failed:', upsertError)
    return NextResponse.json({ error: 'Failed to create bake' }, { status: 500 })
  }

  return NextResponse.json({ bake })
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Column name confirmed via grep across the codebase (collections/[id]/
  // page.tsx uses the identical nested-relation shape: recommendations(id,
  // title, cover_url, ...)) - cover_url is the real column, not
  // cover_image_url as originally guessed.
  const { data: bakes, error } = await supabase
    .from('bake_requests')
    .select('*, recommendations(id, title, cover_url, chapter_count)')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Fetch bakes failed:', error)
    return NextResponse.json({ error: 'Failed to fetch bakes' }, { status: 500 })
  }

  return NextResponse.json({ bakes })
}

export async function DELETE(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const bakeId = searchParams.get('id')
  if (!bakeId) {
    return NextResponse.json({ error: 'id query param is required' }, { status: 400 })
  }

  const bakeIdNumber = Number(bakeId)
  if (!Number.isInteger(bakeIdNumber)) {
    return NextResponse.json({ error: 'id must be a valid integer' }, { status: 400 })
  }

  const { error } = await supabase
    .from('bake_requests')
    .update({ status: 'cleared', cleared_at: new Date().toISOString() })
    .eq('id', bakeIdNumber)
    .eq('user_id', user.id) // ensures a user can only clear their own bake

  if (error) {
    console.error('Clear bake failed:', error)
    return NextResponse.json({ error: 'Failed to clear bake' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}