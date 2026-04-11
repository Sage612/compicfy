import { createClient } from '@/lib/supabase/server'
import { Suspense } from 'react'
import { FilterBar } from '@/components/recommendations/FilterBar'
import { FeaturedCarousel } from '@/components/recommendations/FeaturedCarousel'
import { HorizontalSection } from '@/components/recommendations/HorizontalSection'
import { ComicGridClient } from '@/components/recommendations/ComicGridClient'
import { BookOpen, Radar, Plus } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import type { Recommendation } from '@/types/database.types'
import type { SupabaseClient } from '@supabase/supabase-js'

interface SearchParams {
  q?: string
  type?: string
  genre?: string
  status?: string
  sort?: string
}

interface Props {
  searchParams: Promise<SearchParams>
}

const PAGE_SIZE    = 24
const SAFE_RATINGS = '("adult","mature")'

// ── All section fetchers share one client ────────────────────────

async function getFeatured(s: SupabaseClient) {
  const { data } = await s.from('recommendations').select('*').eq('is_approved', true).not('content_rating', 'in', SAFE_RATINGS).order('daily_votes', { ascending: false }).limit(8)
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
    p_user_id:        userId,
    p_exclude_id:     null,
    p_limit:          12,
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

  const { count } = await s
    .from('recommendations')
    .select('*', { count: 'exact', head: true })
    .eq('is_approved', true)
    .not('content_rating', 'in', SAFE_RATINGS)

  return {
    items: (data as Recommendation[]) ?? [],
    total: count ?? 0,
  }
}

function hasActiveFilters(p: SearchParams) {
  return !!(p.q || p.type || p.genre || p.status || p.sort)
}

export default async function BrowsePage({ searchParams }: Props) {
  const params      = await searchParams
  const isFiltering = hasActiveFilters(params)

  // ── Single shared client ─────────────────────────────────────────
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  let adultEnabled = false
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('adult_content_enabled')
      .eq('id', user.id)
      .single()
    adultEnabled = (profile as any)?.adult_content_enabled === true
  }

  // All parallel, all sharing the same client
  const [
    featured,
    trending,
    recent,
    adminPicks,
    communityFavs,
    hiddenGems,
    youMightLike,
    { items, total },
  ] = await Promise.all([
    isFiltering ? Promise.resolve([]) : getFeatured(supabase),
    isFiltering ? Promise.resolve([]) : getTrending(supabase),
    isFiltering ? Promise.resolve([]) : getRecent(supabase),
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

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center shadow-lg shadow-primary/20 shrink-0">
            <Radar size={17} className="text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-3xl font-black tracking-tight leading-tight">Browse Comics</h1>
            <p className="text-muted-foreground text-xs leading-snug mt-0.5 hidden sm:block">
              Community recommendations · manga, manhwa, manhua &amp; webtoons
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {adultEnabled && (
            <Link href="/browse/adult">
              <Button size="sm" variant="outline" className="gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/5 h-8 px-2.5">
                🔞
              </Button>
            </Link>
          )}
          <Link href="/dashboard/recommendations/new">
            <Button size="sm" className="gap-1.5 bg-gradient-to-r from-primary to-violet-500 hover:opacity-90 border-0 shadow-md shadow-primary/20 h-8 px-3">
              <Plus size={14} />
              <span className="hidden sm:inline">Add Comic</span>
              <span className="sm:hidden text-xs font-semibold">Add</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Featured Carousel ── */}
      {!isFiltering && featured.length > 0 && (
        <Suspense fallback={<div className="h-[280px] sm:h-[360px] rounded-2xl bg-muted animate-pulse" />}>
          <FeaturedCarousel recommendations={featured} />
        </Suspense>
      )}

      {/* ── Horizontal Sections ── */}
      {!isFiltering && (
        <div className="space-y-10">
          <HorizontalSection title="Trending Today"       emoji="🔥" recommendations={trending}      viewAllHref="/browse?sort=trending" />
          <HorizontalSection title="Recently Added"       emoji="✨" recommendations={recent}        viewAllHref="/browse?sort=recent"   />
          {adminPicks.length > 0    && <HorizontalSection title="Admin Picks"          emoji="👑" recommendations={adminPicks}                                            />}
          <HorizontalSection title="Community Favourites" emoji="❤️" recommendations={communityFavs} viewAllHref="/browse?sort=score"    />
          {hiddenGems.length > 0    && <HorizontalSection title="Hidden Gems"          emoji="💎" recommendations={hiddenGems}                                            />}
          {youMightLike.length > 0  && (
            <HorizontalSection title={user ? 'You Might Like' : 'Popular Picks'} emoji="🎯" recommendations={youMightLike} />
          )}
        </div>
      )}

      {/* ── All Comics divider ── */}
      {!isFiltering && (
        <div className="relative flex items-center gap-4 py-2">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-border" />
          <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-card shrink-0">
            <BookOpen size={13} className="text-muted-foreground" />
            <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">All Comics</span>
          </div>
          <div className="flex-1 h-px bg-gradient-to-l from-transparent via-border to-border" />
        </div>
      )}

      {/* ── Filter Bar ── */}
      <Suspense fallback={<div className="h-24 bg-muted/30 rounded-xl animate-pulse" />}>
        <FilterBar adult={false} />
      </Suspense>

      {/* ── Comic Grid ── */}
      <ComicGridClient
        initialItems={items}
        initialTotal={total}
        searchParams={clientParams}
        apiPath="/api/recommendations"
      />
    </div>
  )
}