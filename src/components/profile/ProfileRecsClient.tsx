'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { ComicCard } from '@/components/recommendations/ComicCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from '@/components/ui/sheet'
import { Search, X, SlidersHorizontal, BookOpen, Loader2, Filter } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Recommendation } from '@/types/database.types'
import { toast } from 'sonner'

const TYPES = [
  { value: '',        label: 'All'     },
  { value: 'manga',   label: 'Manga'   },
  { value: 'manhwa',  label: 'Manhwa'  },
  { value: 'manhua',  label: 'Manhua'  },
  { value: 'webtoon', label: 'Webtoon' },
  { value: 'comic',   label: 'Comic'   },
  { value: 'other',   label: 'Other'   },
]

const SORTS = [
  { value: 'recent', label: '✨', full: 'Newest'     },
  { value: 'top',    label: '🏆', full: 'Top Rated'  },
  { value: 'votes',  label: '🔥', full: 'Most Voted' },
]

const STATUSES = [
  { value: '',          label: 'Any'       },
  { value: 'ongoing',   label: 'Ongoing'   },
  { value: 'completed', label: 'Completed' },
  { value: 'hiatus',    label: 'Hiatus'    },
  { value: 'cancelled', label: 'Cancelled' },
]

const TYPE_COLORS: Record<string, string> = {
  manga:   'data-[active=true]:bg-rose-500   data-[active=true]:border-rose-500   data-[active=true]:text-white',
  manhwa:  'data-[active=true]:bg-teal-500   data-[active=true]:border-teal-500   data-[active=true]:text-white',
  manhua:  'data-[active=true]:bg-amber-500  data-[active=true]:border-amber-500  data-[active=true]:text-white',
  webtoon: 'data-[active=true]:bg-teal-500   data-[active=true]:border-teal-500   data-[active=true]:text-white',
  comic:   'data-[active=true]:bg-blue-500   data-[active=true]:border-blue-500   data-[active=true]:text-white',
  other:   'data-[active=true]:bg-zinc-500   data-[active=true]:border-zinc-500   data-[active=true]:text-white',
  '':      'data-[active=true]:bg-primary    data-[active=true]:border-primary    data-[active=true]:text-primary-foreground',
}

const PAGE_SIZE = 24

interface Props {
  username:     string
  userId:       string
  initialItems: Recommendation[]
  initialTotal: number
}

export function ProfileRecsClient({
  username,
  userId,
  initialItems,
  initialTotal,
}: Props) {
  const [q,      setQ]      = useState('')
  const [type,   setType]   = useState('')
  const [status, setStatus] = useState('')
  const [sort,   setSort]   = useState('recent')

  const [items,       setItems]       = useState<Recommendation[]>(initialItems)
  const [total,       setTotal]       = useState(initialTotal)
  // ── offset tracks how many items we've actually loaded ──
  const [offset,      setOffset]      = useState(initialItems.length)
  const [fetching,    setFetching]    = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  const debounceRef   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isFirstRender = useRef(true)

  const hasFilters   = !!(q || type || status)
  const activeFilters = [type, status].filter(Boolean).length

  // ── Core fetch — append=true means load more, false means fresh filter ──
  const fetchRecs = useCallback(async (
    filters: { q: string; type: string; status: string; sort: string },
    fetchOffset: number,
    append: boolean,
  ) => {
    if (append) setLoadingMore(true)
    else        setFetching(true)

    try {
      const params = new URLSearchParams()
      params.set('user_id',       userId)
      params.set('offset',        String(fetchOffset))
      params.set('limit',         String(PAGE_SIZE))
      params.set('exclude_adult', 'true')
      params.set('sort',          filters.sort)
      if (filters.q)      params.set('q',      filters.q)
      if (filters.type)   params.set('type',   filters.type)
      if (filters.status) params.set('status', filters.status)

      const res  = await fetch(`/api/profile/${username}/recommendations?${params}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to load')

      const incoming = (data.recommendations ?? []) as Recommendation[]

      if (append) {
        setItems(prev => [...prev, ...incoming])
        // advance offset by however many actually came back
        setOffset(prev => prev + incoming.length)
      } else {
        setItems(incoming)
        setTotal(data.total ?? incoming.length)
        // after a fresh filter fetch, offset = number of items returned
        setOffset(incoming.length)
      }
    } catch {
      toast.error('Failed to load recommendations')
    } finally {
      setFetching(false)
      setLoadingMore(false)
    }
  }, [username, userId])

  // ── Re-fetch fresh when filters/sort change (skip SSR mount) ──
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    fetchRecs({ q, type, status, sort }, 0, false)
  }, [type, status, sort]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearchChange = (value: string) => {
    setQ(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetchRecs({ q: value, type, status, sort }, 0, false)
    }, 400)
  }

  const clearAll = () => {
    setQ('')
    setType('')
    setStatus('')
    setSort('recent')
    fetchRecs({ q: '', type: '', status: '', sort: 'recent' }, 0, false)
  }

  // ── Load more uses current offset — no stale page math ──
  const loadMore = () => {
    fetchRecs({ q, type, status, sort }, offset, true)
  }

  const hasMore = items.length < total

  return (
    <div className="space-y-5">

      {/* ── Filter bar ── */}
      <div className="rounded-2xl border border-border bg-card p-4 space-y-4">

        {/* Search + mobile sheet trigger */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              value={q}
              onChange={e => handleSearchChange(e.target.value)}
              placeholder="Search recommendations…"
              className="pl-9 h-10 bg-background border-border focus:border-primary transition-colors text-sm"
            />
            {q && (
              <button
                onClick={() => handleSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Mobile filter sheet */}
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="outline" size="sm"
                className={cn(
                  'h-10 gap-1.5 md:hidden relative shrink-0',
                  activeFilters > 0 && 'border-primary text-primary bg-primary/5'
                )}
              >
                <Filter size={14} />
                Filters
                {activeFilters > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">
                    {activeFilters}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent
              side="bottom"
              className="inset-x-0 left-0 right-0 w-full h-auto max-h-[80vh] overflow-y-auto rounded-t-2xl px-4"
            >
              <SheetHeader className="mb-5">
                <SheetTitle className="text-left">Filters</SheetTitle>
              </SheetHeader>
              <MobileFilterPanel
                currentType={type}
                currentStatus={status}
                onType={v => setType(v)}
                onStatus={v => setStatus(v)}
              />
            </SheetContent>
          </Sheet>

          {hasFilters && (
            <Button
              variant="ghost" size="sm"
              onClick={clearAll}
              className="h-10 text-muted-foreground hover:text-foreground gap-1 shrink-0"
            >
              <X size={13} />
              <span className="hidden sm:inline">Clear</span>
            </Button>
          )}
        </div>

        {/* Sort pills */}
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider shrink-0">Sort</span>
          <div className="flex gap-1.5 flex-wrap">
            {SORTS.map(({ value, label, full }) => (
              <button
                key={value}
                onClick={() => setSort(value)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all duration-150',
                  sort === value
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/20'
                    : 'bg-background border-border text-muted-foreground hover:text-foreground hover:border-primary/40'
                )}
              >
                <span>{label}</span>
                <span className="hidden sm:inline">{full}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Desktop type + status */}
        <div className="hidden md:flex items-center gap-3 flex-wrap">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider shrink-0">Type</span>
          <div className="flex gap-1.5 flex-wrap">
            {TYPES.map(({ value, label }) => (
              <button
                key={value}
                data-active={type === value}
                onClick={() => setType(value)}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-bold border transition-all duration-150',
                  TYPE_COLORS[value] ?? TYPE_COLORS[''],
                  type !== value && 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="w-px h-4 bg-border mx-1" />
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider shrink-0">Status</span>
          <div className="flex gap-1.5 flex-wrap">
            {STATUSES.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setStatus(value)}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-bold border transition-all duration-150',
                  status === value
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Results count */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {fetching ? (
              <span className="flex items-center gap-1.5">
                <Loader2 size={11} className="animate-spin" /> Filtering…
              </span>
            ) : (
              <>
                <span className="font-bold text-foreground">{total}</span>{' '}
                recommendation{total !== 1 ? 's' : ''}
                {hasFilters && <span className="text-primary ml-1.5">· filtered</span>}
              </>
            )}
          </p>
          {hasMore && !fetching && (
            <p className="text-xs text-muted-foreground">
              Showing <span className="font-bold text-foreground">{items.length}</span> of <span className="font-bold text-foreground">{total}</span>
            </p>
          )}
        </div>
      </div>

      {/* ── Grid ── */}
      {fetching ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="space-y-2 animate-pulse">
              <div className="w-full aspect-[3/4] rounded-2xl bg-muted" />
              <div className="h-3.5 w-3/4 rounded bg-muted" />
              <div className="h-3 w-1/2 rounded bg-muted" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 rounded-2xl border border-dashed border-border space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto">
            {hasFilters
              ? <Search size={22} className="text-muted-foreground opacity-40" />
              : <BookOpen size={22} className="text-muted-foreground opacity-40" />
            }
          </div>
          <div>
            <p className="font-black text-sm">
              {hasFilters ? 'No matches found' : 'No recommendations yet'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {hasFilters
                ? 'Try adjusting your filters or clearing the search'
                : `@${username} hasn't shared any recommendations yet`
              }
            </p>
          </div>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearAll} className="text-xs gap-1">
              <X size={12} /> Clear filters
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {items.map(rec => (
              <ComicCard key={rec.id} recommendation={rec} />
            ))}
          </div>

          {/* ── Load more ── */}
          {hasMore && (
            <div className="flex flex-col items-center gap-2 pt-2">
              <Button
                variant="outline"
                onClick={loadMore}
                disabled={loadingMore}
                className="gap-2 min-w-44 rounded-xl border-border hover:border-primary/40 hover:bg-primary/5 hover:text-primary transition-all"
              >
                {loadingMore
                  ? <><Loader2 size={14} className="animate-spin" /> Loading…</>
                  : <>Load {Math.min(PAGE_SIZE, total - items.length)} more · {total - items.length} left</>
                }
              </Button>
              <p className="text-[11px] text-muted-foreground">
                {items.length} of {total} loaded
              </p>
            </div>
          )}

          {/* All loaded state */}
          {!hasMore && items.length > PAGE_SIZE && (
            <p className="text-center text-xs text-muted-foreground py-4">
              ✓ All {total} recommendations loaded
            </p>
          )}
        </>
      )}
    </div>
  )
}

function MobileFilterPanel({
  currentType, currentStatus, onType, onStatus,
}: {
  currentType:   string
  currentStatus: string
  onType:        (v: string) => void
  onStatus:      (v: string) => void
}) {
  return (
    <div className="space-y-6 pb-8">
      <div className="space-y-2.5">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Type</p>
        <div className="flex flex-wrap gap-2">
          {TYPES.map(({ value, label }) => (
            <button
              key={value}
              data-active={currentType === value}
              onClick={() => onType(value)}
              className={cn(
                'px-3.5 py-2 rounded-xl text-sm font-semibold border transition-all',
                TYPE_COLORS[value] ?? TYPE_COLORS[''],
                currentType !== value && 'border-border text-muted-foreground'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-2.5">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Status</p>
        <div className="flex flex-wrap gap-2">
          {STATUSES.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => onStatus(value)}
              className={cn(
                'px-3.5 py-2 rounded-xl text-sm font-semibold border transition-all',
                currentStatus === value
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-muted-foreground'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}