'use client'

import { useState } from 'react'
import Link from 'next/link'
import { BookOpen, Check, ExternalLink, Loader2, Croissant, X } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// Combined "Updates" page - chapter updates (comics you're behind on) and
// ready bakes (item #29), together, since both answer the same question:
// "what needs my attention right now." Built as a real page instead of a
// header dropdown/sheet per explicit direction - this content needs room
// (progress bars, a chapter-range picker) that a DropdownMenuContent
// popover can't comfortably give it.

interface ChapterUpdate {
  list_id:           string
  recommendation_id: string
  status:            string
  title:             string
  cover_url:         string | null
  chapter_count:     number
  progress_chapter:  number | null
  source_url:        string | null
  source_label:      string | null
}

interface BakeItem {
  id: number
  recommendation_id: string
  target_chapter_count: number
  counting_mode: 'from_now' | 'from_read'
  chapter_count_at_bake_start: number
  status: 'active' | 'fulfilled'
  recommendations?: { title: string; cover_url: string | null; chapter_count: number }
}

interface Props {
  initialUpdates: ChapterUpdate[]
  initialBakes:   BakeItem[]
}

export function UpdatesClient({ initialUpdates, initialBakes }: Props) {
  const [updates, setUpdates] = useState<ChapterUpdate[]>(initialUpdates)
  const [bakes,   setBakes]   = useState<BakeItem[]>(initialBakes)

  // Which update card has its range-picker open, and the pending value -
  // this is the actual fix for the "20->10 silently claims you read
  // everything in between" bug: no card writes progress on a single tap
  // anymore, it opens a picker defaulting to the comic's CURRENT tracked
  // progress (not the latest chapter) and requires an explicit confirm.
  const [pickerOpenFor, setPickerOpenFor] = useState<string | null>(null)
  const [pendingChapter, setPendingChapter] = useState<number>(0)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [clearingBakeId, setClearingBakeId] = useState<number | null>(null)

  const openPicker = (update: ChapterUpdate) => {
    setPickerOpenFor(update.recommendation_id)
    // Default to their current progress, NOT chapter_count - the whole
    // point is the user picks how far they've actually read, the range
    // just bounds the picker between where they were and what's out now.
    setPendingChapter(update.progress_chapter ?? 0)
  }

  const confirmChapter = async (update: ChapterUpdate) => {
    setSavingId(update.recommendation_id)
    try {
      const res = await fetch(`/api/reading-progress/${update.recommendation_id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          list_id:          update.list_id,
          status:           update.status,
          progress_chapter: pendingChapter,
        }),
      })
      if (!res.ok) throw new Error()
      // If they picked the full latest chapter, this update is fully
      // resolved and drops off the list. If they picked something in
      // between (genuinely read partway through the gap), it STAYS in
      // the list with its progress_chapter updated, since they're still
      // behind chapter_count - correct behavior, not a bug, since the
      // whole point of the picker is to allow a partial catch-up.
      if (pendingChapter >= update.chapter_count) {
        setUpdates(prev => prev.filter(u => u.recommendation_id !== update.recommendation_id))
      } else {
        setUpdates(prev => prev.map(u =>
          u.recommendation_id === update.recommendation_id
            ? { ...u, progress_chapter: pendingChapter }
            : u
        ))
      }
      toast.success(`Progress updated — ch. ${pendingChapter}`)
      setPickerOpenFor(null)
    } catch {
      toast.error('Failed to update progress')
    } finally {
      setSavingId(null)
    }
  }

  const clearBake = async (bake: BakeItem) => {
    setClearingBakeId(bake.id)
    try {
      const res = await fetch(`/api/bakes?id=${bake.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setBakes(prev => prev.filter(b => b.id !== bake.id))
      toast.success('Bake cleared')
    } catch {
      toast.error('Failed to clear bake')
    } finally {
      setClearingBakeId(null)
    }
  }

  const readyBakes  = bakes.filter(b => b.status === 'fulfilled')
  const activeBakes = bakes.filter(b => b.status === 'active')
  const hasNothing  = updates.length === 0 && bakes.length === 0

  if (hasNothing) {
    return (
      <div className="flex flex-col items-center justify-center py-20 rounded-2xl border border-dashed border-border/60 space-y-3 text-center">
        <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
          <BookOpen size={22} className="text-muted-foreground/50" />
        </div>
        <div>
          <p className="font-black text-sm">All caught up</p>
          <p className="text-xs text-muted-foreground mt-1">New chapters and ready bakes will show up here.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">

      {/* ── Ready bakes — surfaced first, since these are explicitly
          waited-for and time-sensitive in a different way than a
          routine chapter update ── */}
      {readyBakes.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
            Ready to binge
          </h2>
          <div className="space-y-2">
            {readyBakes.map(bake => (
              <div
                key={bake.id}
                className="flex items-center gap-3 p-3 rounded-2xl border border-orange-500/20 bg-orange-500/5"
              >
                <div className="w-10 h-14 rounded-lg overflow-hidden bg-muted shrink-0">
                  {bake.recommendations?.cover_url ? (
                    <img
                      src={`/api/image-proxy?url=${encodeURIComponent(bake.recommendations.cover_url)}`}
                      alt={bake.recommendations.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Croissant size={14} className="text-muted-foreground/40" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">{bake.recommendations?.title}</p>
                  <p className="text-xs text-muted-foreground">{bake.target_chapter_count} chapters ready</p>
                </div>
                <Link
                  href={`/comic/${bake.recommendation_id}`}
                  className="shrink-0 h-8 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-opacity flex items-center gap-1.5"
                >
                  <BookOpen size={12} />
                  Read now
                </Link>
                <button
                  onClick={() => clearBake(bake)}
                  disabled={clearingBakeId === bake.id}
                  className="shrink-0 h-8 w-8 rounded-lg border border-border/60 flex items-center justify-center text-muted-foreground hover:text-destructive hover:border-destructive/40 transition-colors"
                  aria-label="Dismiss"
                >
                  {clearingBakeId === bake.id ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Chapter updates ── */}
      {updates.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
            New chapters
          </h2>
          <div className="space-y-2">
            {updates.map(update => {
              const isPickerOpen = pickerOpenFor === update.recommendation_id
              const isSaving     = savingId === update.recommendation_id
              const currentProgress = update.progress_chapter ?? 0

              return (
                <div
                  key={update.recommendation_id}
                  className="rounded-2xl border border-border bg-card overflow-hidden"
                >
                  <div className="flex items-center gap-3 p-3">
                    <Link href={`/comic/${update.recommendation_id}`} className="w-10 h-14 rounded-lg overflow-hidden bg-muted shrink-0">
                      {update.cover_url ? (
                        <img
                          src={`/api/image-proxy?url=${encodeURIComponent(update.cover_url)}`}
                          alt={update.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <BookOpen size={14} className="text-muted-foreground/40" />
                        </div>
                      )}
                    </Link>
                    <div className="min-w-0 flex-1">
                      <Link href={`/comic/${update.recommendation_id}`} className="text-sm font-semibold truncate hover:text-primary transition-colors block">
                        {update.title}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        You're at ch. {currentProgress} · {update.chapter_count} available
                      </p>
                      {update.source_url && (
                        <a
                          href={update.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-primary hover:opacity-80 transition-opacity mt-0.5"
                        >
                          <ExternalLink size={10} />
                          {update.source_label ?? 'Read'}
                        </a>
                      )}
                    </div>
                    {!isPickerOpen && (
                      <button
                        onClick={() => openPicker(update)}
                        className="shrink-0 h-8 px-3 rounded-lg border border-border/60 text-xs font-semibold text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors flex items-center gap-1.5"
                      >
                        <Check size={12} />
                        Update progress
                      </button>
                    )}
                  </div>

                  {/* ── Range picker — the actual fix. Bounded between the
                      comic's current progress and its latest available
                      chapter, so the user explicitly confirms where they
                      really are instead of a single tap silently jumping
                      to the latest chapter and claiming everything in
                      between was read. ── */}
                  {isPickerOpen && (
                    <div className="px-3 pb-3 pt-1 border-t border-border/50 space-y-2">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Ch. {currentProgress}</span>
                        <span className="font-semibold text-foreground">Reading up to ch. {pendingChapter}</span>
                        <span>Ch. {update.chapter_count}</span>
                      </div>
                      <input
                        type="range"
                        min={currentProgress}
                        max={update.chapter_count}
                        value={pendingChapter}
                        onChange={e => setPendingChapter(Number(e.target.value))}
                        className="w-full accent-primary"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setPickerOpenFor(null)}
                          className="flex-1 h-8 rounded-lg border border-border/60 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => confirmChapter(update)}
                          disabled={isSaving}
                          className="flex-1 h-8 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-1.5"
                        >
                          {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                          Confirm
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* ── Active bakes — shown for visibility/management, not because
          they need action right now ── */}
      {activeBakes.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
            Still baking
          </h2>
          <div className="space-y-2">
            {activeBakes.map(bake => {
              const currentCount = bake.recommendations?.chapter_count ?? bake.chapter_count_at_bake_start
              const chaptersSoFar = Math.max(0, currentCount - bake.chapter_count_at_bake_start)
              const progressPct = Math.min(100, Math.round((chaptersSoFar / bake.target_chapter_count) * 100))

              return (
                <div
                  key={bake.id}
                  className="flex items-center gap-3 p-3 rounded-2xl border border-border bg-card"
                >
                  <div className="w-10 h-14 rounded-lg overflow-hidden bg-muted shrink-0">
                    {bake.recommendations?.cover_url ? (
                      <img
                        src={`/api/image-proxy?url=${encodeURIComponent(bake.recommendations.cover_url)}`}
                        alt={bake.recommendations.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Croissant size={14} className="text-muted-foreground/40" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-sm font-semibold truncate">{bake.recommendations?.title}</p>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-orange-500 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {chaptersSoFar}/{bake.target_chapter_count} chapters
                    </p>
                  </div>
                  <button
                    onClick={() => clearBake(bake)}
                    disabled={clearingBakeId === bake.id}
                    className="shrink-0 h-8 w-8 rounded-lg border border-border/60 flex items-center justify-center text-muted-foreground hover:text-destructive hover:border-destructive/40 transition-colors"
                    aria-label="Stop baking"
                  >
                    {clearingBakeId === bake.id ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
                  </button>
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}