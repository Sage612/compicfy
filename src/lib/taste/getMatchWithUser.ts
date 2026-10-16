import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import type { MatchConfidenceTier } from './getSuggestedMatches'

// Taste match between the signed-in viewer and ONE specific profile, for the
// "Taste match" card on that profile. It asks the same database function the
// Matches page uses (match_taste_neighbors), so the percentage is identical,
// but it looks the person up directly instead of only showing them when they
// happen to be in the viewer's top 3 / top 10. It never touches
// matches_last_shown_at, so merely visiting a profile can't advance the
// free-tier weekly refresh.

const CANDIDATE_POOL       = 500
const LOW_CONFIDENCE_FLOOR = 0.3   // same floor getSuggestedMatches applies
const HIGH_CONFIDENCE      = 0.7

export interface ProfileMatch {
  similarityPct:  number
  confidenceTier: MatchConfidenceTier
  sharedGenres:   string[]
}

export async function getMatchWithUser(
  supabase: SupabaseClient<Database>,
  viewerId: string,
  targetId: string,
): Promise<ProfileMatch | null> {
  if (viewerId === targetId) return null

  const { data: scores, error } = await supabase.rpc('match_taste_neighbors', {
    target_user_id: viewerId,
    match_limit:    CANDIDATE_POOL,
  })
  if (error || !scores) return null

  const hit = scores.find(s => s.matched_user_id === targetId)
  if (!hit || hit.match_confidence < LOW_CONFIDENCE_FLOOR) return null

  const { data: rows } = await supabase
    .from('profiles')
    .select('id, favorite_genres')
    .in('id', [viewerId, targetId])

  const genresOf = (id: string) =>
    new Set<string>((((rows ?? []).find(r => r.id === id)?.favorite_genres) ?? []) as string[])
  const mine = genresOf(viewerId)
  const sharedGenres = [...genresOf(targetId)].filter(g => mine.has(g)).slice(0, 3)

  return {
    similarityPct:  Math.round(hit.similarity * 100),
    confidenceTier: hit.match_confidence >= HIGH_CONFIDENCE ? 'high' : 'medium',
    sharedGenres,
  }
}