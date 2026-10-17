import { createClient } from '@/lib/supabase/server'
import { Suspense } from 'react'
import { FilterBar } from '@/components/recommendations/FilterBar'
import { FeaturedCarousel } from '@/components/recommendations/FeaturedCarousel'
import { HorizontalSection } from '@/components/recommendations/HorizontalSection'
import { ComicCard } from '@/components/recommendations/ComicCard'
import { ComicGridClient } from '@/components/recommendations/ComicGridClient'
import {
  FeaturedCarouselSkeleton,
  HorizontalSectionSkeleton,
  GenreSectionsSkeleton,
} from '@/components/recommendations/BrowseSkeletons'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { GENRES, GENRE_MOODS, genreSlug } from '@/lib/utils/constants'
import { GenreAnchorFallback } from '@/components/recommendations/GenreAnchorFallback'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { queryLatestUpdated } from '@/lib/recommendations/browseQueries'
import { isProUser } from '@/lib/access'
import type { Recommendation } from '@/types/app.types'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: '18+ Comics' }

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

const PAGE_SIZE     = 24
const ADULT_RATINGS = ['adult', 'mature'] as const

// ── Genre section config — same rules as the main browse page ────────
const GENRE_PAGE_SIZE     = 12  // fetch 12; mobile shows 9 via CSS, desktop shows all 12
const GENRE_MIN_ITEMS     = 6   // don't render a genre section unless it has at least 6 comics
const GENRE_SECTION_COUNT = 12  // show top N genres by comic count

async function getFeatured(s: SupabaseClient) {
  const { data } = await s.from('recommendations').select('*').eq('is_approved', true).in('content_rating', ADULT_RATINGS).order('daily_votes', { ascending: false }).limit(8)
  return (data as Recommendation[]) ?? []
}

async function getLatestUpdated(s: SupabaseClient) {
  const { items } = await queryLatestUpdated(s, { adult: true, limit: 12, offset: 0 })
  return items
}

async function getTrending(s: SupabaseClient) {
  const { data } = await s.from('recommendations').select('*').eq('is_approved', true).in('content_rating', ADULT_RATINGS).order('daily_votes', { ascending: false }).limit(12)
  return (data as Recommendation[]) ?? []
}

// Uses reviewed_at (approval timestamp) instead of created_at (submission
// timestamp) — same fix as the main browse page's getNewThisWeek, applied
// here for consistency. Only matches rows where reviewed_at is set.
async function getNewThisWeek(s: SupabaseClient) {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { data } = await s
    .from('recommendations')
    .select('*')
    .eq('is_approved', true)
    .in('content_rating', ADULT_RATINGS)
    .not('reviewed_at', 'is', null)
    .gte('reviewed_at', sevenDaysAgo)
    .order('score', { ascending: false })
    .limit(12)
  return (data as Recommendation[]) ?? []
}

async function getCommunityFavourites(s: SupabaseClient) {
  const { data } = await s.from('recommendations').select('*').eq('is_approved', true).in('content_rating', ADULT_RATINGS).order('score', { ascending: false }).limit(12)
  return (data as Recommendation[]) ?? []
}

// Replaces getAdminPicks / getHiddenGems / getYouMightLike being shown
// all at once. Rotates daily (day-of-year % 3) so all three original
// queries still get used, just one at a time.
async function getEditorialPick(
  s: SupabaseClient,
  userId: string
): Promise<{ title: string; slug: string; items: Recommendation[] }> {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  )
  const rotation = dayOfYear % 3

  if (rotation === 0) {
    const { data } = await s
      .from('recommendations')
      .select('*')
      .eq('is_approved', true)
      .eq('is_featured', true)
      .in('content_rating', ADULT_RATINGS)
      .order('featured_at', { ascending: false })
      .limit(12)
    return { title: 'Editor’s picks', slug: 'featured', items: (data as Recommendation[]) ?? [] }
  }

  if (rotation === 1) {
    const { data } = await s
      .from('recommendations')
      .select('*')
      .eq('is_approved', true)
      .in('content_rating', ADULT_RATINGS)
      .order('save_count', { ascending: false })
      .limit(12)
    return { title: 'Hidden gems', slug: 'hidden-gems', items: (data as Recommendation[]) ?? [] }
  }

  const { data } = await (s as any).rpc('get_personalized_recommendations', {
    p_user_id:         userId,
    p_exclude_id:      null,
    p_limit:           20,
    p_content_ratings: ['mature', 'adult'],
  })
  let results = (data as Recommendation[]) ?? []
  results = results.filter(r => (r as any).user_id !== userId)
  return { title: 'You might like', slug: 'for-you', items: results.slice(0, 12) }
}

async function getTopGenresWithCounts(s: SupabaseClient): Promise<string[]> {
  const { data } = await s
    .from('recommendations')
    .select('genres')
    .eq('is_approved', true)
    .in('content_rating', ADULT_RATINGS)

  const rows = (data as { genres: string[] | null }[] | null) ?? []

  const counts = new Map<string, number>()
  for (const row of rows) {
    const primaryGenre = row.genres?.[0]
    if (!primaryGenre || !GENRES.includes(primaryGenre as any)) continue
    counts.set(primaryGenre, (counts.get(primaryGenre) ?? 0) + 1)
  }

  return Array.from(counts.entries())
    .filter(([, count]) => count >= GENRE_MIN_ITEMS)
    .sort((a, b) => b[1] - a[1])
    .slice(0, GENRE_SECTION_COUNT)
    .map(([genre]) => genre)
}

async function getGenreItems(s: SupabaseClient, genre: string): Promise<Recommendation[]> {
  const { data: candidateRows } = await s
    .from('recommendations')
    .select('id, genres')
    .eq('is_approved', true)
    .in('content_rating', ADULT_RATINGS)
    .contains('genres', [genre])

  const primaryMatches = ((candidateRows as { id: string; genres: string[] | null }[] | null) ?? [])
    .filter(r => r.genres && r.genres[0] === genre)

  const total = primaryMatches.length
  if (total === 0) return []

  const maxCycle = Math.max(1, Math.floor(total / GENRE_PAGE_SIZE) || 1)

  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  )
  const seed   = genre.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  const cycle  = Math.min(4, maxCycle)
  const offset = ((dayOfYear + seed) % cycle) * GENRE_PAGE_SIZE

  const idsForPage = primaryMatches
    .slice(offset, offset + GENRE_PAGE_SIZE)
    .map(r => r.id)

  if (idsForPage.length === 0) return []

  const { data } = await s
    .from('recommendations')
    .select('*')
    .in('id', idsForPage)
    .order('score', { ascending: false })

  return (data as Recommendation[]) ?? []
}

async function getInitialGrid(s: SupabaseClient, params: SearchParams) {
  if (params.sort === 'updated') {
    return queryLatestUpdated(s, { q: params.q, type: params.type, genre: params.genre, status: params.status, adult: true, limit: PAGE_SIZE, offset: 0 })
  }
  const { data } = await (s as any).rpc('search_recommendations', {
    p_query:  params.q      || null,
    p_type:   params.type   || null,
    p_genre:  params.genre  || null,
    p_status: params.status || null,
    p_sort:   params.sort   ?? 'score',
    p_adult:  true,
    p_limit:  PAGE_SIZE,
    p_offset: 0,
  })

  const { count } = await s
    .from('recommendations')
    .select('*', { count: 'exact', head: true })
    .eq('is_approved', true)
    .in('content_rating', ADULT_RATINGS)

  return {
    items: (data as Recommendation[]) ?? [],
    total: count ?? 0,
  }
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

function AccessGate({ title, description, actions }: {
  title:       string
  description: string
  actions:     React.ReactNode
}) {
  return (
    <div className="max-w-md mx-auto px-4 py-24 text-center space-y-4">
      <p className="text-[11px] uppercase tracking-widest text-muted-foreground/70">18+</p>
      <h1 className="font-dashboard-serif text-3xl text-foreground">{title}</h1>
      <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
      <div className="flex justify-center gap-3 pt-2">{actions}</div>
    </div>
  )
}

// ── Independently-streaming sections ─────────────────────────────────
// Same pattern as the main browse page — takes the already-created
// supabase client (server.ts's createClient() isn't cache()-wrapped,
// so we pass the single instance down instead of calling it again).

async function FeaturedCarouselSection({ supabase }: { supabase: SupabaseClient }) {
  const items = await getFeatured(supabase)
  if (items.length === 0) return null
  return <FeaturedCarousel recommendations={items} adminFeaturedIds={new Set()} />
}

async function LatestUpdatesSection({ supabase }: { supabase: SupabaseClient }) {
  const items = await getLatestUpdated(supabase)
  if (items.length === 0) return null
  return <HorizontalSection title="Latest updates" eyebrow="New chapters" recommendations={items} viewAllHref="/browse/adult/s/updated" />
}

async function TrendingSection({ supabase }: { supabase: SupabaseClient }) {
  const items = await getTrending(supabase)
  if (items.length === 0) return null
  return <HorizontalSection title="Trending today" eyebrow="Right now" recommendations={items} viewAllHref="/browse/adult/s/trending" />
}

async function NewThisWeekSection({ supabase }: { supabase: SupabaseClient }) {
  const items = await getNewThisWeek(supabase)
  if (items.length === 0) return null
  return <HorizontalSection title="New this week" eyebrow="Fresh" recommendations={items} viewAllHref="/browse/adult/s/new" />
}

async function CommunityFavouritesSection({ supabase }: { supabase: SupabaseClient }) {
  const items = await getCommunityFavourites(supabase)
  if (items.length === 0) return null
  return <HorizontalSection title="Community favourites" eyebrow="All time" recommendations={items} viewAllHref="/browse/adult/s/favourites" />
}

async function EditorialSection({ supabase, userId }: { supabase: SupabaseClient; userId: string }) {
  const editorial = await getEditorialPick(supabase, userId)
  if (editorial.items.length === 0) return null
  return <HorizontalSection title={editorial.title} eyebrow="Picked for today" recommendations={editorial.items} viewAllHref={`/browse/adult/s/${editorial.slug}`} />
}

async function GenreSections({ supabase }: { supabase: SupabaseClient }) {
  const topGenres  = await getTopGenresWithCounts(supabase)
  const genreItems = await Promise.all(topGenres.map(g => getGenreItems(supabase, g)))
  const genreSections = topGenres
    .map((genre, i) => ({ genre, items: genreItems[i] }))
    .filter(section => section.items.length > 0) // safety net: never render an empty section

  if (genreSections.length === 0) return null

  return (
    <div className="space-y-10 pt-2">
      <GenreAnchorFallback availableSlugs={genreSections.map(s => genreSlug(s.genre))} redirectBase="/browse/adult" />

      <div className="border-t border-border/60 pt-8">
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground/70">Explore by mood</p>
      </div>

      {genreSections.map(({ genre, items: genreItems }) => {
        const { mood } = GENRE_MOODS[genre as (typeof GENRES)[number]] ?? { mood: genre }
        return (
          <section key={genre} id={`genre-${genreSlug(genre)}`} className="space-y-4 scroll-mt-20">
            <div className="flex items-end justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground/70">{genre}</p>
                <h3 className="font-dashboard-serif text-xl sm:text-2xl leading-tight text-foreground">{mood}</h3>
              </div>
              <Link
                href={`/browse/adult/s/genre?genre=${encodeURIComponent(genre)}`}
                className="shrink-0 text-xs text-foreground underline underline-offset-4 decoration-border hover:decoration-foreground transition-colors"
              >
                See all
              </Link>
            </div>
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-3 gap-y-5">
              {genreItems.map((rec, i) => (
                <ComicCard
                  key={rec.id}
                  recommendation={rec}
                  className={i >= 9 ? 'hidden md:block' : undefined}
                  showGenres={false}
                />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}

export default async function AdultBrowsePage({ searchParams }: Props) {
  const params      = await searchParams
  const isFiltering = hasActiveFilters(params)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <AccessGate
        title="Age Restricted"
        description="You must be logged in with adult content enabled to access this section."
        actions={
          <>
            <Link href="/browse">
              <Button variant="outline">Back to Browse</Button>
            </Link>
            <Link href="/login">
              <Button>Log In</Button>
            </Link>
          </>
        }
      />
    )
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('adult_content_enabled, is_pro, pro_expires_at, is_patron, patron_expires_at, role')
    .eq('id', user.id)
    .single()

  // Fixed: was hand-rolled `role === 'admin' || role === 'moderator' ||
  // (is_pro && not-expired)` — close, but missed patrons who weren't also
  // flagged is_pro, and duplicated logic that isProUser() already covers.
  const isPro = profile ? isProUser(profile as any) : false

  const settingsUrl = isPro ? '/pro/settings' : '/dashboard/settings'

  if (!(profile as any)?.adult_content_enabled) {
    return (
      <AccessGate
        title="Adult Content Disabled"
        description="Enable adult content in your profile settings to access this section."
        actions={
          <>
            <Link href="/browse">
              <Button variant="outline">Back to Browse</Button>
            </Link>
            <Link href={settingsUrl}>
              <Button>Go to Settings</Button>
            </Link>
          </>
        }
      />
    )
  }

  // Grid + interaction count block the page shell (ComicGridClient needs
  // initial items/total/isPro synchronously). Featured/trending/genre
  // sections stream independently below via their own Suspense boundaries.
  const [{ items, total }, interactionCount] = await Promise.all([
    getInitialGrid(supabase, params),
    getInteractionCount(supabase, user.id),
  ])

  const clientParams: Record<string, string> = { adult: 'true' }
  if (params.q)      clientParams.q      = params.q
  if (params.type)   clientParams.type   = params.type
  if (params.genre)  clientParams.genre  = params.genre
  if (params.status) clientParams.status = params.status
  if (params.sort)   clientParams.sort   = params.sort

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-10">

      {/* Header */}
      <PageHeader
        eyebrow="Browse · 18+"
        title="Adult comics"
        subtitle="Adult and mature titles, shown only to people who opted in"
        backHref="/browse"
        backLabel="All ages"
      />

      <p className="text-xs text-muted-foreground border-y border-border/60 py-3">
        Adult and mature content approved by admins.{' '}
        <Link href={settingsUrl} className="text-foreground underline underline-offset-4 decoration-border hover:decoration-foreground transition-colors">
          Turn it off in settings
        </Link>
      </p>

      {/* Featured Carousel — streams independently */}
      {!isFiltering && (
        <Suspense fallback={<FeaturedCarouselSkeleton />}>
          <FeaturedCarouselSection supabase={supabase} />
        </Suspense>
      )}

      {/* Horizontal sections — each streams independently, in parallel */}
      {!isFiltering && (
        <div className="space-y-12">
          <Suspense fallback={<HorizontalSectionSkeleton />}>
            <LatestUpdatesSection supabase={supabase} />
          </Suspense>
          <Suspense fallback={<HorizontalSectionSkeleton />}>
            <TrendingSection supabase={supabase} />
          </Suspense>
          <Suspense fallback={<HorizontalSectionSkeleton />}>
            <NewThisWeekSection supabase={supabase} />
          </Suspense>
          <Suspense fallback={<HorizontalSectionSkeleton />}>
            <CommunityFavouritesSection supabase={supabase} />
          </Suspense>
          <Suspense fallback={<HorizontalSectionSkeleton />}>
            <EditorialSection supabase={supabase} userId={user.id} />
          </Suspense>
        </div>
      )}

      {/* Genre sections — stream independently */}
      {!isFiltering && (
        <Suspense fallback={<GenreSectionsSkeleton />}>
          <GenreSections supabase={supabase} />
        </Suspense>
      )}

      {/* Filter Bar */}
      <Suspense fallback={<div className="h-24 bg-muted/30 rounded-xl animate-pulse" />}>
        <FilterBar adult={true} />
      </Suspense>

      {/* Comic Grid */}
      <ComicGridClient
        initialItems={items}
        initialTotal={total}
        searchParams={clientParams}
        apiPath="/api/recommendations"
        userId={user.id}
        interactionCount={interactionCount}
        contentRatings={['mature', 'adult']}
        isPro={isPro}
      />

    </div>
  )
}