'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  ArrowLeft, BookOpen, Trash2, Globe, Lock,
  Loader2, BookMarked
} from 'lucide-react'
import { formatDate } from '@/lib/utils/format'
import { cn } from '@/lib/utils'

interface ReadingList {
  id: string
  name: string
  description: string | null
  is_public: boolean
  created_at: string
}

interface ListItem {
  id: string
  status: string
  progress_chapter: number | null
  notes: string | null
  added_at: string
  recommendations: {
    id: string
    title: string
    cover_url: string | null
    type: string
    status: string
    genres: string[]
    upvotes: number
  }
}

const STATUS_META: Record<string, { label: string; emoji: string; className: string }> = {
  reading:      { label: 'Reading',      emoji: '📖', className: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  plan_to_read: { label: 'Plan to Read', emoji: '📌', className: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
  marinating:   { label: 'Marinating',   emoji: '🫙', className: 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400' },
  completed:    { label: 'Completed',    emoji: '✅', className: 'bg-green-500/10 text-green-600 border-green-500/20' },
  on_hold:      { label: 'On Hold',      emoji: '⏸️', className: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' },
  dropped:      { label: 'Dropped',      emoji: '🗑️', className: 'bg-red-500/10 text-red-600 border-red-500/20' },
}

const STATUSES = Object.entries(STATUS_META).map(([value, meta]) => ({ value, ...meta }))

export function ReadingListDetail({
  list,
  initialItems,
}: {
  list: ReadingList
  initialItems: ListItem[]
}) {
  const [items, setItems] = useState(initialItems)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string | null>(null)

  const handleRemove = async (item: ListItem) => {
    if (!confirm(`Remove "${item.recommendations.title}" from this list?`)) return
    setRemovingId(item.id)
    try {
      await fetch(`/api/lists/${list.id}/items?rec_id=${item.recommendations.id}`, {
        method: 'DELETE',
      })
      setItems((prev) => prev.filter((i) => i.id !== item.id))
      toast.success('Removed from list')
    } catch {
      toast.error('Failed to remove')
    } finally {
      setRemovingId(null)
    }
  }

  const handleStatusChange = async (item: ListItem, newStatus: string) => {
    setUpdatingId(item.id)
    try {
      await fetch(`/api/lists/${list.id}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recommendation_id: item.recommendations.id,
          status: newStatus,
        }),
      })
      setItems((prev) =>
        prev.map((i) => i.id === item.id ? { ...i, status: newStatus } : i)
      )
      const meta = STATUS_META[newStatus]
      toast.success(`Status updated to ${meta?.emoji} ${meta?.label}`)
    } catch {
      toast.error('Failed to update status')
    } finally {
      setUpdatingId(null)
    }
  }

  const filtered = filterStatus
    ? items.filter((i) => i.status === filterStatus)
    : items

  // Count by status for filter tabs
  const statusCounts = items.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/dashboard/lists"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft size={14} />
          Back to Lists
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BookMarked size={22} />
              {list.name}
            </h1>
            {list.description && (
              <p className="text-muted-foreground text-sm mt-1">{list.description}</p>
            )}
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              <span>{items.length} comic{items.length !== 1 ? 's' : ''}</span>
              <span className="flex items-center gap-1">
                {list.is_public ? <Globe size={11} /> : <Lock size={11} />}
                {list.is_public ? 'Public' : 'Private'}
              </span>
              <span>Created {formatDate(list.created_at)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Status filter tabs */}
      {items.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setFilterStatus(null)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
              !filterStatus
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border text-muted-foreground hover:border-primary'
            )}
          >
            All ({items.length})
          </button>
          {STATUSES.filter(s => statusCounts[s.value]).map((s) => (
            <button
              key={s.value}
              onClick={() => setFilterStatus(filterStatus === s.value ? null : s.value)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                filterStatus === s.value
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-muted-foreground hover:border-primary'
              )}
            >
              {s.emoji} {s.label} ({statusCounts[s.value]})
            </button>
          ))}
        </div>
      )}

      {/* Empty state */}
      {items.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-xl">
          <BookOpen size={40} className="mx-auto mb-3 text-muted-foreground opacity-40" />
          <h3 className="font-semibold mb-1">No comics yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Add comics to this list from any comic page
          </p>
          <Link href="/browse">
            <Button size="sm">Browse Comics</Button>
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          No comics with this status
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => {
            const rec = item.recommendations
            const statusMeta = STATUS_META[item.status] ?? STATUS_META.plan_to_read

            return (
              <div
                key={item.id}
                className="flex gap-4 p-4 rounded-xl border border-border bg-card hover:border-primary/30 transition-colors"
              >
                {/* Cover */}
                <Link href={`/comic/${rec.id}`} className="shrink-0">
                  <div className="w-14 h-20 rounded-lg overflow-hidden bg-muted border border-border">
                    {rec.cover_url ? (
                      <img
                        src={rec.cover_url}
                        alt={rec.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpen size={16} className="text-muted-foreground opacity-40" />
                      </div>
                    )}
                  </div>
                </Link>

                {/* Info */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link
                        href={`/comic/${rec.id}`}
                        className="font-semibold text-sm hover:text-primary transition-colors line-clamp-1"
                      >
                        {rec.title}
                      </Link>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        <Badge variant="secondary" className="text-xs capitalize">{rec.type}</Badge>
                        <Badge variant="outline" className="text-xs capitalize">{rec.status}</Badge>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemove(item)}
                      disabled={removingId === item.id}
                      className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                    >
                      {removingId === item.id
                        ? <Loader2 size={14} className="animate-spin" />
                        : <Trash2 size={14} />
                      }
                    </button>
                  </div>

                  {/* Status selector */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn(
                      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border font-medium',
                      statusMeta.className
                    )}>
                      {statusMeta.emoji} {statusMeta.label}
                    </span>
                    {updatingId === item.id ? (
                      <Loader2 size={12} className="animate-spin text-muted-foreground" />
                    ) : (
                      <select
                        value={item.status}
                        onChange={(e) => handleStatusChange(item, e.target.value)}
                        className="text-xs text-muted-foreground bg-transparent border-none outline-none cursor-pointer hover:text-foreground transition-colors"
                      >
                        {STATUSES.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.emoji} {s.label}
                          </option>
                        ))}
                      </select>
                    )}
                    <span className="text-xs text-muted-foreground ml-auto">
                      Added {formatDate(item.added_at)}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}