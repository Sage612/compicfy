import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { BookOpen, Rss, UserPlus, LayoutList   } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FeedCard } from '@/components/feed/FeedCard'
import { FeedTabs } from '@/components/feed/FeedTabs'
import { TrendingSidebar } from '@/components/feed/TrendingSidebar'
import { Suspense } from 'react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Feed | Compicfy' }

interface Props {
  searchParams: Promise<{ tab?: string }>
}

export default async function FeedPage({ searchParams }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { tab } = await searchParams
  const activeTab = tab === 'discover' ? 'discover' : 'following'

  // Following count
  const { count: followingCount } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('follower_id', user.id)

  // Feed items based on tab
  let items: any[] = []

  if (activeTab === 'following') {
    const { data } = await (supabase as any).rpc('get_following_feed', {
      p_user_id: user.id,
      p_limit: 30,
    })
    items = data ?? []
  } else {
    const { data } = await (supabase as any).rpc('get_discover_feed', {
      p_user_id: user.id,
      p_limit: 30,
    })
    items = data ?? []
  }

  // Trending sidebar
  const { data: trendingData } = await (supabase as any).rpc('get_trending_feed', {
    p_limit: 8,
  })
  const trending = trendingData ?? []

  // Get reaction counts and user reactions for all feed items
  const itemIds = items.map((i: any) => i.id)
  let reactionCounts: Record<string, number> = {}
  let userReactions: Record<string, boolean> = {}

  if (itemIds.length > 0) {
    const { data: reactions } = await supabase
      .from('reactions')
      .select('recommendation_id, user_id')
      .in('recommendation_id', itemIds)

    const allReactions = reactions ?? []

    // Count reactions per item
    allReactions.forEach((r: any) => {
      reactionCounts[r.recommendation_id] = (reactionCounts[r.recommendation_id] ?? 0) + 1
      if (r.user_id === user.id) {
        userReactions[r.recommendation_id] = true
      }
    })
  }

  const isFollowingNobody = (followingCount ?? 0) === 0

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex gap-8">

        {/* ── Main feed ── */}
        <div className="flex-1 min-w-0 space-y-6">

          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center shadow-lg shadow-primary/20">
              <LayoutList size={16} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">Feed</h1>
              <p className="text-muted-foreground text-sm">
                {activeTab === 'following'
                  ? 'Latest from people you follow'
                  : 'Discover what the community is recommending'}
              </p>
            </div>
          </div>

          {/* Tabs */}
          <Suspense>
            <FeedTabs />
          </Suspense>

          {/* Following tab — empty states */}
          {activeTab === 'following' && isFollowingNobody && (
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
                    <BookOpen size={14} />
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
          )}

          {activeTab === 'following' && !isFollowingNobody && items.length === 0 && (
            <div className="text-center py-20 rounded-2xl border border-dashed border-border space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto">
                <Rss size={22} className="text-muted-foreground opacity-40" />
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
          )}

          {/* Discover tab — empty state */}
          {activeTab === 'discover' && items.length === 0 && (
            <div className="text-center py-20 rounded-2xl border border-dashed border-border space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto">
                <BookOpen size={22} className="text-muted-foreground opacity-40" />
              </div>
              <div>
                <h3 className="font-black text-lg">Nothing to discover yet</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Be the first to recommend a comic
                </p>
              </div>
              <Link href="/dashboard/recommendations/new">
                <Button className="gap-2 bg-gradient-to-r from-primary to-violet-500 hover:opacity-90 border-0">
                  Submit a Recommendation
                </Button>
              </Link>
            </div>
          )}

          {/* Feed items */}
          {items.length > 0 && (
            <div className="space-y-3">
              {items.map((rec: any) => (
                <FeedCard
                  key={rec.id}
                  rec={rec}
                  isLoggedIn={!!user}
                  reactionCount={reactionCounts[rec.id] ?? 0}
                  userReacted={userReactions[rec.id] ?? false}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Trending sidebar — desktop only ── */}
<div className="hidden lg:block w-72 shrink-0 self-start sticky top-20">
  <div className="max-h-[calc(100vh-6rem)] overflow-y-auto no-scrollbar space-y-4 pb-4">
    <TrendingSidebar trending={trending} />
  </div>
</div>

      </div>
    </div>
  )
}