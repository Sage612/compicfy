'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback, useTransition, useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, X, SlidersHorizontal, Loader2, BookOpen, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { GENRES } from '@/lib/utils/constants'
import Image from 'next/image'
import Link from 'next/link'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

// ─── Constants ────────────────────────────────────────────────────────────────

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
  { value: 'score',    label: '🏆', full: 'Top Rated' },
  { value: 'trending', label: '🔥', full: 'Trending'  },
  { value: 'recent',   label: '✨', full: 'Newest'    },
]

const STATUSES = [
  { value: '',          label: 'Any Status' },
  { value: 'ongoing',   label: 'Ongoing'    },
  { value: 'completed', label: 'Completed'  },
  { value: 'hiatus',    label: 'Hiatus'      },
  { value: 'cancelled', label: 'Cancelled'  },
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

const TYPE_BADGE: Record<string, string> = {
  manga:   'bg-rose-500/10   text-rose-500',
  manhwa:  'bg-violet-500/10 text-violet-500',
  manhua:  'bg-amber-500/10  text-amber-500',
  webtoon: 'bg-teal-500/10   text-teal-500',
  comic:   'bg-blue-500/10   text-blue-500',
  other:   'bg-zinc-500/10   text-zinc-500',
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface SearchResult {
  id: string
  title: string
  type: string
  cover_url: string | null
  author: string | null
  artist: string | null
  genres: string[]
  score: number
  status: string
}

// ─── Live Search Dropdown ─────────────────────────────────────────────────────

function SearchDropdown({
  query,
  isAdult,
  onSelect,
}: {
  query: string
  isAdult?: boolean
  onSelect: () => void
}) {
  const [results, setResults]   = useState<SearchResult[]>([])
  const [loading, setLoading]   = useState(false)
  const [visible, setVisible]   = useState(false)
  const debounceRef              = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([])
      setVisible(false)
      return
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams({ q: query, limit: '8' })
        if (isAdult) params.set('adult', 'true')
        const res  = await fetch(`/api/search?${params.toString()}`)
        const data = await res.json()
        setResults(data.results ?? [])
        setVisible(true)
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, isAdult])

  if (!visible && !loading) return null
  if (query.length < 2) return null

  return (
    <div className="absolute top-full left-0 right-0 mt-1.5 z-50 rounded-2xl border border-border bg-card shadow-2xl shadow-black/20 overflow-hidden">
      {loading && results.length === 0 ? (
        <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
          <Loader2 size={14} className="animate-spin" />
          Searching…
        </div>
      ) : results.length === 0 ? (
        <div className="px-4 py-3 text-sm text-muted-foreground">
          No results for &ldquo;{query}&rdquo;
        </div>
      ) : (
        <ul className="py-1.5 max-h-[420px] overflow-y-auto">
          {results.map((r) => (
            <li key={r.id}>
              <Link
                href={`/comic/${r.id}`}
                onClick={onSelect}
                className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/60 transition-colors group"
              >
                <div className="w-9 h-12 rounded-lg overflow-hidden bg-muted shrink-0 border border-border">
                  {r.cover_url ? (
                    <Image
                      src={r.cover_url}
                      alt={r.title}
                      width={36}
                      height={48}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen size={14} className="text-muted-foreground" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
                    {r.title}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <span className={cn(
                      'text-[10px] font-bold px-1.5 py-0.5 rounded-md capitalize',
                      TYPE_BADGE[r.type] ?? 'bg-muted text-muted-foreground'
                    )}>
                      {r.type}
                    </span>
                    {r.author && (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                        <User size={9} />
                        {r.author}
                      </span>
                    )}
                    {r.genres?.slice(0, 2).map((g) => (
                      <span key={g} className="text-[10px] text-muted-foreground">
                        {g}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="text-xs font-bold text-muted-foreground shrink-0">
                  ▲ {r.score ?? 0}
                </div>
              </Link>
            </li>
          ))}

          <li className="border-t border-border mt-1">
            <Link
              href={`/browse?q=${encodeURIComponent(query)}`}
              onClick={onSelect}
              className="flex items-center justify-between px-4 py-2.5 text-xs font-semibold text-primary hover:bg-primary/5 transition-colors"
            >
              <span>See all results for &ldquo;{query}&rdquo;</span>
              <Search size={12} />
            </Link>
          </li>
        </ul>
      )}
    </div>
  )
}

// ─── Main FilterBar ───────────────────────────────────────────────────────────

export function FilterBar({ isAdult = false }: { isAdult?: boolean }) {
  const router       = useRouter()
  const pathname     = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const currentType   = searchParams.get('type')   ?? ''
  const currentGenre  = searchParams.get('genre')  ?? ''
  const currentSort   = searchParams.get('sort')   ?? 'score'
  const currentStatus = searchParams.get('status') ?? ''
  const currentSearch = searchParams.get('q')      ?? ''

  const [inputValue, setInputValue] = useState(currentSearch)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const searchContainerRef = useRef<HTMLDivElement>(null)
  
  // FIXED: Ref for URL update debouncing
  const urlUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      if (urlUpdateTimeoutRef.current) clearTimeout(urlUpdateTimeoutRef.current)
    }
  }, [])

  useEffect(() => {
    setInputValue(currentSearch)
  }, [currentSearch])

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) params.set(key, value)
      else params.delete(key)
      params.delete('page')
      startTransition(() => router.push(`${pathname}?${params.toString()}`))
    },
    [pathname, router, searchParams]
  )

  const clearAll = () => {
    setInputValue('')
    setDropdownOpen(false)
    if (urlUpdateTimeoutRef.current) clearTimeout(urlUpdateTimeoutRef.current)
    startTransition(() => router.push(pathname))
  }

  // FIXED: Proper debounced URL update
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setInputValue(val)
    setDropdownOpen(true)

    if (urlUpdateTimeoutRef.current) clearTimeout(urlUpdateTimeoutRef.current)
    
    urlUpdateTimeoutRef.current = setTimeout(() => {
      updateParam('q', val)
    }, 500)
  }

  const handleDropdownSelect = () => {
    setDropdownOpen(false)
  }

  const activeFilterCount = [currentType, currentGenre, currentStatus, currentSearch]
    .filter(Boolean).length

  const hasActiveFilters = activeFilterCount > 0

  return (
    <div className="space-y-4">

      {/* Row 1: Search */}
      <div className="flex gap-2">
        <div className="relative flex-1" ref={searchContainerRef}>
          {isPending ? (
            <Loader2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground animate-spin pointer-events-none" />
          ) : (
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          )}
          <Input
            placeholder="Search by title, author, artist…"
            value={inputValue}
            className="pl-9 h-10 bg-card border-border focus:border-primary transition-colors"
            onChange={handleSearchChange}
            onFocus={() => inputValue.length >= 2 && setDropdownOpen(true)}
          />
          {inputValue && (
            <button
              onClick={() => {
                setInputValue('')
                setDropdownOpen(false)
                if (urlUpdateTimeoutRef.current) clearTimeout(urlUpdateTimeoutRef.current)
                updateParam('q', '')
              }}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={14} />
            </button>
          )}

          {dropdownOpen && (
            <SearchDropdown
              query={inputValue}
              isAdult={isAdult}
              onSelect={handleDropdownSelect}
            />
          )}
        </div>

        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                'h-10 gap-1.5 md:hidden relative',
                hasActiveFilters && 'border-primary text-primary bg-primary/5'
              )}
            >
              <SlidersHorizontal size={14} />
              Filters
              {activeFilterCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-auto max-h-[80vh] overflow-y-auto rounded-t-2xl">
            <SheetHeader className="mb-5">
              <SheetTitle className="text-left">Filters</SheetTitle>
            </SheetHeader>
            <MobileFilters
              currentType={currentType}
              currentGenre={currentGenre}
              currentStatus={currentStatus}
              updateParam={updateParam}
            />
          </SheetContent>
        </Sheet>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className="h-10 text-muted-foreground hover:text-foreground gap-1"
          >
            <X size={13} />
            <span className="hidden sm:inline">Clear all</span>
          </Button>
        )}
      </div>

      {/* Row 2: Sort pills */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden sm:block shrink-0">
          Sort
        </span>
        <div className="flex gap-1.5">
          {SORTS.map(({ value, label, full }) => (
            <button
              key={value}
              onClick={() => updateParam('sort', value)}
              className={cn(
                'flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold border transition-all duration-150',
                currentSort === value
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/20'
                  : 'bg-card border-border text-muted-foreground hover:text-foreground hover:border-primary/50'
              )}
            >
              <span>{label}</span>
              <span className="hidden sm:inline">{full}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Row 3: Desktop type + status */}
      <div className="hidden md:flex items-center gap-3 flex-wrap">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider shrink-0">
          Type
        </span>
        <div className="flex gap-1.5 flex-wrap">
          {TYPES.map(({ value, label }) => (
            <button
              key={value}
              data-active={currentType === value}
              onClick={() => updateParam('type', value)}
              className={cn(
                'px-3 py-1 rounded-full text-xs font-semibold border transition-all duration-150',
                TYPE_COLORS[value] ?? TYPE_COLORS[''],
                currentType !== value && 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="w-px h-5 bg-border" />

        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider shrink-0">
          Status
        </span>
        <div className="flex gap-1.5 flex-wrap">
          {STATUSES.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => updateParam('status', value)}
              className={cn(
                'px-3 py-1 rounded-full text-xs font-semibold border transition-all duration-150',
                currentStatus === value
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Row 4: Desktop genre chips */}
      <div className="hidden md:flex items-start gap-3">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider shrink-0 mt-1">
          Genre
        </span>
        <div className="flex gap-1.5 flex-wrap">
          {GENRES.map((genre) => (
            <button
              key={genre}
              onClick={() => updateParam('genre', currentGenre === genre ? '' : genre)}
              className={cn(
                'px-3 py-1 rounded-full text-xs font-semibold border transition-all duration-150',
                currentGenre === genre
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
              )}
            >
              {genre}
            </button>
          ))}
        </div>
      </div>

      {/* Active filter badges */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 flex-wrap">
          {currentGenre && (
            <ActiveBadge label={`Genre: ${currentGenre}`} onRemove={() => updateParam('genre', '')} />
          )}
          {currentType && (
            <ActiveBadge label={`Type: ${currentType}`} onRemove={() => updateParam('type', '')} />
          )}
          {currentStatus && (
            <ActiveBadge label={`Status: ${currentStatus}`} onRemove={() => updateParam('status', '')} />
          )}
          {currentSearch && (
            <ActiveBadge label={`"${currentSearch}"`} onRemove={() => { setInputValue(''); updateParam('q', '') }} />
          )}
        </div>
      )}
    </div>
  )
}

function ActiveBadge({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <button
      onClick={onRemove}
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold border border-primary/20 hover:bg-primary/20 transition-colors"
    >
      {label}
      <X size={10} />
    </button>
  )
}

function MobileFilters({
  currentType,
  currentGenre,
  currentStatus,
  updateParam,
}: {
  currentType: string
  currentGenre: string
  currentStatus: string
  updateParam: (key: string, value: string) => void
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

      <div className="space-y-2.5">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Genre</p>
        <div className="flex flex-wrap gap-2">
          {GENRES.map((genre) => (
            <button
              key={genre}
              onClick={() => updateParam('genre', currentGenre === genre ? '' : genre)}
              className={cn(
                'px-3.5 py-2 rounded-xl text-sm font-semibold border transition-all',
                currentGenre === genre
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-muted-foreground'
              )}
            >
              {genre}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}