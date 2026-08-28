import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

// ── Confidence tiers for display ────────────────────────────────────
// Mirrors the confidence scale from computeTasteVector — a match's
// match_confidence is min(confidence_a, confidence_b), so it reflects
// the LESS certain side of the pair. A high similarity score built on
// thin data shouldn't be presented with the same authority as one
// backed by real activity on both sides.
const HIGH_CONFIDENCE_THRESHOLD = 0.7
const LOW_CONFIDENCE_THRESHOLD  = 0.3

// ── Tier limits (item #17) ──────────────────────────────────────────
// Free: top 3, refreshed weekly. Pro: top 10, refreshed nightly (the
// underlying cron always recomputes nightly for everyone — this is a
// DISPLAY freeze for free users, not a slower compute cadence, so we
// don't need two cron schedules).
const FREE_MATCH_LIMIT = 3
const PRO_MATCH_LIMIT  = 10
const FREE_REFRESH_DAYS = 7

export type MatchConfidenceTier = 'high' | 'medium' | 'low'

function tierFor(confidence: number): MatchConfidenceTier {
  if (confidence >= HIGH_CONFIDENCE_THRESHOLD) return 'high'
  if (confidence >= LOW_CONFIDENCE_THRESHOLD)  return 'medium'
  return 'low'
}

export interface SuggestedMatch {
  userId:         string
  username:       string
  displayName:    string | null
  avatarUrl:      string | null
  similarity:     number  // 0..1
  similarityPct:  number  // 0..100, rounded, for display
  confidenceTier: MatchConfidenceTier
  sharedGenres:   string[]
}

export interface MatchFilters {
  genre?:              string  // one of GENRES — only matches sharing this genre
  minConfidence?:      MatchConfidenceTier // e.g. 'high' to exclude medium/low entirely
  matchAdultContent?:  boolean // only show matches whose adult_content_enabled equals the viewer's own setting
}

export async function getSuggestedMatches(
  supabase: SupabaseClient<Database>,
  userId:   string,
  isPro:    boolean,
  filters:  MatchFilters = {},
): Promise<SuggestedMatch[]> {
  const limit = isPro ? PRO_MATCH_LIMIT : FREE_MATCH_LIMIT

  // ── Free-tier weekly freeze ──────────────────────────────────────
  if (!isPro) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('matches_last_shown_at')
      .eq('id', userId)
      .maybeSingle()

    const lastShown = profile?.matches_last_shown_at
    const daysSinceShown = lastShown
      ? (Date.now() - new Date(lastShown).getTime()) / (1000 * 60 * 60 * 24)
      : Infinity

    if (daysSinceShown >= FREE_REFRESH_DAYS) {
      // Time to roll forward — stamp now so this set sticks for another week.
      await supabase
        .from('profiles')
        .update({ matches_last_shown_at: new Date().toISOString() })
        .eq('id', userId)
    }
    // Either way (just rolled, or still within the week), we fetch the
    // current top-3 below — the freeze is about not showing MORE than
    // 3 and not implying daily freshness, not about literally caching
    // a stale row set forever.
  }

  const { data: scores, error: scoresError } = await supabase.rpc(
    'match_taste_neighbors',
    { target_user_id: userId, match_limit: limit },
  )

  if (scoresError) {
    console.error('Failed to fetch compatibility scores:', scoresError)
    return []
  }

  if (!scores || scores.length === 0) return []

  // Filters are Pro-only (item #17). Silently ignored for free users —
  // the UI's ProGate is the primary control for hiding filter inputs;
  // this is a server-side backstop, not the main enforcement point.
  const minConfidence = isPro && filters.minConfidence
    ? filters.minConfidence === 'high'   ? HIGH_CONFIDENCE_THRESHOLD
    : filters.minConfidence === 'medium' ? LOW_CONFIDENCE_THRESHOLD
    : 0
    : LOW_CONFIDENCE_THRESHOLD
  const filteredScores = scores.filter(score => score.match_confidence >= minConfidence)

  if (filteredScores.length === 0) return []

  const matchedIds = filteredScores.map(s => s.matched_user_id)

  const profileSelect = 'id, username, display_name, avatar_url, favorite_genres, adult_content_enabled'

  const [{ data: profiles, error: profilesError }, { data: myProfile }] = await Promise.all([
    supabase
      .from('profiles')
      .select(profileSelect)
      .in('id', matchedIds),
    supabase
      .from('profiles')
      .select('favorite_genres')
      .eq('id', userId)
      .maybeSingle(),
  ])

  if (profilesError) {
    console.error('Failed to fetch matched profiles:', profilesError)
    return []
  }

  const myGenres = new Set<string>(myProfile?.favorite_genres ?? [])
  let candidateProfiles = profiles ?? []

  // Genre filter — Pro-only, applied post-fetch since it's filtering on
  // the MATCHED user's favorite_genres, not something the compatibility
  // table itself indexes.
  const genre = isPro ? filters.genre : undefined
  if (genre) {
    candidateProfiles = candidateProfiles.filter(p =>
      (p.favorite_genres ?? []).includes(genre)
    )
  }

  // Adult-content filter — Pro-only. matchAdultContent lets the viewer
  // choose to only see matches whose adult_content_enabled equals their
  // own (true = only other adult-content-enabled users; false = only
  // users who also keep it off). Left undefined means no filtering.
  if (isPro && filters.matchAdultContent !== undefined) {
    candidateProfiles = candidateProfiles.filter(p =>
      !!p.adult_content_enabled === filters.matchAdultContent
    )
  }

  const profileById = new Map(candidateProfiles.map(p => [p.id, p]))

  return filteredScores
    .map(score => {
      const profile = profileById.get(score.matched_user_id)
      if (!profile) return null

      const theirGenres = (profile.favorite_genres ?? []) as string[]
      const sharedGenres = theirGenres.filter(g => myGenres.has(g)).slice(0, 3)

      return {
        userId:         profile.id,
        username:       profile.username,
        displayName:    profile.display_name,
        avatarUrl:      profile.avatar_url,
        similarity:     score.similarity,
        similarityPct:  Math.round(score.similarity * 100),
        confidenceTier: tierFor(score.match_confidence),
        sharedGenres,
      }
    })
    .filter((m): m is SuggestedMatch => m !== null)
}