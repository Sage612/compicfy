'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { ArrowLeft, BookOpen, Trash2, Globe, Lock,
  Loader2, BookMarked, ChevronRight, Crown, Sparkles,
} from 'lucide-react'
import { formatDate } from '@/lib/utils/format'
import { cn } from '@/lib/utils'
import { ChapterUpdater } from '@/components/recommendations/ChapterUpdater'
import { AddToTrackerSearch } from '@/components/recommendations/AddToTrackerSearch'

interface ReadingList {
  id:          string
  name:        string
  description: string | null
  is_public:   boolean
  created_at:  string
}

interface ListItem {
  id:               string
  status:           string
  progress_chapter: number | null
  notes:            string | null
  added_at:         string
  recommendations: {
    id:            string
    title:         string
    cover_url:     string | null
    type:          string
    status:        string
    genres:        string[]
    upvotes:       number
    chapter_count: number | null
  }
}

const STATUS_META: Record<string, { label: string; emoji: string; className: string }> = {
  reading:      { label: 'Reading',      emoji: '📖', className: 'bg-blue-500/10    text-blue-600    border-blue-500/20'    },
  plan_to_read: { label: 'Plan to Read', emoji: '📌', className: 'bg-violet-500/10  text-violet-600  border-violet-500/20'  },
  marinating:   { label: 'Marinating',   emoji: '🫙', className: 'bg-amber-500/10   text-amber-600   border-amber-500/20'   },
  completed:    { label: 'Completed',    emoji: '✅', className: 'bg-emerald-500/10  text-emerald-600 border-emerald-500/20' },
  on_hold:      { label: 'On Hold',      emoji: '⏸️', className: 'bg-yellow-500/10  text-yellow-600  border-yellow-500/20'  },
  dropped:      { label: 'Dropped',      emoji: '🗑️', className: 'bg-red-500/10     text-red-600     border-red-500/20'     },
}

const TYPE_COLORS: Record<string, string> = {
  manga:   'bg-rose-500/10   text-rose-500   border-rose-500/20',
  manhwa:  'bg-teal-500/10   text-teal-500   border-teal-500/20',
  manhua:  'bg-amber-500/10  text-amber-500  border-amber-500/20',
  webtoon: 'bg-teal-500/10   text-teal-500   border-teal-500/20',
  comic:   'bg-blue-500/10   text-blue-500   border-blue-500/20',
}

const STATUSES = Object.entries(STATUS_META).map(([value, meta]) => ({ value, ...meta }))

interface Props {
  list:         ReadingList
  initialItems: ListItem[]
  isLocked?:    boolean
  allLists?:    { id: string; name: string }[]
  backHref?:    string
}

export function ReadingListDetail({
  list,
  initialItems,
  isLocked  = false,
  allLists  = [],
  backHref  = '/dashboard/lists',
}: Props) {
  const router = useRouter()
  const [items,        setItems]        = useState(initialItems)
  const [removingId,   setRemovingId]   = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string | null>(null)

  const handleRemove = async (e: React.MouseEvent, item: ListItem) => {
    e.stopPropagation()
    if (!confirm(`Remove "${item.recommendations.title}" from this list?`)) return
    setRemovingId(item.id)
    try {
      await fetch(`/api/lists/${list.id}/items?rec_id=${item.recommendations.id}`, { method: 'DELETE' })
      setItems(prev => prev.filter(i => i.id !== item.id))
      toast.success('Removed from list')
    } catch {
      toast.error('Failed to remove')
    } finally {
      setRemovingId(null)
    }
  }

  const handleProgressUpdate = (itemId: string, chapter: number | null, status: string) => {
    setItems(prev => prev.map(i =>
      i.id === itemId ? { ...i, progress_chapter: chapter, status } : i
    ))
  }

  const handleAdded = (_comicId: string, _title: string, _listId: string, _status: string) => {
    window.location.reload()
  }

  const filtered = filterStatus ? items.filter(i => i.status === filterStatus) : items

  const statusCounts = items.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="space-y-6 px-4 py-6 max-w-3xl mx-auto">

      {/* Back link */}
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft size={14} />
        Back to Lists
      </Link>

      {/* Locked banner */}
      {isLocked && (
        <div className="flex items-start gap-3 p-4 rounded-2xl border border-amber-500/30 bg-amber-500/5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0">
            <Crown size={14} className="text-white" />
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <p className="text-sm font-black text-amber-600">This list is locked</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              You can view your comics but can't add new ones or change statuses until you resubscribe.
            </p>
          </div>
          <Link href="/pricing" className="shrink-0">
            <Button size="sm" className="h-8 gap-1.5 bg-gradient-to-r from-amber-400 to-orange-500 border-0 text-white text-xs hover:opacity-90">
              <Sparkles size={11} />
              Upgrade
            </Button>
          </Link>
        </div>
      )}

      {/* Header card */}
      <div className={cn('rounded-2xl border bg-card overflow-hidden', isLocked ? 'border-amber-500/20' : 'border-border')}>
        <div className={cn('h-16 bg-gradient-to-br', isLocked ? 'from-amber-500/10 via-orange-500/5 to-transparent' : 'from-primary/15 via-primary/5 to-transparent')} />
        <div className="px-5 pb-5 -mt-6 space-y-3">
          <div className="flex items-end justify-between gap-4">
            <div className={cn(
              'w-12 h-12 rounded-xl flex items-center justify-center shadow-lg ring-2 ring-card',
              isLocked ? 'bg-gradient-to-br from-amber-400 to-orange-500' : 'bg-primary'
            )}>
              {isLocked
                ? <Lock size={20} className="text-white" />
                : <BookMarked size={20} className="text-primary-foreground" />
              }
            </div>
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-black tracking-tight">{list.name}</h1>
            {list.description && <p className="text-sm text-muted-foreground">{list.description}</p>}
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
            <span><strong className="text-foreground font-black">{items.length}</strong> comic{items.length !== 1 ? 's' : ''}</span>
            <span className={cn(
              'inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold',
              list.is_public ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-muted text-muted-foreground border-border'
            )}>
              {list.is_public ? <Globe size={9} /> : <Lock size={9} />}
              {list.is_public ? 'Public' : 'Private'}
            </span>
            <span>Created {formatDate(list.created_at)}</span>
          </div>
        </div>
      </div>

      {/* Add to tracker search */}
      {!isLocked && (
        <AddToTrackerSearch
          lists={[{ id: list.id, name: list.name }, ...allLists.filter(l => l.id !== list.id)]}
          onAdded={handleAdded}
        />
      )}

      {/* Status filter tabs */}
      {items.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setFilterStatus(null)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-semibold border transition-all',
              !filterStatus ? 'bg-primary text-primary-foreground border-primary shadow-sm' : 'border-border text-muted-foreground hover:border-primary'
            )}
          >
            All ({items.length})
          </button>
          {STATUSES.filter(s => statusCounts[s.value]).map(s => (
            <button
              key={s.value}
              onClick={() => setFilterStatus(filterStatus === s.value ? null : s.value)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-semibold border transition-all',
                filterStatus === s.value ? 'bg-primary text-primary-foreground border-primary shadow-sm' : 'border-border text-muted-foreground hover:border-primary'
              )}
            >
              {s.emoji} {s.label} ({statusCounts[s.value]})
            </button>
          ))}
        </div>
      )}

      {/* Empty states */}
      {items.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border border-dashed border-border space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto">
            <BookOpen size={22} className="text-muted-foreground opacity-40" />
          </div>
          <div>
            <h3 className="font-black text-sm">No comics yet</h3>
            <p className="text-xs text-muted-foreground mt-1">
              {isLocked ? 'Upgrade to Pro to add comics' : 'Use the search above to add comics'}
            </p>
          </div>
          {!isLocked && (
            <Link href="/browse">
              <Button size="sm">Browse Comics</Button>
            </Link>
          )}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 rounded-2xl border border-dashed border-border">
          <p className="text-sm text-muted-foreground">No comics with this status</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(item => {
            const rec        = item.recommendations
            const statusMeta = STATUS_META[item.status] ?? STATUS_META.plan_to_read
            const typeStyle  = TYPE_COLORS[rec.type] ?? 'bg-muted text-muted-foreground border-border'
            const progressPct = rec.chapter_count && item.progress_chapter
              ? Math.min(100, Math.round((item.progress_chapter / rec.chapter_count) * 100))
              : null

            return (
              <div
                key={item.id}
                className="group rounded-2xl border border-border bg-card hover:border-primary/30 transition-all duration-200 overflow-hidden"
              >
                {progressPct !== null && (
                  <div className="h-0.5 bg-muted">
                    <div className="h-full bg-primary transition-all" style={{ width: `${progressPct}%` }} />
                  </div>
                )}

                <div
                  onClick={() => router.push(`/comic/${rec.id}`)}
                  className="flex gap-4 p-4 cursor-pointer"
                >
                  <div className="w-14 h-20 rounded-xl overflow-hidden bg-muted shrink-0 shadow-sm">
                    {rec.cover_url ? (
                      <img src={`/api/image-proxy?url=${encodeURIComponent(rec.cover_url)}`} alt={rec.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpen size={16} className="text-muted-foreground opacity-40" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 space-y-2 py-0.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 space-y-1.5">
                        <p className="font-black text-sm line-clamp-1 group-hover:text-primary transition-colors">{rec.title}</p>
                        <div className="flex flex-wrap gap-1.5 items-center">
                          <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize', typeStyle)}>{rec.type}</span>
                          <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border', statusMeta.className)}>
                            {statusMeta.emoji} {statusMeta.label}
                          </span>
                          {progressPct !== null && (
                            <span className="text-[10px] text-primary font-bold">{progressPct}%</span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={e => handleRemove(e, item)}
                        disabled={removingId === item.id}
                        className="text-muted-foreground hover:text-destructive transition-colors shrink-0 p-1 rounded-lg hover:bg-destructive/10"
                      >
                        {removingId === item.id
                          ? <Loader2 size={13} className="animate-spin" />
                          : <Trash2 size={13} />
                        }
                      </button>
                    </div>

                    {!isLocked ? (
                      <ChapterUpdater
                        comicId={rec.id}
                        listId={list.id}
                        currentChapter={item.progress_chapter}
                        totalChapters={rec.chapter_count}
                        status={item.status}
                        compact
                        onUpdate={(chapter, status) => handleProgressUpdate(item.id, chapter, status)}
                      />
                    ) : (
                      <div className="flex items-center gap-1.5 text-[10px] text-amber-500/70">
                        <Lock size={9} />
                        {item.progress_chapter ? `Ch. ${item.progress_chapter}` : 'No progress'} · Read-only
                      </div>
                    )}

                    <p className="text-[10px] text-muted-foreground">Added {formatDate(item.added_at)}</p>
                  </div>

                  <ChevronRight size={14} className="text-muted-foreground/30 group-hover:text-muted-foreground shrink-0 self-center opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

