import { GENRES, COMIC_TYPES, STATUSES, CONTENT_RATINGS } from '@/lib/utils/constants'

// ============================================================================
// Dimension allocation for the 128-dim taste_vector column.
// Order matters — this exact layout must stay in sync with how vectors are
// read back out (e.g. if you ever want to explain "why this match" by
// inspecting which dims contributed most).
//
//   [0..24]   genre weights       (25 dims, GENRES order)
//   [25..30]  type weights        (6 dims,  COMIC_TYPES order)
//   [31..34]  status weights      (4 dims,  STATUSES order)
//   [35..38]  content_rating wts  (4 dims,  CONTENT_RATINGS order)
//   [39..127] reserved, zero-padded (89 dims headroom for future signals)
// ============================================================================

const VECTOR_DIM = 128

const GENRE_OFFSET   = 0
const TYPE_OFFSET    = GENRE_OFFSET + GENRES.length            // 25
const STATUS_OFFSET  = TYPE_OFFSET + COMIC_TYPES.length        // 31
const RATING_OFFSET  = STATUS_OFFSET + STATUSES.length         // 35
const USED_DIMS      = RATING_OFFSET + CONTENT_RATINGS.length  // 39

// ── Per-item weights ─────────────────────────────────────────────────
// Mirrors the tw2 weighting in get_personalized_recommendations (saves=3,
// votes=2, reviews=1) in spirit: stronger, more deliberate actions count
// more. Reading-list items are the baseline; votes/reviews are treated
// as their OWN independent signal, not a multiplier gated behind list
// membership — a comic a user voted on counts here whether or not it's
// on any of their lists. (Earlier version of this file required the SAME
// comic to be both list-tracked AND voted/reviewed for the engagement
// multiplier to apply at all — that silently discarded a user's voting/
// review activity whenever they didn't also list-track the same comic.)
const READING_LIST_WEIGHT = 1.0
const VOTE_WEIGHT         = 1.5
const REVIEW_WEIGHT       = 1.5

// ── Confidence tiers ─────────────────────────────────────────────────
// Same interaction_count buckets used by get_personalized_recommendations,
// reused here so "how much do we trust this user's data" means the same
// thing across both features instead of two independently-tuned scales.
//   < 5 interactions   → low confidence,  favorite_genres weighted heavily
//   < 20 interactions  → medium confidence, roughly balanced
//   >= 20 interactions → high confidence, behavior dominates
function favoriteGenreWeightFor(interactionCount: number): number {
  if (interactionCount < 5)  return 0.8
  if (interactionCount < 20) return 0.5
  return 0.2
}

function confidenceFor(interactionCount: number): number {
  // Linear ramp to 1.0 at 20 interactions, matching the point where
  // get_personalized_recommendations considers a user "fully active".
  return Math.min(interactionCount / 20, 1.0)
}

export interface RecommendationTasteData {
  recommendation_id: string
  genres:            string[] | null
  type:              string | null
  status:            string | null
  content_rating:    string | null
}

export interface TasteInputs {
  readingListItems: RecommendationTasteData[]
  votedItems:       RecommendationTasteData[] // comics this user voted on, independent of lists
  reviewedItems:    RecommendationTasteData[] // comics this user reviewed, independent of lists
  favoriteGenres:   string[]                  // profiles.favorite_genres
}

export interface TasteVectorResult {
  vector:     number[]
  confidence: number // 0..1 — how much real activity backs this vector
}

/**
 * Computes a 128-dim taste vector plus a confidence score from a user's
 * activity. Pure function — no DB access — so it's easy to unit test and
 * reuse from both the nightly cron job and any future on-demand recompute.
 *
 * Votes and reviews are counted independently of reading-list membership:
 * a comic a user voted on contributes to their taste signal whether or
 * not it's also list-tracked. This matters because voting/reviewing are
 * themselves strong, deliberate signals of taste — gating them behind
 * list membership was silently discarding a user's most opinionated
 * activity whenever they didn't also bother to list-track.
 *
 * favorite_genres is blended in with weight that scales inversely with
 * how much real activity the user has — sparse/new users lean on their
 * stated favorites, active users lean on actual behavior. This mirrors
 * the profile_weight/activity_weight split in
 * get_personalized_recommendations() so both features treat "how much
 * do we trust this user's data" the same way.
 *
 * Returns null if the user has zero usable signal (no activity AND no
 * favorite genres), so callers can skip the upsert entirely rather than
 * writing an all-zero vector that would falsely match everyone.
 */
export function computeTasteVector(inputs: TasteInputs): TasteVectorResult | null {
  const { readingListItems, votedItems, reviewedItems, favoriteGenres } = inputs

  const interactionCount = readingListItems.length + votedItems.length + reviewedItems.length

  if (interactionCount === 0 && favoriteGenres.length === 0) return null

  const vector = new Array(VECTOR_DIM).fill(0)

  const genreIndex  = new Map<string, number>(GENRES.map((g, i) => [g, i]))
  const typeIndex   = new Map<string, number>(COMIC_TYPES.map((t, i) => [t.value, i]))
  const statusIndex = new Map<string, number>(STATUSES.map((s, i) => [s.value, i]))
  const ratingIndex = new Map<string, number>(CONTENT_RATINGS.map((r, i) => [r.value, i]))

  let behavioralWeight = 0

  function applyItem(item: RecommendationTasteData, weight: number) {
    behavioralWeight += weight

    for (const genre of item.genres ?? []) {
      const idx = genreIndex.get(genre)
      if (idx !== undefined) vector[GENRE_OFFSET + idx] += weight
    }
    if (item.type) {
      const idx = typeIndex.get(item.type)
      if (idx !== undefined) vector[TYPE_OFFSET + idx] += weight
    }
    if (item.status) {
      const idx = statusIndex.get(item.status)
      if (idx !== undefined) vector[STATUS_OFFSET + idx] += weight
    }
    if (item.content_rating) {
      const idx = ratingIndex.get(item.content_rating)
      if (idx !== undefined) vector[RATING_OFFSET + idx] += weight
    }
  }

  for (const item of readingListItems) applyItem(item, READING_LIST_WEIGHT)
  for (const item of votedItems)       applyItem(item, VOTE_WEIGHT)
  for (const item of reviewedItems)    applyItem(item, REVIEW_WEIGHT)

  // ── Blend in favorite_genres, weighted by how little else we know ──
  // Treated as a separate weighted pool applied only to genre dims (it
  // has no type/status/rating equivalent), then combined with the
  // behavioral genre signal using the same adaptive split the comics
  // recommender uses.
  if (favoriteGenres.length > 0 && behavioralWeight > 0) {
    const favoriteWeight  = favoriteGenreWeightFor(interactionCount)
    const activityWeight  = 1 - favoriteWeight

    // Normalize behavioral genre dims to proportions first, so blending
    // isn't skewed by raw activity volume.
    for (let i = GENRE_OFFSET; i < GENRE_OFFSET + GENRES.length; i++) {
      vector[i] = vector[i] / behavioralWeight
    }

    const favoriteShare = 1 / favoriteGenres.length
    for (const genre of favoriteGenres) {
      const idx = genreIndex.get(genre)
      if (idx === undefined) continue
      vector[GENRE_OFFSET + idx] =
        vector[GENRE_OFFSET + idx] * activityWeight + favoriteShare * favoriteWeight
    }

    // Type/status/rating dims still need behavioral normalization even
    // though favorites don't touch them.
    for (let i = TYPE_OFFSET; i < USED_DIMS; i++) {
      vector[i] = vector[i] / behavioralWeight
    }
  } else if (favoriteGenres.length > 0) {
    // No behavioral data at all — favorites are the entire genre signal.
    const favoriteShare = 1 / favoriteGenres.length
    for (const genre of favoriteGenres) {
      const idx = genreIndex.get(genre)
      if (idx !== undefined) vector[GENRE_OFFSET + idx] = favoriteShare
    }
  } else {
    // No favorites — pure behavioral, just normalize by total weight.
    for (let i = 0; i < USED_DIMS; i++) {
      vector[i] = vector[i] / behavioralWeight
    }
  }

  // L2-normalize the whole vector so cosine distance behaves consistently
  // regardless of how many dims ended up populated.
  const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0))
  if (magnitude > 0) {
    for (let i = 0; i < VECTOR_DIM; i++) {
      vector[i] = vector[i] / magnitude
    }
  }

  return {
    vector,
    confidence: confidenceFor(interactionCount),
  }
}

/** Formats a computed vector as the string pgvector expects, e.g. "[0.1,0.2,...]" */
export function tasteVectorToSqlLiteral(vector: number[]): string {
  return `[${vector.join(',')}]`
}