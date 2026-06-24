import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { LayoutList } from 'lucide-react'
import { FeedTabs } from '@/components/feed/FeedTabs'
import { FeedList } from '@/components/feed/FeedList'
import { TrendingSidebar } from '@/components/feed/TrendingSidebar'
import { Suspense } from 'react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Feed' }

interface Props {
  searchParams: Promise<{ tab?: string }>
}

const PAGE_SIZE = 20

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

  const isFollowingNobody = (followingCount ?? 0) === 0

  // ── Initial items for active tab ──
  let initialItems: any[] = []
  let initialTotal  = 0
  let initialHasMore = false

  if (activeTab === 'following' && !isFollowingNobody) {
    // Get followed user IDs
    const { data: followData } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id)

    const followingIds = (followData ?? []).map((f: any) => f.following_id)

    // Count
    const { count } = await supabase
      .from('recommendations')
      .select('*', { count: 'exact', head: true })
      .in('user_id', followingIds)
      .eq('is_approved', true)
      .not('content_rating', 'in', '("adult","mature")')

    initialTotal = count ?? 0

    // First page
    const { data: recs } = await supabase 
      .from('recommendations')
      .select(`
        id, title, cover_url, type, status, genres, description,
        upvotes, review_count, created_at, user_id,
        profiles!recommendations_user_id_fkey(
          username, display_name, avatar_url,
          role, is_pro, pro_expires_at, verified_recommender
        )
      `)
      .in('user_id', followingIds)
      .eq('is_approved', true)
      .not('content_rating', 'in', '("adult","mature")')
      .order('created_at', { ascending: false })
      .range(0, PAGE_SIZE - 1)

    initialItems = (recs ?? []).map((r: any) => {
      const p = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles
      return {
        ...r,
        username:             p?.username             ?? '',
        display_name:         p?.display_name         ?? null,
        avatar_url:           p?.avatar_url           ?? null,
        role:                 p?.role                 ?? 'user',
        is_pro:               p?.is_pro               ?? false,
        pro_expires_at:       p?.pro_expires_at        ?? null,
        verified_recommender: p?.verified_recommender ?? false,
        profiles: undefined,
      }
    })

    initialHasMore = initialTotal > PAGE_SIZE

  } else if (activeTab === 'discover') {
    // Exclude self + followed
    const { data: followData } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id)

    const excludeIds = [
      user.id,
      ...(followData ?? []).map((f: any) => f.following_id),
    ]

    let countQ = supabase
      .from('recommendations')
      .select('*', { count: 'exact', head: true })
      .eq('is_approved', true)
      .not('content_rating', 'in', '("adult","mature")')

    excludeIds.forEach(id => { countQ = countQ.neq('user_id', id) })
    const { count } = await countQ
    initialTotal = count ?? 0

    let query = supabase
      .from('recommendations')
      .select(`
        id, title, cover_url, type, status, genres, description,
        upvotes, review_count, created_at, user_id, score,
        profiles!recommendations_user_id_fkey(
          username, display_name, avatar_url,
          role, is_pro, pro_expires_at, verified_recommender
        )
      `)
      .eq('is_approved', true)
      .not('content_rating', 'in', '("adult","mature")')
      .order('score', { ascending: false })
      .range(0, PAGE_SIZE - 1)

    excludeIds.forEach(id => { query = query.neq('user_id', id) })
    const { data: recs } = await query

    initialItems = (recs ?? []).map((r: any) => {
      const p = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles
      return {
        ...r,
        username:             p?.username             ?? '',
        display_name:         p?.display_name         ?? null,
        avatar_url:           p?.avatar_url           ?? null,
        role:                 p?.role                 ?? 'user',
        is_pro:               p?.is_pro               ?? false,
        pro_expires_at:       p?.pro_expires_at        ?? null,
        verified_recommender: p?.verified_recommender ?? false,
        profiles: undefined,
      }
    })

    initialHasMore = initialTotal > PAGE_SIZE
  }

  // Trending sidebar
  const { data: trendingData } = await (supabase as any).rpc('get_trending_feed', { p_limit: 8 })
  const trending = trendingData ?? []

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex gap-8">

        {/* ── Main feed ── */}
        <div className="flex-1 min-w-0 space-y-6">

          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
              <LayoutList size={16} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">Feed</h1>
              <p className="text-muted-foreground text-sm">
                {activeTab === 'following'
                  ? 'Latest from people you follow'
                  : 'See what the community is recommending'}
              </p>
            </div>
          </div>

          {/* Tabs */}
          <Suspense>
            <FeedTabs />
          </Suspense>

          {/* Feed list with infinite loading */}
          <FeedList
            initialItems={initialItems}
            initialTotal={initialTotal}
            initialHasMore={initialHasMore}
            tab={activeTab}
            userId={user.id}
            isFollowingNobody={isFollowingNobody}
          />
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