'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback, useTransition } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, X, SlidersHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { GENRES } from '@/lib/utils/constants'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

const TYPES = [
  { value: '', label: 'All' },
  { value: 'manga', label: 'Manga' },
  { value: 'manhwa', label: 'Manhwa' },
  { value: 'manhua', label: 'Manhua' },
  { value: 'webtoon', label: 'Webtoon' },
  { value: 'comic', label: 'Comic' },
  { value: 'other', label: 'Other' },
]

const SORTS = [
  { value: 'score', label: '🏆 Top' },
  { value: 'trending', label: '🔥 Trending' },
  { value: 'recent', label: '✨ New' },
]

const STATUSES = [
  { value: '', label: 'Any' },
  { value: 'ongoing', label: 'Ongoing' },
  { value: 'completed', label: 'Completed' },
  { value: 'hiatus', label: 'Hiatus' },
  { value: 'cancelled', label: 'Cancelled' },
]

export function FilterBar() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const currentType = searchParams.get('type') ?? ''
  const currentGenre = searchParams.get('genre') ?? ''
  const currentSort = searchParams.get('sort') ?? 'score'
  const currentStatus = searchParams.get('status') ?? ''
  const currentSearch = searchParams.get('q') ?? ''

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
      // Reset to page 1 when filters change
      params.delete('page')
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`)
      })
    },
    [pathname, router, searchParams]
  )

  const clearAll = () => {
    startTransition(() => {
      router.push(pathname)
    })
  }

  const hasActiveFilters = currentType || currentGenre || currentStatus || currentSearch

  return (
    <div className="space-y-3">
      {/* Search + Filter trigger row */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
          <Input
            placeholder="Search comics..."
            defaultValue={currentSearch}
            className="pl-9 h-9"
            onChange={(e) => {
              const val = e.target.value
              const timeout = setTimeout(() => updateParam('q', val), 400)
              return () => clearTimeout(timeout)
            }}
          />
          {currentSearch && (
            <button
                          onClick={() => updateParam('q', '')}
                           aria-label="Clear search"
  title="Clear search"

              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Mobile: sheet filter trigger */}
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn('h-9 gap-1.5 md:hidden', hasActiveFilters && 'border-primary text-primary')}
            >
              <SlidersHorizontal size={14} />
              Filters
              {hasActiveFilters && (
                <span className="w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center">
                  !
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-auto max-h-[80vh] overflow-y-auto">
            <SheetHeader className="mb-4">
              <SheetTitle>Filters</SheetTitle>
            </SheetHeader>
            <MobileFilters
              currentType={currentType}
              currentGenre={currentGenre}
              currentStatus={currentStatus}
              updateParam={updateParam}
            />
          </SheetContent>
        </Sheet>

        {/* Clear all */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className="h-9 text-muted-foreground hover:text-foreground"
          >
            <X size={14} />
            <span className="hidden sm:inline ml-1">Clear</span>
          </Button>
        )}
      </div>

      {/* Sort tabs — always visible */}
      <div className="flex gap-1.5">
        {SORTS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => updateParam('sort', value)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              currentSort === value
                ? 'bg-primary text-primary-foreground'
                : 'bg-card border border-border text-muted-foreground hover:text-foreground hover:border-primary/50'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Desktop: inline type filter */}
      <div className="hidden md:flex gap-1.5 flex-wrap">
        {TYPES.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => updateParam('type', value)}
            className={cn(
              'px-3 py-1 rounded-full text-xs font-medium border transition-colors',
              currentType === value
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border text-muted-foreground hover:border-primary hover:text-foreground'
            )}
          >
            {label}
          </button>
        ))}

        {/* Status */}
        <div className="w-px bg-border mx-1" />
        {STATUSES.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => updateParam('status', value)}
            className={cn(
              'px-3 py-1 rounded-full text-xs font-medium border transition-colors',
              currentStatus === value
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border text-muted-foreground hover:border-primary hover:text-foreground'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Active genre badge */}
      {currentGenre && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Genre:</span>
          <button
            onClick={() => updateParam('genre', '')}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20 hover:bg-primary/20"
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
    <div className="space-y-6 pb-6">
      {/* Type */}
      <div className="space-y-2">
        <p className="text-sm font-semibold">Type</p>
        <div className="flex flex-wrap gap-2">
          {TYPES.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => updateParam('type', value)}
              className={cn(
                'px-3 py-1.5 rounded-full text-sm border transition-colors',
                currentType === value
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-muted-foreground'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Status */}
      <div className="space-y-2">
        <p className="text-sm font-semibold">Status</p>
        <div className="flex flex-wrap gap-2">
          {STATUSES.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => updateParam('status', value)}
              className={cn(
                'px-3 py-1.5 rounded-full text-sm border transition-colors',
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

      {/* Genre */}
      <div className="space-y-2">
        <p className="text-sm font-semibold">Genre</p>
        <div className="flex flex-wrap gap-2">
          {GENRES.map((genre) => (
            <button
              key={genre}
              onClick={() => updateParam('genre', currentGenre === genre ? '' : genre)}
              className={cn(
                'px-3 py-1.5 rounded-full text-sm border transition-colors',
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