'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback, useTransition, useState, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, X } from 'lucide-react'
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
  { value: 'score',    label: 'Top rated'     },
  { value: 'trending', label: 'Trending'      },
  { value: 'updated',  label: 'Latest update' },
  { value: 'recent',   label: 'Newest'        },
  { value: 'top',      label: 'All time'      },
]

const STATUSES = [
  { value: '',          label: 'Any Status' },
  { value: 'ongoing',   label: 'Ongoing'    },
  { value: 'completed', label: 'Completed'  },
  { value: 'hiatus',    label: 'Hiatus'     },
  { value: 'cancelled', label: 'Cancelled'  },
]

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
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  const clearAll = () => {
    setDropdownQuery('')
    setShowDropdown(false)
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    startTransition(() => router.push(pathname))
  }
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
            className="w-full pl-9 h-10 bg-card border-border focus:border-foreground/50 transition-colors"
            onFocus={() => setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
            onChange={(e) => {
              const val = e.target.value
              setDropdownQuery(val)
              setShowDropdown(true)       
              if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
              searchDebounceRef.current = setTimeout(() => {
                updateParam('q', val.trim())
              }, 400)
            }}
          />
          {currentSearch && (
            <button
              onClick={() => {
                if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
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

          {showDropdown && dropdownQuery.trim().length >= 2 && (
            <SearchDropdown
              query={dropdownQuery.trim()}
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
                'h-10 md:hidden shrink-0',
                hasActiveFilters && 'border-foreground text-foreground'
              )}
            >
              Filters{hasActiveFilters ? ' •' : ''}
            </Button>
          </SheetTrigger>

          <SheetContent
            side="bottom"
            className="inset-x-0 left-0 right-0 w-full h-auto max-h-[80vh] overflow-y-auto rounded-t-xl px-4"
          >
            <SheetHeader className="mb-5">
              <SheetTitle className="text-left font-dashboard-serif text-xl font-normal">Filters</SheetTitle>
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
            Clear
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

      {/* ── Row 2: Sort ── */}
      <div className="flex items-center gap-3 w-full">
        <span className="text-[11px] uppercase tracking-widest text-muted-foreground/70 shrink-0">Sort</span>
        <div className="flex-1 min-w-0 overflow-x-auto no-scrollbar">
          <div className="flex gap-1.5 w-max">
            {SORTS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => updateParam('sort', value)}
                className={cn(
                  'px-3 py-1.5 rounded-full border text-xs whitespace-nowrap transition-colors',
                  currentSort === value
                    ? 'bg-foreground text-background border-foreground'
                    : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/40'
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Row 3: Desktop type + status ── */}
      <div className="hidden md:flex items-center gap-4 flex-wrap w-full">
        <span className="text-[11px] uppercase tracking-widest text-muted-foreground/70 shrink-0">Type</span>
        <div className="flex gap-1.5 flex-wrap">
          {TYPES.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => updateParam('type', value)}
              className={cn(
                'px-3 py-1 rounded-full border text-xs transition-colors',
                currentType === value
                  ? 'bg-foreground text-background border-foreground'
                  : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/40'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="w-px h-5 bg-border shrink-0" />

        <span className="text-[11px] uppercase tracking-widest text-muted-foreground/70 shrink-0">Status</span>
        <div className="flex gap-1.5 flex-wrap">
          {STATUSES.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => updateParam('status', value)}
              className={cn(
                'px-3 py-1 rounded-full border text-xs transition-colors',
                currentStatus === value
                  ? 'bg-foreground text-background border-foreground'
                  : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/40'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Active genre ── */}
      {currentGenre && (
        <div className="flex items-center gap-2">
          <span className="text-[11px] uppercase tracking-widest text-muted-foreground/70">Genre</span>
          <button
            onClick={() => updateParam('genre', '')}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-foreground text-background text-xs"
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
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground/70">Type</p>
        <div className="flex flex-wrap gap-2">
          {TYPES.map(({ value, label }) => (
            <button
              key={value}
              data-active={currentType === value}
              onClick={() => updateParam('type', value)}
              className={cn(
                'px-3.5 py-2 rounded-full text-sm border transition-colors',
                currentType === value
                  ? 'bg-foreground text-background border-foreground'
                  : 'border-border text-muted-foreground'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2.5">
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground/70">Status</p>
        <div className="flex flex-wrap gap-2">
          {STATUSES.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => updateParam('status', value)}
              className={cn(
                'px-3.5 py-2 rounded-full text-sm border transition-colors',
                currentStatus === value
                  ? 'bg-foreground text-background border-foreground'
                  : 'border-border text-muted-foreground'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2.5">
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground/70">Genre</p>
        <div className="flex flex-wrap gap-2">
          {GENRES.map((genre) => (
            <button
              key={genre}
              onClick={() => updateParam('genre', currentGenre === genre ? '' : genre)}
              className={cn(
                'px-3.5 py-2 rounded-full text-sm border transition-colors',
                currentGenre === genre
                  ? 'bg-foreground text-background border-foreground'
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