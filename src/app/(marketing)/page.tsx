import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { isProUser } from '@/lib/access'
import { Button } from '@/components/ui/button'
import { ComicCard } from '@/components/recommendations/ComicCard'
import { NewsCard } from '@/components/news/NewsCard'
import { ParticleCanvas } from '@/components/layout/ParticleCanvas'
import { AnimatedCounter } from '@/components/ui/AnimatedCounter'
import { LiveTicker } from '@/components/layout/LiveTicker'
import { ContributorLink } from '@/components/user/ContributorLink'
import {
  ArrowRight, Radar, BookOpen, Users, TrendingUp,
  Star, ChevronRight, Heart,
  ThumbsUp, MessageSquare, Bookmark, Trophy,
} from 'lucide-react'
import { GENRES, GENRE_MOODS, HOME_MOOD_GENRES, genreSlug } from '@/lib/utils/constants'
import type { Recommendation } from '@/types/database.types'
import type { News } from '@/types/database.types'
import type { Metadata } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://compicfy.com'

export const metadata: Metadata = {
  title: 'ComPicfy - Find your next obsession.',
  description: 'A warm community for manga, manhwa, manhua, and webtoon fans. Discover, recommend, and vote for the best comics.',
  openGraph: {
    title:       'ComPicfy - Find your next obsession.',
    description: 'Community-powered comic discovery. Browse, recommend, and vote.',
    images: [{ url: `${SITE_URL}/api/og`, width: 1200, height: 630, alt: 'ComPicfy' }],
  },
  twitter: {
    card:        'summary_large_image',
    title:       'ComPicfy - Find your next obsession.',
    description: 'Community-powered comic discovery. Browse, recommend, and vote.',
    images:      [`${SITE_URL}/api/og`],
  },
}

const PLATFORMS = [
  { name: 'Webtoon',     color: '#00d564' },
  { name: 'Tapas',       color: '#ff6b35' },
  { name: 'MangaPlus',   color: '#e40026' },
  { name: 'Viz Media',   color: '#f6821f' },
  { name: 'Crunchyroll', color: '#f47521' },
  { name: 'Lezhin',      color: '#888'    },
  { name: 'Manta',       color: '#6c5ce7' },
  { name: 'Tappytoon',   color: '#ff4081' },
]

const TYPE_COLORS: Record<string, string> = {
  manga:   'bg-rose-500/20 text-rose-400 border-rose-500/30',
  manhwa:  'bg-teal-500/20 text-teal-400 border-teal-500/30',
  manhua:  'bg-amber-500/20 text-amber-400 border-amber-500/30',
  webtoon: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
  comic:   'bg-blue-500/20 text-blue-400 border-blue-500/30',
  other:   'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
}

const RANK_STYLES: Record<number, { bg: string; text: string }> = {
  0: { bg: 'bg-amber-500/20', text: 'text-amber-400' },
  1: { bg: 'bg-slate-400/20', text: 'text-slate-400' },
  2: { bg: 'bg-amber-700/20', text: 'text-amber-600' },
}

function proxyCover(url: string | null | undefined): string {
  if (!url) return ""
  if (url.startsWith('data:')) return url
  if (url.startsWith('/')) return url
  if (url.includes('/api/image-proxy')) return url
  return `/api/image-proxy?url=${encodeURIComponent(url)}`
}

export default async function HomePage() {
  const supabase = await createClient()
  const [
    { data: trending },
    { data: recentNews },
    { count: memberCount },
    { count: comicCount },
    { count: reviewCount },
    { data: featuredData },
    { data: fallbackData },
    { data: recentActivity },
    { data: topContributors },
    { data: recentCollections },
    { data: recentLists },
  ] = await Promise.all([
    supabase.from('recommendations').select('*').eq('is_approved', true).not('content_rating', 'in', '("adult","mature")').order('score', { ascending: false }).limit(6),
    supabase.from('news').select('*').eq('is_published', true).order('published_at', { ascending: false }).limit(3),
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('recommendations').select('id', { count: 'exact', head: true }).eq('is_approved', true),
    supabase.from('reviews').select('id', { count: 'exact', head: true }),
    supabase.from('recommendations').select('*').eq('is_approved', true).eq('is_featured', true).not('content_rating', 'in', '("adult","mature")').order('score', { ascending: false }).limit(1),
    supabase.from('recommendations').select('*').eq('is_approved', true).not('content_rating', 'in', '("adult","mature")').order('score', { ascending: false }).limit(1),
    supabase.from('recommendations').select('title, type, user_id, profiles!recommendations_user_id_fkey(username)').eq('is_approved', true).not('content_rating', 'in', '("adult","mature")').order('created_at', { ascending: false }).limit(6),
    supabase.from('profiles').select('id, username, display_name, avatar_url, total_recommendations').eq('is_banned', false).not('role', 'eq', 'admin').neq('username', 'ghost').gt('total_recommendations', 0).order('total_recommendations', { ascending: false }).limit(6),
    (supabase as any)
      .from('collections')
      .select('id, title, cover_url, theme_color, save_count, profiles!collections_user_id_fkey(username, avatar_url), collection_items(recommendations(cover_url))')
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(4),
    (supabase as any)
      .from('reading_lists')
      .select('id, name, star_count, profiles!reading_lists_user_id_fkey(username, avatar_url), reading_list_items(recommendations(cover_url))')
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(4),
  ])

  const { data: { user } } = await supabase.auth.getUser()

  let submitRoute = '/dashboard/recommendations/new'
  if (user) {
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('role, is_pro, pro_expires_at')
      .eq('id', user.id)
      .single()
    const isPro = isProUser({
      role: (currentProfile as any)?.role ?? '',
      is_pro: (currentProfile as any)?.is_pro ?? false,
      pro_expires_at: (currentProfile as any)?.pro_expires_at ?? null,
    })
    if (isPro) submitRoute = '/pro/recommendations/new'
  }

  const topComics    = (trending        as Recommendation[]) ?? []
  const latestNews   = (recentNews      as News[])           ?? []
  const totalMembers = memberCount ?? 0
  const totalComics  = comicCount  ?? 0
  const totalReviews = reviewCount ?? 0
  const activity     = (recentActivity  ?? []) as any[]
  const contributors = (topContributors ?? []) as any[]

  const contributorIds = contributors.map((c: any) => c.id)
  const approvedCounts: Record<string, number> = {}
  if (contributorIds.length > 0) {
    const { data: approvedData } = await supabase
      .from('recommendations')
      .select('user_id')
      .eq('is_approved', true)
      .in('user_id', contributorIds)
    ;(approvedData ?? []).forEach((r: any) => {
       approvedCounts[r.user_id] = (approvedCounts[r.user_id] ?? 0) + 1
    })
  }

  const spotlight           = (featuredData?.[0] ?? fallbackData?.[0]) as Recommendation | undefined
  const spotlightIsFeatured = !!(featuredData?.[0])
  const spotlightTypeStyle  = spotlight ? (TYPE_COLORS[spotlight.type] ?? TYPE_COLORS.other) : ''
  const tickerItems = activity.map((rec: any) => ({
    title:    rec.title,
    type:     rec.type,
    username: rec.profiles?.username ?? 'someone',
  }))

  const collections = (recentCollections ?? []) as any[]
  const publicLists  = (recentLists       ?? []) as any[]

  return (
    <div className="flex flex-col">

      {/* ── HERO ── */}
      <section className="relative overflow-hidden min-h-[92vh] flex flex-col items-center justify-center">
        <div className="absolute inset-0 bg-background" />

        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-primary/6 dark:bg-primary/8 blur-[120px]" />
        </div>

        <div className="absolute inset-0 opacity-40 dark:opacity-80">
          <ParticleCanvas />
        </div>

        <div className="absolute inset-0 overflow-hidden pointer-events-none hidden md:block">
          <div className="absolute top-16 right-20 w-32 h-44 rounded border border-border/40 rotate-6" />
          <div className="absolute top-8   right-40 w-24 h-32 rounded border border-border/30 -rotate-3" />
          <div className="absolute top-40 right-12 w-16 h-24 rounded border border-border/20 rotate-12" />
          <div className="absolute bottom-20 right-52 w-28 h-36 rounded border border-border/30 -rotate-6" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 py-16 md:py-24 w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">

            <div className="space-y-6 text-center md:text-left">
              <div className="space-y-1">
                <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black leading-[0.95] tracking-tight">
                  Find your
                </h1>
                <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black leading-[0.95] tracking-tight">
                  next{' '}
                  <span className="relative inline-block">
                    <span className="text-primary">
                       obsession.
                    </span>
                    <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-primary/40 rounded-full" />
                  </span>
                </h1>
              </div>

              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-lg mx-auto md:mx-0">
                The community where manga, manhwa, manhua &amp; webtoon fans discover, recommend, and vote for the best reads.
              </p>

              <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                <Link href="/browse">
                  <Button size="lg" className="gap-2 h-12 px-6 font-bold bg-primary hover:bg-primary/90 border-0 text-primary-foreground">
                    <Radar size={17} />
                    Browse Comics
                    <ArrowRight size={15} />
                  </Button>
                </Link>
                {!user ? (
                  <Link href="/signup">
                    <Button size="lg" variant="outline" className="gap-2 h-12 px-6 font-semibold">
                      <Users size={17} />
                      Join Free
                    </Button>
                  </Link>
                ) : (
                  <Link href={submitRoute}>
                    <Button size="lg" variant="outline" className="gap-2 h-12 px-6 font-semibold">
                      <BookOpen size={17} />
                      Submit a Recommendation
                    </Button>
                  </Link>
                )}
              </div>

              {/* Stats Panel */}
              <div className="flex flex-wrap gap-5 pt-2 justify-center md:justify-start">
                {[
                  { label: 'Comics Shared', value: totalComics,  icon: BookOpen,      color: 'text-rose-500',  bg: 'bg-rose-500/10',  threshold: 20 },
                  { label: 'Reviews',       value: totalReviews, icon: MessageSquare, color: 'text-amber-500', bg: 'bg-amber-500/10', threshold: 20 },
                ]
                  .filter(({ value }) => value > 0)
                  .map(({ label, value, icon: Icon, color, bg, threshold }) => {
                    const isCredible = value >= threshold
                    return (
                      <div key={label} className="flex items-center gap-2 text-sm">
                        {/* FIX: Correct syntax wrapper for class configurations */}
                        <div className={`w-8 h-8 rounded ${bg} flex items-center justify-center ${color}`}>
                          <Icon size={14} />
                        </div>
                        <div>
                          {isCredible ? (
                            <p className="font-bold text-foreground tabular-nums leading-tight">
                              <AnimatedCounter target={value} suffix="+" />
                            </p>
                          ) : (
                            <p className="font-bold text-foreground leading-tight">Growing</p>
                          )}
                          <p className="text-xs text-muted-foreground leading-tight">{label}</p>
                        </div>
                      </div>
                    )
                  })}
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary">
                    <Users size={14} />
                  </div>
                  <div>
                    <p className="font-bold text-foreground leading-tight">Growing</p>
                    <p className="text-xs text-muted-foreground leading-tight">Community</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Spotlight comic */}
            {spotlight && (
              <div className="hidden md:flex justify-center items-center">
                <Link href={`/comic/${spotlight.id}`} className="group relative">
                  <div className="absolute -inset-3 rounded-xl bg-primary/10 blur-xl opacity-50 group-hover:opacity-70 transition-opacity" />
                  <div className="relative w-60 rounded-lg overflow-hidden border border-border shadow-2xl">
                    {spotlight.cover_url ? (
                      <img
                        src={proxyCover(spotlight.cover_url)}
                        alt={spotlight.title}
                        className="w-full aspect-[3/4] object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full aspect-[3/4] bg-muted flex items-center justify-center">
                        <BookOpen size={40} className="text-muted-foreground opacity-30" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border capitalize ${spotlightTypeStyle}`}>
                          {spotlight.type}
                        </span>
                        {spotlightIsFeatured && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-amber-400 font-bold">
                            <Star size={9} className="fill-amber-400" />
                            Featured
                          </span>
                        )}
                      </div>
                      <p className="text-white font-black text-base leading-tight line-clamp-2">
                        {spotlight.title}
                      </p>
                      <div className="flex items-center gap-3 text-white/50 text-xs">
                        <span className="flex items-center gap-1"><ThumbsUp size={10} />{spotlight.upvotes}</span>
                        <span className="flex items-center gap-1"><Bookmark size={10} />{spotlight.save_count}</span>
                      </div>
                    </div>
                    <div className="absolute top-3 right-3 px-2 py-0.5 rounded bg-black/60 text-[10px] font-black text-white border border-white/10">
                      {spotlightIsFeatured ? '✨ Top Pick' : '🏆 Top Rated'}
                    </div>
                  </div>
                </Link>
              </div>
            )}
          </div>
        </div>

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 text-muted-foreground/30 text-[10px] tracking-widest uppercase pointer-events-none">
          <span>scroll</span>
          <div className="w-px h-8 bg-gradient-to-b from-muted-foreground/20 to-transparent" />
        </div>
      </section>

      {/* ── LIVE TICKER ── */}
      <LiveTicker items={tickerItems} />

      {/* ── PLATFORM TRUST BAR ── */}
      <section className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-5">
          <p className="text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-4">
            Comics from official platforms including
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 md:gap-4">
            {PLATFORMS.map((p) => (
              <div key={p.name} className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-border bg-card text-xs font-medium text-muted-foreground hover:text-foreground hover:border-border/80 transition-colors">
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                {p.name}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── GENRE MOOD PILLS ──
          All 25 genres, sourced from GENRE_MOODS (lib/utils/constants.ts) so
          this stays in lockstep with the browse page genre section labels.
          Clicking a pill scrolls straight to that genre's section on
          /browse instead of loading the filtered comic grid. */}
      <section className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-7">
          <p className="text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-5">
            Browse by mood
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            {HOME_MOOD_GENRES.map((genre) => {
              const { mood, emoji } = GENRE_MOODS[genre]
              return (
                <Link key={genre} href={`/browse#genre-${genreSlug(genre)}`}>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-border bg-card text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/5 transition-all duration-150 cursor-pointer select-none font-medium">
                    <span className="text-base leading-none">{emoji}</span>
                    {mood}
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── TRENDING COMICS ── */}
      {topComics.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 py-14 space-y-6 w-full">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🔥</span>
              <div>
                <h2 className="text-2xl font-black tracking-tight">Trending Now</h2>
                <div className="h-px w-8 bg-primary mt-1" />
              </div>
            </div>
            <Link href="/browse?sort=score">
              <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground hover:text-foreground text-xs">
                View all <ChevronRight size={13} />
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {topComics.map((rec) => (
              <ComicCard key={rec.id} recommendation={rec} />
            ))}
          </div>
        </section>
      )}

      {/* ── TOP CONTRIBUTORS ── */}
      {contributors.length > 0 && (
        <section className="border-y border-border">
          <div className="max-w-7xl mx-auto px-4 py-12 space-y-8">
            <div className="text-center space-y-2">

              <h2 className="text-2xl font-black tracking-tight">The people behind the picks</h2>
              <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                Real readers sharing what they love.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {contributors.map((contributor: any, i: number) => {
                const rankStyle = RANK_STYLES[i] ?? { bg: 'bg-muted', text: 'text-muted-foreground' }
                return (
                  <ContributorLink
                    key={contributor.id}
                    username={contributor.username}
                    displayName={contributor.display_name || contributor.username}
                    avatarUrl={contributor.avatar_url}
                    totalRecs={approvedCounts[contributor.id] ?? 0}
                    rank={i}
                    isLoggedIn={!!user}
                    rankStyle={rankStyle}
                  />
                );
              })}
            </div>

            <div className="text-center">
              <Link href="/browse">
                <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                  Browse their recommendations <ChevronRight size={12} />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── COLLECTIONS & LISTS ── */}
      {(collections.length > 0 || publicLists.length > 0) && (
        <section className="border-y border-border">
          <div className="max-w-7xl mx-auto px-4 py-14 space-y-10">
            <div className="text-center space-y-2">

              <h2 className="text-2xl font-black tracking-tight">Collections & reading lists</h2>
              <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                Themed picks and reading journeys, built by the community.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Collections */}
              {collections.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground">Recent Collections</h3>
                    <Link href="/collections" className="text-xs text-primary hover:underline flex items-center gap-0.5 shrink-0">
                      View all <ChevronRight size={12} />
                    </Link>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {collections.map((col: any) => {
                      const covers = (col.collection_items ?? [])
                        .map((i: any) => i.recommendations?.cover_url)
                        .filter(Boolean)
                        .slice(0, 4) as string[]
                      const dominant = covers[0]
                      return (
                        <Link key={col.id} href={`/collections/${col.id}`} className="group relative h-32 rounded-xl overflow-hidden border border-border block">
                          {dominant ? (
                            <img src={proxyCover(dominant)} alt={col.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          ) : (
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-transparent" />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
                          <div className="absolute bottom-0 left-0 right-0 p-2.5">
                            <p className="text-white text-xs font-black leading-snug line-clamp-2 drop-shadow">{col.title}</p>
                            {col.profiles?.username && (
                              <p className="text-white/60 text-[10px] mt-0.5">@{col.profiles.username}</p>
                            )}
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Public lists */}
              {publicLists.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground">Recent Reading Lists</h3>
                    <Link href="/lists" className="text-xs text-primary hover:underline flex items-center gap-0.5 shrink-0">
                      View all <ChevronRight size={12} />
                    </Link>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {publicLists.map((list: any) => {
                      const covers = (list.reading_list_items ?? [])
                        .map((i: any) => i.recommendations?.cover_url)
                        .filter(Boolean)
                        .slice(0, 4) as string[]
                      const dominant = covers[0]
                      return (
                        <Link key={list.id} href={`/lists/${list.id}`} className="group relative h-32 rounded-xl overflow-hidden border border-border block">
                          {dominant ? (
                            <img src={proxyCover(dominant)} alt={list.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          ) : (
                            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/30 to-transparent" />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
                          <div className="absolute bottom-0 left-0 right-0 p-2.5">
                            <p className="text-white text-xs font-black leading-snug line-clamp-2 drop-shadow">{list.name}</p>
                            {list.profiles?.username && (
                              <p className="text-white/60 text-[10px] mt-0.5">@{list.profiles.username}</p>
                            )}
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── HOW IT WORKS ── */}
      <section className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-14 space-y-10">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-black tracking-tight">Three steps, zero gatekeeping</h2>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto">
              Anyone can rec. The community decides what rises.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                step:  '01',
                icon:  BookOpen,
                title: 'Drop your rec',
                desc:  'Found something worth reading? Post it. Add a cover, pick genres, and write one honest reason why people should give it a shot.',
                color: 'text-primary',
                bg:    'bg-primary/10',
              },
              {
                step:  '02',
                icon:  TrendingUp,
                title: 'The community votes',
                desc:  'Other readers upvote or downvote. High-scoring recs hit the featured carousel daily, no hand-picking, just community signal.',
                color: 'text-sky-500',
                bg:    'bg-sky-500/10',
              },
              {
                step:  '03',
                icon:  Heart,
                title: 'Read, review, repeat',
                desc:  'Save anything that catches your eye, leave a short review when you finish, and build a reading list that reflects what you liked.',
                color: 'text-amber-500',
                bg:    'bg-amber-500/10',
              },
            ].map(({ step, icon: Icon, title, desc, color, bg }) => (
              <div key={step} className="relative p-6 rounded-lg bg-card border border-border space-y-4 hover:border-primary/30 transition-colors duration-200">
                <span className="absolute top-4 right-5 text-4xl font-black text-muted-foreground/6 select-none">{step}</span>
                {/* FIX: Correct syntax wrapper for how it works items */}
                <div className={`w-10 h-10 rounded ${bg} flex items-center justify-center ${color}`}>
                  <Icon size={19} />
                </div>
                <h3 className="font-black text-lg leading-snug">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── LATEST NEWS ── */}
      {latestNews.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 py-14 space-y-6 w-full">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📰</span>
              <div>
                <h2 className="text-2xl font-black tracking-tight">Latest News</h2>
                <div className="h-px w-8 bg-primary mt-1" />
              </div>
            </div>
            <Link href="/news">
              <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground hover:text-foreground text-xs">
                All news <ChevronRight size={13} />
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {latestNews.map((item) => (
              <NewsCard key={item.id} news={item} />
            ))}
          </div>
        </section>
      )}

      {/* ── CTA BANNER ── */}
      <section className="max-w-7xl mx-auto px-4 py-14 w-full">
        <div className="relative overflow-hidden rounded-lg p-8 md:p-12 bg-card border border-border">
          <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-primary/8 blur-3xl pointer-events-none" />
          <div className="absolute top-0 left-0 right-0 h-px bg-primary/20 pointer-events-none" />
          <div className="relative max-w-2xl space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded border border-border text-muted-foreground text-xs font-semibold">
              <Star size={12} className="fill-amber-400 text-amber-400" />
              Got a hidden gem?
            </div>
            <h2 className="text-3xl md:text-4xl font-black leading-tight tracking-tight">
              Someone out there needs to read<br className="hidden md:block" />
              <span className="text-primary"> what you just finished.</span>
            </h2>
            <p className="text-muted-foreground leading-relaxed text-sm max-w-lg">
              Post the manga, manhwa, or webtoon you can't stop thinking about. Takes two minutes. Might make someone's whole week.
            </p>
            <div className="flex flex-wrap gap-3 pt-1">
              <Link href={user ? submitRoute : '/signup'}>
                <Button size="lg" className="gap-2 h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-bold border-0">
                  <BookOpen size={15} />
                  {user ? 'Submit a Recommendation' : "Join ComPicfy, it's free"}
                </Button>
              </Link>
              <Link href="/browse">
                <Button size="lg" variant="outline" className="gap-2 h-11 font-semibold">
                  Browse First
                  <ArrowRight size={15} />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}