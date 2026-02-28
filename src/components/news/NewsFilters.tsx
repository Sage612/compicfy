'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback, useTransition } from 'react'
import { Input } from '@/components/ui/input'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

const CATEGORIES = [
  { value: '', label: 'All' },
  { value: 'industry', label: '🏭 Industry' },
  { value: 'release', label: '📚 Releases' },
  { value: 'adaptation', label: '🎬 Adaptations' },
  { value: 'creator', label: '✍️ Creators' },
  { value: 'event', label: '🎪 Events' },
  { value: 'announcement', label: '📢 Announcements' },
]

export function NewsFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  const currentCategory = searchParams.get('category') ?? ''
  const currentSearch = searchParams.get('q') ?? ''

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

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Search news..."
          defaultValue={currentSearch}
          className="pl-9 h-9"
          onChange={(e) => {
            const val = e.target.value
            setTimeout(() => updateParam('q', val), 400)
          }}
        />
        {currentSearch && (
          <button
            onClick={() => updateParam('q', '')}
            title="currentSearch"
  aria-label="currentSearch"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Category tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {CATEGORIES.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => updateParam('category', value)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
              currentCategory === value
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border text-muted-foreground hover:border-primary hover:text-foreground'
            )}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}