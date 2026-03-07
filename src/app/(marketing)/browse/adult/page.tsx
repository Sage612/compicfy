import { createClient } from '@/lib/supabase/server'
import { Suspense } from 'react'
import { ComicCard } from '@/components/recommendations/ComicCard'
import { FilterBar } from '@/components/recommendations/FilterBar'
import { FeaturedCarousel } from '@/components/recommendations/FeaturedCarousel'
import { HorizontalSection } from '@/components/recommendations/HorizontalSection'
import { ShieldAlert, BookOpen } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import type { Recommendation } from '@/types/database.types'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: '18+ Comics' }

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
    .in('content_rating', ['adult', 'mature'])
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
    .in('content_rating', ['adult', 'mature'])
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
    .in('content_rating', ['adult', 'mature'])
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
    .in('content_rating', ['adult', 'mature'])
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
    .in('content_rating', ['adult', 'mature'])
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
    .in('content_rating', ['adult', 'mature'])
    .order('save_count', { ascending: false })
    .limit(12)
  return (data as Recommendation[]) ?? []
}

async function getYouMightLike(userId: string): Promise<Recommendation[]> {
  const supabase = await createClient()

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
      .in('content_rating', ['adult', 'mature'])
      .order('score', { ascending: false })
      .limit(12)
    return (data as Recommendation[]) ?? []
  }

  const { data } = await supabase
    .from('recommendations')
    .select('*')
    .eq('is_approved', true)
    .in('content_rating', ['adult', 'mature'])
    .overlaps('genres', genres)
    .order('score', { ascending: false })
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
    .in('content_rating', ['adult', 'mature'])

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
  if (error) console.error('Adult browse query error:', error)

  const recommendations = (data as Recommendation[]) ?? []
  const totalPages = Math.ceil((count ?? 0) / limit)
  const hasMore = page < totalPages

  if (!recommendations.length) {
    return (
      <div className="text-center py-20">
        <BookOpen size={48} className="mx-auto mb-4 text-muted-foreground opacity-30" />
        <h3 className="text-lg font-semibold mb-1">No 18+ comics found</h3>
        <p className="text-muted-foreground text-sm mb-6">
          {searchParams.q || searchParams.type || searchParams.genre || searchParams.status
            ? 'Try adjusting your filters'
            : 'Be the first to submit one.'}
        </p>
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
          <ComicCard key={rec.id} recommendation={rec} />
        ))}
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          {page > 1 && (
            <Link href={`/browse/adult?${new URLSearchParams({ ...searchParams, page: String(page - 1) })}`}>
              <Button variant="outline" size="sm">← Previous</Button>
            </Link>
          )}
          <span className="text-sm text-muted-foreground px-3">
            Page {page} of {totalPages}
          </span>
          {hasMore && (
            <Link href={`/browse/adult?${new URLSearchParams({ ...searchParams, page: String(page + 1) })}`}>
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

export default async function AdultBrowsePage({ searchParams }: Props) {
  const params = await searchParams
  const isFiltering = hasActiveFilters(params)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Not logged in
  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto">
          <ShieldAlert size={32} className="text-destructive" />
        </div>
        <h1 className="text-2xl font-bold">Age Restricted</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          You must be logged in with adult content enabled to access this section.
        </p>
        <div className="flex justify-center gap-3">
          <Link href="/browse"><Button variant="outline">Back to Browse</Button></Link>
          <Link href="/login"><Button>Log In</Button></Link>
        </div>
      </div>
    )
  }

  // Logged in — check profile flag
  const { data: profile } = await supabase
    .from('profiles')
    .select('adult_content_enabled')
    .eq('id', user.id)
    .single()

  if (!(profile as any)?.adult_content_enabled) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto">
          <ShieldAlert size={32} className="text-destructive" />
        </div>
        <h1 className="text-2xl font-bold">Adult Content Disabled</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Enable adult content in your profile settings to access this section.
        </p>
        <div className="flex justify-center gap-3">
          <Link href="/browse"><Button variant="outline">Back to Browse</Button></Link>
          <Link href="/dashboard/settings"><Button>Go to Settings</Button></Link>
        </div>
      </div>
    )
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
          getYouMightLike(user.id),
        ])

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">🔞 18+ Comics</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Adult &amp; mature content — visible only to opted-in users
          </p>
        </div>
        <Link href="/browse">
          <Button variant="outline" size="sm">← All Ages Browse</Button>
        </Link>
      </div>

      {/* Warning banner */}
      <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20">
        <p className="text-xs text-muted-foreground">
          🔞 This section contains adult (18+) and mature (17+) rated content, manually approved by admins.
          To disable, go to{' '}
          <Link href="/dashboard/settings" className="underline hover:text-foreground">Settings</Link>.
        </p>
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
          {trending.length > 0 && (
            <HorizontalSection
              title="Trending Today"
              emoji="🔥"
              recommendations={trending}
              viewAllHref="/browse/adult?sort=trending"
            />
          )}
          {recent.length > 0 && (
            <HorizontalSection
              title="Recently Added"
              emoji="✨"
              recommendations={recent}
              viewAllHref="/browse/adult?sort=recent"
            />
          )}
          {adminPicks.length > 0 && (
            <HorizontalSection
              title="Admin Picks"
              emoji="👑"
              recommendations={adminPicks}
            />
          )}
          {communityFavs.length > 0 && (
            <HorizontalSection
              title="Community Favourites"
              emoji="❤️"
              recommendations={communityFavs}
              viewAllHref="/browse/adult?sort=score"
            />
          )}
          {hiddenGems.length > 0 && (
            <HorizontalSection
              title="Hidden Gems"
              emoji="💎"
              recommendations={hiddenGems}
            />
          )}
          {youMightLike.length > 0 && (
            <HorizontalSection
              title="You Might Like"
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
          <span className="text-sm font-semibold text-muted-foreground">All 18+ Comics</span>
          <div className="flex-1 h-px bg-border" />
        </div>
      )}

      {/* Filters */}
      <Suspense fallback={<div className="h-24 bg-muted/30 rounded-lg animate-pulse" />}>
        <FilterBar />
      </Suspense>

      {/* Comic grid with pagination */}
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