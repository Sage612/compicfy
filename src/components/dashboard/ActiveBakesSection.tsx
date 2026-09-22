import Link from 'next/link'
import { Croissant, Calendar } from 'lucide-react'

type Bake = {
  id:                          number
  target_chapter_count:        number
  counting_mode:               'from_now' | 'from_read'
  chapter_count_at_bake_start: number
  predicted_ready_at:          string | null
  status:                      'active' | 'fulfilled'
  recommendation: {
    id:            string
    title:         string
    cover_url:     string | null
    chapter_count: number | null
  }
  // Only present/relevant for from_read bakes — the user's current read progress
  // on this comic. Fetched separately since it comes from reading_list_items,
  // not bake_requests itself.
  progress_chapter?: number | null
}

interface Props {
  bakes: Bake[]
}

function proxyCover(url: string | null) {
  if (!url) return ''
  return `/api/image-proxy?url=${encodeURIComponent(url)}`
}

function computeProgress(bake: Bake) {
  const currentChapters = bake.recommendation.chapter_count ?? bake.chapter_count_at_bake_start

  // Same branching as the chapter-check cron and UpdatesClient — a from_read
  // bake counts from wherever the user has actually read to (which can move
  // while the bake is active), not from the comic's chapter count when the
  // bake started.
  const baseline = bake.counting_mode === 'from_read'
    ? (bake.progress_chapter ?? bake.chapter_count_at_bake_start)
    : bake.chapter_count_at_bake_start

  const gained = Math.max(currentChapters - baseline, 0)

  return {
    current: gained,
    target:  bake.target_chapter_count,
    pct:     Math.min((gained / bake.target_chapter_count) * 100, 100),
  }
}

export function ActiveBakesSection({ bakes }: Props) {
  if (bakes.length === 0) return null

  const ready  = bakes.filter(b => b.status === 'fulfilled')
  const baking = bakes.filter(b => b.status !== 'fulfilled')

  return (
    <div className="space-y-6">
      {ready.length > 0 && (
        <div>
          <h2 className="font-dashboard-serif text-xl mb-3 flex items-center gap-2">
            <Croissant size={16} className="text-muted-foreground/60" />Ready to binge
          </h2>
          <div className="space-y-2">
            {ready.map(bake => (
              <Link
                key={bake.id}
                href={`/comic/${bake.recommendation.id}`}
                className="flex items-center gap-3 p-3 rounded-2xl border border-border bg-card hover:border-foreground/20 transition-colors"
              >
                <div className="w-10 h-14 rounded-lg overflow-hidden bg-muted shrink-0">
                  {bake.recommendation.cover_url && (
                    <img src={proxyCover(bake.recommendation.cover_url)} alt={bake.recommendation.title} className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{bake.recommendation.title}</p>
                  <p className="text-xs text-muted-foreground">Ready to binge</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {baking.length > 0 && (
        <div>
          <h2 className="font-dashboard-serif text-xl mb-3 flex items-center gap-2">
            <Croissant size={16} className="text-muted-foreground/60" />Still baking
          </h2>
          <div className="space-y-2">
            {baking.map(bake => {
              const { current, target, pct } = computeProgress(bake)
              return (
                <Link
                  key={bake.id}
                  href={`/comic/${bake.recommendation.id}`}
                  className="flex items-center gap-3 p-3 rounded-2xl border border-border bg-card hover:border-foreground/20 transition-colors"
                >
                  <div className="w-10 h-14 rounded-lg overflow-hidden bg-muted shrink-0">
                    {bake.recommendation.cover_url && (
                      <img src={proxyCover(bake.recommendation.cover_url)} alt={bake.recommendation.title} className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <p className="text-sm font-medium truncate">{bake.recommendation.title}</p>
                    <div className="h-1 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-foreground/70 transition-all duration-700" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{current} / {target} chapters</span>
                      {bake.predicted_ready_at && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar size={10} />~{new Date(bake.predicted_ready_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}