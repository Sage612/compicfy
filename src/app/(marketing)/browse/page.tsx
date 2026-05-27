import { createClient } from '@/lib/supabase/server'
import { Suspense } from 'react'
import { FilterBar } from '@/components/recommendations/FilterBar'
import { FeaturedCarousel } from '@/components/recommendations/FeaturedCarousel'
import { HorizontalSection } from '@/components/recommendations/HorizontalSection'
import { ComicGridClient } from '@/components/recommendations/ComicGridClient'
import { BrowseRecButton } from '@/components/recommendations/BrowseRecButton'
import { BookOpen, Radar, Sparkles, TrendingUp, Clock, Crown, Heart, Diamond, Zap } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import type { Recommendation } from '@/types/database.types'
import type { SupabaseClient } from '@supabase/supabase-js'

interface SearchParams {
  q?:      string
  type?:   string
  genre?:  string
  status?: string
  sort?:   string
}

interface Props {
  searchParams: Promise<SearchParams>
}

const PAGE_SIZE    = 24
const SAFE_RATINGS = '("adult","mature")'

// ─────────────────────────────────────────────────────────────
// ALL your existing data fetching functions remain untouched.
// (getFeatured, getTrending, getRecent, getNewThisWeek,
//  getAdminPicks, getCommunityFavourites, getHiddenGems,
//  getYouMightLike, getInitialGrid, getInteractionCount,
//  hasActiveFilters)
// ─────────────────────────────────────────────────────────────

async function getFeatured(s: SupabaseClient) {
  const { data } = await s.from('recommendations').select('*').eq('is_approved', true).not('content_rating', 'in', SAFE_RATINGS).order('daily_votes', { ascending: false }).limit(12)
  return (data as Recommendation[]) ?? []
}

async function getTrending(s: SupabaseClient) {
  const { data } = await s.from('recommendations').select('*').eq('is_approved', true).not('content_rating', 'in', SAFE_RATINGS).order('daily_votes', { ascending: false }).limit(12)
  return (data as Recommendation[]) ?? []
}

async function getRecent(s: SupabaseClient) {
  const { data } = await s.from('recommendations').select('*').eq('is_approved', true).not('content_rating', 'in', SAFE_RATINGS).order('created_at', { ascending: false }).limit(12)
  return (data as Recommendation[]) ?? []
}

async function getNewThisWeek(s: SupabaseClient) {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { data } = await s
    .from('recommendations')
    .select('*')
    .eq('is_approved', true)
    .not('content_rating', 'in', SAFE_RATINGS)
    .gte('created_at', sevenDaysAgo)
    .order('score', { ascending: false })
    .limit(12)
  return (data as Recommendation[]) ?? []
}

async function getAdminPicks(s: SupabaseClient) {
  const { data } = await s.from('recommendations').select('*').eq('is_approved', true).eq('is_featured', true).not('content_rating', 'in', SAFE_RATINGS).order('featured_at', { ascending: false }).limit(12)
  return (data as Recommendation[]) ?? []
}

async function getCommunityFavourites(s: SupabaseClient) {
  const { data } = await s.from('recommendations').select('*').eq('is_approved', true).not('content_rating', 'in', SAFE_RATINGS).order('score', { ascending: false }).limit(12)
  return (data as Recommendation[]) ?? []
}

async function getHiddenGems(s: SupabaseClient) {
  const { data } = await s.from('recommendations').select('*').eq('is_approved', true).not('content_rating', 'in', SAFE_RATINGS).order('save_count', { ascending: false }).limit(12)
  return (data as Recommendation[]) ?? []
}

async function getYouMightLike(s: SupabaseClient, userId: string | null) {
  const { data } = await (s as any).rpc('get_personalized_recommendations', {
    p_user_id:         userId,
    p_exclude_id:      null,
    p_limit:           12,
    p_content_ratings: ['all_ages', 'teen'],
  })
  return (data as Recommendation[]) ?? []
}

async function getInitialGrid(s: SupabaseClient, params: SearchParams) {
  const { data } = await (s as any).rpc('search_recommendations', {
    p_query:  params.q      || null,
    p_type:   params.type   || null,
    p_genre:  params.genre  || null,
    p_status: params.status || null,
    p_sort:   params.sort   ?? 'score',
    p_adult:  false,
    p_limit:  PAGE_SIZE,
    p_offset: 0,
  })
  const { count } = await s.from('recommendations').select('*', { count: 'exact', head: true }).eq('is_approved', true).not('content_rating', 'in', SAFE_RATINGS)
  return { items: (data as Recommendation[]) ?? [], total: count ?? 0 }
}

async function getInteractionCount(s: SupabaseClient, userId: string): Promise<number> {
  const [votesRes, savesRes] = await Promise.all([
    s.from('votes').select('*', { count: 'exact', head: true }).eq('user_id', userId),
    s.from('saves').select('*', { count: 'exact', head: true }).eq('user_id', userId),
  ])
  return (votesRes.count ?? 0) + (savesRes.count ?? 0)
}

function hasActiveFilters(p: SearchParams) {
  return !!(p.q || p.type || p.genre || p.status || p.sort)
}

export default async function BrowsePage({ searchParams }: Props) {
  const params      = await searchParams
  const isFiltering = hasActiveFilters(params)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let adultEnabled     = false
  let interactionCount = 0
  let isPro            = false
  let recommendHref    = '/dashboard/recommendations/new'

  if (user) {
    const [profileRes, interactions] = await Promise.all([
      supabase.from('profiles').select('adult_content_enabled, is_pro, pro_expires_at, role').eq('id', user.id).single(),
      getInteractionCount(supabase, user.id),
    ])
    adultEnabled     = (profileRes.data as any)?.adult_content_enabled === true
    interactionCount = interactions

    const profile = profileRes.data as any
    isPro = profile?.role === 'admin' ||
            profile?.role === 'moderator' ||
            (profile?.is_pro && (!profile?.pro_expires_at || new Date(profile.pro_expires_at) > new Date()))

    if (isPro) recommendHref = '/pro/recommendations/new'
  }

  const [
    featured, trending, recent, newThisWeek,
    adminPicks, communityFavs, hiddenGems, youMightLike,
    { items, total },
  ] = await Promise.all([
    isFiltering ? Promise.resolve([]) : getFeatured(supabase),
    isFiltering ? Promise.resolve([]) : getTrending(supabase),
    isFiltering ? Promise.resolve([]) : getRecent(supabase),
    isFiltering ? Promise.resolve([]) : getNewThisWeek(supabase),
    isFiltering ? Promise.resolve([]) : getAdminPicks(supabase),
    isFiltering ? Promise.resolve([]) : getCommunityFavourites(supabase),
    isFiltering ? Promise.resolve([]) : getHiddenGems(supabase),
    isFiltering ? Promise.resolve([]) : getYouMightLike(supabase, user?.id ?? null),
    getInitialGrid(supabase, params),
  ])

  const clientParams: Record<string, string> = { adult: 'false' }
  if (params.q)      clientParams.q      = params.q
  if (params.type)   clientParams.type   = params.type
  if (params.genre)  clientParams.genre  = params.genre
  if (params.status) clientParams.status = params.status
  if (params.sort)   clientParams.sort   = params.sort

  // Sections with icons (only show if data exists and not filtering)
  const sections = [
    { id: 'trending', title: 'Trending Today', icon: TrendingUp, data: trending, viewAll: '/browse?sort=trending' },
    { id: 'newWeek', title: 'New This Week', icon: Clock, data: newThisWeek, viewAll: '/browse?sort=recent' },
    { id: 'recent', title: 'Recently Added', icon: Sparkles, data: recent, viewAll: '/browse?sort=recent' },
    { id: 'admin', title: 'Admin Picks', icon: Crown, data: adminPicks, viewAll: null },
    { id: 'community', title: 'Community Favourites', icon: Heart, data: communityFavs, viewAll: '/browse?sort=score' },
    { id: 'gems', title: 'Hidden Gems', icon: Diamond, data: hiddenGems, viewAll: null },
    { id: 'personal', title: user ? 'You Might Like' : 'Popular Picks', icon: Zap, data: youMightLike, viewAll: null },
  ].filter(s => s.data && s.data.length > 0)

  return (
    <div className="min-h-screen bg-background">
      {/* Modern hero gradient */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-background pb-8">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-6 relative z-10">
          {/* Header with glass card effect */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-primary">
                <Radar size={20} className="animate-pulse" />
                <span className="text-xs font-mono font-bold uppercase tracking-wider">Discover</span>
              </div>
              <h1 className="text-4xl sm:text-5xl font-black tracking-tight bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
                Browse Comics
              </h1>
              <p className="text-sm text-muted-foreground max-w-lg">
                Community-driven recommendations for manga, manhwa, manhua, and webtoons.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {adultEnabled && (
                <Link href="/browse/adult">
                  <Button size="sm" variant="outline" className="gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/5 h-9">
                    🔞 Adult
                  </Button>
                </Link>
              )}
              <BrowseRecButton isLoggedIn={!!user} recommendHref={recommendHref} />
            </div>
          </div>

          {/* Featured carousel - full width inside container */}
          {!isFiltering && featured.length > 0 && (
            <Suspense fallback={<div className="h-[280px] sm:h-[360px] rounded-2xl bg-muted animate-pulse" />}>
              <FeaturedCarousel recommendations={featured} />
            </Suspense>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-10">
        {/* Horizontal sections with card-like containers */}
        {!isFiltering && sections.map((section) => (
          <section key={section.id} className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <section.icon size={20} className="text-primary" />
                <h2 className="text-xl font-bold tracking-tight">{section.title}</h2>
              </div>
              {section.viewAll && (
                <Link
                  href={section.viewAll}
                  className="text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  View all →
                </Link>
              )}
            </div>
            <Suspense fallback={<div className="h-64 rounded-2xl bg-muted/30 animate-pulse" />}>
              <HorizontalSection
                title=""
                recommendations={section.data}
                viewAllHref={section.viewAll}
              />
            </Suspense>
          </section>
        ))}

        {/* All Comics divider with style */}
        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-background px-4 text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground">
              All Comics
            </span>
          </div>
        </div>

        {/* Sticky filter bar - modern pill style (FilterBar component unchanged) */}
        <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md rounded-xl border border-border/50 p-2 -mt-2">
          <Suspense fallback={<div className="h-12 bg-muted/30 rounded-lg animate-pulse" />}>
            <FilterBar adult={false} />
          </Suspense>
        </div>

        {/* Comic Grid */}
        <ComicGridClient
          initialItems={items}
          initialTotal={total}
          searchParams={clientParams}
          apiPath="/api/recommendations"
          userId={user?.id ?? null}
          interactionCount={interactionCount}
          isPro={isPro}
        />
      </div>
    </div>
  )
        }
