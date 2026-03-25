import { createClient } from '@/lib/supabase/server'
import { Suspense } from 'react'
import { FilterBar } from '@/components/recommendations/FilterBar'
import { FeaturedCarousel } from '@/components/recommendations/FeaturedCarousel'
import { HorizontalSection } from '@/components/recommendations/HorizontalSection'
import { ComicGridClient } from '@/components/recommendations/ComicGridClient'
import { ShieldAlert, BookOpen, ArrowLeft } from 'lucide-react'
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
}

interface Props {
  searchParams: Promise<SearchParams>
}

const PAGE_SIZE = 24

async function getFeatured() {
  const s = await createClient()
  const { data } = await s.from('recommendations').select('*').eq('is_approved', true).in('content_rating', ['adult', 'mature']).order('daily_votes', { ascending: false }).limit(8)
  return (data as Recommendation[]) ?? []
}
async function getTrending() {
  const s = await createClient()
  const { data } = await s.from('recommendations').select('*').eq('is_approved', true).in('content_rating', ['adult', 'mature']).order('daily_votes', { ascending: false }).limit(12)
  return (data as Recommendation[]) ?? []
}
async function getRecent() {
  const s = await createClient()
  const { data } = await s.from('recommendations').select('*').eq('is_approved', true).in('content_rating', ['adult', 'mature']).order('created_at', { ascending: false }).limit(12)
  return (data as Recommendation[]) ?? []
}
async function getAdminPicks() {
  const s = await createClient()
  const { data } = await s.from('recommendations').select('*').eq('is_approved', true).eq('is_featured', true).in('content_rating', ['adult', 'mature']).order('featured_at', { ascending: false }).limit(12)
  return (data as Recommendation[]) ?? []
}
async function getCommunityFavourites() {
  const s = await createClient()
  const { data } = await s.from('recommendations').select('*').eq('is_approved', true).in('content_rating', ['adult', 'mature']).order('score', { ascending: false }).limit(12)
  return (data as Recommendation[]) ?? []
}
async function getHiddenGems() {
  const s = await createClient()
  const { data } = await s.from('recommendations').select('*').eq('is_approved', true).in('content_rating', ['adult', 'mature']).order('save_count', { ascending: false }).limit(12)
  return (data as Recommendation[]) ?? []
}
async function getYouMightLike(userId: string) {
  const s = await createClient()
  const { data } = await (s as any).rpc('get_personalized_recommendations', { p_user_id: userId, p_exclude_id: null, p_limit: 12, p_content_ratings: ['mature', 'adult'] })
  return (data as Recommendation[]) ?? []
}

async function getInitialGrid(params: SearchParams) {
  const supabase = await createClient()

  const { data } = await (supabase as any).rpc('search_recommendations', {
    p_query:  params.q      || null,
    p_type:   params.type   || null,
    p_genre:  params.genre  || null,
    p_status: params.status || null,
    p_sort:   params.sort   ?? 'score',
    p_adult:  true,
    p_limit:  PAGE_SIZE,
    p_offset: 0,
  })

  const { count } = await supabase
    .from('recommendations')
    .select('*', { count: 'exact', head: true })
    .eq('is_approved', true)
    .in('content_rating', ['adult', 'mature'])

  return {
    items: (data as Recommendation[]) ?? [],
    total: count ?? 0,
  }
}

function hasActiveFilters(p: SearchParams) {
  return !!(p.q || p.type || p.genre || p.status || p.sort)
}

function AccessGate({ title, description, actions }: {
  title: string
  description: string
  actions: React.ReactNode
}) {
  return (
    <div className="max-w-md mx-auto px-4 py-24 text-center space-y-5">
      <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto">
        <ShieldAlert size={28} className="text-destructive" />
      </div>
      <h1 className="text-2xl font-black">{title}</h1>
      <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
      <div className="flex justify-center gap-3">{actions}</div>
    </div>
  )
}

export default async function AdultBrowsePage({ searchParams }: Props) {
  const params = await searchParams
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
            <Link href="/browse"><Button variant="outline">Back to Browse</Button></Link>
            <Link href="/login"><Button className="bg-gradient-to-r from-primary to-violet-500 hover:opacity-90 border-0">Log In</Button></Link>
          </>
        }
      />
    )
  }

  const { data: profile } = await supabase.from('profiles').select('adult_content_enabled').eq('id', user.id).single()

  if (!(profile as any)?.adult_content_enabled) {
    return (
      <AccessGate
        title="Adult Content Disabled"
        description="Enable adult content in your profile settings to access this section."
        actions={
          <>
            <Link href="/browse"><Button variant="outline">Back to Browse</Button></Link>
            <Link href="/dashboard/settings"><Button className="bg-gradient-to-r from-primary to-violet-500 hover:opacity-90 border-0">Go to Settings</Button></Link>
          </>
        }
      />
    )
  }

  const [featured, trending, recent, adminPicks, communityFavs, hiddenGems, youMightLike, { items, total }] =
    await Promise.all([
      isFiltering ? Promise.resolve([]) : getFeatured(),
      isFiltering ? Promise.resolve([]) : getTrending(),
      isFiltering ? Promise.resolve([]) : getRecent(),
      isFiltering ? Promise.resolve([]) : getAdminPicks(),
      isFiltering ? Promise.resolve([]) : getCommunityFavourites(),
      isFiltering ? Promise.resolve([]) : getHiddenGems(),
      isFiltering ? Promise.resolve([]) : getYouMightLike(user.id),
      getInitialGrid(params),
    ])

  const clientParams: Record<string, string> = { adult: 'true' }
  if (params.q)      clientParams.q      = params.q
  if (params.type)   clientParams.type   = params.type
  if (params.genre)  clientParams.genre  = params.genre
  if (params.status) clientParams.status = params.status
  if (params.sort)   clientParams.sort   = params.sort

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-8">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-destructive to-rose-600 flex items-center justify-center shadow-lg shadow-destructive/20 shrink-0">
            <ShieldAlert size={17} className="text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-3xl font-black tracking-tight leading-tight">18+ Comics</h1>
            <p className="text-muted-foreground text-xs sm:text-sm leading-snug mt-0.5">
              Adult &amp; mature content · opted-in users only
            </p>
          </div>
        </div>
        <Link href="/browse" className="shrink-0">
          <Button variant="outline" size="sm" className="gap-1.5 whitespace-nowrap">
            <ArrowLeft size={13} />
            All Ages Browse
          </Button>
        </Link>
      </div>

      {/* ── Warning banner ── */}
      <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-destructive/5 border border-destructive/20">
        <span className="text-base shrink-0 mt-0.5">🔞</span>
        <p className="text-xs text-muted-foreground leading-relaxed">
          This section contains adult (18+) and mature (17+) rated content, manually approved by admins.
          To disable, go to{' '}
          <Link href="/dashboard/settings" className="underline hover:text-foreground transition-colors">Settings</Link>.
        </p>
      </div>

      {/* ── Featured Carousel ── */}
      {!isFiltering && featured.length > 0 && (
        <Suspense fallback={<div className="h-[280px] sm:h-[360px] rounded-2xl bg-muted animate-pulse" />}>
          <FeaturedCarousel recommendations={featured} />
        </Suspense>
      )}

      {/* ── Horizontal Sections ── */}
      {!isFiltering && (
        <div className="space-y-8">
          {trending.length > 0      && <HorizontalSection title="Trending Today"       emoji="🔥" recommendations={trending}      viewAllHref="/browse/adult?sort=trending" />}
          {recent.length > 0        && <HorizontalSection title="Recently Added"       emoji="✨" recommendations={recent}        viewAllHref="/browse/adult?sort=recent"   />}
          {adminPicks.length > 0    && <HorizontalSection title="Admin Picks"          emoji="👑" recommendations={adminPicks}                                               />}
          {communityFavs.length > 0 && <HorizontalSection title="Community Favourites" emoji="❤️" recommendations={communityFavs} viewAllHref="/browse/adult?sort=score"    />}
          {hiddenGems.length > 0    && <HorizontalSection title="Hidden Gems"          emoji="💎" recommendations={hiddenGems}                                               />}
          {youMightLike.length > 0  && <HorizontalSection title="You Might Like"       emoji="🎯" recommendations={youMightLike}                                             />}
        </div>
      )}

      {/* ── All 18+ divider ── */}
      {!isFiltering && (
        <div className="relative flex items-center gap-4 py-2">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-border" />
          <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-card shrink-0">
            <BookOpen size={13} className="text-muted-foreground" />
            <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">All 18+ Comics</span>
          </div>
          <div className="flex-1 h-px bg-gradient-to-l from-transparent via-border to-border" />
        </div>
      )}

      {/* ── Filter Bar ── */}
      <Suspense fallback={<div className="h-24 bg-muted/30 rounded-xl animate-pulse" />}>
        <FilterBar adult={true} />
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