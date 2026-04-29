'use client'

import { useState } from 'react'
import Link from 'next/link'
import { BookOpen, BookMarked, ChevronRight, Flame } from 'lucide-react'
import { ChapterUpdater } from '@/components/recommendations/ChapterUpdater'
import { AddToTrackerSearch } from '@/components/recommendations/AddToTrackerSearch'
import { cn } from '@/lib/utils'

interface ReadingItem {
  id:               string
  list_id:          string
  status:           string
  progress_chapter: number | null
  last_read_at:     string | null
  recommendations: {
    id:            string
    title:         string
    cover_url:     string | null
    type:          string
    status:        string
    chapter_count: number | null
  }
}

interface ReadingList {
  id:   string
  name: string
}

interface Props {
  initialItems: ReadingItem[]
  lists:        ReadingList[]
}

const TYPE_COLORS: Record<string, string> = {
  manga:   'bg-rose-500/10   text-rose-500   border-rose-500/20',
  manhwa:  'bg-violet-500/10 text-violet-500 border-violet-500/20',
  manhua:  'bg-amber-500/10  text-amber-500  border-amber-500/20',
  webtoon: 'bg-teal-500/10   text-teal-500   border-teal-500/20',
  comic:   'bg-blue-500/10   text-blue-500   border-blue-500/20',
}

const STATUS_EMOJI: Record<string, string> = {
  reading:      '📖',
  plan_to_read: '📌',
  completed:    '✅',
  on_hold:      '⏸️',
  dropped:      '🗑️',
  marinating:   '🫙',
}

const STATUS_LABEL: Record<string, string> = {
  reading:      'Reading',
  plan_to_read: 'Plan to Read',
  completed:    'Completed',
  on_hold:      'On Hold',
  dropped:      'Dropped',
  marinating:   'Marinating',
}

export function CurrentlyReadingSection({ initialItems, lists }: Props) {
  const [items, setItems] = useState<ReadingItem[]>(initialItems)

  const handleUpdate = (itemId: string, chapter: number | null, status: string) => {
    setItems(prev => prev.map(item =>
      item.id === itemId
        ? { ...item, progress_chapter: chapter, status }
        : item
    ))
  }

  const handleAdded = (comicId: string, title: string, listId: string, status: string) => {
    if (status === 'reading') {
      window.location.reload()
    }
  }

  return (
    <div className="rounded-2xl border border-teal-500/20 bg-teal-500/[0.03] overflow-hidden">

      {/* ── Section header ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-teal-500/15 bg-teal-500/5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-sm">
            <BookOpen size={13} className="text-white" />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-teal-700 dark:text-teal-400">
              Currently Reading
            </p>
            {items.length > 0 && (
              <p className="text-[10px] text-muted-foreground leading-none mt-0.5">
                {items.length} in progress
              </p>
            )}
          </div>
        </div>
        <Link
          href="/dashboard/lists"
          className="flex items-center gap-1 text-[11px] font-semibold text-teal-600 hover:text-teal-500 transition-colors"
        >
          All lists <ChevronRight size={11} />
        </Link>
      </div>

      {/* ── Add to tracker ── */}
      <div className="px-4 py-3 border-b border-teal-500/10">
        <AddToTrackerSearch lists={lists} onAdded={handleAdded} />
      </div>

      {/* ── Reading items ── */}
      <div className="px-4 pb-4 pt-3">
        {items.length > 0 ? (
          <div className="space-y-2.5">
            {items.map(item => {
              const rec = item.recommendations
              if (!rec) return null

              const typeStyle  = TYPE_COLORS[rec.type] ?? 'bg-muted text-muted-foreground border-border'
              const emoji      = STATUS_EMOJI[item.status]  ?? '📖'
              const statusLabel = STATUS_LABEL[item.status] ?? item.status.replace(/_/g, ' ')

              const progressPct = rec.chapter_count && item.progress_chapter
                ? Math.min(100, Math.round((item.progress_chapter / rec.chapter_count) * 100))
                : null

              return (
                <div
                  key={item.id}
                  className="group rounded-xl border border-border bg-card hover:border-teal-500/30 hover:shadow-sm transition-all duration-200 overflow-hidden"
                >
                  {/* Progress bar */}
                  {progressPct !== null && (
                    <div className="h-1 bg-muted/60">
                      <div
                        className="h-full bg-gradient-to-r from-teal-500 to-cyan-500 transition-all duration-500 rounded-full"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  )}

                  <div className="flex gap-3 p-3">
                    {/* Cover */}
                    <Link href={`/comic/${rec.id}`} className="shrink-0">
                      <div className="w-11 h-15 rounded-lg overflow-hidden bg-muted shadow-sm group-hover:shadow-md transition-shadow" style={{ height: '60px', width: '44px' }}>
                        {rec.cover_url ? (
                          <img
                            src={rec.cover_url}
                            alt={rec.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <BookOpen size={13} className="text-muted-foreground opacity-40" />
                          </div>
                        )}
                      </div>
                    </Link>

                    {/* Info */}
                    <div className="flex-1 min-w-0 space-y-1.5">
                      {/* Title row */}
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          href={`/comic/${rec.id}`}
                          className="text-xs font-black line-clamp-1 hover:text-teal-600 transition-colors"
                        >
                          {rec.title}
                        </Link>
                        {/* Progress % badge */}
                        {progressPct !== null && (
                          <span className="text-[10px] font-black text-teal-600 bg-teal-500/10 border border-teal-500/20 px-1.5 py-0.5 rounded-full shrink-0 leading-none">
                            {progressPct}%
                          </span>
                        )}
                      </div>

                      {/* Badges row */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={cn(
                          'inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold border capitalize',
                          typeStyle
                        )}>
                          {rec.type}
                        </span>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                          <span>{emoji}</span>
                          <span>{statusLabel}</span>
                        </span>
                        {item.progress_chapter != null && rec.chapter_count && (
                          <span className="text-[10px] text-muted-foreground/70">
                            Ch.{item.progress_chapter}/{rec.chapter_count}
                          </span>
                        )}
                        {item.progress_chapter != null && !rec.chapter_count && (
                          <span className="text-[10px] text-muted-foreground/70">
                            Ch.{item.progress_chapter}
                          </span>
                        )}
                      </div>

                      {/* Chapter updater */}
                      <ChapterUpdater
                        comicId={rec.id}
                        listId={item.list_id}
                        currentChapter={item.progress_chapter}
                        totalChapters={rec.chapter_count}
                        status={item.status}
                        compact
                        onUpdate={(chapter, status) => handleUpdate(item.id, chapter, status)}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          /* Empty state */
          <div className="text-center py-8 space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center mx-auto">
              <BookOpen size={16} className="text-teal-500 opacity-60" />
            </div>
            <p className="text-xs font-black text-foreground/70">Nothing in progress</p>
            <p className="text-xs text-muted-foreground">
              Search above to add comics to your tracker
            </p>
          </div>
        )}
      </div>
    </div>
  )
}