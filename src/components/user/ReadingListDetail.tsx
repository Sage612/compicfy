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
import { CustomEntryFooter } from '@/components/lists/CustomEntryFooter'
import { CustomEntryEditModal } from '@/components/lists/CustomEntryEditModal'
import { AddCustomEntryModal } from '@/components/lists/AddCustomEntryModal'
import { TRACKING_STATUSES, TRACKING_STATUS_META, resolveSubStatusLabel } from '@/lib/utils/constants'

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
  sub_status?:      string | null
  progress_chapter: number | null
  notes:            string | null
  added_at:         string
  position?:        number | null
  recommendation_id: string | null
  custom_entry_id:   string | null
  recommendations: {
    id:            string
    title:         string
    cover_url:     string | null
    type:          string
    status:        string
    genres:        string[]
    upvotes:       number
    chapter_count: number | null
  } | null
  custom_entries: {
    id:        string
    title:     string
    cover_url: string | null
    notes:     string | null
  } | null
}

const MAX_NOTE_LENGTH = 500

function getItemDisplay(item: ListItem) {
  if (item.recommendations) {
    return {
      id: item.recommendations.id,
      title: item.recommendations.title,
      coverUrl: item.recommendations.cover_url,
      type: item.recommendations.type,
      chapterCount: item.recommendations.chapter_count,
      isCustom: false as const,
      clickHref: `/comic/${item.recommendations.id}`,
    }
  }

  return {
    id: item.custom_entries?.id ?? item.id,
    title: item.custom_entries?.title ?? 'Untitled',
    coverUrl: item.custom_entries?.cover_url ?? null,
    type: null,
    chapterCount: null,
    isCustom: true as const,
    clickHref: null,
  }
}

interface Props {
  list:         ReadingList
  initialItems: ListItem[]
  isLocked?:    boolean
  allLists?:    { id: string; name: string }[]
  backHref?:    string
  isPro?:       boolean
}

export function ReadingListDetail({
  list,
  initialItems,
  isLocked  = false,
  allLists  = [],
  backHref  = '/dashboard/lists',
  isPro     = false,
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

  // Custom entry edit modal state
  const [editingCustomEntry, setEditingCustomEntry] = useState<{
    id: string; title: string; cover_url: string | null; notes: string | null
  } | null>(null)
  const [showAddCustomModal, setShowAddCustomModal] = useState(false)

  const handleRemove = async (e: React.MouseEvent, item: ListItem) => {
    e.stopPropagation()
    const display = getItemDisplay(item)
    if (!confirm(`Remove "${display.title}" from this list?`)) return

    const removeQuery = new URLSearchParams()
    if (item.custom_entry_id) {
      removeQuery.set('custom_entry_id', item.custom_entry_id)
    } else if (item.recommendation_id) {
      removeQuery.set('rec_id', item.recommendation_id)
    } else {
      toast.error('Could not determine item id')
      return
    }

    setRemovingId(item.id)
    try {
      const res = await fetch(`/api/lists/${list.id}/items?${removeQuery.toString()}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setItems(prev => prev.filter(i => i.id !== item.id))
      toast.success('Removed from list')
    } catch {
      toast.error('Failed to remove')
    } finally {
      setRemovingId(null)
    }
  }

  const handleProgressUpdate = (itemId: string, chapter: number | null, status: string, subStatus?: string | null) => {
    setItems(prev => prev.map(i =>
      i.id === itemId ? { ...i, progress_chapter: chapter, status, sub_status: subStatus ?? i.sub_status } : i
    ))
  }

  const handleCustomEntryConverted = () => {
    // The converted item needs the full recommendation object, so reload for clean data.
    window.location.reload()
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
    const idField = item.custom_entry_id
      ? { custom_entry_id: item.custom_entry_id }
      : { recommendation_id: item.recommendation_id }

    setSavingNoteId(item.id)
    try {
      const res = await fetch(`/api/lists/${list.id}/items`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...idField,
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
  // NOTE: still only sets `status`, not `sub_status` — PATCHes
  // /api/lists/[id]/items, whose accepted fields haven't been reviewed yet.
  // Sub-status editing for recommendation-backed items already works via
  // ChapterUpdater below (goes through /api/reading-progress instead).
  const handleQuickStatusChange = async (e: React.MouseEvent, item: ListItem, newStatus: string) => {
    e.stopPropagation()
    if (newStatus === item.status) {
      setStatusPickerId(null)
      return
    }

    const idField = item.custom_entry_id
      ? { custom_entry_id: item.custom_entry_id }
      : { recommendation_id: item.recommendation_id }

    setSavingStatusId(item.id)
    try {
      const res = await fetch(`/api/lists/${list.id}/items`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...idField,
          status: newStatus,
          sub_status: null, // clear any stale sub-status from the previous status —
                             // the API only touches fields explicitly sent, so this
                             // has to be explicit here (matches ChapterUpdater's behavior)
        }),
      })
      if (!res.ok) throw new Error()
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: newStatus, sub_status: null } : i))
      setStatusPickerId(null)
      toast.success(TRACKING_STATUS_META[newStatus as keyof typeof TRACKING_STATUS_META].label)
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
      result = result.filter(i => {
        const title = i.recommendations?.title ?? i.custom_entries?.title ?? 'Untitled'
        return title.toLowerCase().includes(q)
      })
    }
    return result
  }, [items, filterStatus, searchQuery])

  const statusCounts = items.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Cover collage for the banner — up to 5 covers from the list's own comics
  const bannerCovers = useMemo(
    () => items
      .map(i => i.recommendations?.cover_url ?? i.custom_entries?.cover_url)
      .filter(Boolean)
      .slice(0, 5) as string[],
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
              You can view and update comics already here, but cannot add new ones until you resubscribe.
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

      {/* Manual custom-entry trigger — for anything not on ComPicfy at all */}
      {!isLocked && (
        <button
          type="button"
          onClick={() => setShowAddCustomModal(true)}
          className="text-xs text-muted-foreground/60 hover:text-foreground transition-colors -mt-4"
        >
          Can&apos;t find it? Track it anyway →
        </button>
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
          {TRACKING_STATUSES.filter(s => statusCounts[s.value]).map(s => (
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
              {TRACKING_STATUS_META[s.value].label} ({statusCounts[s.value]})
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
            const display     = getItemDisplay(item)
            const statusMeta = TRACKING_STATUS_META[item.status as keyof typeof TRACKING_STATUS_META] ?? TRACKING_STATUS_META.plan_to_read
            const subStatusLabel = resolveSubStatusLabel(item.status, item.sub_status)
            const progressPct = display.chapterCount && item.progress_chapter
              ? Math.min(100, Math.round((item.progress_chapter / display.chapterCount) * 100))
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
                  onClick={() => !blockClick && display.clickHref && router.push(display.clickHref)}
                  className={cn('flex gap-4', !blockClick && display.clickHref && 'cursor-pointer')}
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
                    {display.coverUrl ? (
                      <img
                        src={`/api/image-proxy?url=${encodeURIComponent(display.coverUrl)}`}
                        alt={display.title}
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
                          {display.title}
                        </p>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-[11px] italic text-muted-foreground/60 lowercase">
                            {display.type ?? 'custom'}
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
                            {subStatusLabel && (
                              <span className="text-muted-foreground/50 italic">· {subStatusLabel}</span>
                            )}
                            <ChevronDown size={10} className="opacity-40" />
                          </>
                        )}
                      </button>

                      {isPickingStatus && (
                        <div className="absolute top-full left-0 mt-1.5 z-50 bg-popover border border-border/60 rounded-lg shadow-lg overflow-hidden min-w-[150px] py-1">
                          {TRACKING_STATUSES.map(s => {
                            const meta = TRACKING_STATUS_META[s.value]
                            return (
                              <button
                                key={s.value}
                                type="button"
                                onClick={e => handleQuickStatusChange(e, item, s.value)}
                                className={cn(
                                  'w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-muted/60 transition-colors',
                                  s.value === item.status ? 'text-foreground font-medium' : 'text-muted-foreground'
                                )}
                              >
                                <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} />
                                {meta.label}
                                {s.value === item.status && <Check size={11} className="ml-auto" />}
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    {!display.isCustom && (
                      <ChapterUpdater
                        comicId={display.id}
                        listId={list.id}
                        currentChapter={item.progress_chapter}
                        totalChapters={display.chapterCount}
                        status={item.status}
                        subStatus={item.sub_status}
                        compact
                        onUpdate={(chapter, status, subStatus) => handleProgressUpdate(item.id, chapter, status, subStatus)}
                      />
                    )}

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

                {/* Custom entry: conversion check + submit nudge + edit */}
                {display.isCustom && (
                  <div className="pl-[80px] pt-1.5 flex items-center gap-3" onClick={e => e.stopPropagation()}>
                    <CustomEntryFooter
                      customEntryId={item.custom_entry_id!}
                      title={display.title}
                      coverUrl={display.coverUrl}
                      isPro={isPro}
                      onConverted={handleCustomEntryConverted}
                    />
                    <button
                      type="button"
                      onClick={() => setEditingCustomEntry({
                        id: item.custom_entry_id!,
                        title: display.title,
                        cover_url: display.coverUrl,
                        notes: item.notes,
                      })}
                      className="text-[11px] text-muted-foreground/50 hover:text-foreground transition-colors shrink-0"
                    >
                      Edit
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {editingCustomEntry && (
        <CustomEntryEditModal
          entry={editingCustomEntry}
          onClose={() => setEditingCustomEntry(null)}
          onSaved={(updated) => {
            setItems(prev => prev.map(i =>
              i.custom_entry_id === updated.id
                ? { ...i, custom_entries: { ...i.custom_entries, ...updated } }
                : i
            ))
            setEditingCustomEntry(null)
          }}
          onDeleted={() => {
            setItems(prev => prev.filter(i => i.custom_entry_id !== editingCustomEntry.id))
            setEditingCustomEntry(null)
          }}
        />
      )}

      {showAddCustomModal && (
        <AddCustomEntryModal
          listId={list.id}
          onClose={() => setShowAddCustomModal(false)}
          onCreated={(entry, item) => {
            setItems(prev => [
              ...prev,
              {
                id: item.id,
                status: item.status,
                progress_chapter: null,
                notes: item.notes,
                added_at: item.added_at,
                recommendation_id: null,
                custom_entry_id: entry.id,
                recommendations: null,
                custom_entries: entry,
              },
            ])
            setShowAddCustomModal(false)
            toast.success(`Added "${entry.title}" to your list`)
          }}
        />
      )}
    </div>
  )
}