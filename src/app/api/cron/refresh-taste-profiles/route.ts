import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { computeTasteVector, tasteVectorToSqlLiteral, type ReadingItemForTaste } from '@/lib/taste/computeTasteVector'
import { GENRES } from '@/lib/utils/constants'

const BATCH_SIZE       = 25   // users processed per tick
const LOCK_NAME        = 'taste_profile_refresh'
const LOCK_DURATION_MS = 55_000
const TOP_MATCHES_PER_USER = 10 // stored per user; widget shows top 3-5 of these

interface RefreshLog {
  user_id:        string
  status:         'success' | 'skipped_no_items' | 'failed'
  reading_items?: number
  reason?:        string
  error?:         string
  timestamp:      string
}

async function logRefresh(supabase: any, log: RefreshLog) {
  try {
    await supabase.from('activity_logs').insert({
      user_id:     null,
      action:      'taste_profile_refresh',
      entity_type: 'user_taste_profiles',
      entity_id:   log.user_id,
      details:     log,
    })
  } catch (err) {
    console.error('Failed to log:', err)
  }
}

// ── Lock helpers ─────────────────────────────────────────────────────
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

// ── Main handler ─────────────────────────────────────────────────────
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
    // At current scale (dozens of users) we process everyone in one pass.
    // If this ever needs multi-tick pagination (thousands of users), add
    // a cursor here the same way chapter-check paginates comics.
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id')
      .limit(BATCH_SIZE * 100) // generous cap, not a real pagination boundary yet

    if (usersError) {
      console.error('DB error fetching users:', usersError)
      return NextResponse.json({ error: 'DB fetch failed' }, { status: 500 })
    }

    if (!users || users.length === 0) {
      return NextResponse.json({ processed: 0, message: 'No users found' })
    }

    let succeeded = 0
    let skipped   = 0
    let failed    = 0
    const logs: RefreshLog[] = []

    for (const user of users) {
      const timestamp = new Date().toISOString()

      try {
        // Pull this user's reading list items joined through to recommendations
        const { data: items, error: itemsError } = await supabase
          .from('reading_list_items')
          .select(`
            recommendation_id,
            reading_lists!inner(user_id),
            recommendations!inner(genres, type, status, content_rating)
          `)
          .eq('reading_lists.user_id', user.id)

        if (itemsError) throw itemsError

        if (!items || items.length === 0) {
          skipped++
          logs.push({ user_id: user.id, status: 'skipped_no_items', timestamp })
          continue
        }

        const readingItems: ReadingItemForTaste[] = items.map((item: any) => ({
          recommendation_id: item.recommendation_id,
          genres:            item.recommendations?.genres ?? null,
          type:               item.recommendations?.type ?? null,
          status:             item.recommendations?.status ?? null,
          content_rating:     item.recommendations?.content_rating ?? null,
        }))

        // Fetch this user's reviewed/voted recommendation ids for the engagement multiplier
        const [{ data: reviews }, { data: votes }] = await Promise.all([
          supabase.from('reviews').select('recommendation_id').eq('user_id', user.id),
          supabase.from('votes').select('recommendation_id').eq('user_id', user.id),
        ])

        const reviewedRecIds = new Set<string>((reviews ?? []).map((r: any) => r.recommendation_id))
        const votedRecIds    = new Set<string>((votes ?? []).map((v: any) => v.recommendation_id))

        const vector = computeTasteVector({ items: readingItems, reviewedRecIds, votedRecIds })

        if (!vector) {
          skipped++
          logs.push({ user_id: user.id, status: 'skipped_no_items', reading_items: readingItems.length, timestamp })
          continue
        }

        const { error: upsertError } = await supabase
          .from('user_taste_profiles')
          .upsert({
            user_id:      user.id,
            taste_vector: tasteVectorToSqlLiteral(vector),
            updated_at:   timestamp,
          }, { onConflict: 'user_id' })

        if (upsertError) throw upsertError

        succeeded++
        logs.push({ user_id: user.id, status: 'success', reading_items: readingItems.length, timestamp })

      } catch (err: any) {
        console.error(`Failed to refresh taste profile for user ${user.id}:`, err)
        failed++
        logs.push({ user_id: user.id, status: 'failed', error: err?.message ?? 'Unknown error', timestamp })
      }
    }

    for (const log of logs) await logRefresh(supabase, log)

    // ── Refresh compatibility scores now that vectors are current ──
    // Pulls each user's nearest neighbors by cosine similarity and
    // replaces their stored top-N matches. Runs after the vector pass
    // so scores reflect this run's updates, not stale ones.
    const { data: refreshedProfiles } = await supabase
      .from('user_taste_profiles')
      .select('user_id, taste_vector')

    let matchesUpdated = 0

    if (refreshedProfiles && refreshedProfiles.length > 1) {
      for (const profile of refreshedProfiles) {
        try {
          const { data: neighbors, error: matchError } = await supabase.rpc('match_taste_neighbors', {
            target_user_id: profile.user_id,
            match_limit:     TOP_MATCHES_PER_USER,
          })

          if (matchError) throw matchError
          if (!neighbors || neighbors.length === 0) continue

          await supabase
            .from('user_compatibility_scores')
            .delete()
            .eq('user_id', profile.user_id)

          const rows = neighbors.map((n: any) => ({
            user_id:         profile.user_id,
            matched_user_id: n.matched_user_id,
            similarity:      n.similarity,
            computed_at:     new Date().toISOString(),
          }))

          const { error: insertError } = await supabase
            .from('user_compatibility_scores')
            .insert(rows)

          if (insertError) throw insertError
          matchesUpdated++

        } catch (err: any) {
          console.error(`Failed to refresh matches for user ${profile.user_id}:`, err)
        }
      }
    }

    return NextResponse.json({
      users_processed: users.length,
      succeeded,
      skipped,
      failed,
      matches_updated: matchesUpdated,
      ran_at:          new Date().toISOString(),
    })
  } finally {
    await releaseLock(supabase)
  }
}