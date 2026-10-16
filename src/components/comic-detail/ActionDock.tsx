'use client'

// src/components/comic-detail/ActionDock.tsx
//
// The same one-tap log button as the top bar, pinned to the bottom of the
// screen where a thumb can reach it, plus a "more" button that opens the track
// sheet. Stays put while you scroll, on every screen size.
//
// On small screens it sits just above the app's floating nav pill.

import { MoreHorizontal } from 'lucide-react'
import { TRACKING_STATUS_META, type TrackingStatusValue } from '@/lib/utils/constants'
import { trackAction } from './TrackBar'
import { useTracking } from './TrackingProvider'

export function ActionDock() {
  const t = useTracking()
  const { status, chapter } = t.snapshot
  const meta   = status ? TRACKING_STATUS_META[status as TrackingStatusValue] : null
  const action = trackAction(t)

  return (
    <div className="fixed inset-x-0 z-40 bottom-[calc(84px+env(safe-area-inset-bottom,0px))] lg:bottom-5 px-4 pointer-events-none">
      <div className="pointer-events-auto mx-auto max-w-3xl flex items-center gap-2 rounded-2xl border border-dossier-foreground/20 bg-dossier/95 backdrop-blur-md shadow-xl shadow-black/25 p-2">
        <button
          type="button"
          onClick={t.openSheet}
          aria-label="Open tracking options"
          className="flex-1 min-w-0 flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-left hover:bg-dossier-foreground/5 transition-colors"
        >
          <span className="w-8 h-8 shrink-0 rounded-full bg-dossier-foreground/10 flex items-center justify-center text-base leading-none">
            {meta ? meta.emoji : <MoreHorizontal size={16} />}
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-bold text-dossier-foreground truncate">
              {meta ? meta.label : 'Track this comic'}
            </span>
            <span className="block text-xs font-medium text-dossier-foreground/72 tabular-nums truncate">
              {chapter !== null
                ? `Ch. ${chapter}${t.totalChapters ? ` of ${t.totalChapters}` : ''}`
                : 'Rate, log, add to list + more'}
            </span>
          </span>
        </button>

        <button
          type="button"
          onClick={action.onClick}
          aria-label={action.label === '+1' ? 'Log one more chapter' : action.label}
          className={
            action.subtle
              ? 'shrink-0 min-w-[92px] h-11 px-4 rounded-xl border border-dossier-foreground/20 text-dossier-foreground text-sm font-semibold flex items-center justify-center gap-1.5'
              : 'shrink-0 min-w-[92px] h-11 px-4 rounded-xl bg-dossier-foreground text-dossier text-sm font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-transform'
          }
        >
          {action.icon}
          {action.label}
        </button>
      </div>
    </div>
  )
}