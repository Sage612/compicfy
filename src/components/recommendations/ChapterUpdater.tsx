'use client'

import { useState } from 'react'
import { Check, Loader2, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Props {
  comicId:        string
  listId:         string
  currentChapter: number | null
  totalChapters:  number | null
  status:         string
  onUpdate?:      (chapter: number | null, status: string) => void
  compact?:       boolean   // true = just the chapter input inline, false = full row
}

const STATUS_META: Record<string, { label: string; dot: string }> = {
  reading:      { label: 'Reading',      dot: 'bg-blue-500'    },
  plan_to_read: { label: 'Plan to read', dot: 'bg-violet-500'  },
  completed:    { label: 'Completed',    dot: 'bg-emerald-500' },
  on_hold:      { label: 'On hold',      dot: 'bg-yellow-500'  },
  dropped:      { label: 'Dropped',      dot: 'bg-red-500'     },
  marinating:   { label: 'Marinating',   dot: 'bg-amber-500'   },
}

const STATUSES = Object.entries(STATUS_META).map(([value, meta]) => ({ value, ...meta }))

export function ChapterUpdater({
  comicId, listId, currentChapter, totalChapters, status, onUpdate, compact = false,
}: Props) {
  const [chapter, setChapter] = useState<string>(currentChapter?.toString() ?? '')
  const [saving,  setSaving]  = useState(false)
  const [dirty,   setDirty]   = useState(false)
  const [incrementing, setIncrementing] = useState(false)

  const atLast = !!(totalChapters && (currentChapter ?? 0) >= totalChapters)
  const pct = totalChapters && currentChapter
    ? Math.min(100, Math.round((currentChapter / totalChapters) * 100))
    : null

  const save = async (newChapter?: string, newStatus?: string) => {
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
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      const savedChapter = chapterVal ? parseInt(chapterVal) : null
      const savedStatus  = newStatus ?? status
      onUpdate?.(savedChapter, savedStatus)
      setDirty(false)

      toast.success(newStatus ? STATUS_META[newStatus].label : 'Progress saved')
    } catch {
      toast.error('Failed to save')
    } finally {
      setSaving(false)
    }
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
      onUpdate?.(next, status)
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

  // Full version — chapter input + status selector
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
        {STATUSES.map(s => (
          <button
            key={s.value}
            onClick={() => save(chapter, s.value)}
            disabled={saving}
            className={cn(
              'flex items-center gap-1.5 text-xs transition-colors',
              status === s.value
                ? 'text-foreground font-medium'
                : 'text-muted-foreground/60 hover:text-foreground'
            )}
          >
            <span className={cn('h-1.5 w-1.5 rounded-full', status === s.value ? s.dot : 'bg-border')} />
            {s.label}
          </button>
        ))}
      </div>
    </div>
  )
}