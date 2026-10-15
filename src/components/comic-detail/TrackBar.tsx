'use client'

// src/components/comic-detail/TrackBar.tsx
//
// The big action bar under the ratings, Letterboxd style. One row, one obvious
// tap:
//   not tracking   "Track, rate, review, add to list + more"   [Start reading]
//   tracking       "Reading · Ch. 47 of 112"                    [ +1 ]
// Tapping the left side opens the full track sheet; the button on the right is
// the one-tap action so logging never needs the sheet.

import { Check, ChevronRight, Play, Plus, RotateCcw, UserRound } from 'lucide-react'
import { TRACKING_STATUS_META, resolveSubStatusLabel, type TrackingStatusValue } from '@/lib/utils/constants'
import { useTracking } from './TrackingProvider'

export function TrackBar() {
  const t = useTracking()
  const { status, subStatus, chapter } = t.snapshot
  const meta = status ? TRACKING_STATUS_META[status as TrackingStatusValue] : null
  const subLabel = status ? resolveSubStatusLabel(status, subStatus) : null

  /* ── what the right-hand button does ── */
  let action: { label: string; icon: React.ReactNode; onClick: () => void; subtle?: boolean }

  if (!t.signedIn) {
    action = { label: 'Sign in', icon: <UserRound size={15} />, onClick: t.openSheet }
  } else if (!status) {
    action = { label: 'Start reading', icon: <Play size={14} className="fill-current" />, onClick: t.startReading }
  } else if (status === 'completed') {
    action = { label: 'Finished', icon: <Check size={15} />, onClick: t.openSheet, subtle: true }
  } else if (status === 'dropped') {
    action = { label: 'Resume', icon: <RotateCcw size={14} />, onClick: t.startReading }
  } else if (!chapter) {
    action = { label: 'Ch. 1', icon: <Plus size={15} />, onClick: t.plusOne }
  } else {
    action = { label: '+1', icon: <Plus size={16} />, onClick: t.plusOne }
  }

  const caught =
    t.totalChapters !== null && chapter !== null && chapter >= t.totalChapters && status === 'reading'

  return (
    <div className="flex items-stretch gap-2">
      <button
        type="button"
        onClick={t.openSheet}
        className="flex-1 min-w-0 flex items-center gap-3 rounded-xl border border-dossier-foreground/10 bg-dossier-panel/60 px-3 py-2.5 text-left hover:border-dossier-foreground/25 transition-colors"
      >
        <span className="w-9 h-9 shrink-0 rounded-full bg-dossier-foreground/10 flex items-center justify-center text-dossier-foreground/60 text-base leading-none">
          {meta ? meta.emoji : <UserRound size={16} />}
        </span>

        <span className="flex-1 min-w-0">
          {meta ? (
            <>
              <span className="block text-sm font-semibold text-dossier-foreground truncate">
                {meta.label}
                {subLabel ? <span className="font-normal text-dossier-foreground/55"> · {subLabel}</span> : null}
              </span>
              <span className="block font-[family-name:var(--font-mono)] text-[11px] text-dossier-foreground/50 tabular-nums">
                {chapter !== null
                  ? `Ch. ${chapter}${t.totalChapters ? ` of ${t.totalChapters}` : ''}${caught ? ' · caught up' : ''}`
                  : 'No chapter logged yet'}
              </span>
            </>
          ) : (
            <span className="block text-sm text-dossier-foreground/70 truncate">
              Rate, log, review, add to list + more
            </span>
          )}
        </span>

        <ChevronRight size={16} className="shrink-0 text-dossier-foreground/35" />
      </button>

      <button
        type="button"
        onClick={action.onClick}
        aria-label={action.label === '+1' ? 'Log one more chapter' : action.label}
        className={
          action.subtle
            ? 'shrink-0 min-w-[84px] px-4 rounded-xl border border-dossier-foreground/15 text-dossier-foreground/70 text-sm font-semibold flex items-center justify-center gap-1.5'
            : 'shrink-0 min-w-[84px] px-4 rounded-xl bg-dossier-foreground text-dossier text-sm font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-transform'
        }
      >
        {action.icon}
        {action.label}
      </button>
    </div>
  )
}