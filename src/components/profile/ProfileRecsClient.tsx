'use client'

import { useState, useTransition, useCallback, useRef } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { ComicCard } from '@/components/recommendations/ComicCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from '@/components/ui/sheet'
import {
  Search, X, SlidersHorizontal, BookOpen, Loader2,
} from 'lucide-react'
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
  { value: 'recent', label: '✨', full: 'Newest'    },
  { value: 'top',    label: '🏆', full: 'Top Rated' },
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
  manhwa:  'data-[active=true]:bg-violet-500 data-[active=true]:border-violet-500 data-[active=true]:text-white',
  manhua:  'data-[active=true]:bg-amber-500  data-[active=true]:border-amber-500  data-[active=true]:text-white',
  webtoon: 'data-[active=true]:bg-teal-500   data-[active=true]:border-teal-500   data-[active=true]:text-white',
  comic:   'data-[active=true]:bg-blue-500   data-[active=true]:border-blue-500   data-[active=true]:text-white',
  other:   'data-[active=true]:bg-zinc-500   data-[active=true]:border-zinc-500   data-[active=true]:text-white',
  '':      'data-[active=true]:bg-primary    data-[active=true]:border-primary    data-[active=true]:text-primary-foreground',
}

const PAGE_SIZE = 24

interface Filters {
  type:   string
  genre:  string
  status: string
  sort:   string
  q:      string
}

interface Props {
  username:       string
  userId:         string
  initialItems:   Recommendation[]
  initialTotal:   number
  currentFilters: Filters
}

export function ProfileRecsClient({
  username,
  userId,
  initialItems,
  initialTotal,
  currentFilters,
}: Props) {
  const router        = useRouter()
  const pathname      = usePathname()
  const searchParams  = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const [items, setItems]       = useState<Recommendation[]>(initialItems)
  const [total, setTotal]       = useState(initialTotal)
  const [page, setPage]         = useState(1)
  const [loadingMore, setLoadingMore] = useState(false)
  const [searchInput, setSearchInput] = useState(currentFilters.q)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) params.set(key, value)
      else params.delete(key)
      params.delete('page')
      setPage(1)
      startTransition(() => router.push(`${pathname}?${params.toString()}`))
    },
    [pathname, router, searchParams]
  )

  const clearAll = () => {
    setSearchInput('')
    setPage(1)
    startTransition(() => router.push(pathname))
  }

  const handleSearchChange = (value: string) => {
    setSearchInput(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => updateParam('q', value), 400)
  }

  const loadMore = async () => {
    setLoadingMore(true)
    try {
      const params = new URLSearchParams()
      params.set('user_id', userId)
      params.set('offset', String((page) * PAGE_SIZE))
      params.set('limit', String(PAGE_SIZE))
      params.set('exclude_adult', 'true')
      if (currentFilters.type)   params.set('type',   currentFilters.type)
      if (currentFilters.genre)  params.set('genre',  currentFilters.genre)
      if (currentFilters.status) params.set('status', currentFilters.status)
      if (currentFilters.sort)   params.set('sort',   currentFilters.sort)
      if (currentFilters.q)      params.set('q',      currentFilters.q)

      const res  = await fetch(`/api/profile/${username}/recommendations?${params}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to load')
      setItems(prev => [...prev, ...(data.recommendations ?? [])])
      setPage(prev => prev + 1)
    } catch {
      toast.error('Failed to load more')
    } finally {
      setLoadingMore(false)
    }
  }

  const hasFilters  = !!(currentFilters.type || currentFilters.genre || currentFilters.status || currentFilters.q)
  const hasMore     = items.length < total
  const currentSort = currentFilters.sort || 'recent'

  return (
    <div className="space-y-6">

      {/* ── Filter bar ── */}
      <div className="space-y-3">

        {/* Row 1: search + mobile filters */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              value={searchInput}
              onChange={e => handleSearchChange(e.target.value)}
              placeholder="Search recommendations…"
              className="pl-9 h-10 bg-card border-border focus:border-primary transition-colors"
            />
            {searchInput && (
              <button
                onClick={() => { setSearchInput(''); updateParam('q', '') }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Mobile filters sheet */}
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  'h-10 gap-1.5 md:hidden relative shrink-0',
                  hasFilters && 'border-primary text-primary bg-primary/5'
                )}
              >
                <SlidersHorizontal size={14} />
                Filters
                {hasFilters && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">
                    !
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-auto max-h-[80vh] overflow-y-auto rounded-t-2xl">
              <SheetHeader className="mb-5">
                <SheetTitle className="text-left">Filters</SheetTitle>
              </SheetHeader>
              <MobileFilterPanel
                currentType={currentFilters.type}
                currentStatus={currentFilters.status}
                updateParam={updateParam}
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

        {/* Row 2: sort pills */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider shrink-0">Sort</span>
          <div className="flex gap-1.5">
            {SORTS.map(({ value, label, full }) => (
              <button
                key={value}
                onClick={() => updateParam('sort', value)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold border transition-all duration-150',
                  currentSort === value
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/20'
                    : 'bg-card border-border text-muted-foreground hover:text-foreground hover:border-primary/50'
                )}
              >
                <span>{label}</span>
                <span className="hidden sm:inline text-xs">{full}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Row 3: desktop type + status */}
        <div className="hidden md:flex items-center gap-3 flex-wrap">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider shrink-0">Type</span>
          <div className="flex gap-1.5 flex-wrap">
            {TYPES.map(({ value, label }) => (
              <button
                key={value}
                data-active={currentFilters.type === value}
                onClick={() => updateParam('type', value)}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-semibold border transition-all duration-150',
                  TYPE_COLORS[value] ?? TYPE_COLORS[''],
                  currentFilters.type !== value && 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="w-px h-5 bg-border" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider shrink-0">Status</span>
          <div className="flex gap-1.5 flex-wrap">
            {STATUSES.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => updateParam('status', value)}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-semibold border transition-all duration-150',
                  currentFilters.status === value
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
            {isPending ? (
              <span className="flex items-center gap-1.5">
                <Loader2 size={11} className="animate-spin" /> Filtering…
              </span>
            ) : (
              <>
                <span className="font-semibold text-foreground">{total}</span>{' '}
                recommendation{total !== 1 ? 's' : ''}
                {hasFilters && <span className="text-primary ml-1">· filtered</span>}
              </>
            )}
          </p>
        </div>
      </div>

      {/* ── Grid ── */}
      {items.length === 0 ? (
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
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {items.map(rec => (
            <ComicCard key={rec.id} recommendation={rec} />
          ))}
        </div>
      )}

      {/* ── Load more ── */}
      {hasMore && items.length > 0 && (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            onClick={loadMore}
            disabled={loadingMore}
            className="gap-2 min-w-36 rounded-xl border-border hover:border-primary/40 hover:bg-primary/5 hover:text-primary transition-all"
          >
            {loadingMore
              ? <><Loader2 size={14} className="animate-spin" /> Loading…</>
              : <>Load more · {total - items.length} left</>
            }
          </Button>
        </div>
      )}
    </div>
  )
}

function MobileFilterPanel({
  currentType, currentStatus, updateParam,
}: {
  currentType:   string
  currentStatus: string
  updateParam:   (key: string, value: string) => void
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
              onClick={() => updateParam('type', value)}
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
              onClick={() => updateParam('status', value)}
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