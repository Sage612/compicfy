'use client'

interface Props {
  viewerGenres:    string[]
  profileGenres:   string[]
  profileName:     string
  // Optional interaction signals
  viewerStats?:    { reviews: number; votes_given: number; lists: number }
  profileStats?:   { reviews: number; votes_given: number; lists: number }
}

// ── Genre similarity (Jaccard) ────────────────────────────────────────────────
function genreJaccard(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0
  const setA  = new Set(a)
  const setB  = new Set(b)
  const union = new Set([...a, ...b])
  const overlap = [...setA].filter(g => setB.has(g)).length
  return overlap / union.size
}

// ── Engagement similarity ─────────────────────────────────────────────────────
// Compare how actively two users engage — closer activity levels = more similar
function engagementSimilarity(
  a?: { reviews: number; votes_given: number; lists: number },
  b?: { reviews: number; votes_given: number; lists: number }
): number {
  if (!a || !b) return 0

  // Normalize each metric to 0–1 using soft cap of 100
  const norm  = (v: number) => Math.min(v, 100) / 100
  const diff  = (x: number, y: number) => 1 - Math.abs(norm(x) - norm(y))

  const reviewSim = diff(a.reviews,     b.reviews)
  const voteSim   = diff(a.votes_given, b.votes_given)
  const listSim   = diff(a.lists,       b.lists)

  // Weighted average — reviews matter most
  return (reviewSim * 0.5) + (voteSim * 0.3) + (listSim * 0.2)
}

// ── Combined score ────────────────────────────────────────────────────────────
function computeCompatibility(
  viewerGenres:  string[],
  profileGenres: string[],
  viewerStats?:  Props['viewerStats'],
  profileStats?: Props['profileStats']
): number {
  const genreScore      = genreJaccard(viewerGenres, profileGenres)
  const engageScore     = engagementSimilarity(viewerStats, profileStats)

  // If we have engagement data, blend 70% genre + 30% engagement
  // Without it, pure genre score
  const blended = viewerStats && profileStats
    ? genreScore * 0.7 + engageScore * 0.3
    : genreScore

  return Math.round(blended * 100)
}

function getCompatLabel(pct: number): { label: string; color: string; emoji: string } {
  if (pct >= 80) return { label: 'Twin Readers',      color: 'text-emerald-500',      emoji: '🔥' }
  if (pct >= 60) return { label: 'Great Match',        color: 'text-primary',          emoji: '✨' }
  if (pct >= 40) return { label: 'Good Overlap',       color: 'text-amber-500',        emoji: '👍' }
  if (pct >= 20) return { label: 'Some Common Taste',  color: 'text-muted-foreground', emoji: '🤝' }
  return              { label: 'Different Tastes',      color: 'text-muted-foreground', emoji: '🎲' }
}

export function TasteCompatibility({
  viewerGenres,
  profileGenres,
  profileName,
  viewerStats,
  profileStats,
}: Props) {
  if (!viewerGenres.length || !profileGenres.length) return null

  const pct    = computeCompatibility(viewerGenres, profileGenres, viewerStats, profileStats)
  const meta   = getCompatLabel(pct)
  const shared = viewerGenres.filter(g => profileGenres.includes(g)).slice(0, 3)

  return (
    <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-muted/50 border border-border text-xs">
      <span className="text-base leading-none">{meta.emoji}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={`font-black ${meta.color}`}>{pct}% taste match</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground">{meta.label}</span>
        </div>
        {shared.length > 0 && (
          <p className="text-muted-foreground/70 mt-0.5 truncate">
            Both like {shared.join(', ')}
          </p>
        )}
      </div>
    </div>
  )
}