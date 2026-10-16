'use client'

// src/components/comic-detail/ProgressStrip.tsx
//
// "Your progress": where you are, how you felt along the way, and a scrub bar
// to jump. The coloured dots are the moods you tapped after logging chapters,
// placed where they happened, so the bar doubles as a quick memory of how the
// story felt.

import { useMemo } from 'react'
import { MOOD_TINT, MOODS } from '@/lib/tracking/constants'
import { TRACKING_STATUS_META, resolveSubStatusLabel, type TrackingStatusValue } from '@/lib/utils/constants'
import { timeAgo } from '@/lib/utils/format'
import { useTracking } from './TrackingProvider'
import { ScrubBar } from './ScrubBar'

const MOOD_LABEL: Record<string, string> = Object.fromEntries(MOODS.map(m => [m.emoji, m.label]))

export function ProgressStrip() {
  const t = useTracking()
  const { status, subStatus, chapter, lastReadAt } = t.snapshot

  const ch    = chapter ?? 0
  const total = t.totalChapters

  // The bar's scale: the real total if we know it, otherwise the furthest point so far.
  const scale = useMemo(() => {
    const furthest = Math.max(ch, ...t.moments.map(m => m.chapter ?? 0), 1)
    return total && total > 0 ? Math.max(total, furthest) : furthest
  }, [ch, total, t.moments])

  if (!t.signedIn || !t.tracked) return null

  const meta     = TRACKING_STATUS_META[status as TrackingStatusValue]
  const subLabel = status ? resolveSubStatusLabel(status, subStatus) : null
  const pct      = Math.min(100, Math.round((ch / scale) * 100))

  return (
    <section id="progress" className="scroll-mt-20 space-y-3">
      <div className="flex items-end justify-between gap-3">
        <h2 className="font-[family-name:var(--font-mono)] font-medium text-[11px] uppercase tracking-[0.2em] text-dossier-foreground/65">
          Your progress
        </h2>
        {lastReadAt && (
          <span className="font-[family-name:var(--font-mono)] font-medium text-[11px] text-dossier-foreground/65">
            Updated {timeAgo(lastReadAt)}
          </span>
        )}
      </div>

      <div className="rounded-2xl border border-dossier-foreground/10 bg-dossier-panel/40 p-4 space-y-4">
        <div className="flex items-baseline justify-between gap-3">
          <p className="font-[family-name:var(--font-dossier-display)] text-3xl font-black italic tabular-nums text-dossier-foreground leading-none">
            Ch. {ch}
            {total ? <span className="text-base font-normal not-italic text-dossier-foreground/65"> / {total}</span> : null}
          </p>
          <p className="text-xs text-dossier-foreground/80 text-right">
            {meta?.emoji} {meta?.label}
            {subLabel ? ` · ${subLabel}` : ''}
          </p>
        </div>

        {/* bar + mood dots */}
        <div className="relative pt-2 pb-1">
          <div className="h-2 rounded-full bg-dossier-foreground/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-dossier-foreground/80 transition-[width] duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
          {t.moments.map(m => {
            if (m.chapter === null) return null
            const left = Math.min(100, Math.max(0, (m.chapter / scale) * 100))
            return (
              <span
                key={m.id}
                title={`${m.mood} ${MOOD_LABEL[m.mood] ?? ''} · Ch. ${m.chapter}`}
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full border-2 border-dossier shadow-sm"
                style={{ left: `${left}%`, background: MOOD_TINT[m.mood] ?? '#94a3b8' }}
              />
            )
          })}
        </div>

        {t.moments.length > 0 && (
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {MOODS.filter(m => t.moments.some(p => p.mood === m.emoji)).map(m => (
              <span key={m.emoji} className="flex items-center gap-1.5 text-[11px] text-dossier-foreground/72">
                <span className="w-2 h-2 rounded-full" style={{ background: MOOD_TINT[m.emoji] }} />
                {m.label}
              </span>
            ))}
          </div>
        )}

        <ScrubBar value={ch} max={scale} onCommit={t.setChapter} disabled={status === 'completed'} />
      </div>
    </section>
  )
}