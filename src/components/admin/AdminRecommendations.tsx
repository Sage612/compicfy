'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import {
  CheckCircle, XCircle, Star, StarOff, Loader2, BookOpen,
  ChevronDown, ChevronUp, Pencil, Eye, Trash2, Search,
  CheckSquare, Square, ListChecks, X, Crown, Clock,
  Lock, Unlock, ExternalLink,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/utils/format'
import Link from 'next/link'
import { PlatformSelector } from '@/components/recommendations/PlatformSelector'
import { GenreSelector } from '@/components/recommendations/GenreSelector'

const FILTERS = [
  { value: 'all',        label: 'All',            color: 'text-foreground'  },
  { value: 'pending',    label: 'Pending',        color: 'text-amber-500'   },
  { value: 'approved',   label: 'Approved',       color: 'text-emerald-500' },
  { value: 'rejected',   label: 'Rejected',       color: 'text-red-500'     },
  { value: 'featured',   label: 'Featured ⭐',    color: 'text-primary'     },
  { value: 'appeals',    label: 'Appeals 🚩',     color: 'text-orange-500'  },
  { value: 'more_info',  label: 'More Info 🔗',   color: 'text-sky-500'     },
]

const TYPE_COLORS: Record<string, string> = {
  manga:   'bg-rose-500/10   text-rose-500   border-rose-500/20',
  manhwa:  'bg-teal-500/10 text-teal-500 border-teal-500/20',
  manhua:  'bg-amber-500/10  text-amber-500  border-amber-500/20',
  webtoon: 'bg-teal-500/10   text-teal-500   border-teal-500/20',
  comic:   'bg-blue-500/10   text-blue-500   border-blue-500/20',
}

const TYPES    = ['manga', 'manhwa', 'manhua', 'webtoon', 'comic', 'other']
const STATUSES = ['ongoing', 'completed', 'hiatus', 'cancelled']
const RATINGS  = ['all_ages', 'teen', 'mature', 'adult']

// ── External ID fields ──────────────────────────────────────────────────
// Locking a field here stops the automated id-checker cron from ever
// touching it (searching, overwriting, or nulling as an outlier). Use this
// when the cron matched the wrong series, or when a comic genuinely isn't
// listed on a given source (e.g. a Webtoon-only series absent from
// MangaUpdates) so it should stop retrying forever.
const EXTERNAL_ID_FIELDS = [
  { key: 'mangaupdates_id', label: 'MangaUpdates', urlBase: 'https://www.mangaupdates.com/series/' },
  { key: 'mangadex_id',     label: 'MangaDex',     urlBase: 'https://mangadex.org/title/' },
  { key: 'anilist_id',      label: 'AniList',      urlBase: 'https://anilist.co/manga/' },
  { key: 'mal_id',          label: 'MyAnimeList',  urlBase: 'https://myanimelist.net/manga/' },
] as const

// ── Carousel duration presets ─────────────────────────────────────────────
const CAROUSEL_DURATIONS = [
  { label: '6 hours',   hours: 6     },
  { label: '12 hours',  hours: 12    },
  { label: '1 day',     hours: 24    },
  { label: '3 days',    hours: 72    },
  { label: '1 week',    hours: 168   },
  { label: '2 weeks',   hours: 336   },
  { label: '1 month',   hours: 720   },
  { label: 'No expiry', hours: null  },
]

function proxyCover(url: string | null | undefined): string | null {
  if (!url) return null
  if (url.startsWith('data:')) return url
  if (url.startsWith('/')) return url
  if (url.includes('/api/image-proxy')) return url
  return `/api/image-proxy?url=${encodeURIComponent(url)}`
}

function sanitisePayload(data: Record<string, any>): Record<string, any> {
  const numericFields = ['chapter_count', 'year_released']
  const result: Record<string, any> = {}
  for (const [key, value] of Object.entries(data)) {
    if (numericFields.includes(key)) {
      result[key] = value === '' || value === null || value === undefined ? null : Number(value)
    } else if (EXTERNAL_ID_FIELDS.some(f => f.key === key)) {
      // External ID fields: empty string means "no id" → store as null
      result[key] = typeof value === 'string' && value.trim() === '' ? null : value
    } else if (typeof value === 'string') {
      result[key] = value
    } else {
      result[key] = value
    }
  }
  return result
}

function sortRecs(recs: any[], currentFilter: string): any[] {
  if (currentFilter !== 'pending' && currentFilter !== 'all') return recs
  return [...recs].sort((a, b) => {
    if (a.is_pro_submission && !b.is_pro_submission) return -1
    if (!a.is_pro_submission && b.is_pro_submission) return 1
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })
}

// Returns true if a rec has a More Info link that hasn't been
// admin-approved yet (i.e. it's user_submitted or auto_fetched).
function hasUnverifiedMoreInfoLink(rec: any): boolean {
  return !!rec.more_info_link && rec.more_info_link_source !== 'admin_approved'
}

// ── Carousel expiry display ───────────────────────────────────────────────
function CarouselExpiryBadge({ carouselUntil }: { carouselUntil: string | null }) {
  if (!carouselUntil) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border bg-primary/10 text-primary border-primary/20">
      <Clock size={9} /> Carousel: No expiry
    </span>
  )
  const until = new Date(carouselUntil)
  const now   = new Date()
  const expired = until < now
  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border',
      expired
        ? 'bg-muted text-muted-foreground border-border'
        : 'bg-sky-500/10 text-sky-600 border-sky-500/20'
    )}>
      <Clock size={9} />
      {expired ? `Carousel expired ${formatDate(carouselUntil)}` : `Carousel until ${formatDate(carouselUntil)}`}
    </span>
  )
}

// ── Feature duration picker ───────────────────────────────────────────────
function FeaturePicker({ onConfirm, onCancel, loading }: {
  onConfirm: (hours: number | null) => void
  onCancel:  () => void
  loading:   boolean
}) {
  const [selected, setSelected] = useState<number | null>(24)

  return (
    <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-2 mt-1">
      <p className="text-[10px] font-black uppercase tracking-widest text-amber-600">
        Carousel duration
      </p>
      <div className="flex flex-wrap gap-1.5">
        {CAROUSEL_DURATIONS.map(d => (
          <button
            key={d.label}
            onClick={() => setSelected(d.hours)}
            className={cn(
              'px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors',
              selected === d.hours
                ? 'bg-amber-500 text-white border-amber-500'
                : 'border-border text-muted-foreground hover:border-amber-500/50 hover:text-amber-600'
            )}
          >
            {d.label}
          </button>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground">
        Comic stays <strong>featured</strong> everywhere permanently. Carousel slot expires after selected duration.
      </p>
      <div className="flex gap-2">
        <Button
          size="sm"
          className="gap-1.5 h-7 text-xs bg-amber-500 hover:bg-amber-600 border-0 text-white"
          onClick={() => onConfirm(selected)}
          disabled={loading}
        >
          {loading ? <Loader2 size={11} className="animate-spin" /> : <Star size={11} />}
          Feature
        </Button>
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

export function AdminRecommendations({ role }: { role: 'admin' | 'moderator' }) {
  const [recs, setRecs]                   = useState<any[]>([])
  const [filter, setFilter]               = useState('pending')
  const [search, setSearch]               = useState('')
  const [searchInput, setSearchInput]     = useState('')
  const [loading, setLoading]             = useState(true)
  const [loadingMore, setLoadingMore]     = useState(false)
  const [expandedId, setExpandedId]       = useState<string | null>(null)
  const [rejectReason, setRejectReason]   = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [editingId, setEditingId]         = useState<string | null>(null)
  const [editData, setEditData]           = useState<Record<string, any>>({})
  const [total, setTotal]                 = useState<number>(0)
  const [page, setPage]                   = useState(1)
  const [hasMore, setHasMore]             = useState(false)
  const [featuringId, setFeaturingId]     = useState<string | null>(null) // shows picker

  const [bulkMode, setBulkMode]           = useState(false)
  const [selected, setSelected]           = useState<Set<string>>(new Set())
  const [bulkLoading, setBulkLoading]     = useState(false)
  const [idsOpenFor, setIdsOpenFor]       = useState<string | null>(null) // which rec's External IDs section is expanded

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchRecs = useCallback(async (pageNum = 1, append = false) => {
    if (append) setLoadingMore(true)
    else        setLoading(true)
    try {
      const params = new URLSearchParams({ filter, page: String(pageNum) })
      if (search) params.set('q', search)
      const res  = await fetch(`/api/admin/recommendations?${params}`)
      const data = await res.json()
      const sorted = sortRecs(data.recommendations ?? [], filter)
      setRecs(prev => append ? [...prev, ...sorted] : sorted)
      setTotal(data.total ?? 0)
      setHasMore(data.hasMore ?? false)
      setPage(pageNum)
    } catch {
      toast.error('Failed to fetch')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [filter, search])

  useEffect(() => { fetchRecs(1) }, [fetchRecs])

  useEffect(() => {
    setSelected(new Set())
    setBulkMode(false)
    setIdsOpenFor(null)
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
    setFeaturingId(null)
  }

  const handleAction = async (id: string, action: string, extra: Record<string, any> = {}) => {
    setActionLoading(`${id}-${action}`)
    try {
      const res = await fetch(`/api/admin/recommendations/${id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action, ...extra }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? `Failed to ${action}`)
      }
      toast.success(`${action} successful`)
      if (action === 'feature') {
        const data = await res.clone().json().catch(() => ({}))
        setRecs(prev => prev.map(r => r.id === id ? { ...r, is_featured: true, carousel_until: data.carousel_until ?? extra.carousel_until ?? null } : r))
        setFeaturingId(null)
      } else if (action === 'unfeature') {
        setRecs(prev => prev.map(r => r.id === id ? { ...r, is_featured: false, carousel_until: null } : r))
      } else if (action === 'verify_more_info') {
        setRecs(prev => prev.map(r => r.id === id
          ? { ...r, more_info_link_source: 'admin_approved', more_info_link_verified_at: new Date().toISOString() }
          : r
        ))
        if (filter === 'more_info') {
          setRecs(prev => prev.filter(r => r.id !== id))
        }
      } else if (action === 'reject_more_info') {
        setRecs(prev => prev.map(r => r.id === id
          ? { ...r, more_info_link: null, more_info_link_source: null, more_info_link_verified_at: null }
          : r
        ))
        if (filter === 'more_info') {
          setRecs(prev => prev.filter(r => r.id !== id))
        }
      } else {
        setRecs(prev => prev.filter(r => r.id !== id))
        setExpandedId(null)
        setRejectReason('')
      }
    } catch (err: any) {
      toast.error(err.message ?? `Failed to ${action}`)
    } finally {
      setActionLoading(null)
    }
  }

  const handleFeatureConfirm = async (id: string, hours: number | null) => {
    const carousel_until = hours
      ? new Date(Date.now() + hours * 60 * 60 * 1000).toISOString()
      : null
    await handleAction(id, 'feature', { carousel_until })
  }

  const handleEdit = async (id: string) => {
    setActionLoading(`${id}-edit`)
    try {
      const payload = sanitisePayload(editData)
      const res = await fetch(`/api/admin/recommendations/${id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to update')
      }
      toast.success('Recommendation updated!')
      setEditingId(null)
      fetchRecs(1)
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
      more_info_link:     rec.more_info_link     ?? '',
      // External IDs — used by the automated id-checker cron. Empty string
      // means "no id set". id_locked_fields holds which of the four field
      // keys below are protected from being touched by that cron.
      mangaupdates_id:    rec.mangaupdates_id    ?? '',
      mangadex_id:        rec.mangadex_id        ?? '',
      anilist_id:         rec.anilist_id         ?? '',
      mal_id:             rec.mal_id             ?? '',
      id_locked_fields:   rec.id_locked_fields   ?? [],
    })
  }

  const toggleIdLock = (field: string) => {
    setEditData(d => {
      const current: string[] = d.id_locked_fields ?? []
      const next = current.includes(field)
        ? current.filter((f: string) => f !== field)
        : [...current, field]
      return { ...d, id_locked_fields: next }
    })
  }

  const pendingRecs   = recs.filter(r => !r.is_approved && !r.rejection_reason)
  const allPendingIds = pendingRecs.map(r => r.id)

  const toggleSelect    = (id: string) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleSelectAll = () => selected.size === allPendingIds.length ? setSelected(new Set()) : setSelected(new Set(allPendingIds))

  const handleBulkApprove = async () => {
    if (selected.size === 0) return
    const ids = Array.from(selected)
    setBulkLoading(true)
    let ok = 0, fail = 0
    for (let i = 0; i < ids.length; i += 5) {
      await Promise.all(ids.slice(i, i + 5).map(async id => {
        try {
          const res = await fetch(`/api/admin/recommendations/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'approve' }) })
          res.ok ? ok++ : fail++
        } catch { fail++ }
      }))
    }
    if (ok > 0) { toast.success(`${ok} approved`); setRecs(prev => prev.filter(r => !selected.has(r.id))); setSelected(new Set()) }
    if (fail > 0) toast.error(`${fail} failed`)
    setBulkLoading(false)
  }

  const handleBulkReject = async (reason: string) => {
    if (selected.size === 0 || !reason.trim()) return
    const ids = Array.from(selected)
    setBulkLoading(true)
    let ok = 0, fail = 0
    for (let i = 0; i < ids.length; i += 5) {
      await Promise.all(ids.slice(i, i + 5).map(async id => {
        try {
          const res = await fetch(`/api/admin/recommendations/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'reject', reason }) })
          res.ok ? ok++ : fail++
        } catch { fail++ }
      }))
    }
    if (ok > 0) { toast.success(`${ok} rejected`); setRecs(prev => prev.filter(r => !selected.has(r.id))); setSelected(new Set()) }
    if (fail > 0) toast.error(`${fail} failed`)
    setBulkLoading(false)
  }

  const handleBulkDelete = async () => {
    if (selected.size === 0) return
    if (!window.confirm(`Permanently delete ${selected.size} recommendation${selected.size !== 1 ? 's' : ''}? This cannot be undone.`)) return
    const ids = Array.from(selected)
    setBulkLoading(true)
    let ok = 0, fail = 0
    for (let i = 0; i < ids.length; i += 5) {
      await Promise.all(ids.slice(i, i + 5).map(async id => {
        try {
          const res = await fetch(`/api/admin/recommendations/${id}`, { method: 'DELETE' })
          res.ok ? ok++ : fail++
        } catch { fail++ }
      }))
    }
    if (ok > 0) {
      toast.success(`${ok} deleted`)
      setRecs(prev => prev.filter(r => !selected.has(r.id)))
      setSelected(new Set())
    }
    if (fail > 0) toast.error(`${fail} failed to delete`)
    setBulkLoading(false)
  }

  const BulkToolbar = ({ role }: { role: 'admin' | 'moderator' }) => {
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
            <button onClick={toggleSelectAll} disabled={!hasPending} className={cn('flex items-center gap-2 text-sm font-bold transition-colors', hasPending ? 'hover:text-primary' : 'opacity-40 cursor-not-allowed')}>
              {allSelected ? <CheckSquare size={16} className="text-primary" /> : <Square size={16} className="text-muted-foreground" />}
              {allSelected ? 'Deselect all' : `Select all pending (${allPendingIds.length})`}
            </button>
            {someSelected && <span className="text-xs font-black px-2.5 py-1 rounded-full bg-primary text-primary-foreground">{selected.size} selected</span>}
          </div>
          <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs text-muted-foreground" onClick={() => { setBulkMode(false); setSelected(new Set()) }}>
            <X size={12} /> Exit bulk
          </Button>
        </div>
        {someSelected && (
          <div className="flex flex-col sm:flex-row gap-2">
            <Button size="sm" className="gap-2 bg-emerald-500 hover:bg-emerald-600 text-white border-0" onClick={handleBulkApprove} disabled={bulkLoading}>
              {bulkLoading ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={13} />}
              Approve {selected.size} selected
            </Button>
            <Button size="sm" variant="outline" className="gap-2 text-red-500 border-red-500/30 hover:bg-red-500/10" onClick={() => setShowRejectInput(v => !v)} disabled={bulkLoading}>
              <XCircle size={13} /> Reject selected
            </Button>
            {role === 'admin' && (
              <Button size="sm" variant="outline" className="gap-2 text-red-600 border-red-600/30 hover:bg-red-600/10" onClick={handleBulkDelete} disabled={bulkLoading}>
                {bulkLoading ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                Delete selected
              </Button>
            )}
          </div>
        )}
        {someSelected && showRejectInput && (
          <div className="space-y-2 pt-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Rejection reason (applies to all {selected.size} selected)</p>
            <Textarea value={bulkRejectReason} onChange={e => setBulkRejectReason(e.target.value)} placeholder="Explain why these are being rejected..." rows={2} className="resize-none text-sm" />
            <Button size="sm" variant="destructive" className="gap-2" onClick={() => handleBulkReject(bulkRejectReason)} disabled={!bulkRejectReason.trim() || bulkLoading}>
              {bulkLoading ? <Loader2 size={13} className="animate-spin" /> : <XCircle size={13} />}
              Confirm reject {selected.size}
            </Button>
          </div>
        )}
        {!hasPending && <p className="text-xs text-muted-foreground">No pending recommendations to select. Switch to the <strong>Pending</strong> filter to use bulk actions.</p>}
      </div>
    )
  }

  return (
    <div className="space-y-4">

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <Input value={searchInput} onChange={e => handleSearchChange(e.target.value)} placeholder="Search by title, author, or artist…" className="pl-9 h-10 bg-card" />
        {searchInput && (
          <button onClick={() => { setSearchInput(''); setSearch('') }} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs">✕</button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 min-w-0 overflow-hidden">
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-4 z-10 bg-gradient-to-r from-background to-transparent" />
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-4 z-10 bg-gradient-to-l from-background to-transparent" />
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar px-1 -mx-1">
            {FILTERS.map(({ value, label, color }) => (
              <button key={value} onClick={() => handleFilterChange(value)}
                className={cn('px-3 py-1.5 rounded-full text-xs font-semibold border transition-all whitespace-nowrap shrink-0',
                  filter === value ? 'bg-primary text-primary-foreground border-primary shadow-sm' : `border-border ${color} hover:border-primary`)}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <button onClick={() => { setBulkMode(v => !v); setSelected(new Set()) }}
          className={cn('shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all',
            bulkMode ? 'bg-primary text-primary-foreground border-primary shadow-sm' : 'border-border text-muted-foreground hover:border-primary')}>
          <ListChecks size={12} /> Bulk
        </button>
      </div>

      {!loading && (
        <p className="text-xs text-muted-foreground px-1">
          {recs.length} / {total} result{total !== 1 ? 's' : ''}
          {search && <span className="text-primary ml-1">for "{search}"</span>}
        </p>
      )}

      {!loading && (filter === 'pending' || filter === 'all') && recs.some(r => r.is_pro_submission && !r.is_approved && !r.rejection_reason) && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs text-amber-600">
          <Crown size={12} className="fill-amber-500 shrink-0" />
          Pro submissions are shown first and marked with a crown badge.
        </div>
      )}

      <BulkToolbar role={role} />

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
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest text-center px-1">{search ? 'No results' : 'All clear'}</span>
            </div>
          </div>
          <p className="text-sm font-black">{search ? `No results for "${search}"` : `No ${filter} recommendations`}</p>
          <p className="text-xs text-muted-foreground mt-1">{search ? 'Try a different search term' : 'Nothing to review right now'}</p>
          {search && <Button variant="ghost" size="sm" onClick={() => { setSearchInput(''); setSearch('') }} className="mt-3 text-xs">Clear search</Button>}
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {recs.map((rec) => {
              const isExpanded  = expandedId === rec.id
              const isEditing   = editingId  === rec.id
              const isFeaturing = featuringId === rec.id
              const profile     = rec.profiles
              const typeStyle   = TYPE_COLORS[rec.type] ?? 'bg-muted text-muted-foreground border-border'
              const isPending   = !rec.is_approved && !rec.rejection_reason
              const isSelected  = selected.has(rec.id)
              const isProSub    = !!rec.is_pro_submission
              const coverSrc    = proxyCover(rec.cover_url)

              return (
                <div key={rec.id} className={cn(
                  'rounded-2xl border bg-card overflow-hidden transition-colors',
                  isSelected ? 'border-primary/50 bg-primary/5' :
                  isProSub && isPending ? 'border-amber-500/30 hover:border-amber-500/50' :
                  'border-border hover:border-primary/30'
                )}>
                  {isProSub && isPending && <div className="h-0.5 bg-gradient-to-r from-amber-400 via-orange-400 to-transparent" />}

                  <div className="flex gap-3 p-4">
                    {bulkMode && isPending && (
                      <button onClick={() => toggleSelect(rec.id)} className="shrink-0 self-start mt-1 text-muted-foreground hover:text-primary transition-colors">
                        {isSelected ? <CheckSquare size={16} className="text-primary" /> : <Square size={16} />}
                      </button>
                    )}

                    <div className="w-12 h-16 rounded-xl overflow-hidden bg-muted shrink-0 shadow-sm">
                      {coverSrc ? <img src={coverSrc} alt={rec.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><BookOpen size={16} className="text-muted-foreground opacity-40" /></div>}
                    </div>

                    <div className="flex-1 min-w-0 space-y-1.5">
                      <h3 className="font-black text-sm truncate pr-1">{rec.title}</h3>

                      <div className="flex flex-wrap gap-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize ${typeStyle}`}>{rec.type}</span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border border-border bg-muted text-muted-foreground capitalize">{rec.status}</span>
                        {rec.is_approved
                          ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border bg-emerald-500/10 text-emerald-600 border-emerald-500/20">✓ Approved</span>
                          : rec.rejection_reason
                          ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border bg-red-500/10 text-red-500 border-red-500/20">✕ Rejected</span>
                          : <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border bg-amber-500/10 text-amber-600 border-amber-500/20">⏳ Pending</span>
                        }
                        {rec.is_featured && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border bg-amber-500/10 text-amber-600 border-amber-500/20">⭐ Featured</span>}
                        {rec.is_featured && <CarouselExpiryBadge carouselUntil={rec.carousel_until} />}
                        {rec.appeal_status === 'pending' && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border bg-orange-500/10 text-orange-600 border-orange-500/20">🚩 Appeal</span>}
                        {isProSub && <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold border bg-amber-500/10 text-amber-600 border-amber-500/20"><Crown size={9} className="fill-amber-500" />Pro</span>}
                        {rec.is_ai_generated && rec.ai_model === 'auto-submitter' && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border bg-primary/10 text-primary border-primary/20">🤖 System</span>}
                        {hasUnverifiedMoreInfoLink(rec) && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border bg-sky-500/10 text-sky-600 border-sky-500/20">🔗 Link unverified</span>}
                      </div>

                      <p className="text-xs text-muted-foreground">by @{profile?.display_name || profile?.username} · {formatDate(rec.created_at)}</p>

                      {rec.rejection_reason && <p className="text-xs text-red-500 bg-red-500/5 border border-red-500/10 rounded-lg px-2.5 py-1">Rejected: {rec.rejection_reason}</p>}

                      <div className="flex flex-wrap items-center gap-1 pt-1 sm:justify-end">
                        <Link href={`/comic/${rec.id}`} target="_blank">
                          <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs px-2.5 sm:h-8 sm:w-8 sm:p-0">
                            <Eye size={12} /><span className="sm:hidden">View</span>
                          </Button>
                        </Link>
                        <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs px-2.5 sm:h-8 sm:w-8 sm:p-0" onClick={() => isEditing ? setEditingId(null) : startEdit(rec)}>
                          <Pencil size={12} /><span className="sm:hidden">Edit</span>
                        </Button>
                        {!rec.is_approved && !rec.rejection_reason && (
                          <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs px-2.5 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10 sm:h-8 sm:w-8 sm:p-0"
                            onClick={() => handleAction(rec.id, 'approve')} disabled={!!actionLoading}>
                            {actionLoading === `${rec.id}-approve` ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                            <span className="sm:hidden">Approve</span>
                          </Button>
                        )}
                        {rec.is_featured && role === 'admin' ? (
                          <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs px-2.5 text-amber-500 border-amber-500/30 hover:bg-amber-500/10 sm:h-8 sm:w-8 sm:p-0"
                            onClick={() => handleAction(rec.id, 'unfeature')}>
                            <StarOff size={12} /><span className="sm:hidden">Unfeature</span>
                          </Button>
                        ) : rec.is_approved && role === 'admin' && (
                          <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs px-2.5 text-amber-500 border-amber-500/30 hover:bg-amber-500/10 sm:h-8 sm:w-8 sm:p-0"
                            onClick={() => setFeaturingId(isFeaturing ? null : rec.id)}>
                            <Star size={12} /><span className="sm:hidden">Feature</span>
                          </Button>
                        )}
                        {role === 'admin' && (
                          <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs px-2.5 text-red-500 border-red-500/30 hover:bg-red-500/10 sm:h-8 sm:w-8 sm:p-0"
                            disabled={!!actionLoading} onClick={() => { if (window.confirm(`Permanently delete "${rec.title}"?`)) handleDelete(rec.id) }}>
                            {actionLoading === `${rec.id}-delete` ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                            <span className="sm:hidden">Delete</span>
                          </Button>
                        )}
                        <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs px-2.5 sm:h-8 sm:w-8 sm:p-0" onClick={() => setExpandedId(isExpanded ? null : rec.id)}>
                          {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                          <span className="sm:hidden">{isExpanded ? 'Less' : 'More'}</span>
                        </Button>
                      </div>

                      {isFeaturing && (
                        <FeaturePicker
                          onConfirm={(hours) => handleFeatureConfirm(rec.id, hours)}
                          onCancel={() => setFeaturingId(null)}
                          loading={actionLoading === `${rec.id}-feature`}
                        />
                      )}
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
                                  editData[field] === v ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary')}>
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
                        <PlatformSelector
                          value={editData.official_platforms ?? []}
                          onChange={(platforms) => setEditData(d => ({ ...d, official_platforms: platforms }))}
                          links={editData.official_links ?? []}
                          onLinksChange={(links) => setEditData(d => ({ ...d, official_links: links }))}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">More Info Link</p>
                        <Input
                          value={editData.more_info_link ?? ''}
                          onChange={e => setEditData(d => ({ ...d, more_info_link: e.target.value }))}
                          placeholder="https://www.mangaupdates.com/series/..."
                          className="text-sm h-9"
                        />
                        <p className="text-[10px] text-muted-foreground">
                          Editing this directly does not change its verification status use Verify/Reject Link below if this comic has an unverified link pending review.
                        </p>
                      </div>

                      {/* External IDs — used by the id-checker cron. Collapsed by
                          default since mods rarely need to touch these. */}
                      <div className="space-y-1.5 border-t border-border pt-3">
                        <button
                          type="button"
                          onClick={() => setIdsOpenFor(idsOpenFor === rec.id ? null : rec.id)}
                          className="w-full flex items-center justify-between text-left"
                        >
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                            External IDs
                            {(() => {
                              const setCount = EXTERNAL_ID_FIELDS.filter(f => (editData[f.key] ?? '').trim()).length
                              const lockCount = (editData.id_locked_fields ?? []).length
                              return (
                                <span className="ml-2 normal-case font-normal text-muted-foreground/70">
                                  {setCount}/4 set{lockCount > 0 ? ` · ${lockCount} locked` : ''}
                                </span>
                              )
                            })()}
                          </span>
                          {idsOpenFor === rec.id ? <ChevronUp size={13} className="text-muted-foreground" /> : <ChevronDown size={13} className="text-muted-foreground" />}
                        </button>

                        {idsOpenFor === rec.id && (
                          <div className="space-y-1.5 pt-1">
                            <p className="text-[10px] text-muted-foreground">
                              Lock a field to stop the automated ID checker from ever touching it — use this if it matched the wrong series, or if this comic genuinely isn't listed on that source.
                            </p>
                            <div className="space-y-1.5">
                              {EXTERNAL_ID_FIELDS.map(({ key, label, urlBase }) => {
                                const locked = (editData.id_locked_fields ?? []).includes(key)
                                const val    = editData[key] ?? ''
                                return (
                                  <div key={key} className="flex items-center gap-1.5">
                                    <span className="w-24 shrink-0 text-[10px] text-muted-foreground">{label}</span>
                                    <Input
                                      value={val}
                                      onChange={e => setEditData(d => ({ ...d, [key]: e.target.value }))}
                                      placeholder="Not set"
                                      className="text-sm h-8 flex-1 min-w-0"
                                    />
                                    {val && (
                                      <a
                                        href={`${urlBase}${val}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="shrink-0 text-muted-foreground hover:text-primary"
                                        title="Open on source"
                                      >
                                        <ExternalLink size={13} />
                                      </a>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => toggleIdLock(key)}
                                      title={locked ? 'Locked — the automated checker will not touch this field' : 'Unlocked — the automated checker may update this field'}
                                      className={cn(
                                        'shrink-0 flex items-center gap-1 h-8 px-2 rounded-md text-[10px] font-semibold border transition-colors',
                                        locked
                                          ? 'bg-primary text-primary-foreground border-primary'
                                          : 'border-border text-muted-foreground hover:border-primary'
                                      )}
                                    >
                                      {locked ? <Lock size={11} /> : <Unlock size={11} />}
                                      {locked ? 'Locked' : 'Lock'}
                                    </button>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}
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

                  {/* Expanded: reject / appeal / more info */}
                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-3 border-t border-border pt-4 bg-muted/10">
                      <p className="text-xs text-muted-foreground line-clamp-3">{rec.description}</p>
                      {!rec.rejection_reason && (
                        <div className="space-y-2">
                          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Reject with Reason</p>
                          <Textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Explain why this is being rejected..." rows={2} className="resize-none text-sm" />
                          <Button size="sm" variant="destructive" onClick={() => handleAction(rec.id, 'reject', { reason: rejectReason })} disabled={!rejectReason.trim() || !!actionLoading} className="gap-2">
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

                      {hasUnverifiedMoreInfoLink(rec) && (
                        <div className="space-y-2 p-3 rounded-xl bg-sky-500/5 border border-sky-500/20">
                          <p className="text-xs font-bold text-sky-600 flex items-center gap-1.5">
                            More Info Link — {rec.more_info_link_source === 'auto_fetched' ? 'Auto-matched' : 'Community submitted'}
                          </p>
                          <a
                            href={rec.more_info_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline break-all"
                          >
                            {rec.more_info_link}
                          </a>
                          <div className="flex flex-wrap gap-2 pt-1">
                            <Button
                              size="sm"
                              className="gap-1.5 bg-emerald-500 hover:bg-emerald-600"
                              onClick={() => handleAction(rec.id, 'verify_more_info')}
                              disabled={!!actionLoading}
                            >
                              {actionLoading === `${rec.id}-verify_more_info`
                                ? <Loader2 size={13} className="animate-spin" />
                                : <CheckCircle size={13} />}
                              Verify Link
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleAction(rec.id, 'reject_more_info')}
                              disabled={!!actionLoading}
                            >
                              {actionLoading === `${rec.id}-reject_more_info`
                                ? <Loader2 size={13} className="animate-spin" />
                                : <XCircle size={13} />}
                              Reject Link
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

          {hasMore && (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchRecs(page + 1, true)}
                disabled={loadingMore}
                className="gap-2 min-w-[140px]"
              >
                {loadingMore
                  ? <><Loader2 size={13} className="animate-spin" /> Loading…</>
                  : `Load more (${total - recs.length} remaining)`
                }
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}