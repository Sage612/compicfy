'use client'

import { useState } from 'react'
import Link from 'next/link'
import { BookOpen, ChevronRight } from 'lucide-react'
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
    // Optimistically add to the list — full data comes on next page load
    // For now just show a placeholder that will be accurate after refresh
    if (status === 'reading') {
      // Trigger a soft refresh by adding a placeholder
      // The user will see it on next full load, but we don't want to block UX
      window.location.reload()
    }
  }

  return (
    <div className="space-y-3">

      {/* Section header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Currently Reading
        </h2>
        <Link href="/dashboard/lists" className="text-xs text-primary hover:underline flex items-center gap-1">
          All lists <ChevronRight size={12} />
        </Link>
      </div>

      {/* Add to tracker */}
      <AddToTrackerSearch lists={lists} onAdded={handleAdded} />

      {/* Reading items */}
      {items.length > 0 ? (
        <div className="space-y-2">
          {items.map(item => {
            const rec       = item.recommendations
            if (!rec) return null
            const typeStyle = TYPE_COLORS[rec.type] ?? 'bg-muted text-muted-foreground border-border'
            const emoji     = STATUS_EMOJI[item.status] ?? '📖'

            // Progress bar calculation
            const progressPct = rec.chapter_count && item.progress_chapter
              ? Math.min(100, Math.round((item.progress_chapter / rec.chapter_count) * 100))
              : null

            return (
              <div
                key={item.id}
                className="group rounded-2xl border border-border bg-card hover:border-primary/30 transition-all duration-200 overflow-hidden"
              >
                {/* Progress bar at top */}
                {progressPct !== null && (
                  <div className="h-0.5 bg-muted">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-violet-500 transition-all duration-500"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                )}

                <div className="flex gap-3 p-3">
                  {/* Cover */}
                  <Link href={`/comic/${rec.id}`} className="shrink-0">
                    <div className="w-12 h-16 rounded-xl overflow-hidden bg-muted shadow-sm group-hover:shadow-md transition-shadow">
                      {rec.cover_url ? (
                        <img
                          src={rec.cover_url}
                          alt={rec.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <BookOpen size={14} className="text-muted-foreground opacity-40" />
                        </div>
                      )}
                    </div>
                  </Link>

                  {/* Info + updater */}
                  <div className="flex-1 min-w-0 space-y-2 py-0.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 space-y-1">
                        <Link
                          href={`/comic/${rec.id}`}
                          className="text-xs font-black line-clamp-1 hover:text-primary transition-colors block"
                        >
                          {rec.title}
                        </Link>
                        <div className="flex items-center gap-1.5">
                          <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold border capitalize', typeStyle)}>
                            {rec.type}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {emoji} {item.status.replace(/_/g, ' ')}
                          </span>
                          {progressPct !== null && (
                            <span className="text-[10px] text-primary font-bold">
                              {progressPct}%
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Inline chapter updater */}
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
        <div className="text-center py-8 rounded-2xl border border-dashed border-border space-y-2">
          <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center mx-auto">
            <BookOpen size={16} className="text-muted-foreground opacity-40" />
          </div>
          <p className="text-xs font-bold">Nothing in progress</p>
          <p className="text-xs text-muted-foreground">
            Search above to add comics to your tracker
          </p>
        </div>
      )}
    </div>
  )
}