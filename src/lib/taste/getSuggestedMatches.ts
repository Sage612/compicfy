import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface SuggestedMatch {
  userId:        string
  username:      string
  displayName:   string | null
  avatarUrl:     string | null
  similarity:    number  // 0..1
  similarityPct: number  // 0..100, rounded, for display
  sharedGenres:  string[]
}

interface TasteProfile {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  favorite_genres: string[] | null
}

interface ViewerTasteProfile {
  favorite_genres: string[] | null
}

/**
 * Reads precomputed matches from user_compatibility_scores (populated
 * nightly by the taste-profile-refresh cron) and joins in profile
 * display data. Does NOT compute anything live — if a user has no
 * rows yet (new signup, or hasn't been through a nightly run), this
 * returns an empty array rather than falling back to a live compute,
 * since live compute doesn't scale and would need its own separate
 * narrowing query.
 */
export async function getSuggestedMatches(
  supabase: SupabaseClient<Database>,
  userId:   string,
  limit:    number = 5,
): Promise<SuggestedMatch[]> {
  const { data: scores, error: scoresError } = await supabase
    .from('user_compatibility_scores')
    .select('matched_user_id, similarity')
    .eq('user_id', userId)
    .order('similarity', { ascending: false })
    .limit(limit)

  if (scoresError) {
    console.error('Failed to fetch compatibility scores:', scoresError)
    return []
  }

  if (!scores || scores.length === 0) return []

  const matchedIds = scores.map((s: any) => s.matched_user_id)

  const [{ data: profiles, error: profilesError }, { data: myProfile }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, favorite_genres')
      .in('id', matchedIds)
      .returns<TasteProfile[]>(),
    supabase
      .from('profiles')
      .select('favorite_genres')
      .eq('id', userId)
      .maybeSingle<ViewerTasteProfile>(),
  ])

  if (profilesError) {
    console.error('Failed to fetch matched profiles:', profilesError)
    return []
  }

  const myGenres = new Set<string>(myProfile?.favorite_genres ?? [])
  const profileById = new Map((profiles ?? []).map(p => [p.id, p]))

  return scores
    .map((score: any) => {
      const profile = profileById.get(score.matched_user_id)
      if (!profile) return null

      const theirGenres = (profile.favorite_genres ?? []) as string[]
      const sharedGenres = theirGenres.filter(g => myGenres.has(g)).slice(0, 3)

      return {
        userId:        profile.id,
        username:      profile.username,
        displayName:   profile.display_name,
        avatarUrl:     profile.avatar_url,
        similarity:    score.similarity,
        similarityPct: Math.round(score.similarity * 100),
        sharedGenres,
      }
    })
    .filter((m): m is SuggestedMatch => m !== null)
}