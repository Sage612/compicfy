import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Split out of the original single-tick refresh-taste-profiles route,
// same reason as refresh-taste-vectors (real Gateway Timeout at 30s).
// Runs as a SEPARATE cron schedule, timed to start after vectors have
// had a full window to refresh (e.g. vectors at 2am, matches at 3am) —
// a slightly-stale vector from earlier the same night is fine for a
// nightly-cadence feature; there's no hard synchronization needed
// between the two routes beyond "give vectors a head start."
const BATCH_SIZE           = 20   // one RPC call per user + a delete + an insert
const LOCK_NAME            = 'taste_match_refresh'
const LOCK_DURATION_MS     = 25_000
const TOP_MATCHES_PER_USER = 10

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
    // Only consider users who actually have a vector — no point computing
    // matches for someone with no taste data at all yet.
    const { data: vectorRows, error: vectorError } = await supabase
      .from('user_taste_profiles')
      .select('user_id')
      .not('taste_vector', 'is', null)
      .order('user_id', { ascending: true })
      .limit(BATCH_SIZE * 20)

    if (vectorError) {
      console.error('DB error fetching vector rows:', vectorError)
      return NextResponse.json({ error: 'DB fetch failed' }, { status: 500 })
    }

    if (!vectorRows || vectorRows.length === 0) {
      return NextResponse.json({ processed: 0, message: 'No users with taste vectors yet' })
    }

    const userIds = vectorRows.map((r: any) => r.user_id)

    // Separate query for the refresh cursor — kept as two plain queries
    // rather than a Supabase embed join, since the embed alias syntax for
    // pulling a single nested column wasn't confidently verifiable and
    // this route already caused one real production timeout; correctness
    // here matters more than saving one round-trip.
    const { data: cursorRows, error: cursorError } = await supabase
      .from('profiles')
      .select('id, last_match_refresh_at')
      .in('id', userIds)

    if (cursorError) {
      console.error('DB error fetching refresh cursors:', cursorError)
      return NextResponse.json({ error: 'DB fetch failed' }, { status: 500 })
    }

    const cursorByUserId = new Map(
      (cursorRows ?? []).map((r: any) => [r.id, r.last_match_refresh_at])
    )

    const sorted = [...userIds].sort((a, b) => {
      const aTime = cursorByUserId.get(a)
      const bTime = cursorByUserId.get(b)
      if (!aTime && !bTime) return 0
      if (!aTime) return -1
      if (!bTime) return 1
      return new Date(aTime).getTime() - new Date(bTime).getTime()
    })

    const batch = sorted.slice(0, BATCH_SIZE)

    let matchesUpdated = 0
    let failed = 0
    const timestamp = new Date().toISOString()

    for (const userId of batch) {
      try {
        const { data: neighbors, error: matchError } = await supabase.rpc('match_taste_neighbors', {
          target_user_id: userId,
          match_limit:     TOP_MATCHES_PER_USER,
        })

        if (matchError) throw matchError

        await supabase
          .from('user_compatibility_scores')
          .delete()
          .eq('user_id', userId)

        if (neighbors && neighbors.length > 0) {
          const rows = neighbors.map((n: any) => ({
            user_id:          userId,
            matched_user_id:  n.matched_user_id,
            similarity:       n.similarity,
            match_confidence: n.match_confidence,
            computed_at:      timestamp,
          }))

          const { error: insertError } = await supabase
            .from('user_compatibility_scores')
            .insert(rows)

          if (insertError) throw insertError
        }

        await supabase
          .from('profiles')
          .update({ last_match_refresh_at: timestamp })
          .eq('id', userId)

        matchesUpdated++

      } catch (err: any) {
        console.error(`Failed to refresh matches for user ${userId}:`, err)
        failed++
      }
    }

    return NextResponse.json({
      batch_size:       batch.length,
      total_candidates: userIds.length,
      matches_updated:  matchesUpdated,
      failed,
      ran_at:           timestamp,
    })
  } finally {
    await releaseLock(supabase)
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