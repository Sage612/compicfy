'use client'

import { useState } from 'react'
import { Check, Loader2, Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  TRACKING_STATUSES,
  TRACKING_STATUS_META,
  TRACKING_SUB_STATUS_CUSTOM_MAX_LENGTH,
  resolveSubStatusLabel,
  isPresetSubStatus,
} from '@/lib/utils/constants'

interface Props {
  comicId:        string
  listId:         string
  currentChapter: number | null
  totalChapters:  number | null
  status:         string
  subStatus?:     string | null
  onUpdate?:      (chapter: number | null, status: string, subStatus?: string | null) => void
  compact?:       boolean   // true = just the chapter input inline, false = full row
}

export function ChapterUpdater({
  comicId, listId, currentChapter, totalChapters, status, subStatus = null, onUpdate, compact = false,
}: Props) {
  const [chapter, setChapter] = useState<string>(currentChapter?.toString() ?? '')
  const [saving,  setSaving]  = useState(false)
  const [dirty,   setDirty]   = useState(false)
  const [incrementing, setIncrementing] = useState(false)

  // Sub-status row state (full mode only)
  const [showSubStatusCustom, setShowSubStatusCustom] = useState(false)
  const [customText, setCustomText] = useState(
    subStatus && !isPresetSubStatus(status, subStatus) ? subStatus : ''
  )

  const atLast = !!(totalChapters && (currentChapter ?? 0) >= totalChapters)
  const pct = totalChapters && currentChapter
    ? Math.min(100, Math.round((currentChapter / totalChapters) * 100))
    : null

  const save = async (newChapter?: string, newStatus?: string, newSubStatus?: string | null) => {
    setSaving(true)
    try {
      const chapterVal = newChapter !== undefined ? newChapter : chapter
      const res = await fetch(`/api/reading-progress/${comicId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          list_id:          listId,
          progress_chapter: chapterVal ? parseInt(chapterVal) : null,
          ...(newStatus ? { status: newStatus } : {}),
          ...(newSubStatus !== undefined ? { sub_status: newSubStatus } : {}),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      const savedChapter   = chapterVal ? parseInt(chapterVal) : null
      const savedStatus    = newStatus ?? status
      const savedSubStatus = newSubStatus !== undefined ? newSubStatus : subStatus
      onUpdate?.(savedChapter, savedStatus, savedSubStatus)
      setDirty(false)

      toast.success(newStatus ? TRACKING_STATUS_META[newStatus as keyof typeof TRACKING_STATUS_META].label : 'Progress saved')
    } catch {
      toast.error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  // Switching top-level status clears any sub-status from the previous status
  // (a "waiting for new chapters" on_hold sub-status makes no sense once
  // you've moved to completed, for example)
  const handleStatusChange = (newStatus: string) => {
    setShowSubStatusCustom(false)
    setCustomText('')
    save(chapter, newStatus, null)
  }

  const handleSubStatusPreset = (value: string) => {
    save(chapter, status, value)
  }

  const handleSubStatusCustomSave = () => {
    const trimmed = customText.trim()
    if (!trimmed) return
    save(chapter, status, trimmed.slice(0, TRACKING_SUB_STATUS_CUSTOM_MAX_LENGTH))
  }

  const handleSubStatusClear = () => {
    setShowSubStatusCustom(false)
    setCustomText('')
    save(chapter, status, null)
  }

  const handleIncrement = async () => {
    const base = currentChapter ?? 0
    const next = base + 1

    if (totalChapters && next > totalChapters) {
      toast.error(`Already at the last chapter (${totalChapters})`)
      return
    }

    setIncrementing(true)
    try {
      const res = await fetch(`/api/reading-progress/${comicId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ list_id: listId, progress_chapter: next }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setChapter(next.toString())
      setDirty(false)
      onUpdate?.(next, status, subStatus)
      toast.success(`Ch. ${next}`)
    } catch {
      toast.error('Failed to update')
    } finally {
      setIncrementing(false)
    }
  }

  if (compact) {
    return (
      <div className="space-y-1" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2">
          <span className="text-[11px] tracking-tight text-muted-foreground/70 tabular-nums">Ch.</span>
          <input
            type="number"
            min="0"
            max={totalChapters ?? undefined}
            value={chapter}
            onChange={e => { setChapter(e.target.value); setDirty(true) }}
            onKeyDown={e => e.key === 'Enter' && dirty && save()}
            placeholder="—"
            className="w-10 h-5 text-xs bg-transparent border-0 border-b border-border/50 px-0 outline-none focus:border-foreground/60 text-foreground tabular-nums transition-colors"
          />
          {totalChapters && (
            <span className="text-[11px] text-muted-foreground/50 tabular-nums">/ {totalChapters}</span>
          )}

          {!atLast && (
            <button
              onClick={handleIncrement}
              disabled={incrementing || saving}
              title="Add 1 chapter"
              className="h-5 w-5 rounded-full text-muted-foreground/60 hover:text-foreground hover:bg-muted/60 flex items-center justify-center transition-colors shrink-0"
            >
              {incrementing ? <Loader2 size={9} className="animate-spin" /> : <Plus size={11} />}
            </button>
          )}

          {dirty && (
            <button
              onClick={() => save()}
              disabled={saving}
              className="text-[11px] font-medium text-foreground hover:opacity-60 transition-opacity shrink-0 flex items-center gap-0.5"
            >
              {saving ? <Loader2 size={10} className="animate-spin" /> : <Check size={11} />}
            </button>
          )}
        </div>

        {pct !== null && (
          <div className="h-px w-full bg-border/50 overflow-hidden">
            <div className="h-full bg-foreground/70 transition-all duration-300" style={{ width: `${pct}%` }} />
          </div>
        )}
      </div>
    )
  }

  const statusMeta = TRACKING_STATUS_META[status as keyof typeof TRACKING_STATUS_META]
  const subStatusLabel = resolveSubStatusLabel(status, subStatus)

  // Full version — chapter input + status selector + sub-status row
  return (
    <div className="space-y-3" onClick={e => e.stopPropagation()}>
      {/* Chapter row */}
      <div className="flex items-center gap-2.5">
        <span className="text-xs text-muted-foreground/70">Chapter</span>
        <input
          type="number"
          min="0"
          max={totalChapters ?? undefined}
          value={chapter}
          onChange={e => { setChapter(e.target.value); setDirty(true) }}
          onKeyDown={e => e.key === 'Enter' && dirty && save()}
          placeholder="—"
          className="w-14 h-7 text-sm bg-transparent border-0 border-b border-border/50 px-0 outline-none focus:border-foreground/60 text-foreground text-center tabular-nums transition-colors"
        />
        {totalChapters && (
          <span className="text-xs text-muted-foreground/50 tabular-nums">of {totalChapters}</span>
        )}

        {!atLast && (
          <button
            onClick={handleIncrement}
            disabled={incrementing || saving}
            title="Add 1 chapter"
            className="h-7 w-7 rounded-full border border-border/50 text-muted-foreground hover:border-foreground/40 hover:text-foreground flex items-center justify-center transition-colors shrink-0"
          >
            {incrementing ? <Loader2 size={12} className="animate-spin" /> : <Plus size={13} />}
          </button>
        )}

        {dirty && (
          <button
            onClick={() => save()}
            disabled={saving}
            className="text-xs font-medium text-foreground border-b border-foreground/60 hover:opacity-60 flex items-center gap-1 transition-opacity"
          >
            {saving ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
            Save
          </button>
        )}
      </div>

      {pct !== null && (
        <div className="h-px w-full bg-border/50 overflow-hidden">
          <div className="h-full bg-foreground/70 transition-all duration-300" style={{ width: `${pct}%` }} />
        </div>
      )}

      {/* Status selector — plain typography, dot indicator */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {TRACKING_STATUSES.map(({ value }) => {
          const meta = TRACKING_STATUS_META[value]
          return (
            <button
              key={value}
              onClick={() => handleStatusChange(value)}
              disabled={saving}
              className={cn(
                'flex items-center gap-1.5 text-xs transition-colors',
                status === value
                  ? 'text-foreground font-medium'
                  : 'text-muted-foreground/60 hover:text-foreground'
              )}
            >
              <span className={cn('h-1.5 w-1.5 rounded-full', status === value ? meta.dot : 'bg-border')} />
              {meta.label}
            </button>
          )
        })}
      </div>

      {/* Sub-status row — nuance on top of the current status, optional */}
      <div className="pt-0.5">
        {!showSubStatusCustom ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {subStatusLabel && (
              <span className="text-[11px] text-muted-foreground/70 italic">{subStatusLabel}</span>
            )}
            {statusMeta.subStatusPresets.map(preset => (
              <button
                key={preset.value}
                onClick={() => handleSubStatusPreset(preset.value)}
                disabled={saving}
                className={cn(
                  'text-[11px] transition-colors',
                  subStatus === preset.value
                    ? 'text-foreground font-medium underline underline-offset-2'
                    : 'text-muted-foreground/50 hover:text-muted-foreground'
                )}
              >
                {preset.label}
              </button>
            ))}
            <button
              onClick={() => setShowSubStatusCustom(true)}
              disabled={saving}
              className="text-[11px] text-muted-foreground/50 hover:text-muted-foreground transition-colors"
            >
              Custom…
            </button>
            {subStatus && (
              <button
                onClick={handleSubStatusClear}
                disabled={saving}
                className="text-[11px] text-muted-foreground/40 hover:text-destructive transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={customText}
              onChange={e => setCustomText(e.target.value.slice(0, TRACKING_SUB_STATUS_CUSTOM_MAX_LENGTH))}
              onKeyDown={e => e.key === 'Enter' && handleSubStatusCustomSave()}
              placeholder="Add detail…"
              className="flex-1 h-6 text-[11px] bg-transparent border-0 border-b border-border/50 px-0 outline-none focus:border-foreground/60 text-foreground placeholder:text-muted-foreground/40"
            />
            <button
              onClick={handleSubStatusCustomSave}
              disabled={saving || !customText.trim()}
              className="text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
            >
              {saving ? <Loader2 size={11} className="animate-spin" /> : <Check size={12} />}
            </button>
            <button
              onClick={() => { setShowSubStatusCustom(false); setCustomText('') }}
              className="text-muted-foreground/50 hover:text-foreground transition-colors"
            >
              <X size={11} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}