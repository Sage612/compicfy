'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback, useTransition, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

const CATEGORIES = [
  { value: '',              label: 'All',           emoji: '🗞️' },
  { value: 'industry',     label: 'Industry',      emoji: '🏭' },
  { value: 'release',      label: 'Releases',      emoji: '📚' },
  { value: 'adaptation',   label: 'Adaptations',   emoji: '🎬' },
  { value: 'creator',      label: 'Creators',      emoji: '✍️' },
  { value: 'event',        label: 'Events',        emoji: '🎪' },
  { value: 'announcement', label: 'Announcements', emoji: '📢' },
]

export function NewsFilters() {
  const router       = useRouter()
  const pathname     = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()
  const debounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null)

  const currentCategory = searchParams.get('category') ?? ''
  const currentSearch   = searchParams.get('q')        ?? ''

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

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => updateParam('q', val), 400)
  }

  return (
    <div className="space-y-3">

      {/* Search — full width on mobile, capped on desktop */}
      <div className="relative w-full sm:max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Search news…"
          defaultValue={currentSearch}
          className="pl-9 h-10 bg-card border-border focus:border-primary transition-colors"
          onChange={handleSearchChange}
        />
        {currentSearch && (
          <button
            onClick={() => {
              if (debounceRef.current) clearTimeout(debounceRef.current)
              updateParam('q', '')
            }}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Category pills — scrollable on mobile, wrap on desktop */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar sm:flex-wrap pb-1 sm:pb-0">
        {CATEGORIES.map(({ value, label, emoji }) => (
          <button
            key={value}
            onClick={() => updateParam('category', value)}
            className={cn(
              'inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all duration-150 shrink-0',
              currentCategory === value
                ? 'bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/20'
                : 'bg-card border-border text-muted-foreground hover:text-foreground hover:border-primary/50'
            )}
          >
            <span>{emoji}</span>
            {label}
          </button>
        ))}
      </div>

    </div>
  )
}