import { createClient } from '@/lib/supabase/server'
import { Suspense } from 'react'
import { ComicCard } from '@/components/recommendations/ComicCard'
import { FilterBar } from '@/components/recommendations/FilterBar'
import { FeaturedCarousel } from '@/components/recommendations/FeaturedCarousel'
import { HorizontalSection } from '@/components/recommendations/HorizontalSection'
import { AgeFilterWrapper } from '@/components/recommendations/AgeFilterWrapper'
import { BookOpen } from 'lucide-react'
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
    .order('score', { ascending: false })
    .limit(12)
  return (data as Recommendation[]) ?? []
}

async function getYouMightLike(userId: string | null): Promise<Recommendation[]> {
  const supabase = await createClient()

  if (!userId) {
    const { data } = await supabase
      .from('recommendations')
      .select('*')
      .eq('is_approved', true)
      .order('score', { ascending: false })
      .limit(12)
    return (data as Recommendation[]) ?? []
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('favorite_genres')
    .eq('id', userId)
    .single()

  const genres = ((profile as any)?.favorite_genres ?? []) as string[]

  if (!genres.length) {
    const { data } = await supabase
      .from('recommendations')
      .select('*')
      .eq('is_approved', true)
      .order('score', { ascending: false })
      .limit(12)
    return (data as Recommendation[]) ?? []
  }

  const { data } = await supabase
    .from('recommendations')
    .select('*')
    .eq('is_approved', true)
    .overlaps('genres', genres)
    .order('score', { ascending: false })
    .limit(12)

  return (data as Recommendation[]) ?? []
}

async function getHiddenGems(): Promise<Recommendation[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('recommendations')
    .select('*')
    .eq('is_approved', true)
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

  if (searchParams.q) query = query.ilike('title', `%${searchParams.q}%`)
  if (searchParams.type) query = query.eq('type', searchParams.type)
  if (searchParams.genre) query = query.contains('genres', [searchParams.genre])
  if (searchParams.status) query = query.eq('status', searchParams.status)

  switch (searchParams.sort) {
    case 'trending':
      query = query.order('daily_votes', { ascending: false })
      break
    case 'recent':
      query = query.order('created_at', { ascending: false })
      break
    default:
      query = query.order('score', { ascending: false })
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
        <BookOpen size={48} className="mx-auto mb-4 text-muted-foreground opacity-30" />
        <h3 className="text-lg font-semibold mb-1">No comics found</h3>
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
      <p className="text-sm text-muted-foreground">
        {count} comic{count !== 1 ? 's' : ''} found
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {recommendations.map((rec) => (
          <AgeFilterWrapper key={rec.id} contentRating={rec.content_rating}>
            <ComicCard recommendation={rec} />
          </AgeFilterWrapper>
        ))}
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          {page > 1 && (
            <Link href={`/browse?${new URLSearchParams({ ...searchParams, page: String(page - 1) })}`}>
              <Button variant="outline" size="sm">← Previous</Button>
            </Link>
          )}
          <span className="text-sm text-muted-foreground px-3">
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
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Browse Comics</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Discover community recommendations
          </p>
        </div>
        <Link href="/dashboard/recommendations/new" className="hidden sm:block">
          <Button size="sm" className="gap-2">
            <BookOpen size={14} />
            Add Comic
          </Button>
        </Link>
      </div>

      {/* Featured Carousel */}
      {!isFiltering && featured.length > 0 && (
        <Suspense fallback={
          <div className="h-[280px] sm:h-[360px] rounded-2xl bg-muted animate-pulse" />
        }>
          <FeaturedCarousel recommendations={featured} />
        </Suspense>
      )}

      {/* Horizontal sections */}
      {!isFiltering && (
        <div className="space-y-8">
          <HorizontalSection
            title="Trending Today"
            emoji="🔥"
            recommendations={trending}
            viewAllHref="/browse?sort=trending"
          />
          <HorizontalSection
            title="Recently Added"
            emoji="✨"
            recommendations={recent}
            viewAllHref="/browse?sort=recent"
          />
          {adminPicks.length > 0 && (
            <HorizontalSection
              title="Admin Picks"
              emoji="👑"
              recommendations={adminPicks}
            />
          )}
          <HorizontalSection
            title="Community Favourites"
            emoji="❤️"
            recommendations={communityFavs}
            viewAllHref="/browse?sort=score"
          />
          {hiddenGems.length > 0 && (
            <HorizontalSection
              title="Hidden Gems"
              emoji="💎"
              recommendations={hiddenGems}
            />
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

      {/* Divider */}
      {!isFiltering && (
        <div className="flex items-center gap-4">
          <div className="flex-1 h-px bg-border" />
          <span className="text-sm font-semibold text-muted-foreground">All Comics</span>
          <div className="flex-1 h-px bg-border" />
        </div>
      )}

      {/* Filters */}
      <Suspense fallback={<div className="h-24 bg-muted/30 rounded-lg animate-pulse" />}>
        <FilterBar />
      </Suspense>

      {/* Comic grid */}
      <Suspense
        fallback={
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        }
      >
        <ComicGrid searchParams={params} />
      </Suspense>
    </div>
  )
}