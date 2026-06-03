'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback, useTransition, useState, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, X, SlidersHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import { GENRES } from '@/lib/utils/constants'
import { SearchDropdown } from './SearchDropdown'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

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
  { value: 'score',    emoji: '🏆', full: 'Top Rated' },
  { value: 'trending', emoji: '🔥', full: 'Trending'  },
  { value: 'recent',   emoji: '✨', full: 'Newest'    },
  { value: 'top',      emoji: '👑', full: 'All Time'  },
]

const STATUSES = [
  { value: '',          label: 'Any Status' },
  { value: 'ongoing',   label: 'Ongoing'    },
  { value: 'completed', label: 'Completed'  },
  { value: 'hiatus',    label: 'Hiatus'     },
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

interface Props {
  adult?: boolean
}

export function FilterBar({ adult = false }: Props) {
  const router       = useRouter()
  const pathname     = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [dropdownQuery, setDropdownQuery] = useState('')
  const [showDropdown, setShowDropdown]   = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  const currentType   = searchParams.get('type')   ?? ''
  const currentGenre  = searchParams.get('genre')  ?? ''
  const currentSort   = searchParams.get('sort')   ?? 'score'
  const currentStatus = searchParams.get('status') ?? ''
  const currentSearch = searchParams.get('q')      ?? ''

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

  const clearAll = () => startTransition(() => router.push(pathname))
  const hasActiveFilters = currentType || currentGenre || currentStatus || currentSearch

  return (
    <div className="w-full space-y-3">

      {/* ── Row 1: Search + mobile filter trigger ── */}
      <div className="flex gap-2 w-full">
        <div className="relative flex-1 min-w-0" ref={searchRef}>
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none z-10" />
          <Input
            placeholder="Search by title, author, genre…"
            defaultValue={currentSearch}
            className="w-full pl-9 h-10 bg-card border-border focus:border-primary transition-colors"
            onFocus={() => setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
            onChange={(e) => {
              const val = e.target.value
              setDropdownQuery(val)
              setShowDropdown(true)
              const t = setTimeout(() => updateParam('q', val), 400)
              return () => clearTimeout(t)
            }}
          />
          {currentSearch && (
            <button
              onClick={() => {
                updateParam('q', '')
                setDropdownQuery('')
                setShowDropdown(false)
              }}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors z-10"
            >
              <X size={14} />
            </button>
          )}

          {showDropdown && dropdownQuery.length >= 2 && (
            <SearchDropdown
              query={dropdownQuery}
              adult={adult}
              onSelect={() => {
                setShowDropdown(false)
                setDropdownQuery('')
              }}
            />
          )}
        </div>

        {/* Mobile sheet trigger */}
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                'h-10 gap-1.5 md:hidden relative shrink-0',
                hasActiveFilters && 'border-primary text-primary bg-primary/5'
              )}
            >
              <SlidersHorizontal size={14} />
              Filters
              {hasActiveFilters && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">
                  !
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
            className="h-10 text-muted-foreground hover:text-foreground gap-1 shrink-0"
          >
            <X size={13} />
            <span className="hidden sm:inline">Clear all</span>
          </Button>
        )}
      </div>

      {/* Search hint */}
      {currentSearch && (
        <p className="text-xs text-muted-foreground px-1">
          Searching for
          <span className="text-foreground font-semibold ml-1">"{currentSearch}"</span>
        </p>
      )}

      {/* ── Row 2: Sort pills ── */}
      {/* Mobile: horizontally scrollable with full labels */}
      <div className="flex items-center gap-2 w-full">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider shrink-0">
          Sort
        </span>

        {/* Mobile scroll container */}
        <div className="relative flex-1 md:hidden overflow-hidden">
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-4 z-10 bg-gradient-to-r from-background to-transparent" />
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-4 z-10 bg-gradient-to-l from-background to-transparent" />
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar px-1 w-full pb-0.5">
            {SORTS.map(({ value, emoji, full }) => (
              <button
                key={value}
                onClick={() => updateParam('sort', value)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg whitespace-nowrap shrink-0',
                  'text-xs font-semibold border transition-all duration-150 active:scale-95',
                  currentSort === value
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/20'
                    : 'bg-card border-border text-muted-foreground hover:text-foreground hover:border-primary/50'
                )}
              >
                <span>{emoji}</span>
                <span>{full}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Desktop: wrap freely */}
        <div className="hidden md:flex gap-1.5 flex-wrap">
          {SORTS.map(({ value, emoji, full }) => (
            <button
              key={value}
              onClick={() => updateParam('sort', value)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-semibold border transition-all duration-150',
                currentSort === value
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/20'
                  : 'bg-card border-border text-muted-foreground hover:text-foreground hover:border-primary/50'
              )}
            >
              <span>{emoji}</span>
              <span>{full}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Row 3: Desktop type + status chips ── */}
      <div className="hidden md:flex items-center gap-3 flex-wrap w-full">
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
                'px-3 py-1 rounded-md text-xs font-semibold border transition-all duration-150',
                TYPE_COLORS[value] ?? TYPE_COLORS[''],
                currentType !== value && 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="w-px h-5 bg-border shrink-0" />

        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider shrink-0">
          Status
        </span>
        <div className="flex gap-1.5 flex-wrap">
          {STATUSES.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => updateParam('status', value)}
              className={cn(
                'px-3 py-1 rounded-md text-xs font-semibold border transition-all duration-150',
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

      {/* ── Active genre badge ── */}
      {currentGenre && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium">Genre:</span>
          <button
            onClick={() => updateParam('genre', '')}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold border border-primary/20 hover:bg-primary/20 transition-colors"
          >
            {currentGenre}
            <X size={10} />
          </button>
        </div>
      )}
    </div>
  )
}

function MobileFilters({
  currentType, currentGenre, currentStatus, updateParam,
}: {
  currentType:   string
  currentGenre:  string
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
                'px-3.5 py-2 rounded-lg text-sm font-semibold border transition-all',
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
                'px-3.5 py-2 rounded-lg text-sm font-semibold border transition-all',
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
                'px-3.5 py-2 rounded-lg text-sm font-semibold border transition-all',
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