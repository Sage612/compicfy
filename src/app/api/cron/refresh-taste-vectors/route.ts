import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { computeTasteVector, tasteVectorToSqlLiteral, type RecommendationTasteData } from '@/lib/taste/computeTasteVector'

// Split out of the original single-tick refresh-taste-profiles route
// after a real Gateway Timeout at 30s (confirmed via logs, not guessed —
// the flagged user had zero activity and empty favorite_genres, so the
// timeout was cumulative pool/connection pressure across the whole loop,
// not one bad query). Batches across ticks the same way chapter-check
// already does: BATCH_SIZE per invocation, oldest-refreshed-first cursor.
const BATCH_SIZE       = 15   // conservative for a 30s budget — 3 queries/user + 1 upsert
const LOCK_NAME        = 'taste_vector_refresh'
const LOCK_DURATION_MS = 25_000 // just under the 30s gateway limit

interface RefreshLog {
  user_id:            string
  status:             'success' | 'skipped_no_data' | 'failed'
  interaction_count?: number
  confidence?:        number
  reason?:            string
  error?:             string
  timestamp:          string
}

async function logRefresh(supabase: any, log: RefreshLog) {
  try {
    await supabase.from('activity_logs').insert({
      user_id:     null,
      action:      'taste_vector_refresh',
      entity_type: 'user_taste_profiles',
      entity_id:   log.user_id,
      details:     log,
    })
  } catch (err) {
    console.error('Failed to log:', err)
  }
}

async function acquireLock(supabase: any): Promise<boolean> {
  const { data: existing } = await supabase
    .from('cron_locks')
    .select('locked_until')
    .eq('job_name', LOCK_NAME)
    .maybeSingle()

  if (existing && new Date(existing.locked_until) > new Date()) return false

  await supabase
    .from('cron_locks')
    .upsert({ job_name: LOCK_NAME, locked_until: new Date(Date.now() + LOCK_DURATION_MS).toISOString() })

  return true
}

async function releaseLock(supabase: any) {
  await supabase.from('cron_locks').delete().eq('job_name', LOCK_NAME)
}

export async function GET(req: Request) {
  const secret = req.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const gotLock = await acquireLock(supabase)
  if (!gotLock) {
    return NextResponse.json({ message: 'Previous run still in progress, skipping this tick' })
  }

  try {
    // Two plain queries instead of a Supabase embed join — kept simple
    // and unambiguous rather than relying on unverified embed-alias
    // syntax, since this route already caused one real production
    // timeout and correctness matters more than saving a round-trip.
    const { data: allProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, favorite_genres')
      .order('id', { ascending: true })
      .limit(BATCH_SIZE * 20) // over-fetch a bit; we sort client-side then slice

    if (profilesError) {
      console.error('DB error fetching profiles:', profilesError)
      return NextResponse.json({ error: 'DB fetch failed' }, { status: 500 })
    }

    if (!allProfiles || allProfiles.length === 0) {
      return NextResponse.json({ processed: 0, message: 'No users found' })
    }

    const candidateIds = allProfiles.map((p: any) => p.id)

    const { data: cursorRows, error: cursorError } = await supabase
      .from('user_taste_profiles')
      .select('user_id, last_vector_refresh_at')
      .in('user_id', candidateIds)

    if (cursorError) {
      console.error('DB error fetching refresh cursors:', cursorError)
      return NextResponse.json({ error: 'DB fetch failed' }, { status: 500 })
    }

    const cursorByUserId = new Map(
      (cursorRows ?? []).map((r: any) => [r.user_id, r.last_vector_refresh_at])
    )

    // Sort by last_vector_refresh_at ascending (nulls/never-refreshed
    // first — covers both users with no user_taste_profiles row at all
    // yet, and rows where the column itself is null), then take just
    // this tick's batch.
    const sorted = [...allProfiles].sort((a: any, b: any) => {
      const aTime = cursorByUserId.get(a.id)
      const bTime = cursorByUserId.get(b.id)
      if (!aTime && !bTime) return 0
      if (!aTime) return -1
      if (!bTime) return 1
      return new Date(aTime).getTime() - new Date(bTime).getTime()
    })

    const batch = sorted.slice(0, BATCH_SIZE)

    let succeeded = 0
    let skipped   = 0
    let failed    = 0
    const logs: RefreshLog[] = []

    for (const user of batch) {
      const timestamp = new Date().toISOString()

      try {
        const { data: listRows, error: listError } = await supabase
          .from('reading_list_items')
          .select(`
            recommendation_id,
            reading_lists!inner(user_id),
            recommendations!inner(genres, type, status, content_rating)
          `)
          .eq('reading_lists.user_id', user.id)

        if (listError) throw listError

        const { data: voteRows, error: voteError } = await supabase
          .from('votes')
          .select(`
            recommendation_id,
            recommendations!inner(genres, type, status, content_rating)
          `)
          .eq('user_id', user.id)

        if (voteError) throw voteError

        const { data: reviewRows, error: reviewError } = await supabase
          .from('reviews')
          .select(`
            recommendation_id,
            recommendations!inner(genres, type, status, content_rating)
          `)
          .eq('user_id', user.id)

        if (reviewError) throw reviewError

        const toTasteData = (row: any): RecommendationTasteData => ({
          recommendation_id: row.recommendation_id,
          genres:             row.recommendations?.genres ?? null,
          type:               row.recommendations?.type ?? null,
          status:             row.recommendations?.status ?? null,
          content_rating:     row.recommendations?.content_rating ?? null,
        })

        const readingListItems = (listRows ?? []).map(toTasteData)
        const votedItems       = (voteRows ?? []).map(toTasteData)
        const reviewedItems    = (reviewRows ?? []).map(toTasteData)
        const favoriteGenres   = (user.favorite_genres ?? []) as string[]

        const result = computeTasteVector({
          readingListItems,
          votedItems,
          reviewedItems,
          favoriteGenres,
        })

        const interactionCount = readingListItems.length + votedItems.length + reviewedItems.length

        if (!result) {
          skipped++
          // Still stamp last_vector_refresh_at even when skipped, so a
          // permanently-empty user doesn't get re-checked every single
          // tick ahead of users who actually have data to process.
          await supabase
            .from('user_taste_profiles')
            .upsert({
              user_id:                user.id,
              last_vector_refresh_at: timestamp,
            }, { onConflict: 'user_id' })

          logs.push({
            user_id: user.id,
            status:  'skipped_no_data',
            interaction_count: interactionCount,
            timestamp,
          })
          continue
        }

        const { error: upsertError } = await supabase
          .from('user_taste_profiles')
          .upsert({
            user_id:                user.id,
            taste_vector:           tasteVectorToSqlLiteral(result.vector),
            confidence:             result.confidence,
            updated_at:             timestamp,
            last_vector_refresh_at: timestamp,
          }, { onConflict: 'user_id' })

        if (upsertError) throw upsertError

        succeeded++
        logs.push({
          user_id:            user.id,
          status:             'success',
          interaction_count:  interactionCount,
          confidence:         result.confidence,
          timestamp,
        })

      } catch (err: any) {
        console.error(`Failed to refresh taste vector for user ${user.id}:`, err)
        failed++
        logs.push({ user_id: user.id, status: 'failed', error: err?.message ?? 'Unknown error', timestamp })
      }
    }

    for (const log of logs) await logRefresh(supabase, log)

    return NextResponse.json({
      batch_size:       batch.length,
      total_candidates: allProfiles.length,
      succeeded,
      skipped,
      failed,
      ran_at:           new Date().toISOString(),
    })
  } finally {
    await releaseLock(supabase)
  }
}