interface Props {
  viewerGenres:  string[]
  profileGenres: string[]
  profileName:   string
}

function computeCompatibility(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0
  const setA    = new Set(a)
  const setB    = new Set(b)
  const union   = new Set([...a, ...b])
  const overlap = [...setA].filter(g => setB.has(g)).length
  // Jaccard similarity scaled to percentage
  return Math.round((overlap / union.size) * 100)
}

function getCompatLabel(pct: number): { label: string; color: string; emoji: string } {
  if (pct >= 80) return { label: 'Twin Readers',    color: 'text-emerald-500', emoji: '🔥' }
  if (pct >= 60) return { label: 'Great Match',      color: 'text-primary',    emoji: '✨' }
  if (pct >= 40) return { label: 'Good Overlap',     color: 'text-amber-500',  emoji: '👍' }
  if (pct >= 20) return { label: 'Some Common Taste',color: 'text-muted-foreground', emoji: '🤝' }
  return              { label: 'Different Tastes',    color: 'text-muted-foreground', emoji: '🎲' }
}

export function TasteCompatibility({ viewerGenres, profileGenres, profileName }: Props) {
  if (!viewerGenres.length || !profileGenres.length) return null

  const pct     = computeCompatibility(viewerGenres, profileGenres)
  const meta    = getCompatLabel(pct)

  // Find shared genres to display
  const shared  = viewerGenres.filter(g => profileGenres.includes(g)).slice(0, 3)

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