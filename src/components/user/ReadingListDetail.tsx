'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import {
  ArrowLeft,
  BookOpen,
  Trash2,
  Globe,
  Lock,
  Loader2,
  ChevronRight,
  StickyNote,
  Check,
  X,
  Pencil,
  Search,
  GripVertical,
  ChevronDown,
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
  position?:        number | null
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

const STATUS_META: Record<string, { label: string; dot: string }> = {
  reading:      { label: 'Reading',      dot: 'bg-blue-500'    },
  plan_to_read: { label: 'Plan to read', dot: 'bg-violet-500'  },
  marinating:   { label: 'Marinating',   dot: 'bg-amber-500'   },
  completed:    { label: 'Completed',    dot: 'bg-emerald-500' },
  on_hold:      { label: 'On hold',      dot: 'bg-yellow-500'  },
  dropped:      { label: 'Dropped',      dot: 'bg-red-500'     },
}

const STATUSES = Object.entries(STATUS_META).map(([value, meta]) => ({ value, ...meta }))
const MAX_NOTE_LENGTH = 500

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
  const [searchQuery,  setSearchQuery]  = useState('')

  // Notes editing state
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [noteDraft,     setNoteDraft]     = useState('')
  const [savingNoteId,  setSavingNoteId]  = useState<string | null>(null)

  // Status-switcher popover state
  const [statusPickerId, setStatusPickerId] = useState<string | null>(null)
  const [savingStatusId, setSavingStatusId] = useState<string | null>(null)

  // Drag-reorder state
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [, setReordering]           = useState(false)

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

  const startEditingNote = (e: React.MouseEvent, item: ListItem) => {
    e.stopPropagation()
    setEditingNoteId(item.id)
    setNoteDraft(item.notes ?? '')
  }

  const cancelEditingNote = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    setEditingNoteId(null)
    setNoteDraft('')
  }

  const handleSaveNote = async (e: React.MouseEvent, item: ListItem) => {
    e.stopPropagation()
    const trimmed = noteDraft.trim()
    setSavingNoteId(item.id)
    try {
      const res = await fetch(`/api/lists/${list.id}/items`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recommendation_id: item.recommendations.id,
          notes: trimmed === '' ? null : trimmed,
        }),
      })
      if (!res.ok) throw new Error()
      setItems(prev => prev.map(i =>
        i.id === item.id ? { ...i, notes: trimmed === '' ? null : trimmed } : i
      ))
      setEditingNoteId(null)
      setNoteDraft('')
      toast.success(trimmed === '' ? 'Note removed' : 'Note saved')
    } catch {
      toast.error('Failed to save note')
    } finally {
      setSavingNoteId(null)
    }
  }

  // Quick status picker handler
  const handleQuickStatusChange = async (e: React.MouseEvent, item: ListItem, newStatus: string) => {
    e.stopPropagation()
    if (newStatus === item.status) {
      setStatusPickerId(null)
      return
    }
    setSavingStatusId(item.id)
    try {
      const res = await fetch(`/api/lists/${list.id}/items`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recommendation_id: item.recommendations.id,
          status: newStatus,
        }),
      })
      if (!res.ok) throw new Error()
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: newStatus } : i))
      setStatusPickerId(null)
      toast.success(STATUS_META[newStatus].label)
    } catch {
      toast.error('Failed to update status')
    } finally {
      setSavingStatusId(null)
    }
  }

  // Drag-and-reorder
  const canReorder = !isLocked && !filterStatus && !searchQuery.trim()

  const persistOrder = async (newItems: ListItem[]) => {
    setReordering(true)
    try {
      const res = await fetch(`/api/lists/${list.id}/reorder`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_ids: newItems.map(i => i.id),
        }),
      })
      if (!res.ok) throw new Error()
    } catch {
      toast.error('Failed to save order')
      setItems(initialItems)
    } finally {
      setReordering(false)
    }
  }

  const handleDragStart = (id: string) => {
    if (!canReorder) return
    setDraggingId(id)
  }

  const handleDragOver = (e: React.DragEvent, id: string) => {
    if (!canReorder || !draggingId) return
    e.preventDefault()
    if (id !== dragOverId) setDragOverId(id)
  }

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    if (!canReorder || !draggingId || draggingId === targetId) {
      setDraggingId(null)
      setDragOverId(null)
      return
    }
    e.preventDefault()

    setItems(prev => {
      const fromIndex = prev.findIndex(i => i.id === draggingId)
      const toIndex   = prev.findIndex(i => i.id === targetId)
      if (fromIndex === -1 || toIndex === -1) return prev

      const next = [...prev]
      const [moved] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, moved)
      persistOrder(next)
      return next
    })

    setDraggingId(null)
    setDragOverId(null)
  }

  const handleDragEnd = () => {
    setDraggingId(null)
    setDragOverId(null)
  }

  // Filter + search
  const filtered = useMemo(() => {
    let result = filterStatus ? items.filter(i => i.status === filterStatus) : items
    const q = searchQuery.trim().toLowerCase()
    if (q) {
      result = result.filter(i => i.recommendations.title.toLowerCase().includes(q))
    }
    return result
  }, [items, filterStatus, searchQuery])

  const statusCounts = items.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Cover collage for the banner — up to 5 covers from the list's own comics
  const bannerCovers = useMemo(
    () => items.map(i => i.recommendations?.cover_url).filter(Boolean).slice(0, 5) as string[],
    [items]
  )

  return (
    <div className="space-y-8 px-4 py-8 max-w-2xl mx-auto">
      {/* Back link */}
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground/70 hover:text-foreground transition-colors"
      >
        <ArrowLeft size={14} />
        Back to lists
      </Link>

      {/* Cover banner — quiet collage, no overlaid chrome, fades into the page */}
      {bannerCovers.length > 0 && (
        <div className="relative h-40 sm:h-52 rounded-xl overflow-hidden -mt-2">
          <div className="absolute inset-0 flex gap-0.5">
            {bannerCovers.map((url, i) => (
              <div
                key={i}
                className={cn(
                  'relative overflow-hidden shrink-0',
                  bannerCovers.length === 1 ? 'flex-1' : i === 0 ? 'w-2/5' : 'flex-1'
                )}
              >
                <img
                  src={`/api/image-proxy?url=${encodeURIComponent(url)}`}
                  alt=""
                  className="w-full h-full object-cover"
                  aria-hidden
                />
              </div>
            ))}
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/5 to-transparent" />
        </div>
      )}

      {/* Locked banner */}
      {isLocked && (
        <div className="flex items-start justify-between gap-4 py-3 border-y border-amber-500/25">
          <div className="space-y-0.5">
            <p className="text-sm font-medium text-amber-600">This list is locked</p>
            <p className="text-xs text-muted-foreground/70 leading-relaxed">
              You can view and update comics already here, but can't add new ones until you resubscribe.
            </p>
          </div>
          <Link href="/pricing" className="shrink-0 self-center">
            <span className="text-xs font-medium text-amber-600 border-b border-amber-600/50 hover:opacity-70 transition-opacity whitespace-nowrap">
              Upgrade
            </span>
          </Link>
        </div>
      )}

      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          {isLocked ? <Lock size={14} className="text-amber-600" /> : null}
          <h1 className="font-serif text-3xl tracking-tight text-foreground">{list.name}</h1>
        </div>
        {list.description && (
          <p className="text-sm text-muted-foreground/80 leading-relaxed">{list.description}</p>
        )}
        <div className="flex items-center gap-3 text-[11px] uppercase tracking-wide text-muted-foreground/60">
          <span>{items.length} comic{items.length !== 1 ? 's' : ''}</span>
          <span className="text-border">·</span>
          <span className="inline-flex items-center gap-1">
            {list.is_public ? <Globe size={10} /> : <Lock size={10} />}
            {list.is_public ? 'Public' : 'Private'}
          </span>
          <span className="text-border">·</span>
          <span>Created {formatDate(list.created_at)}</span>
        </div>
      </div>

      {/* Add to tracker search */}
      {!isLocked && (
        <AddToTrackerSearch
          lists={[{ id: list.id, name: list.name }, ...allLists.filter(l => l.id !== list.id)]}
          onAdded={handleAdded}
        />
      )}

      {/* Search within this list */}
      {items.length > 3 && (
        <div className="relative">
          <Search size={13} className="absolute left-0 top-1/2 -translate-y-1/2 text-muted-foreground/50 pointer-events-none" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search this list…"
            className="w-full h-9 pl-5 pr-6 bg-transparent border-0 border-b border-border/50 text-sm outline-none focus:border-foreground/60 text-foreground placeholder:text-muted-foreground/50 transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-0 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors"
            >
              <X size={13} />
            </button>
          )}
        </div>
      )}

      {/* Status filter — underline tabs */}
      {items.length > 0 && (
        <div className="flex gap-5 overflow-x-auto no-scrollbar border-b border-border/40 -mx-4 px-4">
          <button
            type="button"
            onClick={() => setFilterStatus(null)}
            className={cn(
              'pb-2.5 text-sm whitespace-nowrap border-b-2 -mb-px transition-colors shrink-0',
              !filterStatus
                ? 'border-foreground text-foreground font-medium'
                : 'border-transparent text-muted-foreground/60 hover:text-foreground'
            )}
          >
            All ({items.length})
          </button>
          {STATUSES.filter(s => statusCounts[s.value]).map(s => (
            <button
              key={s.value}
              type="button"
              onClick={() => setFilterStatus(filterStatus === s.value ? null : s.value)}
              className={cn(
                'pb-2.5 text-sm whitespace-nowrap border-b-2 -mb-px transition-colors shrink-0',
                filterStatus === s.value
                  ? 'border-foreground text-foreground font-medium'
                  : 'border-transparent text-muted-foreground/60 hover:text-foreground'
              )}
            >
              {s.label} ({statusCounts[s.value]})
            </button>
          ))}
        </div>
      )}

      {/* Reorder hint */}
      {canReorder && items.length > 1 && (
        <p className="text-[11px] text-muted-foreground/50 flex items-center gap-1 -mt-4">
          <GripVertical size={10} />
          Drag to reorder — clear filters or search first
        </p>
      )}

      {/* Empty states */}
      {items.length === 0 ? (
        <div className="text-center py-20 space-y-3">
          <BookOpen size={22} className="text-muted-foreground/30 mx-auto" />
          <div>
            <h3 className="font-serif text-base text-foreground">No comics yet</h3>
            <p className="text-xs text-muted-foreground/60 mt-1">
              {isLocked ? 'Upgrade to Pro to add comics' : 'Use the search above to add comics'}
            </p>
          </div>
          {!isLocked && (
            <Link href="/browse">
              <Button size="sm" variant="outline" className="mt-2">Browse comics</Button>
            </Link>
          )}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-sm text-muted-foreground/60">
            {searchQuery ? 'No comics match your search' : 'No comics with this status'}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border/40">
          {filtered.map(item => {
            const rec        = item.recommendations
            const statusMeta = STATUS_META[item.status] ?? STATUS_META.plan_to_read
            const progressPct = rec.chapter_count && item.progress_chapter
              ? Math.min(100, Math.round((item.progress_chapter / rec.chapter_count) * 100))
              : null
            const isEditingNote   = editingNoteId === item.id
            const isSavingNote    = savingNoteId === item.id
            const hasNote         = !!item.notes
            const isPickingStatus = statusPickerId === item.id
            const isSavingStatus  = savingStatusId === item.id
            const isDragging      = draggingId === item.id
            const isDragOver      = dragOverId === item.id && draggingId !== item.id
            const blockClick      = isEditingNote || isPickingStatus

            return (
              <div
                key={item.id}
                draggable={canReorder}
                onDragStart={() => handleDragStart(item.id)}
                onDragOver={e => handleDragOver(e, item.id)}
                onDrop={e => handleDrop(e, item.id)}
                onDragEnd={handleDragEnd}
                className={cn(
                  'group py-5 transition-opacity',
                  isDragging && 'opacity-40',
                  isDragOver && 'bg-muted/30'
                )}
              >
                <div
                  onClick={() => !blockClick && router.push(`/comic/${rec.id}`)}
                  className={cn('flex gap-4', !blockClick && 'cursor-pointer')}
                >
                  {canReorder && (
                    <div
                      className="flex items-center shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground/0 group-hover:text-muted-foreground/40 transition-colors -ml-1"
                      onClick={e => e.stopPropagation()}
                    >
                      <GripVertical size={14} />
                    </div>
                  )}

                  {/* Cover */}
                  <div className="w-16 aspect-[2/3] rounded-lg overflow-hidden bg-muted shrink-0 shadow-sm group-hover:shadow-md transition-shadow relative">
                    {rec.cover_url ? (
                      <img
                        src={`/api/image-proxy?url=${encodeURIComponent(rec.cover_url)}`}
                        alt={rec.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpen size={16} className="text-muted-foreground opacity-40" />
                      </div>
                    )}
                    {/* Progress bar — thin strip at bottom of cover */}
                    {progressPct !== null && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black/20">
                        <div className="h-full bg-primary transition-all" style={{ width: `${progressPct}%` }} />
                      </div>
                    )}
                  </div>

                  {/* Main details */}
                  <div className="flex-1 min-w-0 space-y-2 py-0.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 space-y-1 flex-1">
                        <p className="font-serif text-base leading-snug line-clamp-1 text-foreground group-hover:opacity-70 transition-opacity">
                          {rec.title}
                        </p>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-[11px] italic text-muted-foreground/60 lowercase">
                            {rec.type}
                          </p>
                          {progressPct !== null && (
                            <>
                              <span className="text-muted-foreground/30 text-[11px]">·</span>
                              <p className="text-[11px] text-primary font-medium">{progressPct}%</p>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Remove — always visible on mobile (no hover state available
                          on touch), only relies on hover to sharpen on desktop */}
                      <button
                        type="button"
                        onClick={e => handleRemove(e, item)}
                        disabled={removingId === item.id}
                        className="text-muted-foreground/40 sm:text-muted-foreground/0 sm:group-hover:text-muted-foreground/50 hover:!text-destructive transition-colors shrink-0 p-1"
                      >
                        {removingId === item.id ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <Trash2 size={13} />
                        )}
                      </button>
                    </div>

                    {/* Status — plain text dropdown */}
                    <div className="relative inline-block" onClick={e => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => setStatusPickerId(isPickingStatus ? null : item.id)}
                        disabled={isSavingStatus}
                        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {isSavingStatus ? (
                          <Loader2 size={10} className="animate-spin" />
                        ) : (
                          <>
                            <span className={cn('h-1.5 w-1.5 rounded-full', statusMeta.dot)} />
                            {statusMeta.label}
                            <ChevronDown size={10} className="opacity-40" />
                          </>
                        )}
                      </button>

                      {isPickingStatus && (
                        <div className="absolute top-full left-0 mt-1.5 z-50 bg-popover border border-border/60 rounded-lg shadow-lg overflow-hidden min-w-[150px] py-1">
                          {STATUSES.map(s => (
                            <button
                              key={s.value}
                              type="button"
                              onClick={e => handleQuickStatusChange(e, item, s.value)}
                              className={cn(
                                'w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-muted/60 transition-colors',
                                s.value === item.status ? 'text-foreground font-medium' : 'text-muted-foreground'
                              )}
                            >
                              <span className={cn('h-1.5 w-1.5 rounded-full', s.dot)} />
                              {s.label}
                              {s.value === item.status && <Check size={11} className="ml-auto" />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <ChapterUpdater
                      comicId={rec.id}
                      listId={list.id}
                      currentChapter={item.progress_chapter}
                      totalChapters={rec.chapter_count}
                      status={item.status}
                      compact
                      onUpdate={(chapter, status) => handleProgressUpdate(item.id, chapter, status)}
                    />

                    <p className="text-[10px] text-muted-foreground/50">Added {formatDate(item.added_at)}</p>
                  </div>

                  <ChevronRight size={14} className="text-muted-foreground/0 group-hover:text-muted-foreground/40 shrink-0 self-center transition-colors" />
                </div>

                {/* Private note */}
                <div className="pl-[80px] pt-2" onClick={e => e.stopPropagation()}>
                  {isEditingNote ? (
                    <div className="space-y-1.5">
                      <textarea
                        value={noteDraft}
                        onChange={e => setNoteDraft(e.target.value)}
                        placeholder="Why did you pause this? What chapter should you remember? Notes are private, only you can see them."
                        maxLength={MAX_NOTE_LENGTH}
                        autoFocus
                        rows={2}
                        className="w-full text-xs bg-transparent border-0 border-b border-border/50 px-0 py-1 resize-none outline-none focus:border-foreground/60 transition-colors placeholder:text-muted-foreground/40"
                      />
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground/40">{noteDraft.length}/{MAX_NOTE_LENGTH}</span>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={cancelEditingNote}
                            disabled={isSavingNote}
                            className="text-[11px] text-muted-foreground/60 hover:text-foreground transition-colors flex items-center gap-1"
                          >
                            <X size={10} /> Cancel
                          </button>
                          <button
                            onClick={e => handleSaveNote(e, item)}
                            disabled={isSavingNote}
                            className="text-[11px] font-medium text-foreground border-b border-foreground/60 hover:opacity-60 transition-opacity flex items-center gap-1"
                          >
                            {isSavingNote ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />}
                            Save
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : hasNote ? (
                    <button
                      type="button"
                      onClick={e => startEditingNote(e, item)}
                      className="w-full text-left flex items-start gap-1.5 group/note"
                    >
                      <StickyNote size={11} className="text-muted-foreground/40 shrink-0 mt-0.5" />
                      <p className="text-[11px] text-muted-foreground/70 italic line-clamp-2 flex-1 leading-snug">{item.notes}</p>
                      <Pencil size={10} className="text-muted-foreground/0 group-hover/note:text-muted-foreground/50 transition-colors shrink-0 mt-0.5" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={e => startEditingNote(e, item)}
                      className="text-[11px] text-muted-foreground/40 hover:text-muted-foreground transition-colors flex items-center gap-1"
                    >
                      <StickyNote size={10} />
                      Add a private note
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}