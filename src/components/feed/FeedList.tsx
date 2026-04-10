'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { FeedCard } from './FeedCard'
import { Loader2, BookOpen, LayoutList, UserPlus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

interface Props {
  initialItems:      any[]
  initialTotal:      number
  initialHasMore:    boolean
  tab:               'following' | 'discover'
  userId:            string
  isFollowingNobody: boolean
}

const PAGE_SIZE = 20

export function FeedList({
  initialItems,
  initialTotal,
  initialHasMore,
  tab,
  userId,
  isFollowingNobody,
}: Props) {
  const [items,   setItems]   = useState<any[]>(initialItems)
  const [total,   setTotal]   = useState(initialTotal)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [loading, setLoading] = useState(false)
  const [offset,  setOffset]  = useState(initialItems.length)

  // Reaction state — keyed by recommendation id
  const [reactionCounts,  setReactionCounts]  = useState<Record<string, number>>({})
  const [userReactions,   setUserReactions]   = useState<Record<string, boolean>>({})

  const supabase    = createClient()
  const mountedRef  = useRef(true)
  // Sentinel div at the bottom — IntersectionObserver watches this
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  // Reset when tab changes (server re-renders with new initialItems)
  useEffect(() => {
    setItems(initialItems)
    setTotal(initialTotal)
    setHasMore(initialHasMore)
    setOffset(initialItems.length)
  }, [tab]) // intentionally only tab — initialItems reference changes on every render

  // Fetch reactions for all visible items
  useEffect(() => {
    if (items.length === 0) return
    const ids = items.map(i => i.id)

    const fetchReactions = async () => {
      const { data } = await supabase
        .from('reactions')
        .select('recommendation_id, user_id')
        .in('recommendation_id', ids)

      if (!mountedRef.current) return

      const counts: Record<string, number>  = {}
      const mine:   Record<string, boolean> = {}

      ;(data ?? []).forEach((r: any) => {
        counts[r.recommendation_id] = (counts[r.recommendation_id] ?? 0) + 1
        if (r.user_id === userId) mine[r.recommendation_id] = true
      })

      setReactionCounts(counts)
      setUserReactions(mine)
    }

    fetchReactions()
  }, [items.length]) // re-fetch whenever item count grows (new page loaded)

  // Keep reaction state in sync after a toggle from ReactionButton
  const handleReactionToggle = useCallback((id: string, reacted: boolean) => {
    setUserReactions(prev  => ({ ...prev, [id]: reacted }))
    setReactionCounts(prev => ({
      ...prev,
      [id]: reacted ? (prev[id] ?? 0) + 1 : Math.max(0, (prev[id] ?? 1) - 1),
    }))
  }, [])

  // Load next page
  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return
    setLoading(true)

    try {
      const params = new URLSearchParams({
        limit:  String(PAGE_SIZE),
        offset: String(offset),
      })
      const res  = await fetch(`/api/feed/${tab}?${params}`)
      const data = await res.json()

      if (!res.ok) throw new Error(data.error ?? 'Failed to load')
      if (!mountedRef.current) return

      setItems(prev => [...prev, ...(data.items ?? [])])
      setOffset(prev => prev + (data.items ?? []).length)
      setHasMore(data.hasMore ?? false)
      setTotal(data.total ?? total)
    } catch {
      toast.error('Failed to load more')
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [loading, hasMore, offset, tab, total])

  // IntersectionObserver — fires loadMore when sentinel scrolls into view
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore()
      },
      { rootMargin: '200px' } // start loading 200px before the bottom
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [loadMore]) // loadMore ref changes when offset/hasMore changes

  // ── Empty states ──
  if (tab === 'following' && isFollowingNobody) {
    return (
      <div className="text-center py-20 rounded-2xl border border-dashed border-border space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto">
          <UserPlus size={22} className="text-muted-foreground opacity-40" />
        </div>
        <div>
          <h3 className="font-black text-lg">You're not following anyone yet</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
            Follow users whose taste you trust to see their picks here
          </p>
        </div>
        <div className="flex gap-3 justify-center">
          <Link href="/browse">
            <Button className="gap-2 bg-gradient-to-r from-primary to-violet-500 hover:opacity-90 border-0">
              <Search size={14} />
              Discover Comics
            </Button>
          </Link>
          <Link
            href="/feed?tab=discover"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-card text-sm font-semibold text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
          >
            Try Discover
          </Link>
        </div>
      </div>
    )
  }

  if (tab === 'following' && !isFollowingNobody && items.length === 0) {
    return (
      <div className="text-center py-20 rounded-2xl border border-dashed border-border space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto">
          <LayoutList size={22} className="text-muted-foreground opacity-40" />
        </div>
        <div>
          <h3 className="font-black text-lg">Nothing here yet</h3>
          <p className="text-sm text-muted-foreground mt-1">
            The people you follow haven't shared any approved recommendations yet
          </p>
        </div>
        <Link href="/feed?tab=discover">
          <Button variant="outline" className="gap-2">
            <BookOpen size={14} />
            Try Discover Instead
          </Button>
        </Link>
      </div>
    )
  }

  if (tab === 'discover' && items.length === 0) {
    return (
      <div className="text-center py-20 rounded-2xl border border-dashed border-border space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto">
          <BookOpen size={22} className="text-muted-foreground opacity-40" />
        </div>
        <div>
          <h3 className="font-black text-lg">Nothing to discover yet</h3>
          <p className="text-sm text-muted-foreground mt-1">Be the first to recommend a comic</p>
        </div>
        <Link href="/dashboard/recommendations/new">
          <Button className="gap-2 bg-gradient-to-r from-primary to-violet-500 hover:opacity-90 border-0">
            Submit a Recommendation
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">

      {/* Item count */}
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        {items.length} of {total} recommendation{total !== 1 ? 's' : ''}
      </p>

      {/* Feed items */}
      <div className="space-y-3">
        {items.map((rec: any) => (
          <FeedCard
            key={rec.id}
            rec={rec}
            isLoggedIn={true}
            reactionCount={reactionCounts[rec.id] ?? rec.upvotes ?? 0}
            userReacted={userReactions[rec.id]    ?? false}
            onReactionToggle={handleReactionToggle}
          />
        ))}
      </div>

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} className="h-4" />

      {/* Loading spinner — shown while fetching next page */}
      {loading && (
        <div className="flex justify-center py-4">
          <Loader2 size={20} className="animate-spin text-muted-foreground" />
        </div>
      )}

      {/* End of feed */}
      {!hasMore && items.length >= PAGE_SIZE && (
        <p className="text-center text-xs text-muted-foreground py-4">
          You've seen everything 🎉
        </p>
      )}
    </div>
  )
}