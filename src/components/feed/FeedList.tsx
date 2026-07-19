'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { FeedCard } from './FeedCard'
import { Loader2, BookOpen, LayoutList, UserPlus, Radar } from 'lucide-react'
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

  const [reactionCounts, setReactionCounts] = useState<Record<string, number>>({})
  const [userReactions,  setUserReactions]  = useState<Record<string, boolean>>({})

  // Top contributors to follow — fetched only when following nobody
  const [topContributors, setTopContributors] = useState<any[]>([])
  const [followingIds,    setFollowingIds]    = useState<Set<string>>(new Set())
  const [followLoading,   setFollowLoading]   = useState<string | null>(null)

  const supabase   = createClient()
  const mountedRef = useRef(true)
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  useEffect(() => {
    setItems(initialItems)
    setTotal(initialTotal)
    setHasMore(initialHasMore)
    setOffset(initialItems.length)
    setReactionCounts({})
    setUserReactions({})
  }, [tab])

  // Fetch top contributors when following nobody on following tab
  useEffect(() => {
    if (!(tab === 'following' && isFollowingNobody)) return

    const fetchContributors = async () => {
      try {
        const res  = await fetch('/api/users/top-contributors?limit=6')
        const data = await res.json()
        setTopContributors(data.users ?? [])
      } catch { /* non-fatal */ }
    }

    fetchContributors()
  }, [tab, isFollowingNobody])

  const handleFollow = async (profileId: string) => {
    setFollowLoading(profileId)
    try {
      const res = await fetch('/api/follows', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ following_id: profileId }),
      })
      if (res.ok) {
        setFollowingIds(prev => new Set([...prev, profileId]))
        toast.success('Following!')
      }
    } catch { /* silent */ } finally {
      setFollowLoading(null)
    }
  }

  // Reactions only apply to recommendation-type feed items — collections,
  // lists, and reviews don't have a reactions row to look up.
  const fetchReactions = useCallback(async (currentItems: any[]) => {
    const recIds = currentItems
      .filter((i: any) => i.item_type === 'recommendation')
      .map((i: any) => i.id)
    if (recIds.length === 0) return

    const { data } = await supabase
      .from('reactions')
      .select('recommendation_id, user_id')
      .in('recommendation_id', recIds)

    if (!mountedRef.current) return

    const counts: Record<string, number>  = {}
    const mine:   Record<string, boolean> = {}

    ;(data ?? []).forEach((r: any) => {
      counts[r.recommendation_id] = (counts[r.recommendation_id] ?? 0) + 1
      if (r.user_id === userId) mine[r.recommendation_id] = true
    })

    setReactionCounts(prev => ({ ...prev, ...counts }))
    setUserReactions(prev  => ({ ...prev, ...mine  }))
  }, [userId])

  useEffect(() => { fetchReactions(items) }, [items])

  const handleReactionToggle = useCallback((id: string, reacted: boolean) => {
    setUserReactions(prev  => ({ ...prev, [id]: reacted }))
    setReactionCounts(prev => ({
      ...prev,
      [id]: reacted ? (prev[id] ?? 0) + 1 : Math.max(0, (prev[id] ?? 1) - 1),
    }))
  }, [])

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) })
      const res    = await fetch(`/api/feed/${tab}?${params}`)
      const data   = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to load')
      if (!mountedRef.current) return
      const newItems = data.items ?? []
      setItems(prev => [...prev, ...newItems])
      setOffset(prev => prev + newItems.length)
      setHasMore(data.hasMore ?? false)
      setTotal(data.total ?? total)
    } catch {
      toast.error('Failed to load more')
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [loading, hasMore, offset, tab, total])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore() },
      { rootMargin: '200px' }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [loadMore])

  // ── Empty: following nobody ─────────────────────────────────────
  if (tab === 'following' && isFollowingNobody) {
    return (
      <div className="space-y-6">
        {/* Comic-panel empty state */}
        <div className="relative flex flex-col items-center justify-center py-16 rounded-2xl border border-dashed border-border overflow-hidden">
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-violet-500/5 blur-3xl pointer-events-none" />
          <div className="relative mb-8 w-36 h-36 mx-auto">
            <div className="absolute top-0 left-0 w-20 h-28 rounded-2xl border-2 border-border bg-card rotate-[-12deg] opacity-40" />
            <div className="absolute top-2 left-6 w-20 h-28 rounded-2xl border-2 border-border bg-card rotate-[-5deg] opacity-60" />
            <div className="absolute top-4 left-10 w-20 h-28 rounded-2xl border-2 border-primary/30 bg-card shadow-xl flex flex-col items-center justify-center gap-1">
              <UserPlus size={18} className="text-primary opacity-60" />
              <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest text-center px-1">Follow</span>
            </div>
          </div>
          <p className="text-sm font-black">You're not following anyone yet</p>
          <p className="text-xs text-muted-foreground mt-1 text-center max-w-xs px-4">
            Follow readers whose taste you trust to see their picks here
          </p>
          <div className="flex gap-3 justify-center mt-6">
            <Link href="/browse">
              <Button className="gap-2 bg-primary hover:opacity-90 border-0 shadow-md shadow-primary/20" size="sm">
                <Radar size={14} />
                Discover Comics
              </Button>
            </Link>
            <Link href="/feed?tab=discover">
              <Button variant="outline" size="sm" className="gap-2">
                Try Discover
              </Button>
            </Link>
          </div>
        </div>

        {/* Top contributors to follow */}
        {topContributors.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                Suggested readers to follow
              </p>
              <div className="flex-1 h-px bg-border" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {topContributors.map((contributor: any) => {
                const initials   = (contributor.display_name || contributor.username || 'U').slice(0, 2).toUpperCase()
                const isFollowed = followingIds.has(contributor.id)
                return (
                  <div
                    key={contributor.id}
                    className="flex items-center gap-3 p-3 rounded-2xl border border-border bg-card hover:border-primary/30 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center text-white text-xs font-bold shrink-0 overflow-hidden">
                      {contributor.avatar_url
                        ? <img src={contributor.avatar_url} alt={initials} className="w-full h-full object-cover" />
                        : initials
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black truncate">
                        {contributor.display_name || contributor.username}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {contributor.total_recommendations ?? 0} recommendations
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant={isFollowed ? 'outline' : 'default'}
                      className={isFollowed
                        ? 'h-7 text-xs px-3 gap-1 border-primary/30 text-primary'
                        : 'h-7 text-xs px-3 gap-1 bg-gradient-to-r from-primary to-violet-500 border-0 hover:opacity-90'
                      }
                      onClick={() => !isFollowed && handleFollow(contributor.id)}
                      disabled={followLoading === contributor.id || isFollowed}
                    >
                      {followLoading === contributor.id
                        ? <Loader2 size={11} className="animate-spin" />
                        : isFollowed ? '✓ Following' : '+ Follow'
                      }
                    </Button>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── Empty: following someone but no recs yet ─────────────────────
  if (tab === 'following' && !isFollowingNobody && items.length === 0) {
    return (
      <div className="relative flex flex-col items-center justify-center py-20 rounded-2xl border border-dashed border-border overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-violet-500/5 blur-3xl pointer-events-none" />
        <div className="relative mb-8 w-36 h-36 mx-auto">
          <div className="absolute top-0 left-0 w-20 h-28 rounded-2xl border-2 border-border bg-card rotate-[-12deg] opacity-40" />
          <div className="absolute top-2 left-6 w-20 h-28 rounded-2xl border-2 border-border bg-card rotate-[-5deg] opacity-60" />
          <div className="absolute top-4 left-10 w-20 h-28 rounded-2xl border-2 border-primary/30 bg-card shadow-xl flex flex-col items-center justify-center gap-1">
            <LayoutList size={18} className="text-primary opacity-60" />
            <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest text-center px-1">Empty</span>
          </div>
        </div>
        <p className="text-sm font-black">Nothing here yet</p>
        <p className="text-xs text-muted-foreground mt-1 text-center max-w-xs px-4">
          The people you follow haven't shared any approved recommendations, collections, lists, or reviews yet
        </p>
        <Link href="/feed?tab=discover" className="mt-6">
          <Button variant="outline" size="sm" className="gap-2">
            <LayoutList size={14} />
            Try Discover Instead
          </Button>
        </Link>
      </div>
    )
  }

  // ── Empty: discover tab ───────────────────────────────────────────
  if (tab === 'discover' && items.length === 0) {
    return (
      <div className="relative flex flex-col items-center justify-center py-20 rounded-2xl border border-dashed border-border overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-violet-500/5 blur-3xl pointer-events-none" />
        <div className="relative mb-8 w-36 h-36 mx-auto">
          <div className="absolute top-0 left-0 w-20 h-28 rounded-2xl border-2 border-border bg-card rotate-[-12deg] opacity-40" />
          <div className="absolute top-2 left-6 w-20 h-28 rounded-2xl border-2 border-border bg-card rotate-[-5deg] opacity-60" />
          <div className="absolute top-4 left-10 w-20 h-28 rounded-2xl border-2 border-primary/30 bg-card shadow-xl flex flex-col items-center justify-center gap-1">
            <BookOpen size={18} className="text-primary opacity-60" />
            <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest text-center px-1">Discover</span>
          </div>
        </div>
        <p className="text-sm font-black">Nothing to discover yet</p>
        <p className="text-xs text-muted-foreground mt-1">Be the first to recommend a comic</p>
        <Link href="/reader/dashboard/recommendations/new" className="mt-6">
          <Button size="sm" className="gap-2 bg-gradient-to-r from-primary to-violet-500 hover:opacity-90 border-0 shadow-md shadow-primary/20">
            Submit a Recommendation
          </Button>
        </Link>
      </div>
    )
  }

  // ── Feed items ─────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        {items.length} of {total} item{total !== 1 ? 's' : ''}
      </p>

      <div className="space-y-3">
        {items.map((item: any) => (
          <FeedCard

            key={`${item.item_type}-${item.id}`}
            rec={item}
            isLoggedIn={true}
            reactionCount={item.item_type === 'recommendation' ? (reactionCounts[item.id] ?? 0) : 0}
            userReacted={item.item_type === 'recommendation' ? (userReactions[item.id] ?? false) : false}
            onReactionToggle={handleReactionToggle}
          />
        ))}
      </div>

      <div ref={sentinelRef} className="h-4" />

      {loading && (
        <div className="flex justify-center py-4">
          <Loader2 size={20} className="animate-spin text-muted-foreground" />
        </div>
      )}

      {!hasMore && items.length >= PAGE_SIZE && (
        <p className="text-center text-xs text-muted-foreground py-4">
          You've seen everything 🎉
        </p>
      )}
    </div>
  )
}