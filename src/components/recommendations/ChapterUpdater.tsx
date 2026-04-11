'use client'

import { useState } from 'react'
import { Check, Loader2, BookOpen } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Props {
  comicId:      string
  listId:       string
  currentChapter: number | null
  totalChapters:  number | null
  status:       string
  onUpdate?:    (chapter: number | null, status: string) => void
  compact?:     boolean   // true = just the chapter input inline, false = full row
}

const STATUS_META: Record<string, { label: string; emoji: string }> = {
  reading:      { label: 'Reading',      emoji: '📖' },
  plan_to_read: { label: 'Plan to Read', emoji: '📌' },
  completed:    { label: 'Completed',    emoji: '✅' },
  on_hold:      { label: 'On Hold',      emoji: '⏸️' },
  dropped:      { label: 'Dropped',      emoji: '🗑️' },
  marinating:   { label: 'Marinating',   emoji: '🫙' },
}

const STATUSES = Object.entries(STATUS_META).map(([value, meta]) => ({ value, ...meta }))

export function ChapterUpdater({
  comicId, listId, currentChapter, totalChapters, status, onUpdate, compact = false,
}: Props) {
  const [chapter, setChapter] = useState<string>(currentChapter?.toString() ?? '')
  const [saving,  setSaving]  = useState(false)
  const [dirty,   setDirty]   = useState(false)

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

      if (newStatus) {
        const meta = STATUS_META[newStatus]
        toast.success(`${meta.emoji} ${meta.label}`)
      } else {
        toast.success('Progress saved!')
      }
    } catch {
      toast.error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  if (compact) {
    return (
      <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
        <BookOpen size={11} className="text-muted-foreground shrink-0" />
        <input
          type="number"
          min="0"
          max={totalChapters ?? undefined}
          value={chapter}
          onChange={e => { setChapter(e.target.value); setDirty(true) }}
          onKeyDown={e => e.key === 'Enter' && dirty && save()}
          placeholder="Ch."
          className="w-14 h-6 text-xs bg-muted border border-border rounded-md px-1.5 outline-none focus:border-primary text-foreground placeholder:text-muted-foreground text-center"
        />
        {totalChapters && (
          <span className="text-[10px] text-muted-foreground">/ {totalChapters}</span>
        )}
        {dirty && (
          <button
            onClick={() => save()}
            disabled={saving}
            className="h-6 w-6 rounded-md bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 transition-opacity shrink-0"
          >
            {saving ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />}
          </button>
        )}
      </div>
    )
  }

  // Full version — chapter input + status selector
  return (
    <div className="space-y-2" onClick={e => e.stopPropagation()}>
      {/* Chapter row */}
      <div className="flex items-center gap-2">
        <BookOpen size={12} className="text-muted-foreground shrink-0" />
        <span className="text-xs text-muted-foreground">Chapter</span>
        <input
          type="number"
          min="0"
          max={totalChapters ?? undefined}
          value={chapter}
          onChange={e => { setChapter(e.target.value); setDirty(true) }}
          onKeyDown={e => e.key === 'Enter' && dirty && save()}
          placeholder="—"
          className="w-16 h-7 text-xs bg-muted border border-border rounded-lg px-2 outline-none focus:border-primary text-foreground text-center"
        />
        {totalChapters && (
          <span className="text-[10px] text-muted-foreground">of {totalChapters}</span>
        )}
        {dirty && (
          <button
            onClick={() => save()}
            disabled={saving}
            className="h-7 px-2.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold flex items-center gap-1 hover:opacity-90"
          >
            {saving ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
            Save
          </button>
        )}
      </div>

      {/* Status selector */}
      <div className="flex flex-wrap gap-1">
        {STATUSES.map(s => (
          <button
            key={s.value}
            onClick={() => save(chapter, s.value)}
            disabled={saving}
            className={cn(
              'flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border transition-all',
              status === s.value
                ? 'bg-primary/10 text-primary border-primary/30'
                : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
            )}
          >
            <span>{s.emoji}</span>
            <span>{s.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}