'use client'

// src/components/comic-detail/TrackSheet.tsx
//
// The full tracking sheet behind the big bar. Everything is one tap, nothing
// has a mandatory second step (except saying why you dropped something):
//
//   Status       six chips, tap one. Optional detail chips appear underneath.
//   Chapter      − / number / +1, plus the scrub bar when the total is known.
//   Feeling      six moods and an optional one-liner.
//   Rate         five stars.
//   More         add to list, add to collection, bake, report (passed in by the page).

import { useState, type ReactNode } from 'react'
import { Loader2, Minus, Plus, Star } from 'lucide-react'
import { toast } from 'sonner'
import {
  Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'
import {
  TRACKING_STATUSES,
  TRACKING_STATUS_META,
  TRACKING_SUB_STATUS_CUSTOM_MAX_LENGTH,
  resolveSubStatusLabel,
  isPresetSubStatus,
  type TrackingStatusValue,
} from '@/lib/utils/constants'
import { MOODS, NOTE_MAX_LENGTH } from '@/lib/tracking/constants'
import { useTracking } from './TrackingProvider'
import { ScrubBar } from './ScrubBar'

export interface SheetRow {
  key:     string
  label:   string
  icon:    ReactNode
  /** One short line under the label. */
  hint?:   string
  content: ReactNode
}

const chip =
  'rounded-xl border px-2 py-2.5 text-xs font-semibold flex flex-col items-center gap-1 transition-colors'

export function TrackSheet({ rows }: { rows: SheetRow[] }) {
  const t = useTracking()
  const { status, subStatus, chapter } = t.snapshot

  const [dropOpen, setDropOpen]     = useState(false)
  const [customReason, setCustomReason] = useState('')
  const [chapterDraft, setChapterDraft] = useState<string | null>(null)
  const [mood, setMood]             = useState<string | null>(null)
  const [line, setLine]             = useState('')
  const [spoiler, setSpoiler]       = useState(false)
  const [savingLine, setSavingLine] = useState(false)
  const [hoverStar, setHoverStar]   = useState(0)
  const [ratingBusy, setRatingBusy] = useState(false)

  const meta       = status ? TRACKING_STATUS_META[status as TrackingStatusValue] : null
  const showReasons = dropOpen || status === 'dropped'

  const pickStatus = (value: TrackingStatusValue) => {
    if (value === 'dropped') {
      // Dropping asks for a reason first (one tap), so the choice is saved together with it.
      if (status !== 'dropped') { setDropOpen(true); return }
      return
    }
    setDropOpen(false)
    t.setStatus(value)
  }

  const pickReason = (reason: string) => {
    setDropOpen(false)
    setCustomReason('')
    t.setStatus('dropped', { subStatus: reason })
  }

  const commitChapter = () => {
    if (chapterDraft === null) return
    const n = Number(chapterDraft)
    setChapterDraft(null)
    if (Number.isFinite(n) && n >= 0 && n !== (chapter ?? 0)) t.setChapter(n)
  }

  const saveFeeling = async () => {
    if (!mood && !line.trim()) return
    setSavingLine(true)
    const ok = await t.saveNote({ note: line, spoiler, mood })
    setSavingLine(false)
    if (ok) { setMood(null); setLine(''); setSpoiler(false) }
  }

  const rate = async (n: number) => {
    setRatingBusy(true)
    try {
      const res = await fetch(`/api/recommendations/${t.recommendationId}/reviews`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ rating: n, rating_only: true }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error ?? 'Could not save your rating')
        return
      }
      t.setRating(n)
      toast.success('Rating saved')
    } catch {
      toast.error('Could not save your rating')
    } finally {
      setRatingBusy(false)
    }
  }

  const detailPresets = meta && status !== 'dropped' ? meta.subStatusPresets : []
  const customDetail  = status && subStatus && !isPresetSubStatus(status, subStatus) ? subStatus : null

  return (
    <Sheet open={t.sheetOpen} onOpenChange={o => (o ? t.openSheet() : t.closeSheet())}>
      <SheetContent
        side="bottom"
        className="bg-dossier-panel text-dossier-foreground border-dossier-foreground/10 max-h-[88vh] overflow-y-auto rounded-t-2xl px-5 pb-8 pt-2 gap-5 sm:max-w-lg sm:mx-auto"
      >
        <div className="w-9 h-1 rounded-full bg-dossier-foreground/20 mx-auto mt-2" />

        <SheetHeader className="p-0 pr-8">
          <SheetTitle className="text-xl font-black leading-tight text-dossier-foreground">{t.title}</SheetTitle>
          <SheetDescription className="text-dossier-foreground/72 text-xs">
            Tap to log. Nothing here is required.
          </SheetDescription>
        </SheetHeader>

        {/* ── Status ── */}
        <section className="space-y-2.5">
          <Label>Status</Label>
          <div className="grid grid-cols-3 gap-2">
            {TRACKING_STATUSES.map(({ value }) => {
              const m = TRACKING_STATUS_META[value]
              const active = status === value || (value === 'dropped' && dropOpen)
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => pickStatus(value)}
                  className={`${chip} ${
                    active
                      ? 'border-dossier-foreground/60 bg-dossier-foreground/10 text-dossier-foreground'
                      : 'border-dossier-foreground/10 text-dossier-foreground/80 hover:border-dossier-foreground/30'
                  }`}
                >
                  <span className="text-lg leading-none">{m.emoji}</span>
                  {m.label}
                </button>
              )
            })}
          </div>

          {/* Why did you stop? (one tap) */}
          {showReasons && (
            <div className="rounded-xl border border-dossier-foreground/10 bg-dossier/50 p-3 space-y-2.5">
              <p className="text-xs font-semibold text-dossier-foreground">Why did you stop?</p>
              <div className="flex flex-wrap gap-1.5">
                {TRACKING_STATUS_META.dropped.subStatusPresets.map(p => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => pickReason(p.value)}
                    className={`px-3 py-1.5 rounded-full border text-xs font-medium ${
                      status === 'dropped' && subStatus === p.value
                        ? 'border-dossier-foreground/60 bg-dossier-foreground/10 text-dossier-foreground'
                        : 'border-dossier-foreground/15 text-dossier-foreground/88 hover:border-dossier-foreground/35'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={customReason}
                  maxLength={TRACKING_SUB_STATUS_CUSTOM_MAX_LENGTH}
                  onChange={e => setCustomReason(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && customReason.trim()) pickReason(customReason.trim()) }}
                  placeholder="Or in your own words…"
                  className="flex-1 h-9 rounded-lg bg-dossier border border-dossier-foreground/15 px-3 text-xs outline-none focus:border-dossier-foreground/40 placeholder:text-dossier-foreground/60"
                />
                <button
                  type="button"
                  disabled={!customReason.trim()}
                  onClick={() => pickReason(customReason.trim())}
                  className="h-9 px-3 rounded-lg bg-dossier-foreground text-dossier text-xs font-bold disabled:opacity-40"
                >
                  Drop it
                </button>
              </div>
              {status === 'dropped' && subStatus && (
                <p className="text-[11px] text-dossier-foreground/65">
                  Saved as: {resolveSubStatusLabel('dropped', subStatus)}. This stays private to you.
                </p>
              )}
            </div>
          )}

          {/* Optional detail chips for the other statuses, including Spite Read */}
          {!showReasons && detailPresets.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {detailPresets.map(p => (
                <button
                  key={p.value}
                  type="button"
                  aria-pressed={subStatus === p.value}
                  onClick={() => t.setSubStatus(subStatus === p.value ? null : p.value)}
                  className={`px-3 py-1.5 rounded-full border text-xs font-medium ${
                    subStatus === p.value
                      ? 'border-dossier-foreground/60 bg-dossier-foreground/10 text-dossier-foreground'
                      : 'border-dossier-foreground/15 text-dossier-foreground/80 hover:border-dossier-foreground/35'
                  }`}
                >
                  {p.label}
                </button>
              ))}
              {customDetail && (
                <button
                  type="button"
                  onClick={() => t.setSubStatus(null)}
                  className="px-3 py-1.5 rounded-full border border-dossier-foreground/60 bg-dossier-foreground/10 text-xs font-medium text-dossier-foreground"
                >
                  {customDetail} ✕
                </button>
              )}
            </div>
          )}
        </section>

        {/* ── Chapter ── */}
        <section className="space-y-3">
          <Label>
            Chapter
            {t.totalChapters ? <span className="ml-1 normal-case tracking-normal text-dossier-foreground/65">of {t.totalChapters}</span> : null}
          </Label>

          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="One chapter back"
              disabled={!chapter}
              onClick={() => t.setChapter(Math.max(0, (chapter ?? 0) - 1))}
              className="w-11 h-11 shrink-0 rounded-xl border border-dossier-foreground/15 flex items-center justify-center disabled:opacity-30"
            >
              <Minus size={16} />
            </button>
            <input
              inputMode="numeric"
              value={chapterDraft ?? (chapter !== null ? String(chapter) : '')}
              placeholder="0"
              onChange={e => setChapterDraft(e.target.value.replace(/[^0-9]/g, ''))}
              onBlur={commitChapter}
              onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
              aria-label="Current chapter"
              className="flex-1 min-w-0 h-11 rounded-xl bg-dossier border border-dossier-foreground/15 text-center text-xl font-bold tabular-nums outline-none focus:border-dossier-foreground/40"
            />
            <button
              type="button"
              onClick={t.plusOne}
              className="h-11 px-5 shrink-0 rounded-xl bg-dossier-foreground text-dossier text-sm font-bold flex items-center gap-1.5 active:scale-95 transition-transform"
            >
              <Plus size={15} /> 1
            </button>
          </div>

          {t.totalChapters ? (
            <ScrubBar value={chapter ?? 0} max={t.totalChapters} onCommit={t.setChapter} />
          ) : null}
        </section>

        {/* ── Feeling ── */}
        <section className="space-y-2.5">
          <Label>How does it feel?</Label>
          <div className="flex items-center gap-1.5" role="group" aria-label="Mood">
            {MOODS.map(m => (
              <button
                key={m.emoji}
                type="button"
                title={m.label}
                aria-label={m.label}
                aria-pressed={mood === m.emoji}
                onClick={() => setMood(mood === m.emoji ? null : m.emoji)}
                className={`flex-1 h-11 rounded-xl text-xl leading-none border transition ${
                  mood === m.emoji
                    ? 'border-dossier-foreground/60 bg-dossier-foreground/10'
                    : 'border-dossier-foreground/10 hover:border-dossier-foreground/30'
                }`}
              >
                {m.emoji}
              </button>
            ))}
          </div>
          <input
            value={line}
            maxLength={NOTE_MAX_LENGTH}
            onChange={e => setLine(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') saveFeeling() }}
            placeholder="One line to remember it by (optional)"
            className="w-full h-11 rounded-xl bg-dossier border border-dossier-foreground/15 px-3 text-sm outline-none focus:border-dossier-foreground/40 placeholder:text-dossier-foreground/60"
          />
          {(mood || line.trim()) && (
            <div className="flex items-center justify-between gap-3">
              <label className={`flex items-center gap-2 text-xs text-dossier-foreground/80 ${line.trim() ? '' : 'invisible'}`}>
                <input type="checkbox" checked={spoiler} onChange={e => setSpoiler(e.target.checked)} />
                Contains spoilers
              </label>
              <button
                type="button"
                onClick={saveFeeling}
                disabled={savingLine}
                className="h-9 px-5 rounded-xl bg-dossier-foreground text-dossier text-sm font-bold disabled:opacity-50 flex items-center gap-1.5"
              >
                {savingLine && <Loader2 size={13} className="animate-spin" />}
                Save
              </button>
            </div>
          )}
        </section>

        {/* ── Rate ── */}
        <section className="space-y-2.5">
          <Label>Your rating</Label>
          {t.rating ? (
            <div>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map(n => (
                  <Star key={n} size={26} className={t.rating! >= n ? 'fill-amber-400 text-amber-400' : 'text-dossier-foreground/25'} />
                ))}
              </div>
              <p className="mt-1.5 text-xs text-dossier-foreground/72">
                You rated this {t.rating}★. Want to say more? Write a review further down the page.
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-1" onMouseLeave={() => setHoverStar(0)}>
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  type="button"
                  disabled={ratingBusy}
                  aria-label={`Rate ${n} star${n > 1 ? 's' : ''}`}
                  onMouseEnter={() => setHoverStar(n)}
                  onClick={() => rate(n)}
                  className="p-0.5"
                >
                  <Star size={28} className={hoverStar >= n ? 'fill-amber-400 text-amber-400' : 'text-dossier-foreground/25'} />
                </button>
              ))}
              {ratingBusy && <Loader2 size={15} className="animate-spin ml-2 text-dossier-foreground/65" />}
            </div>
          )}
        </section>

        {/* ── More: every action is a card, always open. Nothing hides behind
            a chevron, and pickers open inside the card (never floating off the
            bottom of the screen). ── */}
        {rows.length > 0 && (
          <section className="space-y-2">
            <Label>More</Label>
            <div className="space-y-2.5">
              {rows.map(row => (
                <div
                  key={row.key}
                  className="rounded-2xl border border-dossier-foreground/15 bg-dossier/50 p-3.5 space-y-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-10 h-10 shrink-0 rounded-xl bg-dossier-foreground/10 flex items-center justify-center text-dossier-foreground">
                      {row.icon}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-dossier-foreground">{row.label}</p>
                      {row.hint && <p className="text-xs text-dossier-foreground/72">{row.hint}</p>}
                    </div>
                  </div>
                  <div>{row.content}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* A Close button at the bottom, where a thumb is, so you never have to
            reach for the X at the top. Stays pinned while the sheet scrolls. */}
        <div className="sticky bottom-0 -mx-5 -mb-8 px-5 pt-3 pb-6 bg-dossier-panel border-t border-dossier-foreground/10">
          <SheetClose asChild>
            <button
              type="button"
              className="w-full h-12 rounded-xl bg-dossier-foreground text-dossier text-sm font-bold active:scale-[0.98] transition-transform"
            >
              Close
            </button>
          </SheetClose>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function Label({ children }: { children: ReactNode }) {
  return (
    <p className="font-[family-name:var(--font-mono)] font-medium text-[11px] uppercase tracking-[0.2em] text-dossier-foreground/65">
      {children}
    </p>
  )
}