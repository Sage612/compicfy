import { createClient } from '@/lib/supabase/server'
import { Suspense } from 'react'
import { FilterBar } from '@/components/recommendations/FilterBar'
import { FeaturedCarousel } from '@/components/recommendations/FeaturedCarousel'
import { HorizontalSection } from '@/components/recommendations/HorizontalSection'
import { ComicGridClient } from '@/components/recommendations/ComicGridClient'
import { BrowseRecButton } from '@/components/recommendations/BrowseRecButton'
import { BookOpen, Radar, Sparkles, Compass } from 'lucide-react'
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

  return (
    <div className="min-h-screen bg-background pb-20">
      
      {/* ── MODERN HERO / HEADER COMPLEX SECTION ──────────────────────── */}
      <div className="relative border-b border-border/40 bg-gradient-to-b from-muted/20 via-background to-background pt-10 pb-8 mb-6">
        {/* Decorative subtle abstract light rings */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-10 left-10 w-72 h-72 bg-violet-500/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 bg-muted/20 border border-border/40 rounded-3xl p-6 md:p-8 backdrop-blur-xl">
            <div className="flex items-start gap-4 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary via-primary to-violet-500 flex items-center justify-center shrink-0 shadow-lg shadow-primary/10 ring-4 ring-background">
                <Compass size={22} className="text-primary-foreground animate-pulse" />
              </div>
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-none bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                    Browse Comics
                  </h1>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                    <Sparkles size={10} /> v2.0
                  </span>
                </div>
                <p className="text-muted-foreground text-xs sm:text-sm max-w-xl font-medium leading-relaxed">
                  Explore aggregate platform data across core mediums curated by community readers.
                </p>
              </div>
            </div>

            {/* Premium CTA Action Tray */}
            <div className="flex items-center gap-2 shrink-0 self-end md:self-center bg-background/50 p-2 border border-border/40 rounded-2xl backdrop-blur-sm shadow-inner">
              {adultEnabled && (
                <Link href="/browse/adult">
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="gap-1.5 border border-destructive/20 text-destructive hover:bg-destructive/10 h-9 px-3 rounded-xl transition-all"
                  >
                    <span>🔞</span>
                    <span className="text-[11px] font-bold tracking-wider hidden lg:inline uppercase">Mature Mode</span>
                  </Button>
                </Link>
              )}
              <BrowseRecButton isLoggedIn={!!user} recommendHref={recommendHref} />
            </div>
          </div>
        </div>
      </div>

      {/* ── MAIN LAYOUT WRAPPER ───────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 space-y-12">
        
        {/* Featured Carousel Frame */}
        {!isFiltering && featured.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <span className="text-xs font-black uppercase tracking-widest text-muted-foreground/60">Featured Masterpieces</span>
              <div className="flex-1 h-px bg-border/40" />
            </div>
            <Suspense fallback={<div className="h-[280px] sm:h-[360px] rounded-3xl bg-muted/40 border border-border/30 animate-pulse" />}>
              <div className="p-1 rounded-3xl border border-border/30 bg-muted/10">
                <FeaturedCarousel recommendations={featured} />
              </div>
            </Suspense>
          </div>
        )}

        {/* Horizontal Scroll Content Segments */}
        {!isFiltering && (
          <div className="space-y-12">
            <HorizontalSection title="Trending Today"  emoji="🔥" recommendations={trending}     viewAllHref="/browse?sort=trending" />
            
            {newThisWeek.length > 0 && (
              <HorizontalSection title="New This Week" emoji="🆕" recommendations={newThisWeek}  viewAllHref="/browse?sort=recent"   />
            )}
            
            <HorizontalSection title="Recently Added"       emoji="✨" recommendations={recent}        viewAllHref="/browse?sort=recent"   />
            
            {adminPicks.length > 0 && (
              <HorizontalSection title="Admin Picks"          emoji="👑" recommendations={adminPicks}     />
            )}
            
            <HorizontalSection title="Community Favourites" emoji="❤️" recommendations={communityFavs} viewAllHref="/browse?sort=score"    />
            
            {hiddenGems.length > 0 && (
              <HorizontalSection title="Hidden Gems"          emoji="💎" recommendations={hiddenGems}     />
            )}
            
            {youMightLike.length > 0 && (
              <HorizontalSection
                title={user ? 'You Might Like' : 'Popular Picks'}
                emoji="🎯"
                recommendations={youMightLike}
              />
            )}
          </div>
        )}

        {/* ── CORE COMPACT GRID CONTROL DIVIDER ───────────────────────── */}
        {!isFiltering && (
          <div className="relative flex items-center gap-4 pt-4">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border/60 to-border" />
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border/60 bg-muted/20 backdrop-blur-sm shrink-0">
              <BookOpen size={12} className="text-primary" />
              <span className="text-[10px] font-black uppercase tracking-widest text-foreground">Complete Archive</span>
            </div>
            <div className="flex-1 h-px bg-gradient-to-l from-transparent via-border/60 to-border" />
          </div>
        )}

        {/* Interactive Discovery Filtering Deck */}
        <div className="space-y-6">
          <div className="bg-muted/10 rounded-2xl border border-border/40 p-4 shadow-sm backdrop-blur-md">
            <Suspense fallback={<div className="h-16 bg-muted/20 rounded-xl animate-pulse" />}>
              <FilterBar adult={false} />
            </Suspense>
          </div>

          {/* Client Dynamic Hydration Render Matrix */}
          <div className="px-0.5">
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

      </div>
    </div>
  )
}
