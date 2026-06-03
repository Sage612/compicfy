'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import {
  CheckCircle, XCircle, Star, StarOff, Loader2, BookOpen,
  ChevronDown, ChevronUp, Pencil, Eye, Trash2, Search,
  CheckSquare, Square, ListChecks, X, Crown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/utils/format'
import Link from 'next/link'
import { PlatformSelector } from '@/components/recommendations/PlatformSelector'
import { GenreSelector } from '@/components/recommendations/GenreSelector'

const FILTERS = [
  { value: 'all',      label: 'All',         color: 'text-foreground'  },
  { value: 'pending',  label: 'Pending',     color: 'text-amber-500'   },
  { value: 'approved', label: 'Approved',    color: 'text-emerald-500' },
  { value: 'rejected', label: 'Rejected',    color: 'text-red-500'     },
  { value: 'featured', label: 'Featured ⭐', color: 'text-primary'     },
  { value: 'appeals',  label: 'Appeals 🚩',  color: 'text-orange-500'  },
]

const TYPE_COLORS: Record<string, string> = {
  manga:   'bg-rose-500/10   text-rose-500   border-rose-500/20',
  manhwa:  'bg-violet-500/10 text-violet-500 border-violet-500/20',
  manhua:  'bg-amber-500/10  text-amber-500  border-amber-500/20',
  webtoon: 'bg-teal-500/10   text-teal-500   border-teal-500/20',
  comic:   'bg-blue-500/10   text-blue-500   border-blue-500/20',
}

const TYPES    = ['manga', 'manhwa', 'manhua', 'webtoon', 'comic', 'other']
const STATUSES = ['ongoing', 'completed', 'hiatus', 'cancelled']
const RATINGS  = ['all_ages', 'teen', 'mature', 'adult']

function sanitisePayload(data: Record<string, any>): Record<string, any> {
  const numericFields = ['chapter_count', 'year_released']
  const result: Record<string, any> = {}
  for (const [key, value] of Object.entries(data)) {
    if (numericFields.includes(key)) {
      result[key] = value === '' || value === null || value === undefined
        ? null
        : Number(value)
    } else if (typeof value === 'string') {
      result[key] = value
    } else {
      result[key] = value
    }
  }
  return result
}

// ── Sort recs so Pro submissions appear first in the pending queue ─
function sortRecs(recs: any[], currentFilter: string): any[] {
  if (currentFilter !== 'pending' && currentFilter !== 'all') return recs
  return [...recs].sort((a, b) => {
    // Pro submissions first
    if (a.is_pro_submission && !b.is_pro_submission) return -1
    if (!a.is_pro_submission && b.is_pro_submission) return 1
    // Then by date descending
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })
}

export function AdminRecommendations() {
  const [recs, setRecs]                     = useState<any[]>([])
  const [filter, setFilter]                 = useState('pending')
  const [search, setSearch]                 = useState('')
  const [searchInput, setSearchInput]       = useState('')
  const [loading, setLoading]               = useState(true)
  const [expandedId, setExpandedId]         = useState<string | null>(null)
  const [rejectReason, setRejectReason]     = useState('')
  const [actionLoading, setActionLoading]   = useState<string | null>(null)
  const [editingId, setEditingId]           = useState<string | null>(null)
  const [editData, setEditData]             = useState<Record<string, any>>({})
  const [total, setTotal]                   = useState<number>(0)

  const [bulkMode, setBulkMode]             = useState(false)
  const [selected, setSelected]             = useState<Set<string>>(new Set())
  const [bulkLoading, setBulkLoading]       = useState(false)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchRecs = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ filter })
      if (search) params.set('q', search)
      const res  = await fetch(`/api/admin/recommendations?${params}`)
      const data = await res.json()
      // Sort Pro submissions first on arrival
      setRecs(sortRecs(data.recommendations ?? [], filter))
      setTotal(data.total ?? 0)
    } catch {
      toast.error('Failed to fetch')
    } finally {
      setLoading(false)
    }
  }, [filter, search])

  useEffect(() => { fetchRecs() }, [fetchRecs])

  useEffect(() => {
    setSelected(new Set())
    setBulkMode(false)
  }, [filter, search])

  const handleSearchChange = (value: string) => {
    setSearchInput(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setSearch(value), 400)
  }

  const handleFilterChange = (value: string) => {
    setFilter(value)
    setExpandedId(null)
    setEditingId(null)
    setSelected(new Set())
    setBulkMode(false)
  }

  const handleAction = async (id: string, action: string, extra: Record<string, any> = {}) => {
    setActionLoading(`${id}-${action}`)
    try {
      const res = await fetch(`/api/admin/recommendations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? `Failed to ${action}`)
      }
      toast.success(`${action} successful`)
      setRecs(prev => prev.filter(r => r.id !== id))
      setExpandedId(null)
      setRejectReason('')
    } catch (err: any) {
      toast.error(err.message ?? `Failed to ${action}`)
    } finally {
      setActionLoading(null)
    }
  }

  const handleEdit = async (id: string) => {
    setActionLoading(`${id}-edit`)
    try {
      const payload = sanitisePayload(editData)
      const res = await fetch(`/api/admin/recommendations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to update')
      }
      toast.success('Recommendation updated!')
      setEditingId(null)
      fetchRecs()
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to update')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async (id: string) => {
    setActionLoading(`${id}-delete`)
    try {
      const res = await fetch(`/api/admin/recommendations/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to delete')
      }
      toast.success('Recommendation deleted')
      setRecs(prev => prev.filter(r => r.id !== id))
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to delete')
    } finally {
      setActionLoading(null)
    }
  }

  const startEdit = (rec: any) => {
    setEditingId(rec.id)
    setEditData({
      title:              rec.title              ?? '',
      description:        rec.description        ?? '',
      type:               rec.type               ?? 'manga',
      status:             rec.status             ?? 'ongoing',
      author:             rec.author             ?? '',
      artist:             rec.artist             ?? '',
      publisher:          rec.publisher          ?? '',
      cover_url:          rec.cover_url          ?? '',
      why_recommend:      rec.why_recommend      ?? '',
      content_rating:     rec.content_rating     ?? 'all_ages',
      chapter_count:      rec.chapter_count      ?? '',
      year_released:      rec.year_released      ?? '',
      genres:             rec.genres             ?? [],
      official_platforms: rec.official_platforms ?? [],
    })
  }

  const pendingRecs   = recs.filter(r => !r.is_approved && !r.rejection_reason)
  const allPendingIds = pendingRecs.map(r => r.id)

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selected.size === allPendingIds.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(allPendingIds))
    }
  }

  const handleBulkApprove = async () => {
    if (selected.size === 0) return
    const ids = Array.from(selected)
    setBulkLoading(true)
    let successCount = 0
    let failCount    = 0
    const BATCH = 5
    for (let i = 0; i < ids.length; i += BATCH) {
      const batch = ids.slice(i, i + BATCH)
      await Promise.all(
        batch.map(async (id) => {
          try {
            const res = await fetch(`/api/admin/recommendations/${id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'approve' }),
            })
            if (res.ok) successCount++
            else failCount++
          } catch {
            failCount++
          }
        })
      )
    }
    if (successCount > 0) {
      toast.success(` ${successCount} recommendation${successCount > 1 ? 's' : ''} approved`)
      setRecs(prev => prev.filter(r => !selected.has(r.id)))
      setSelected(new Set())
    }
    if (failCount > 0) toast.error(`${failCount} failed to approve`)
    setBulkLoading(false)
  }

  const handleBulkReject = async (reason: string) => {
    if (selected.size === 0 || !reason.trim()) return
    const ids = Array.from(selected)
    setBulkLoading(true)
    let successCount = 0
    let failCount    = 0
    const BATCH = 5
    for (let i = 0; i < ids.length; i += BATCH) {
      const batch = ids.slice(i, i + BATCH)
      await Promise.all(
        batch.map(async (id) => {
          try {
            const res = await fetch(`/api/admin/recommendations/${id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'reject', reason }),
            })
            if (res.ok) successCount++
            else failCount++
          } catch {
            failCount++
          }
        })
      )
    }
    if (successCount > 0) {
      toast.success(` ${successCount} recommendation${successCount > 1 ? 's' : ''} rejected`)
      setRecs(prev => prev.filter(r => !selected.has(r.id)))
      setSelected(new Set())
    }
    if (failCount > 0) toast.error(`${failCount} failed to reject`)
    setBulkLoading(false)
  }

  const BulkToolbar = () => {
    const [bulkRejectReason, setBulkRejectReason] = useState('')
    const [showRejectInput, setShowRejectInput]   = useState(false)

    if (!bulkMode) return null

    const hasPending   = allPendingIds.length > 0
    const allSelected  = selected.size === allPendingIds.length && allPendingIds.length > 0
    const someSelected = selected.size > 0

    return (
      <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSelectAll}
              disabled={!hasPending}
              className={cn(
                'flex items-center gap-2 text-sm font-bold transition-colors',
                hasPending ? 'hover:text-primary' : 'opacity-40 cursor-not-allowed'
              )}
            >
              {allSelected
                ? <CheckSquare size={16} className="text-primary" />
                : <Square size={16} className="text-muted-foreground" />
              }
              {allSelected ? 'Deselect all' : `Select all pending (${allPendingIds.length})`}
            </button>
            {someSelected && (
              <span className="text-xs font-black px-2.5 py-1 rounded-full bg-primary text-primary-foreground">
                {selected.size} selected
              </span>
            )}
          </div>
          <Button
            variant="ghost" size="sm"
            className="h-7 gap-1.5 text-xs text-muted-foreground"
            onClick={() => { setBulkMode(false); setSelected(new Set()) }}
          >
            <X size={12} />
            Exit bulk
          </Button>
        </div>

        {someSelected && (
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              size="sm"
              className="gap-2 bg-emerald-500 hover:bg-emerald-600 text-white border-0"
              onClick={handleBulkApprove}
              disabled={bulkLoading}
            >
              {bulkLoading ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={13} />}
              Approve {selected.size} selected
            </Button>
            <Button
              size="sm" variant="outline"
              className="gap-2 text-red-500 border-red-500/30 hover:bg-red-500/10"
              onClick={() => setShowRejectInput(v => !v)}
              disabled={bulkLoading}
            >
              <XCircle size={13} />
              Reject selected
            </Button>
          </div>
        )}

        {someSelected && showRejectInput && (
          <div className="space-y-2 pt-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Rejection reason (applies to all {selected.size} selected)
            </p>
            <Textarea
              value={bulkRejectReason}
              onChange={e => setBulkRejectReason(e.target.value)}
              placeholder="Explain why these are being rejected..."
              rows={2}
              className="resize-none text-sm"
            />
            <Button
              size="sm" variant="destructive" className="gap-2"
              onClick={() => handleBulkReject(bulkRejectReason)}
              disabled={!bulkRejectReason.trim() || bulkLoading}
            >
              {bulkLoading ? <Loader2 size={13} className="animate-spin" /> : <XCircle size={13} />}
              Confirm reject {selected.size}
            </Button>
          </div>
        )}

        {!hasPending && (
          <p className="text-xs text-muted-foreground">
            No pending recommendations to select. Switch to the <strong>Pending</strong> filter to use bulk actions.
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <Input
          value={searchInput}
          onChange={e => handleSearchChange(e.target.value)}
          placeholder="Search by title, author, or artist…"
          className="pl-9 h-10 bg-card"
        />
        {searchInput && (
          <button
            onClick={() => { setSearchInput(''); setSearch('') }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
          >
            ✕
          </button>
        )}
      </div>

      {/* Filter tabs + bulk toggle */}
      <div className="flex gap-1.5 flex-wrap items-center">
        {FILTERS.map(({ value, label, color }) => (
          <button
            key={value}
            onClick={() => handleFilterChange(value)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-semibold border transition-all',
              filter === value
                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                : `border-border ${color} hover:border-primary`
            )}
          >
            {label}
          </button>
        ))}
        <button
          onClick={() => { setBulkMode(v => !v); setSelected(new Set()) }}
          className={cn(
            'ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all',
            bulkMode
              ? 'bg-primary text-primary-foreground border-primary shadow-sm'
              : 'border-border text-muted-foreground hover:border-primary'
          )}
        >
          <ListChecks size={12} />
          Bulk
        </button>
        {!loading && (
          <span className="text-xs text-muted-foreground">
            {total} result{total !== 1 ? 's' : ''}
            {search && <span className="text-primary ml-1">for "{search}"</span>}
          </span>
        )}
      </div>

      {/* Pro submissions note — shown in pending/all when there are pro submissions */}
      {!loading && (filter === 'pending' || filter === 'all') && recs.some(r => r.is_pro_submission && !r.is_approved && !r.rejection_reason) && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs text-amber-600">
          <Crown size={12} className="fill-amber-500 shrink-0" />
          Pro submissions are shown first and marked with a crown badge.
        </div>
      )}

      <BulkToolbar />

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={24} className="animate-spin text-muted-foreground" />
        </div>
      ) : recs.length === 0 ? (
        <div className="relative flex flex-col items-center justify-center py-20 rounded-2xl border border-dashed border-border overflow-hidden">
          <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full bg-violet-500/5 blur-3xl pointer-events-none" />
          <div className="relative mb-6 w-32 h-32 mx-auto">
            <div className="absolute top-0 left-0 rounded-2xl border-2 border-border bg-card rotate-[-12deg] opacity-40" style={{ width: '4.5rem', height: '6rem' }} />
            <div className="absolute top-2 left-5 rounded-2xl border-2 border-border bg-card rotate-[-5deg] opacity-60" style={{ width: '4.5rem', height: '6rem' }} />
            <div className="absolute top-4 left-9 rounded-2xl border-2 border-primary/30 bg-card shadow-xl flex flex-col items-center justify-center gap-1" style={{ width: '4.5rem', height: '6rem' }}>
              {search ? <Search size={16} className="text-primary opacity-60" /> : <BookOpen size={16} className="text-primary opacity-60" />}
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest text-center px-1">
                {search ? 'No results' : 'All clear'}
              </span>
            </div>
          </div>
          <p className="text-sm font-black">
            {search ? `No results for "${search}"` : `No ${filter} recommendations`}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {search ? 'Try a different search term' : 'Nothing to review right now'}
          </p>
          {search && (
            <Button variant="ghost" size="sm" onClick={() => { setSearchInput(''); setSearch('') }} className="mt-3 text-xs">
              Clear search
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {recs.map((rec) => {
            const isExpanded  = expandedId === rec.id
            const isEditing   = editingId  === rec.id
            const profile     = rec.profiles
            const typeStyle   = TYPE_COLORS[rec.type] ?? 'bg-muted text-muted-foreground border-border'
            const isPending   = !rec.is_approved && !rec.rejection_reason
            const isSelected  = selected.has(rec.id)
            const isProSub    = !!rec.is_pro_submission

            return (
              <div
                key={rec.id}
                className={cn(
                  'rounded-2xl border bg-card overflow-hidden transition-colors',
                  isSelected
                    ? 'border-primary/50 bg-primary/5'
                    : isProSub && isPending
                    ? 'border-amber-500/30 hover:border-amber-500/50'
                    : 'border-border hover:border-primary/30'
                )}
              >
                {/* Pro priority stripe */}
                {isProSub && isPending && (
                  <div className="h-0.5 bg-gradient-to-r from-amber-400 via-orange-400 to-transparent" />
                )}

                <div className="flex gap-3 p-4">
                  {/* Bulk checkbox */}
                  {bulkMode && isPending && (
                    <button
                      onClick={() => toggleSelect(rec.id)}
                      className="shrink-0 self-start mt-1 text-muted-foreground hover:text-primary transition-colors"
                    >
                      {isSelected
                        ? <CheckSquare size={16} className="text-primary" />
                        : <Square size={16} />
                      }
                    </button>
                  )}

                  {/* Cover */}
                  <div className="w-12 h-16 rounded-xl overflow-hidden bg-muted shrink-0 shadow-sm">
                    {rec.cover_url
                      ? <img src={rec.cover_url} alt={rec.title} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center"><BookOpen size={14} className="text-muted-foreground opacity-40" /></div>
                    }
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <h3 className="font-black text-sm truncate pr-1">{rec.title}</h3>

                    <div className="flex flex-wrap gap-1">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize ${typeStyle}`}>
                        {rec.type}
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border border-border bg-muted text-muted-foreground capitalize">
                        {rec.status}
                      </span>
                      {rec.is_approved
                        ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border bg-emerald-500/10 text-emerald-600 border-emerald-500/20">✓ Approved</span>
                        : rec.rejection_reason
                        ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border bg-red-500/10 text-red-500 border-red-500/20">✕ Rejected</span>
                        : <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border bg-amber-500/10 text-amber-600 border-amber-500/20">⏳ Pending</span>
                      }
                      {rec.is_featured && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border bg-amber-500/10 text-amber-600 border-amber-500/20">⭐ Featured</span>
                      )}
                      {rec.appeal_status === 'pending' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border bg-orange-500/10 text-orange-600 border-orange-500/20">🚩 Appeal</span>
                      )}
                      {/* Pro submission badge */}
                      {isProSub && (
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold border bg-amber-500/10 text-amber-600 border-amber-500/20">
                          <Crown size={9} className="fill-amber-500" />
                          Pro
                        </span>
                      )}
                      {/* System/auto-submitter badge */}
                      {rec.is_ai_generated && rec.ai_model === 'auto-submitter' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border bg-primary/10 text-primary border-primary/20">
                          🤖 System
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground">
                      by @{profile?.display_name || profile?.username} · {formatDate(rec.created_at)}
                    </p>

                    {rec.rejection_reason && (
                      <p className="text-xs text-red-500 bg-red-500/5 border border-red-500/10 rounded-lg px-2.5 py-1">
                        Rejected: {rec.rejection_reason}
                      </p>
                    )}

                    {/* Action buttons */}
                    <div className="flex flex-wrap items-center gap-1 pt-1 sm:justify-end">
                      <Link href={`/comic/${rec.id}`} target="_blank">
                        <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs px-2.5 sm:h-8 sm:w-8 sm:p-0">
                          <Eye size={12} />
                          <span className="sm:hidden">View</span>
                        </Button>
                      </Link>
                      <Button
                        variant="outline" size="sm"
                        className="h-7 gap-1.5 text-xs px-2.5 sm:h-8 sm:w-8 sm:p-0"
                        onClick={() => isEditing ? setEditingId(null) : startEdit(rec)}
                      >
                        <Pencil size={12} />
                        <span className="sm:hidden">Edit</span>
                      </Button>
                      {!rec.is_approved && !rec.rejection_reason && (
                        <Button
                          variant="outline" size="sm"
                          className="h-7 gap-1.5 text-xs px-2.5 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10 sm:h-8 sm:w-8 sm:p-0"
                          onClick={() => handleAction(rec.id, 'approve')}
                          disabled={!!actionLoading}
                        >
                          {actionLoading === `${rec.id}-approve`
                            ? <Loader2 size={12} className="animate-spin" />
                            : <CheckCircle size={12} />
                          }
                          <span className="sm:hidden">Approve</span>
                        </Button>
                      )}
                      {rec.is_featured ? (
                        <Button
                          variant="outline" size="sm"
                          className="h-7 gap-1.5 text-xs px-2.5 text-amber-500 border-amber-500/30 hover:bg-amber-500/10 sm:h-8 sm:w-8 sm:p-0"
                          onClick={() => handleAction(rec.id, 'unfeature')}
                        >
                          <StarOff size={12} />
                          <span className="sm:hidden">Unfeature</span>
                        </Button>
                      ) : rec.is_approved && (
                        <Button
                          variant="outline" size="sm"
                          className="h-7 gap-1.5 text-xs px-2.5 text-amber-500 border-amber-500/30 hover:bg-amber-500/10 sm:h-8 sm:w-8 sm:p-0"
                          onClick={() => handleAction(rec.id, 'feature')}
                        >
                          <Star size={12} />
                          <span className="sm:hidden">Feature</span>
                        </Button>
                      )}
                      <Button
                        variant="outline" size="sm"
                        className="h-7 gap-1.5 text-xs px-2.5 text-red-500 border-red-500/30 hover:bg-red-500/10 sm:h-8 sm:w-8 sm:p-0"
                        disabled={!!actionLoading}
                        onClick={() => { if (window.confirm(`Permanently delete "${rec.title}"?`)) handleDelete(rec.id) }}
                      >
                        {actionLoading === `${rec.id}-delete`
                          ? <Loader2 size={12} className="animate-spin" />
                          : <Trash2 size={12} />
                        }
                        <span className="sm:hidden">Delete</span>
                      </Button>
                      <Button
                        variant="outline" size="sm"
                        className="h-7 gap-1.5 text-xs px-2.5 sm:h-8 sm:w-8 sm:p-0"
                        onClick={() => setExpandedId(isExpanded ? null : rec.id)}
                      >
                        {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        <span className="sm:hidden">{isExpanded ? 'Less' : 'More'}</span>
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Edit form */}
                {isEditing && (
                  <div className="px-4 pb-5 space-y-4 border-t border-border pt-4 bg-muted/20">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Edit Recommendation</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <Input value={editData.title ?? ''} onChange={e => setEditData(d => ({ ...d, title: e.target.value }))} placeholder="Title" className="text-sm h-9" />
                      <Input value={editData.cover_url ?? ''} onChange={e => setEditData(d => ({ ...d, cover_url: e.target.value }))} placeholder="Cover URL" className="text-sm h-9" />
                    </div>
                    <Textarea value={editData.description ?? ''} onChange={e => setEditData(d => ({ ...d, description: e.target.value }))} placeholder="Description" rows={3} className="resize-none text-sm" />
                    <Textarea value={editData.why_recommend ?? ''} onChange={e => setEditData(d => ({ ...d, why_recommend: e.target.value }))} placeholder="Why recommend..." rows={2} className="resize-none text-sm" />
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {['author', 'artist', 'publisher'].map(f => (
                        <Input key={f} value={editData[f] ?? ''} onChange={e => setEditData(d => ({ ...d, [f]: e.target.value }))} placeholder={f.charAt(0).toUpperCase() + f.slice(1)} className="text-sm h-9" />
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input type="number" value={editData.chapter_count ?? ''} onChange={e => setEditData(d => ({ ...d, chapter_count: e.target.value }))} placeholder="Chapters" className="text-sm h-9" />
                      <Input type="number" value={editData.year_released ?? ''} onChange={e => setEditData(d => ({ ...d, year_released: e.target.value }))} placeholder="Year" className="text-sm h-9" />
                    </div>
                    {[
                      { label: 'Type',   field: 'type',           items: TYPES    },
                      { label: 'Status', field: 'status',         items: STATUSES },
                      { label: 'Rating', field: 'content_rating', items: RATINGS  },
                    ].map(({ label, field, items }) => (
                      <div key={field} className="space-y-1.5">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">{label}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {items.map(v => (
                            <button key={v} onClick={() => setEditData(d => ({ ...d, [field]: v }))}
                              className={cn('px-2.5 py-1 rounded-full text-xs border capitalize transition-colors',
                                editData[field] === v ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary'
                              )}>
                              {v.replace('_', ' ')}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Genres</p>
                      <GenreSelector value={editData.genres ?? []} onChange={(genres) => setEditData(d => ({ ...d, genres }))} />
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Platforms</p>
                      <PlatformSelector value={editData.official_platforms ?? []} onChange={(platforms) => setEditData(d => ({ ...d, official_platforms: platforms }))} />
                    </div>
                    <div className="flex gap-2 justify-end pt-1">
                      <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>Cancel</Button>
                      <Button size="sm" onClick={() => handleEdit(rec.id)} disabled={!!actionLoading} className="gap-2">
                        {actionLoading === `${rec.id}-edit` && <Loader2 size={13} className="animate-spin" />}
                        Save Changes
                      </Button>
                    </div>
                  </div>
                )}

                {/* Expanded: reject / appeal */}
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-3 border-t border-border pt-4 bg-muted/10">
                    <p className="text-xs text-muted-foreground line-clamp-3">{rec.description}</p>
                    {!rec.rejection_reason && (
                      <div className="space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Reject with Reason</p>
                        <Textarea
                          value={rejectReason}
                          onChange={e => setRejectReason(e.target.value)}
                          placeholder="Explain why this is being rejected..."
                          rows={2}
                          className="resize-none text-sm"
                        />
                        <Button
                          size="sm" variant="destructive"
                          onClick={() => handleAction(rec.id, 'reject', { reason: rejectReason })}
                          disabled={!rejectReason.trim() || !!actionLoading}
                          className="gap-2"
                        >
                          {actionLoading === `${rec.id}-reject` ? <Loader2 size={13} className="animate-spin" /> : <XCircle size={13} />}
                          Reject
                        </Button>
                      </div>
                    )}
                    {rec.appeal_status === 'pending' && rec.appeal_text && (
                      <div className="space-y-2 p-3 rounded-xl bg-orange-500/5 border border-orange-500/20">
                        <p className="text-xs font-bold text-orange-600">Appeal Message</p>
                        <p className="text-sm">{rec.appeal_text}</p>
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" className="gap-1.5 bg-emerald-500 hover:bg-emerald-600" onClick={() => handleAction(rec.id, 'resolve_appeal', { appeal_status: 'approved' })} disabled={!!actionLoading}>
                            <CheckCircle size={13} /> Approve Appeal
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleAction(rec.id, 'resolve_appeal', { appeal_status: 'rejected' })} disabled={!!actionLoading}>
                            <XCircle size={13} /> Reject Appeal
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}