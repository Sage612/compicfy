'use client'

import { useState, useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import { ComicCard } from '@/components/recommendations/ComicCard'
import { ComicCardSkeleton } from '@/components/recommendations/ComicCardSkeleton'
import { Button } from '@/components/ui/button'
import { BookOpen, Loader2, Plus, Sparkles, LayoutGrid, Lock, Search } from 'lucide-react'
import Link from 'next/link'
import type { Recommendation } from '@/types/database.types'
import { cn } from '@/lib/utils'

interface Props {
  initialItems:      Recommendation[]
  initialTotal:      number
  searchParams:      Record<string, string>
  apiPath?:          string
  userId?:           string | null
  interactionCount?: number
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

  // ── Session restore ──────────────────────────────────────────────
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
      const res  = await fetch('/api/recommendations/personalized?limit=48')
      const data = await res.json()
      setForYouItems(data.recommendations ?? [])
    } catch {
      setForYouItems([])
    } finally {
      setForYouLoading(false)
    }
  }, [userId])

  const handleTabChange = (tab: GridTab) => {
    setActiveTab(tab)
    if (tab === 'foryou') fetchForYou()
  }

  const hasMore = items.length < total

  const loadMore = useCallback(async () => {
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
  }, [page, searchParams, apiPath])

  // ── Derive active filter info for empty state messaging ──────────
  const activeQuery  = searchParams.q      ?? ''
  const activeType   = searchParams.type   ?? ''
  const activeGenre  = searchParams.genre  ?? ''
  const activeStatus = searchParams.status ?? ''
  const hasFilters   = !!(activeQuery || activeType || activeGenre || activeStatus)

  const emptyTitle = activeQuery
    ? `No results for "${activeQuery}"`
    : hasFilters
    ? 'No comics match these filters'
    : 'No comics yet'

  const emptySubtext = activeQuery
    ? 'Try a different title, author, or genre'
    : hasFilters
    ? 'Try adjusting or clearing your filters'
    : 'Be the first to add a recommendation!'

  const showTabs = !!userId

  return (
    <div className="space-y-4">

      {/* Tab switcher */}
      {showTabs && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleTabChange('all')}
            className={cn(
              'flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-sm font-semibold border transition-all',
              activeTab === 'all'
                ? 'bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/20'
                : 'bg-card border-border text-muted-foreground hover:text-foreground hover:border-primary/50'
            )}
          >
            <LayoutGrid size={13} />
            All Comics
          </button>
          <button
            onClick={() => forYouUnlocked && handleTabChange('foryou')}
            className={cn(
              'flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-sm font-semibold border transition-all',
              activeTab === 'foryou'
                ? 'bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/20'
                : forYouUnlocked
                ? 'bg-card border-border text-muted-foreground hover:text-foreground hover:border-primary/50'
                : 'bg-card border-border text-muted-foreground opacity-60 cursor-not-allowed'
            )}
            title={!forYouUnlocked ? `Vote or save ${MIN_INTERACTIONS - interactionCount} more comics to unlock` : undefined}
          >
            <Sparkles size={13} />
            For You
            {!forYouUnlocked && (
              <span className="flex items-center gap-0.5 text-[10px] font-bold text-muted-foreground ml-0.5">
                <Lock size={9} />
                {interactionCount}/{MIN_INTERACTIONS}
              </span>
            )}
          </button>
        </div>
      )}

      {showTabs && !forYouUnlocked && interactionCount >= MIN_INTERACTIONS - 3 && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl border border-primary/20 bg-primary/5">
          <Sparkles size={13} className="text-primary shrink-0" />
          <p className="text-xs text-muted-foreground">
            <span className="text-primary font-semibold">
              {MIN_INTERACTIONS - interactionCount} more vote{MIN_INTERACTIONS - interactionCount !== 1 ? 's' : ''} or save{MIN_INTERACTIONS - interactionCount !== 1 ? 's' : ''}
            </span>
            {' '}to unlock your personalised feed
          </p>
        </div>
      )}

      {/* For You tab */}
      {activeTab === 'foryou' && (
        <>
          {forYouLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {Array.from({ length: 12 }).map((_, i) => <ComicCardSkeleton key={i} />)}
            </div>
          ) : forYouItems.length === 0 ? (
            /* ── For You empty state ── */
            <div className="relative flex flex-col items-center justify-center py-20 rounded-2xl border border-dashed border-border overflow-hidden">
              <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
              <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-violet-500/5 blur-3xl pointer-events-none" />
              <div className="relative mb-8 w-36 h-36 mx-auto">
                <div className="absolute top-0 left-0 w-20 h-28 rounded-2xl border-2 border-border bg-card rotate-[-12deg] opacity-40" />
                <div className="absolute top-2 left-6 w-20 h-28 rounded-2xl border-2 border-border bg-card rotate-[-5deg] opacity-60" />
                <div className="absolute top-4 left-10 w-20 h-28 rounded-2xl border-2 border-primary/30 bg-card shadow-xl flex flex-col items-center justify-center gap-1">
                  <Sparkles size={18} className="text-primary opacity-60" />
                  <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest text-center px-1">For You</span>
                </div>
              </div>
              <p className="text-sm font-black">No personalised picks yet</p>
              <p className="text-xs text-muted-foreground mt-1">Vote and save more comics to improve your recommendations</p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {forYouItems.length} picks based on your taste
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {forYouItems.map(rec => <ComicCard key={rec.id} recommendation={rec} />)}
              </div>
            </div>
          )}
        </>
      )}

      {/* All Comics tab */}
      {activeTab === 'all' && (
        <>
          {!items.length ? (
            /* ── Comic-panel empty state ── */
            <div className="relative flex flex-col items-center justify-center py-20 rounded-2xl border border-dashed border-border overflow-hidden">
              <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
              <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-violet-500/5 blur-3xl pointer-events-none" />

              <div className="relative mb-8 w-36 h-36 mx-auto">
                <div className="absolute top-0 left-0 w-20 h-28 rounded-2xl border-2 border-border bg-card rotate-[-12deg] opacity-40" />
                <div className="absolute top-2 left-6 w-20 h-28 rounded-2xl border-2 border-border bg-card rotate-[-5deg] opacity-60" />
                <div className="absolute top-4 left-10 w-20 h-28 rounded-2xl border-2 border-primary/30 bg-card shadow-xl flex flex-col items-center justify-center gap-1">
                  {activeQuery
                    ? <Search size={18} className="text-primary opacity-60" />
                    : <BookOpen size={18} className="text-primary opacity-60" />
                  }
                  <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest text-center px-1">
                    {activeQuery ? 'No results' : 'Empty'}
                  </span>
                </div>
              </div>

              <p className="text-sm font-black">{emptyTitle}</p>
              <p className="text-xs text-muted-foreground mt-1 text-center max-w-xs px-4">{emptySubtext}</p>

              <div className="flex flex-wrap gap-3 justify-center mt-6">
                {hasFilters && (
                  <Link href="/browse">
                    <Button variant="outline" size="sm" className="gap-1.5">
                      Clear filters
                    </Button>
                  </Link>
                )}
                {!hasFilters && (
                  <Link href="/dashboard/recommendations/new">
                    <Button size="sm" className="gap-2 bg-gradient-to-r from-primary to-violet-500 hover:opacity-90 border-0 shadow-lg shadow-primary/20">
                      <Plus size={14} />
                      Submit a Recommendation
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {items.length} of {total} comic{total !== 1 ? 's' : ''}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {items.map(rec => <ComicCard key={rec.id} recommendation={rec} />)}
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
            </>
          )}
        </>
      )}
    </div>
  )
}