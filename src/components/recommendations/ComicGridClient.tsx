'use client'

import { useState, useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import { ComicCard } from '@/components/recommendations/ComicCard'
import { ComicCardSkeleton } from '@/components/recommendations/ComicCardSkeleton'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import Link from 'next/link'
import type { Recommendation } from '@/types/app.types'
import { cn } from '@/lib/utils'

interface Props {
  initialItems:       Recommendation[]
  initialTotal:       number
  searchParams:       Record<string, string>
  apiPath?:           string
  userId?:            string | null
  interactionCount?:  number
  contentRatings?:    string[]
  isPro?:             boolean
}

const PAGE_SIZE        = 24
const MIN_INTERACTIONS = 5

type GridTab = 'all' | 'foryou'

function getSessionKey(searchParams: Record<string, string>) {
  const sorted = Object.keys(searchParams)
    .sort()
    .reduce<Record<string, string>>((acc, k) => { acc[k] = searchParams[k]; return acc }, {})
  return `cgrid_${btoa(JSON.stringify(sorted)).replace(/=/g, '')}`
}

export function ComicGridClient({
  initialItems,
  initialTotal,
  searchParams,
  apiPath = '/api/recommendations',
  userId  = null,
  interactionCount = 0,
  contentRatings = ['all_ages', 'teen'],
  isPro = false,
}: Props) {
  const sessionKey = getSessionKey(searchParams)
  const scrollKey  = `${sessionKey}_y`

  const [items,    setItems]    = useState<Recommendation[]>(initialItems)
  const [total,    setTotal]    = useState(initialTotal)
  const [page,     setPage]     = useState(1)
  const [loading,  setLoading]  = useState(false)
  const [hydrated, setHydrated] = useState(false)

  const forYouUnlocked = !!userId && interactionCount >= MIN_INTERACTIONS
  const [activeTab,     setActiveTab]     = useState<GridTab>('all')
  const [forYouItems,   setForYouItems]   = useState<Recommendation[]>([])
  const [forYouLoading, setForYouLoading] = useState(false)
  const forYouFetched = useRef(false)
  const prevKeyRef    = useRef(sessionKey)

  // Sentinel ref for infinite scroll
  const sentinelRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    setHydrated(true)
    try {
      const raw = sessionStorage.getItem(sessionKey)
      if (!raw) return
      const saved = JSON.parse(raw)
      if (Array.isArray(saved.items) && saved.items.length > 0 && typeof saved.total === 'number' && typeof saved.page === 'number') {
        setItems(saved.items)
        setTotal(saved.total)
        setPage(saved.page)
      }
    } catch {}
  }, [sessionKey])

  useEffect(() => {
    if (!hydrated) return
    try {
      const y = sessionStorage.getItem(scrollKey)
      if (!y) return
      const target = parseInt(y, 10)
      if (isNaN(target) || target <= 0) return
      requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo({ top: target, behavior: 'instant' })))
    } catch {}
  }, [hydrated, scrollKey])

  useEffect(() => {
    const save = () => { try { sessionStorage.setItem(scrollKey, String(Math.round(window.scrollY))) } catch {} }
    window.addEventListener('scroll', save, { passive: true })
    return () => window.removeEventListener('scroll', save)
  }, [scrollKey])

  useEffect(() => {
    if (!hydrated) return
    try { sessionStorage.setItem(sessionKey, JSON.stringify({ items, total, page })) } catch {}
  }, [items, total, page, hydrated, sessionKey])

  useEffect(() => {
    if (prevKeyRef.current === sessionKey) return
    prevKeyRef.current = sessionKey
    try { Object.keys(sessionStorage).forEach(k => { if (k.startsWith('cgrid_')) sessionStorage.removeItem(k) }) } catch {}
    setItems(initialItems)
    setTotal(initialTotal)
    setPage(1)
    setActiveTab('all')
    forYouFetched.current = false
    setForYouItems([])
  }, [sessionKey, initialItems, initialTotal])

  const fetchForYou = useCallback(async () => {
    if (forYouFetched.current || !userId) return
    forYouFetched.current = true
    setForYouLoading(true)
    try {
      const params = new URLSearchParams({
        limit:           '48',
        content_ratings: contentRatings.join(','),
      })
      const res  = await fetch(`/api/recommendations/personalized?${params}`)
      const data = await res.json()
      setForYouItems(data.recommendations ?? [])
    } catch {
      setForYouItems([])
    } finally {
      setForYouLoading(false)
    }
  }, [userId, contentRatings])

  const handleTabChange = (tab: GridTab) => {
    setActiveTab(tab)
    if (tab === 'foryou') fetchForYou()
  }

  const hasMore = items.length < total

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return
    setLoading(true)
    try {
      const nextPage = page + 1
      const params   = new URLSearchParams({ ...searchParams, page: String(nextPage), limit: String(PAGE_SIZE) })
      const res      = await fetch(`${apiPath}?${params}`)
      const data     = await res.json()
      setItems(prev => [...prev, ...(data.recommendations ?? data.data ?? [])])
      setPage(nextPage)
    } catch {
      console.error('Failed to load more')
    } finally {
      setLoading(false)
    }
  }, [page, searchParams, apiPath, loading, hasMore])

  // ── Infinite scroll via IntersectionObserver ──
  useEffect(() => {
    if (activeTab !== 'all') return
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadMore()
        }
      },
      { rootMargin: '200px' } // start loading 200px before hitting the bottom
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [activeTab, hasMore, loading, loadMore])

  const activeQuery  = searchParams.q      ?? ''
  const activeType   = searchParams.type   ?? ''
  const activeGenre  = searchParams.genre  ?? ''
  const activeStatus = searchParams.status ?? ''
  const hasFilters   = !!(activeQuery || activeType || activeGenre || activeStatus)

  const showTabs = !!userId

  return (
    <div className="space-y-4">

      {/* Tab switcher */}
      {showTabs && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleTabChange('all')}
            className={cn(
              'px-3.5 py-1.5 rounded-full text-sm border transition-colors',
              activeTab === 'all'
                ? 'bg-foreground text-background border-foreground'
                : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/40'
            )}
          >
            All comics
          </button>
          <button
            onClick={() => forYouUnlocked && handleTabChange('foryou')}
            className={cn(
              'px-3.5 py-1.5 rounded-full text-sm border transition-colors inline-flex items-center gap-1.5',
              activeTab === 'foryou'
                ? 'bg-foreground text-background border-foreground'
                : forYouUnlocked
                ? 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/40'
                : 'border-dashed border-border text-muted-foreground/60 cursor-not-allowed'
            )}
            title={!forYouUnlocked ? `Vote or save ${MIN_INTERACTIONS - interactionCount} more comics to unlock` : undefined}
          >
            For you
            {!forYouUnlocked && (
              <span className="text-[10px] tabular-nums">{interactionCount}/{MIN_INTERACTIONS}</span>
            )}
          </button>
        </div>
      )}

      {showTabs && !forYouUnlocked && interactionCount >= MIN_INTERACTIONS - 3 && (
        <p className="text-xs text-muted-foreground">
          <span className="text-foreground">
            {MIN_INTERACTIONS - interactionCount} more vote{MIN_INTERACTIONS - interactionCount !== 1 ? 's' : ''} or save{MIN_INTERACTIONS - interactionCount !== 1 ? 's' : ''}
          </span>
          {' '}to unlock your personalised feed.
        </p>
      )}

      {/* For You tab */}
      {activeTab === 'foryou' && (
        <>
          {forYouLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-3 gap-y-6">
              {Array.from({ length: 12 }).map((_, i) => <ComicCardSkeleton key={i} />)}
            </div>
          ) : forYouItems.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center">
              <p className="font-dashboard-serif text-xl text-foreground">Nothing to show yet</p>
              <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">
                Vote and save comics in the All comics tab. Your feed builds up as you go.
              </p>
              <button
                onClick={() => handleTabChange('all')}
                className="mt-4 text-sm text-foreground underline underline-offset-4 decoration-border hover:decoration-foreground transition-colors"
              >
                Back to all comics
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground/70">
                {forYouItems.length} picks based on your taste
              </p>
            
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-3 gap-y-6">
                {forYouItems.map(rec => <ComicCard key={rec.id} recommendation={rec} showGenres />)}
              </div>
            </div>
          )}
        </>
      )}

      {/* All Comics tab */}
      {activeTab === 'all' && (
        <>
          {!items.length ? (
            <div className="rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center">
              {activeQuery ? (
                <>
                  <p className="font-dashboard-serif text-xl text-foreground">No results for “{activeQuery}”</p>
                  <p className="text-sm text-muted-foreground mt-2">Try a different title or author name.</p>
                  <Link href="/browse" className="inline-block mt-4 text-sm text-foreground underline underline-offset-4 decoration-border hover:decoration-foreground transition-colors">Clear search</Link>
                </>
              ) : hasFilters ? (
                <>
                  <p className="font-dashboard-serif text-xl text-foreground">No comics match these filters</p>
                  <p className="text-sm text-muted-foreground mt-2">Try loosening the filters or clearing them.</p>
                  <Link href="/browse" className="inline-block mt-4 text-sm text-foreground underline underline-offset-4 decoration-border hover:decoration-foreground transition-colors">Clear filters</Link>
                </>
              ) : (
                <>
                  <p className="font-dashboard-serif text-xl text-foreground">No comics yet</p>
                  <p className="text-sm text-muted-foreground mt-2">Be the first to add a recommendation.</p>
                  <Link href={isPro ? '/pro/reader/dashboard/recommendations/new' : '/reader/dashboard/recommendations/new'} className="inline-block mt-4">
                    <Button size="sm">Submit one now</Button>
                  </Link>
                </>
              )}
            </div>
          ) : (
            <>
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground/70">
                {items.length} of {total} comic{total !== 1 ? 's' : ''}
              </p>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-3 gap-y-6">
                {items.map(rec => <ComicCard key={rec.id} recommendation={rec} showGenres />)}
              </div>

              {/* Infinite scroll sentinel */}
              <div ref={sentinelRef} className="flex justify-center py-4">
                {loading && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 size={14} className="animate-spin" />
                    Loading more…
                  </div>
                )}
              </div>

              {!hasMore && items.length > PAGE_SIZE && (
                <p className="text-center text-xs text-muted-foreground py-2">
                  That’s all {total} comics.
                </p>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}