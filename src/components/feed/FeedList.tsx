'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { FeedCard } from './FeedCard'
import { Button } from '@/components/ui/button'
import { Loader2, Plus, BookOpen, LayoutList, UserPlus, Search } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

interface Props {
  initialItems:    any[]
  initialTotal:    number
  initialHasMore:  boolean
  tab:             'following' | 'discover'
  userId:          string
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
  const [items, setItems]       = useState<any[]>(initialItems)
  const [total, setTotal]       = useState(initialTotal)
  const [hasMore, setHasMore]   = useState(initialHasMore)
  const [loading, setLoading]   = useState(false)
  const [offset, setOffset]     = useState(initialItems.length)

  // Reaction state — keyed by recommendation id
  const [reactionCounts, setReactionCounts] = useState<Record<string, number>>({})
  const [userReactions, setUserReactions]   = useState<Record<string, boolean>>({})

  const supabase   = createClient()
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  // Reset when tab changes
  useEffect(() => {
    setItems(initialItems)
    setTotal(initialTotal)
    setHasMore(initialHasMore)
    setOffset(initialItems.length)
  }, [tab, initialItems, initialTotal, initialHasMore])

  // Fetch reactions for visible items
  useEffect(() => {
    if (items.length === 0) return
    const ids = items.map(i => i.id)

    const fetchReactions = async () => {
      const { data } = await supabase
        .from('reactions')
        .select('recommendation_id, user_id')
        .in('recommendation_id', ids)

      if (!mountedRef.current) return

      const counts: Record<string, number> = {}
      const mine:   Record<string, boolean> = {}

      ;(data ?? []).forEach((r: any) => {
        counts[r.recommendation_id] = (counts[r.recommendation_id] ?? 0) + 1
        if (r.user_id === userId) mine[r.recommendation_id] = true
      })

      setReactionCounts(counts)
      setUserReactions(mine)
    }

    fetchReactions()
  }, [items, userId])

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
            reactionCount={reactionCounts[rec.id] ?? 0}
            userReacted={userReactions[rec.id]   ?? false}
          />
        ))}
      </div>

      {/* Load more */}
      {hasMore && (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            onClick={loadMore}
            disabled={loading}
            className="gap-2 min-w-[160px] rounded-xl border-border hover:border-primary/50 hover:bg-primary/5 hover:text-primary transition-all"
          >
            {loading
              ? <><Loader2 size={14} className="animate-spin" /> Loading…</>
              : <><Plus size={14} /> Load more · {total - items.length} left</>
            }
          </Button>
        </div>
      )}

      {/* End of feed */}
      {!hasMore && items.length > PAGE_SIZE && (
        <p className="text-center text-xs text-muted-foreground py-4">
          You've seen everything 🎉
        </p>
      )}
    </div>
  )
}