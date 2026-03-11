import { createClient } from '@/lib/supabase/server'
import { Suspense } from 'react'
import { ComicCard } from '@/components/recommendations/ComicCard'
import { FilterBar } from '@/components/recommendations/FilterBar'
import { FeaturedCarousel } from '@/components/recommendations/FeaturedCarousel'
import { HorizontalSection } from '@/components/recommendations/HorizontalSection'
import { BookOpen, Compass } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import type { Recommendation } from '@/types/database.types'

interface SearchParams {
  q?: string
  type?: string
  genre?: string
  status?: string
  sort?: string
  page?: string
}

interface Props {
  searchParams: Promise<SearchParams>
}

async function getFeatured(): Promise<Recommendation[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('recommendations')
    .select('*')
    .eq('is_approved', true)
    .not('content_rating', 'in', '("adult","mature")')
    .order('daily_votes', { ascending: false })
    .limit(8)
  return (data as Recommendation[]) ?? []
}

async function getTrending(): Promise<Recommendation[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('recommendations')
    .select('*')
    .eq('is_approved', true)
    .not('content_rating', 'in', '("adult","mature")')
    .order('daily_votes', { ascending: false })
    .limit(12)
  return (data as Recommendation[]) ?? []
}

async function getRecent(): Promise<Recommendation[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('recommendations')
    .select('*')
    .eq('is_approved', true)
    .not('content_rating', 'in', '("adult","mature")')
    .order('created_at', { ascending: false })
    .limit(12)
  return (data as Recommendation[]) ?? []
}

async function getAdminPicks(): Promise<Recommendation[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('recommendations')
    .select('*')
    .eq('is_approved', true)
    .eq('is_featured', true)
    .not('content_rating', 'in', '("adult","mature")')
    .order('featured_at', { ascending: false })
    .limit(12)
  return (data as Recommendation[]) ?? []
}

async function getCommunityFavourites(): Promise<Recommendation[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('recommendations')
    .select('*')
    .eq('is_approved', true)
    .not('content_rating', 'in', '("adult","mature")')
    .order('score', { ascending: false })
    .limit(12)
  return (data as Recommendation[]) ?? []
}

async function getYouMightLike(userId: string | null): Promise<Recommendation[]> {
  const supabase = await createClient()
  const { data } = await (supabase as any).rpc('get_personalized_recommendations', {
    p_user_id: userId,
    p_exclude_id: null,
    p_limit: 12,
    p_content_ratings: ['all_ages', 'teen'],
  })
  return (data as Recommendation[]) ?? []
}

async function getHiddenGems(): Promise<Recommendation[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('recommendations')
    .select('*')
    .eq('is_approved', true)
    .not('content_rating', 'in', '("adult","mature")')
    .order('save_count', { ascending: false })
    .limit(12)
  return (data as Recommendation[]) ?? []
}

async function ComicGrid({ searchParams }: { searchParams: SearchParams }) {
  const supabase = await createClient()

  const page = parseInt(searchParams.page ?? '1')
  const limit = 24
  const offset = (page - 1) * limit

  let query = supabase
    .from('recommendations')
    .select('*', { count: 'exact' })
    .eq('is_approved', true)
    .not('content_rating', 'in', '("adult","mature")')

  if (searchParams.q)      query = query.ilike('title', `%${searchParams.q}%`)
  if (searchParams.type)   query = query.eq('type', searchParams.type)
  if (searchParams.genre)  query = query.contains('genres', [searchParams.genre])
  if (searchParams.status) query = query.eq('status', searchParams.status)

  switch (searchParams.sort) {
    case 'trending': query = query.order('daily_votes', { ascending: false }); break
    case 'recent':   query = query.order('created_at',  { ascending: false }); break
    default:         query = query.order('score',        { ascending: false })
  }

  query = query.range(offset, offset + limit - 1)

  const { data, count, error } = await query
  if (error) console.error('Browse query error:', error)

  const recommendations = (data as Recommendation[]) ?? []
  const totalPages = Math.ceil((count ?? 0) / limit)
  const hasMore = page < totalPages

  if (!recommendations.length) {
    return (
      <div className="text-center py-20">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
          <BookOpen size={28} className="text-muted-foreground opacity-40" />
        </div>
        <h3 className="text-lg font-black mb-1">No comics found</h3>
        <p className="text-muted-foreground text-sm mb-6">
          {searchParams.q || searchParams.type || searchParams.genre || searchParams.status
            ? 'Try adjusting your filters'
            : 'Be the first to add a recommendation!'}
        </p>
        <Link href="/dashboard/recommendations/new">
          <Button className="gap-2">
            <BookOpen size={16} />
            Submit a Recommendation
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        {count} comic{count !== 1 ? 's' : ''} found
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {recommendations.map((rec) => (
          <ComicCard key={rec.id} recommendation={rec} />
        ))}
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-4">
          {page > 1 && (
            <Link href={`/browse?${new URLSearchParams({ ...searchParams, page: String(page - 1) })}`}>
              <Button variant="outline" size="sm">← Previous</Button>
            </Link>
          )}
          <span className="text-sm text-muted-foreground px-3 font-medium">
            Page {page} of {totalPages}
          </span>
          {hasMore && (
            <Link href={`/browse?${new URLSearchParams({ ...searchParams, page: String(page + 1) })}`}>
              <Button variant="outline" size="sm">Next →</Button>
            </Link>
          )}
        </div>
      )}
    </div>
  )
}

function hasActiveFilters(params: SearchParams) {
  return !!(params.q || params.type || params.genre || params.status || params.sort)
}

export default async function BrowsePage({ searchParams }: Props) {
  const params = await searchParams
  const isFiltering = hasActiveFilters(params)

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

  const [featured, trending, recent, adminPicks, communityFavs, hiddenGems, youMightLike] =
    isFiltering
      ? [[], [], [], [], [], [], []]
      : await Promise.all([
          getFeatured(),
          getTrending(),
          getRecent(),
          getAdminPicks(),
          getCommunityFavourites(),
          getHiddenGems(),
          getYouMightLike(user?.id ?? null),
        ])

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-10">

      {/* ── PAGE HEADER ── */}
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center shadow-lg shadow-primary/20">
              <Compass size={17} className="text-white" />
            </div>
            <h1 className="text-3xl font-black tracking-tight">Browse Comics</h1>
          </div>
          <p className="text-muted-foreground text-sm pl-0.5">
            Discover community recommendations · manga, manhwa, manhua &amp; webtoons
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {adultEnabled && (
            <Link href="/browse/adult">
              <Button size="sm" variant="outline" className="gap-2 border-destructive/30 text-destructive hover:bg-destructive/5">
                🔞 18+
              </Button>
            </Link>
          )}
          <Link href="/dashboard/recommendations/new">
            <Button size="sm" className="gap-2">
              <BookOpen size={14} />
              <span className="hidden sm:inline">Add Comic</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* ── FEATURED CAROUSEL ── */}
      {!isFiltering && featured.length > 0 && (
        <Suspense fallback={
          <div className="h-[280px] sm:h-[360px] rounded-2xl bg-muted animate-pulse" />
        }>
          <FeaturedCarousel recommendations={featured} />
        </Suspense>
      )}

      {/* ── HORIZONTAL SECTIONS ── */}
      {!isFiltering && (
        <div className="space-y-10">
          <HorizontalSection title="Trending Today"        emoji="🔥" recommendations={trending}      viewAllHref="/browse?sort=trending" />
          <HorizontalSection title="Recently Added"        emoji="✨" recommendations={recent}        viewAllHref="/browse?sort=recent"   />
          {adminPicks.length > 0 && (
            <HorizontalSection title="Admin Picks"         emoji="👑" recommendations={adminPicks}                                        />
          )}
          <HorizontalSection title="Community Favourites"  emoji="❤️" recommendations={communityFavs} viewAllHref="/browse?sort=score"    />
          {hiddenGems.length > 0 && (
            <HorizontalSection title="Hidden Gems"         emoji="💎" recommendations={hiddenGems}                                        />
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

      {/* ── ALL COMICS DIVIDER ── */}
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

      {/* ── FILTER BAR ── */}
      <Suspense fallback={<div className="h-24 bg-muted/30 rounded-xl animate-pulse" />}>
        <FilterBar />
      </Suspense>

      {/* ── COMIC GRID ── */}
      <Suspense
        fallback={
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        }
      >
        <ComicGrid searchParams={params} />
      </Suspense>

    </div>
  )
}