// src/components/comic-detail/RatingsHistogram.tsx
//
// Letterboxd's ratings block: bars from one star on the left to five on the
// right, the average on the right. Server component, no client JS.

import { Star } from 'lucide-react'
import type { RatingBreakdown } from '@/lib/tracking/types'

interface Props {
  breakdown:  RatingBreakdown
  upvotePct?: number | null
  voteCount?: number
}

export function RatingsHistogram({ breakdown, upvotePct = null, voteCount = 0 }: Props) {
  const { counts, total, average } = breakdown
  const peak = Math.max(...counts, 1)

  return (
    <section aria-label="Ratings" className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-[family-name:var(--font-mono)] font-medium text-[11px] uppercase tracking-[0.2em] text-dossier-foreground/65">
          Ratings
        </h2>
        <span className="font-[family-name:var(--font-mono)] font-medium text-[11px] text-dossier-foreground/65">
          {total > 0 ? `${total.toLocaleString()} rating${total === 1 ? '' : 's'}` : 'No ratings yet'}
          {upvotePct !== null && voteCount > 0 ? ` · ${upvotePct}% upvoted` : ''}
        </span>
      </div>

      <div className="flex items-end gap-3">
        <Star size={14} className="shrink-0 mb-0.5 fill-emerald-400 text-emerald-400" aria-label="1 star" />

        <div className="flex-1 flex items-end gap-1.5 h-16" role="img" aria-label={`Rating distribution, ${total} ratings`}>
          {counts.map((count, i) => (
            <div
              key={i}
              title={`${i + 1}★: ${count}`}
              className="flex-1 rounded-t-[3px] bg-dossier-foreground/25 transition-[height]"
              style={{ height: `${count === 0 ? 4 : Math.max(8, Math.round((count / peak) * 100))}%` }}
            />
          ))}
        </div>

        <div className="shrink-0 text-right">
          <p className="font-[family-name:var(--font-dossier-display)] text-3xl font-light tabular-nums text-dossier-foreground/80 leading-none">
            {average !== null ? average.toFixed(1) : '–'}
          </p>
          <div className="mt-1.5 flex gap-0.5 justify-end" aria-label="5 stars">
            {[1, 2, 3, 4, 5].map(n => (
              <Star key={n} size={11} className="fill-emerald-400 text-emerald-400" />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}