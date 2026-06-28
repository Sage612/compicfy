'use client'

interface Props {
  viewerGenres:    string[]
  profileGenres:   string[]
  profileName:     string
  viewerStats?:    { reviews: number; votes_given: number; lists: number }
  profileStats?:   { reviews: number; votes_given: number; lists: number }
  // New: reading list overlap signal
  sharedReading?:  number   // count of comics both are reading
  sharedPlanning?: number   // count of comics both plan to read
}

function genreJaccard(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0
  const setA    = new Set(a)
  const union   = new Set([...a, ...b])
  const overlap = [...setA].filter(g => new Set(b).has(g)).length
  return overlap / union.size
}

function engagementSimilarity(
  a?: { reviews: number; votes_given: number; lists: number },
  b?: { reviews: number; votes_given: number; lists: number }
): number {
  if (!a || !b) return 0
  const norm = (v: number) => Math.min(v, 100) / 100
  const diff = (x: number, y: number) => 1 - Math.abs(norm(x) - norm(y))
  return (diff(a.reviews, b.reviews) * 0.5) + (diff(a.votes_given, b.votes_given) * 0.3) + (diff(a.lists, b.lists) * 0.2)
}

// Reading list overlap — shared comics in reading/plan_to_read = strong signal
function readingOverlapScore(sharedReading: number, sharedPlanning: number): number {
  // Each shared reading comic = 0.15 boost (capped at 0.6)
  // Each shared planning comic = 0.08 boost (capped at 0.4)
  const readingBoost  = Math.min(sharedReading  * 0.15, 0.6)
  const planningBoost = Math.min(sharedPlanning * 0.08, 0.4)
  return Math.min(readingBoost + planningBoost, 0.8) // max 80% from this signal alone
}

function computeCompatibility(
  viewerGenres:   string[],
  profileGenres:  string[],
  viewerStats?:   Props['viewerStats'],
  profileStats?:  Props['profileStats'],
  sharedReading:  number = 0,
  sharedPlanning: number = 0
): number {
  const genreScore   = genreJaccard(viewerGenres, profileGenres)
  const engageScore  = engagementSimilarity(viewerStats, profileStats)
  const readingScore = readingOverlapScore(sharedReading, sharedPlanning)

  // Blend: 50% genre + 20% engagement + 30% reading overlap
  // If no reading data, fall back to 70% genre + 30% engagement
  // If no engagement data either, pure genre
  const hasReading   = sharedReading > 0 || sharedPlanning > 0
  const hasEngagement = viewerStats && profileStats

  let blended: number
  if (hasReading && hasEngagement) {
    blended = genreScore * 0.5 + engageScore * 0.2 + readingScore * 0.3
  } else if (hasReading) {
    blended = genreScore * 0.6 + readingScore * 0.4
  } else if (hasEngagement) {
    blended = genreScore * 0.7 + engageScore * 0.3
  } else {
    blended = genreScore
  }

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
  sharedReading  = 0,
  sharedPlanning = 0,
}: Props) {
  if (!viewerGenres.length || !profileGenres.length) return null

  const pct    = computeCompatibility(viewerGenres, profileGenres, viewerStats, profileStats, sharedReading, sharedPlanning)
  const meta   = getCompatLabel(pct)
  const shared = viewerGenres.filter(g => profileGenres.includes(g)).slice(0, 3)

  return (
    <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-muted/50 border border-border text-xs">
      <span className="text-base leading-none">{meta.emoji}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`font-black ${meta.color}`}>{pct}% taste match</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground">{meta.label}</span>
          {(sharedReading > 0 || sharedPlanning > 0) && (
            <>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">
                {sharedReading > 0 && `${sharedReading} reading`}
                {sharedReading > 0 && sharedPlanning > 0 && ', '}
                {sharedPlanning > 0 && `${sharedPlanning} planned`}
              </span>
            </>
          )}
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