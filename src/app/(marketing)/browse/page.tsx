import { createClient } from '@/lib/supabase/server'
import { Suspense } from 'react'
import { FilterBar } from '@/components/recommendations/FilterBar'
import { FeaturedCarousel } from '@/components/recommendations/FeaturedCarousel'
import { HorizontalSection } from '@/components/recommendations/HorizontalSection'
import { ComicCard } from '@/components/recommendations/ComicCard'
import { ComicGridClient } from '@/components/recommendations/ComicGridClient'
import { BookOpen, Radar } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { GENRES, GENRE_MOODS, genreSlug } from '@/lib/utils/constants'
import { GenreAnchorFallback } from '@/components/recommendations/GenreAnchorFallback'
import { ScrollingTitle } from '@/components/recommendations/ScrollingTitle'
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

// ── Genre section config ──────────────────────────────────────────
const GENRE_PAGE_SIZE     = 12  // fetch 12; mobile shows 9 via CSS, desktop shows all 12
const GENRE_MIN_ITEMS     = 6   // don't render a genre section unless it has at least 6 comics
const GENRE_SECTION_COUNT = 12  // show top N genres by comic count

async function getFeatured(s: SupabaseClient): Promise<{ items: Recommendation[]; adminIds: Set<string> }> {
  const now = new Date().toISOString()

  // Admin-curated picks — is_featured=true AND (carousel_until is null OR carousel_until > now)
  const { data: adminData } = await s
    .from('recommendations')
    .select('*')
    .eq('is_approved', true)
    .eq('is_featured', true)
    .not('content_rating', 'in', SAFE_RATINGS)
    .or(`carousel_until.is.null,carousel_until.gt.${now}`)
    .order('featured_at', { ascending: false })
    .limit(6)

  const adminPicks = (adminData as Recommendation[]) ?? []
  const adminIds   = new Set(adminPicks.map(r => r.id))
  const remaining  = Math.max(0, 12 - adminPicks.length)

  // Fill remaining with top community-voted — not admin-featured, ordered by daily_votes
  let communityPicks: Recommendation[] = []
  if (remaining > 0) {
    const { data: communityData } = await s
      .from('recommendations')
      .select('*')
      .eq('is_approved', true)
      .eq('is_featured', false)
      .not('content_rating', 'in', SAFE_RATINGS)
      .order('daily_votes', { ascending: false })
      .limit(remaining)
    communityPicks = (communityData as Recommendation[]) ?? []
  }

  return { items: [...adminPicks, ...communityPicks], adminIds }
}

async function getTrending(s: SupabaseClient) {
  const { data } = await s.from('recommendations').select('*').eq('is_approved', true).not('content_rating', 'in', SAFE_RATINGS).order('daily_votes', { ascending: false }).limit(12)
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

async function getCommunityFavourites(s: SupabaseClient) {
  const { data } = await s.from('recommendations').select('*').eq('is_approved', true).not('content_rating', 'in', SAFE_RATINGS).order('score', { ascending: false }).limit(12)
  return (data as Recommendation[]) ?? []
}

async function getEditorialPick(
  s: SupabaseClient,
  userId: string | null
): Promise<{ title: string; emoji: string; items: Recommendation[] }> {
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
      .not('content_rating', 'in', SAFE_RATINGS)
      .order('featured_at', { ascending: false })
      .limit(12)
    return { title: 'Admin Picks', emoji: '👑', items: (data as Recommendation[]) ?? [] }
  }

  if (rotation === 1) {
    const { data } = await s
      .from('recommendations')
      .select('*')
      .eq('is_approved', true)
      .not('content_rating', 'in', SAFE_RATINGS)
      .order('save_count', { ascending: false })
      .limit(12)
    return { title: 'Hidden Gems', emoji: '💎', items: (data as Recommendation[]) ?? [] }
  }

  const { data } = await (s as any).rpc('get_personalized_recommendations', {
    p_user_id:         userId,
    p_exclude_id:      null,
    p_limit:           20,
    p_content_ratings: ['all_ages', 'teen'],
  })
  let results = (data as Recommendation[]) ?? []
  if (userId) results = results.filter(r => r.user_id !== userId)
  return { title: userId ? 'You Might Like' : 'Popular Picks', emoji: '🎯', items: results.slice(0, 12) }
}

async function getTopGenresWithCounts(s: SupabaseClient): Promise<string[]> {
  const { data } = await s
    .from('recommendations')
    .select('genres')
    .eq('is_approved', true)
    .not('content_rating', 'in', SAFE_RATINGS)

  const rows = (data as { genres: string[] | null }[] | null) ?? []

  const counts = new Map<string, number>()
  for (const row of rows) {
    const primaryGenre = row.genres?.[0]
    if (!primaryGenre || !GENRES.includes(primaryGenre as any)) continue // ignore stray/legacy values
    counts.set(primaryGenre, (counts.get(primaryGenre) ?? 0) + 1)
  }

  return Array.from(counts.entries())
    .filter(([, count]) => count >= GENRE_MIN_ITEMS)
    .sort((a, b) => b[1] - a[1])
    .slice(0, GENRE_SECTION_COUNT)
    .map(([genre]) => genre)
}

async function getGenreItems(s: SupabaseClient, genre: string): Promise<Recommendation[]> {
  const { data: countRows } = await s
    .from('recommendations')
    .select('id, genres')
    .eq('is_approved', true)
    .not('content_rating', 'in', SAFE_RATINGS)
    .contains('genres', [genre])

  const primaryMatches = ((countRows as { id: string; genres: string[] | null }[] | null) ?? [])
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

  }

  const [
    featuredResult, trending, newThisWeek,
    communityFavs, editorial,
    { items, total },
  ] = await Promise.all([
    isFiltering ? Promise.resolve({ items: [], adminIds: new Set<string>() }) : getFeatured(supabase),
    isFiltering ? Promise.resolve([]) : getTrending(supabase),
    isFiltering ? Promise.resolve([]) : getNewThisWeek(supabase),
    isFiltering ? Promise.resolve([]) : getCommunityFavourites(supabase),
    isFiltering ? Promise.resolve({ title: '', emoji: '', items: [] }) : getEditorialPick(supabase, user?.id ?? null),
    getInitialGrid(supabase, params),
  ])

  let genreSections: { genre: string; items: Recommendation[] }[] = []
  if (!isFiltering) {
    const topGenres  = await getTopGenresWithCounts(supabase)
    const genreItems = await Promise.all(topGenres.map(g => getGenreItems(supabase, g)))
    genreSections    = topGenres
      .map((genre, i) => ({ genre, items: genreItems[i] }))
      .filter(section => section.items.length > 0) // safety net: never render an empty section
  }

  const featured         = featuredResult.items
  const adminFeaturedIds = featuredResult.adminIds

  const clientParams: Record<string, string> = { adult: 'false' }
  if (params.q)      clientParams.q      = params.q
  if (params.type)   clientParams.type   = params.type
  if (params.genre)  clientParams.genre  = params.genre
  if (params.status) clientParams.status = params.status
  if (params.sort)   clientParams.sort   = params.sort

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded bg-primary flex items-center justify-center shrink-0">
            <Radar size={16} className="text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-3xl font-black tracking-tight leading-tight">Browse Comics</h1>
            <p className="text-muted-foreground text-xs leading-snug mt-0.5 hidden sm:block">
              Community recommendations · manga, manhwa, manhua &amp; webtoons
            </p>
          </div>
        </div>
        {adultEnabled && (
          <Link href="/browse/adult">
            <Button size="sm" variant="outline" className="gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/5 h-8 px-2.5 shrink-0">🔞</Button>
          </Link>
        )}
      </div>

      {/* Featured Carousel — admin picks shown first, rest are community voted */}
      {!isFiltering && featured.length > 0 && (
        <Suspense fallback={<div className="h-[280px] sm:h-[360px] rounded-2xl bg-muted animate-pulse" />}>
          <FeaturedCarousel recommendations={featured} adminFeaturedIds={adminFeaturedIds} />
        </Suspense>
      )}


      {!isFiltering && (
        <div className="space-y-10">
          <HorizontalSection title="Trending Today"       emoji="🔥" recommendations={trending}      viewAllHref="/browse?sort=trending" />
          {newThisWeek.length > 0 && (
            <HorizontalSection title="New This Week"      emoji="🆕" recommendations={newThisWeek}   viewAllHref="/browse?sort=recent"   />
          )}
          <HorizontalSection title="Community Favourites" emoji="❤️" recommendations={communityFavs} viewAllHref="/browse?sort=score"    />
          {editorial.items.length > 0 && (
            <HorizontalSection title={editorial.title} emoji={editorial.emoji} recommendations={editorial.items} />
          )}
        </div>
      )}


      {!isFiltering && genreSections.length > 0 && (
        <div className="space-y-8 pt-2">
          <GenreAnchorFallback availableSlugs={genreSections.map(s => genreSlug(s.genre))} />

          <div className="relative flex items-center gap-4 py-2">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-border" />
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card shrink-0">
              <BookOpen size={13} className="text-muted-foreground" />
              <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Explore by Mood</span>
            </div>
            <div className="flex-1 h-px bg-gradient-to-l from-transparent via-border to-border" />
          </div>

          {genreSections.map(({ genre, items: genreItems }) => {
            const { mood, emoji } = GENRE_MOODS[genre as (typeof GENRES)[number]] ?? { mood: genre, emoji: '📚' }
            return (
              <div key={genre} id={`genre-${genreSlug(genre)}`} className="space-y-3 scroll-mt-20">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-2xl leading-none shrink-0">{emoji}</span>
                    <div className="min-w-0">
                      <ScrollingTitle>
                        <h3 className="text-lg font-black leading-tight tracking-tight">{mood}</h3>
                      </ScrollingTitle>
                      <div className="h-0.5 w-8 rounded-full bg-primary mt-1 opacity-60" />
                    </div>
                  </div>
                  <Link href={`/browse?genre=${encodeURIComponent(genre)}`} className="shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1 text-xs text-muted-foreground hover:text-foreground h-8 px-3"
                    >
                      View All
                      <span aria-hidden>→</span>
                    </Button>
                  </Link>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3">
                  {genreItems.map((rec, i) => (
                    <ComicCard
                      key={rec.id}
                      recommendation={rec}
                      className={i >= 9 ? 'hidden md:block' : undefined}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Filter Bar */}
      <Suspense fallback={<div className="h-24 bg-muted/30 rounded-xl animate-pulse" />}>
        <FilterBar adult={false} />
      </Suspense>

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
  )
}