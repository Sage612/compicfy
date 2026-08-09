'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { ArrowLeft, BookOpen, Trash2, Globe, Lock,
  Loader2, BookMarked, ChevronRight, Crown, Sparkles,
  StickyNote, Check, X, Pencil, Search, GripVertical,
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

  // Notes editing state — tracked by item id, one open editor at a time
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [noteDraft,     setNoteDraft]     = useState('')
  const [savingNoteId,  setSavingNoteId]  = useState<string | null>(null)

  // Status-switcher popover state — tracked by item id, one open at a time
  const [statusPickerId, setStatusPickerId] = useState<string | null>(null)
  const [savingStatusId, setSavingStatusId] = useState<string | null>(null)

  // Drag-reorder state
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [reordering, setReordering] = useState(false)

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

  // ── Status switcher (compact) ──
  const handleQuickStatusChange = async (e: React.MouseEvent, item: ListItem, newStatus: string) => {
    e.stopPropagation()
    if (newStatus === item.status) { setStatusPickerId(null); return }
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
      const meta = STATUS_META[newStatus]
      toast.success(`${meta.emoji} ${meta.label}`)
    } catch {
      toast.error('Failed to update status')
    } finally {
      setSavingStatusId(null)
    }
  }

  // ── Drag-and-reorder ──
  // Only meaningful when no filter/search is active — reordering a filtered
  // subset would desync from the real underlying order, so we disable drag
  // entirely while filtered/searched (dropHandled below also guards this).
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
      // Revert on failure
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

  // ── Filter + search ──
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
              You can view your comics but can't add new ones until you resubscribe. You can still update statuses and notes on comics already here.
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

      {/* Search within this list */}
      {items.length > 3 && (
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search this list…"
            className="pl-9 h-9 text-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
            >
              <X size={13} />
            </button>
          )}
        </div>
      )}

      {/* Status filter tabs */}
      {items.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1">
          <button
            onClick={() => setFilterStatus(null)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-semibold border transition-all shrink-0 whitespace-nowrap',
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
                'px-3 py-1.5 rounded-full text-xs font-semibold border transition-all shrink-0 whitespace-nowrap',
                filterStatus === s.value ? 'bg-primary text-primary-foreground border-primary shadow-sm' : 'border-border text-muted-foreground hover:border-primary'
              )}
            >
              {s.emoji} {s.label} ({statusCounts[s.value]})
            </button>
          ))}
        </div>
      )}

      {/* Reorder hint — only shown when reordering is actually available */}
      {canReorder && items.length > 1 && (
        <p className="text-[10px] text-muted-foreground/60 flex items-center gap-1 -mt-2">
          <GripVertical size={10} />
          Drag comics to reorder · clear filters/search to reorder
        </p>
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
          <p className="text-sm text-muted-foreground">
            {searchQuery ? 'No comics match your search' : 'No comics with this status'}
          </p>
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
                  'group rounded-2xl border border-border bg-card hover:border-primary/30 transition-all duration-200',
                  isDragging && 'opacity-40',
                  isDragOver && 'border-primary/60 border-2',
                )}
              >
                {progressPct !== null && (
                  <div className="h-0.5 bg-muted rounded-t-2xl overflow-hidden">
                    <div className="h-full bg-primary transition-all" style={{ width: `${progressPct}%` }} />
                  </div>
                )}

                <div
                  onClick={() => !blockClick && router.push(`/comic/${rec.id}`)}
                  className={cn('flex gap-3 p-4', !blockClick && 'cursor-pointer')}
                >
                  {canReorder && (
                    <div
                      className="flex items-center shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-colors"
                      onClick={e => e.stopPropagation()}
                    >
                      <GripVertical size={14} />
                    </div>
                  )}

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
                      <div className="min-w-0 space-y-1.5 flex-1">
                        <p className="font-black text-sm line-clamp-1 group-hover:text-primary transition-colors">{rec.title}</p>
                        <div className="flex flex-nowrap items-center gap-1.5 overflow-hidden">
                          <span className={cn('inline-flex items-center shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize', typeStyle)}>{rec.type}</span>

                          {/* ── Clickable status pill → opens compact status picker ── */}
                          <div className="relative shrink-0" onClick={e => e.stopPropagation()}>
                            <button
                              onClick={() => setStatusPickerId(isPickingStatus ? null : item.id)}
                              disabled={isSavingStatus}
                              className={cn(
                                'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors whitespace-nowrap',
                                statusMeta.className,
                                'hover:brightness-95 cursor-pointer'
                              )}
                            >
                              {isSavingStatus
                                ? <Loader2 size={9} className="animate-spin" />
                                : <>{statusMeta.emoji} {statusMeta.label}<ChevronDown size={9} className="opacity-50" /></>
                              }
                            </button>

                            {isPickingStatus && (
                              <div className="absolute top-full left-0 mt-1 z-[100] bg-card border border-border rounded-xl shadow-xl overflow-hidden min-w-[150px]">
                                {STATUSES.map(s => (
                                  <button
                                    key={s.value}
                                    onClick={e => handleQuickStatusChange(e, item, s.value)}
                                    className={cn(
                                      'w-full flex items-center gap-2 px-3 py-2.5 text-xs text-left hover:bg-accent transition-colors',
                                      s.value === item.status && 'bg-accent/60 font-bold'
                                    )}
                                  >
                                    <span>{s.emoji}</span>
                                    <span>{s.label}</span>
                                    {s.value === item.status && <Check size={11} className="ml-auto text-primary" />}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          {progressPct !== null && (
                            <span className="text-[10px] text-primary font-bold shrink-0">{progressPct}%</span>
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

                    <ChapterUpdater
                      comicId={rec.id}
                      listId={list.id}
                      currentChapter={item.progress_chapter}
                      totalChapters={rec.chapter_count}
                      status={item.status}
                      compact
                      onUpdate={(chapter, status) => handleProgressUpdate(item.id, chapter, status)}
                    />

                    <p className="text-[10px] text-muted-foreground">Added {formatDate(item.added_at)}</p>
                  </div>

                  <ChevronRight size={14} className="text-muted-foreground/30 group-hover:text-muted-foreground shrink-0 self-center opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>

                {/* ── Private note ── */}
                <div className="px-4 pb-4 -mt-1" onClick={e => e.stopPropagation()}>
                  {isEditingNote ? (
                    <div className="space-y-1.5">
                      <textarea
                        value={noteDraft}
                        onChange={e => setNoteDraft(e.target.value)}
                        placeholder="Why did you pause this? What chapter should you remember? Notes are private, only you can see them."
                        maxLength={MAX_NOTE_LENGTH}
                        autoFocus
                        rows={2}
                        className="w-full text-xs rounded-xl border border-border bg-background px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40"
                      />
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground/60">{noteDraft.length}/{MAX_NOTE_LENGTH}</span>
                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 text-[10px] px-2 gap-1"
                            onClick={cancelEditingNote}
                            disabled={isSavingNote}
                          >
                            <X size={10} /> Cancel
                          </Button>
                          <Button
                            size="sm"
                            className="h-6 text-[10px] px-2 gap-1"
                            onClick={e => handleSaveNote(e, item)}
                            disabled={isSavingNote}
                          >
                            {isSavingNote ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />}
                            Save
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : hasNote ? (
                    <button
                      onClick={e => startEditingNote(e, item)}
                      className="w-full text-left flex items-start gap-1.5 px-3 py-2 rounded-xl bg-muted/50 hover:bg-muted border border-transparent hover:border-border transition-colors group/note"
                    >
                      <StickyNote size={11} className="text-muted-foreground/60 shrink-0 mt-0.5" />
                      <p className="text-[11px] text-muted-foreground line-clamp-2 flex-1 leading-snug">{item.notes}</p>
                      <Pencil size={10} className="text-muted-foreground/0 group-hover/note:text-muted-foreground/60 transition-colors shrink-0 mt-0.5" />
                    </button>
                  ) : (
                    <button
                      onClick={e => startEditingNote(e, item)}
                      className="text-[10px] text-muted-foreground/50 hover:text-muted-foreground transition-colors flex items-center gap-1"
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