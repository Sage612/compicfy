import type { SupabaseClient } from '@supabase/supabase-js'
import type { Recommendation } from '@/types/app.types'

const ADULT_RATINGS = ['adult', 'mature'] as const

/** All-ages vs adult scoping, applied to any recommendations query. */
export function scopeByRating<T extends { in: Function; not: Function }>(q: T, adult: boolean): T {
  return adult
    ? q.in('content_rating', ADULT_RATINGS)
    : q.not('content_rating', 'in', '("adult","mature")')
}

interface LatestOpts {
  q?:      string
  type?:   string
  genre?:  string
  status?: string
  adult:   boolean
  limit:   number
  offset:  number
}

/**
 * "Latest update" ordering: comics whose newest chapter landed most
 * recently come first (last_chapter_released_at, written by the
 * chapter-check cron). Comics with no known chapter date sort last.
 *
 * Done as a direct query so it doesn't depend on search_recommendations
 * knowing a new p_sort value.
 */
export async function queryLatestUpdated(
  s: SupabaseClient,
  { q, type, genre, status, adult, limit, offset }: LatestOpts,
): Promise<{ items: Recommendation[]; total: number }> {
  let query = s
    .from('recommendations')
    .select('*', { count: 'exact' })
    .eq('is_approved', true)
    .eq('is_draft', false)

  query = scopeByRating(query as any, adult) as any

  if (q) {
    const safe = q.replace(/[%,()]/g, ' ')
    query = query.or(`title.ilike.%${safe}%,author.ilike.%${safe}%,artist.ilike.%${safe}%,description.ilike.%${safe}%`)
  }
  if (type)   query = query.eq('type', type as any)
  if (genre)  query = query.contains('genres', [genre])
  if (status) query = query.eq('status', status)

  const { data, count } = await query
    .order('last_chapter_released_at', { ascending: false, nullsFirst: false })
    .order('score', { ascending: false })
    .range(offset, offset + limit - 1)

  return { items: (data as Recommendation[]) ?? [], total: count ?? 0 }
}