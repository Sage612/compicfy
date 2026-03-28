'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { ComicCard } from '@/components/recommendations/ComicCard'
import { Button } from '@/components/ui/button'
import { BookOpen, Loader2, Plus } from 'lucide-react'
import Link from 'next/link'
import type { Recommendation } from '@/types/database.types'

interface Props {
  initialItems: Recommendation[]
  initialTotal: number
  searchParams: Record<string, string>
  apiPath?: string
}

const PAGE_SIZE = 24

export function ComicGridClient({
  initialItems,
  initialTotal,
  searchParams,
  apiPath = '/api/recommendations',
}: Props) {
  const [items, setItems] = useState<Recommendation[]>(initialItems)
  const [total, setTotal] = useState(initialTotal)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)

  // Track previous searchParams to detect filter changes
  const prevSearchParamsRef = useRef<string>(JSON.stringify(searchParams))

  // Sync items when searchParams or initialItems change
  // This fires when the user picks a new sort/filter and the server
  // re-renders with fresh initialItems
  useEffect(() => {
    const currentKey = JSON.stringify(searchParams)
    if (prevSearchParamsRef.current !== currentKey) {
      prevSearchParamsRef.current = currentKey
      setItems(initialItems)
      setTotal(initialTotal)
      setPage(1)
    }
  }, [searchParams, initialItems, initialTotal])

  // Also sync on first mount if initialItems changes identity
  // (handles RSC revalidation without full navigation)
  useEffect(() => {
    setItems(initialItems)
    setTotal(initialTotal)
    setPage(1)
  }, [initialItems, initialTotal])

  const hasMore = items.length < total

  const loadMore = useCallback(async () => {
    setLoading(true)
    try {
      const nextPage = page + 1
      const params = new URLSearchParams({
        ...searchParams,
        page: String(nextPage),
        limit: String(PAGE_SIZE),
      })
      const res = await fetch(`${apiPath}?${params}`)
      const data = await res.json()
      const newItems = data.recommendations ?? data.data ?? []
      setItems(prev => [...prev, ...newItems])
      setPage(nextPage)
    } catch {
      console.error('Failed to load more')
    } finally {
      setLoading(false)
    }
  }, [page, searchParams, apiPath])

  if (!items.length) {
    return (
      <div className="text-center py-20">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
          <BookOpen size={28} className="text-muted-foreground opacity-40" />
        </div>
        <h3 className="text-lg font-black mb-1">No comics found</h3>
        <p className="text-muted-foreground text-sm mb-6">
          {Object.keys(searchParams).some(k => ['q', 'type', 'genre', 'status'].includes(k))
            ? 'Try adjusting your filters'
            : 'Be the first to add a recommendation!'
          }
        </p>
        <Link href="/dashboard/recommendations/new">
          <Button className="gap-2 bg-gradient-to-r from-primary to-violet-500 hover:opacity-90 border-0 shadow-lg shadow-primary/20">
            <Plus size={15} />
            Submit a Recommendation
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        {items.length} of {total} comic{total !== 1 ? 's' : ''}
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {items.map(rec => (
          <ComicCard key={rec.id} recommendation={rec} />
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            onClick={loadMore}
            disabled={loading}
            className="gap-2 min-w-[160px] rounded-xl border-border hover:border-primary/50 transition-colors"
          >
            {loading
              ? <><Loader2 size={14} className="animate-spin" /> Loading...</>
              : <><Plus size={14} /> Load More</>
            }
          </Button>
        </div>
      )}

      {!hasMore && items.length > PAGE_SIZE && (
        <p className="text-center text-xs text-muted-foreground py-2">
          You've seen all {total} comics 🎉
        </p>
      )}
    </div>
  )
}