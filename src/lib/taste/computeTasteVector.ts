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

const ENGAGEMENT_MULTIPLIER = 1.5 // items the user reviewed or voted on count 1.5x

export interface ReadingItemForTaste {
  recommendation_id: string
  genres:            string[] | null
  type:              string | null
  status:            string | null
  content_rating:    string | null
}

export interface TasteInputs {
  items:                ReadingItemForTaste[]
  reviewedRecIds:       Set<string> // recommendation_ids this user has reviewed
  votedRecIds:          Set<string> // recommendation_ids this user has voted on
}

/**
 * Computes a 128-dim taste vector from a user's reading list activity.
 * Pure function — no DB access — so it's easy to unit test and reuse
 * from both the nightly cron job and any future on-demand recompute.
 *
 * Returns null if the user has no usable signal (empty reading list),
 * so callers can decide whether to skip the upsert entirely rather than
 * writing an all-zero vector that would falsely match everyone.
 */
export function computeTasteVector(inputs: TasteInputs): number[] | null {
  const { items, reviewedRecIds, votedRecIds } = inputs

  if (!items.length) return null

  const vector = new Array(VECTOR_DIM).fill(0)

  const genreIndex  = new Map<string, number>(GENRES.map((g, i) => [g, i]))
  const typeIndex   = new Map<string, number>(COMIC_TYPES.map((t, i) => [t.value, i]))
  const statusIndex = new Map<string, number>(STATUSES.map((s, i) => [s.value, i]))
  const ratingIndex = new Map<string, number>(CONTENT_RATINGS.map((r, i) => [r.value, i]))

  let totalWeight = 0

  for (const item of items) {
    const isEngaged =
      reviewedRecIds.has(item.recommendation_id) || votedRecIds.has(item.recommendation_id)
    const weight = isEngaged ? ENGAGEMENT_MULTIPLIER : 1

    totalWeight += weight

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

  if (totalWeight === 0) return null

  // Normalize used dims by total weight so the vector reflects proportions,
  // not raw counts (a user with 200 items shouldn't dominate similarity
  // math purely by volume vs a user with 5 items and identical taste).
  for (let i = 0; i < USED_DIMS; i++) {
    vector[i] = vector[i] / totalWeight
  }

  // L2-normalize the whole vector so cosine distance behaves consistently
  // regardless of how many dims ended up populated.
  const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0))
  if (magnitude > 0) {
    for (let i = 0; i < VECTOR_DIM; i++) {
      vector[i] = vector[i] / magnitude
    }
  }

  return vector
}

/** Formats a computed vector as the string pgvector expects, e.g. "[0.1,0.2,...]" */
export function tasteVectorToSqlLiteral(vector: number[]): string {
  return `[${vector.join(',')}]`
}