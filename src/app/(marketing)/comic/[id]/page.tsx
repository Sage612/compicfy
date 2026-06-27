import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { ReviewSection } from '@/components/recommendations/ReviewSection'
import { AddToListButton } from '@/components/recommendations/AddToListButton'
import { AddToCollectionButton } from '@/components/collections/AddToCollectionButton'
import { SimilarComics } from '@/components/recommendations/SimilarComics'
import {
  BookOpen, Calendar, Hash, User, Palette,
  Globe, ExternalLink, ArrowLeft, ShieldAlert,
  Star, ThumbsUp, Bookmark, MessageSquare,
} from 'lucide-react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils/format'
import { VoteButtons } from '@/components/recommendations/VoteButtons'
import { SaveButton } from '@/components/recommendations/SaveButton'
import { ShareButton } from '@/components/recommendations/ShareButton'
import type { Metadata } from 'next'
import type { Recommendation } from '@/types/database.types'
import { Button } from '@/components/ui/button'
import { Suspense } from 'react'
import { ContextualOffers } from '@/components/affiliate/ContextualOffers'
import { ReadingProgressButton } from '@/components/recommendations/ReadingProgressButton'
import { SubmitYourOwnButton } from '@/components/recommendations/SubmitYourOwnButton'
import { RecommenderLink } from '@/components/recommendations/RecommenderLink'
import { headers } from 'next/headers'
import { Fraunces, JetBrains_Mono } from 'next/font/google'

// ── Editorial type system ────────────────────────────────────────
const display = Fraunces({
  subsets: ['latin'],
  weight: ['400', '500', '600', '900'],
  style: ['normal', 'italic'],
  variable: '--font-display',
})
const mono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-mono',
})

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://compicfy.com'
const GHOST_ID = '00000000-0000-0000-0000-000000000000'

const PALETTE = {
  ink:   '#0b0b0e',
  panel: '#15151a',
  paper: '#f3efe7',
} as const

interface Props {
  params: Promise<{ id: string }>
}

function truncateAtWord(str: string, max: number): string {
  if (str.length <= max) return str
  const cut = str.slice(0, max)
  const lastSpace = cut.lastIndexOf(' ')
  return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut) + '…'
}

function ratioToStars(upvotes: number, downvotes: number): number {
  const total = upvotes + downvotes
  if (total === 0) return 4
  const ratio = upvotes / total
  return Math.round((1 + ratio * 4) * 10) / 10
}

function isCrawler(userAgent: string): boolean {
  return /googlebot|bingbot|slurp|duckduckbot|baiduspider|yandex|facebot|ia_archiver|twitterbot|linkedinbot|whatsapp|telegrambot/i
    .test(userAgent)
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('recommendations')
    .select('title, description, type, genres, author, cover_url, status')
    .eq('id', id)
    .single()

  type RecMeta = Pick<Recommendation, 'title' | 'description' | 'type' | 'genres' | 'author' | 'cover_url' | 'status'>
  const rec = data as RecMeta | null
  if (!rec) return { title: 'Comic' }

  const typeLabel = rec.type
    ? rec.type.charAt(0).toUpperCase() + rec.type.slice(1)
    : 'Comic'

  const genreList = rec.genres?.slice(0, 3).join(', ') ?? ''

  const rawDesc = [
    `${rec.title} is a ${typeLabel.toLowerCase()}`,
    rec.author   ? `by ${rec.author}`           : null,
    genreList    ? `in the genres ${genreList}`  : null,
    rec.status   ? `— currently ${rec.status}.` : null,
    rec.description ? rec.description           : 'Discover where to read it and what the community thinks.',
  ].filter(Boolean).join(' ')

  const description = truncateAtWord(rawDesc, 155)

  const keywords = [
    rec.title,
    `${rec.title} ${rec.type}`,
    `${rec.title} review`,
    `${rec.title} where to read`,
    `${rec.title} recommendation`,
    ...(rec.genres ?? []),
    rec.author ?? null,
    typeLabel,
    'manga recommendation',
    'manhwa recommendation',
    'manhua recommendation',
     'webtoon recommendation',
  ].filter((k): k is string => !!k && k.trim().length > 0)

  const ogParams = new URLSearchParams({
    title:       rec.title        ?? '',
    description: description      ?? '',
    ...(rec.cover_url ? { cover: rec.cover_url } : {}),
    ...(rec.type      ? { type:  rec.type      } : {}),
  })
  const ogImageUrl = `${SITE_URL}/api/og?${ogParams.toString()}`
  const pageUrl    = `${SITE_URL}/comic/${id}`
  const pageTitle  = `${rec.title} ${typeLabel}`

  return {
    title:       pageTitle,
    description,
    keywords,
    alternates:  { canonical: pageUrl },
    openGraph: {
      title:       pageTitle,
      description,
      type:        'article',
      url:         pageUrl,
      siteName:    'Compicfy',
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: `${rec.title} cover` }],
    },
    twitter: {
      card:        'summary_large_image',
      title:       pageTitle,
      description,
      images:      [ogImageUrl],
    },
  }
}

function ComicJsonLd({
  rec,
  id,
  recommenderName,
}: {
  rec: Recommendation
  id: string
  recommenderName: string
}) {
  const typeLabel = rec.type
    ? rec.type.charAt(0).toUpperCase() + rec.type.slice(1)
    : 'Comic'

  const ratingValue = ratioToStars(rec.upvotes ?? 0, rec.downvotes ?? 0)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type':    'Book',
    name:        rec.title,
    description: rec.description
      ? truncateAtWord(rec.description, 300)
      : undefined,
    url:         `${SITE_URL}/comic/${id}`,
    ...(rec.cover_url     ? { image: rec.cover_url }                                         : {}),
    ...(rec.author        ? { author: { '@type': 'Person', name: rec.author } }              : {}),
    ...(rec.year_released ? { datePublished: String(rec.year_released) }                     : {}),
    bookFormat:   'GraphicNovel',
    inLanguage:   rec.original_language ?? 'ja',
    genre:        rec.genres ?? [],
    ...(rec.review_count > 0
      ? {
          aggregateRating: {
            '@type':       'AggregateRating',
            ratingValue,
            ratingCount:   rec.review_count,
            reviewCount:   rec.review_count,
            bestRating:    5,
            worstRating:   1,
          },
        }
      : {}),
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home',   item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: 'Browse', item: `${SITE_URL}/browse` },
        { '@type': 'ListItem', position: 3, name: rec.title, item: `${SITE_URL}/comic/${id}` },
      ],
    },
    mainEntityOfPage: {
      '@type':     'WebPage',
      '@id':       `${SITE_URL}/comic/${id}`,
      name:        `${rec.title} — ${typeLabel} Recommendation`,
      description: `Community recommendation for ${rec.title}. Recommended by ${recommenderName} on Compicfy.`,
      publisher: {
        '@type': 'Organization',
        name:    'Compicfy',
        url:      SITE_URL,
        logo:    `${SITE_URL}/icons/icon-192.png`,
      },
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}

const TYPE_STYLES: Record<string, { gradient: string; badge: string; glow: string; border: string }> = {
  manga:   { gradient: 'from-rose-500   to-pink-600',   badge: 'bg-rose-500/15   text-rose-500   border-rose-500/25',   glow: 'bg-rose-500/20',   border: 'border-rose-500/30'   },
  manhwa:  { gradient: 'from-teal-500   to-cyan-600',   badge: 'bg-teal-500/15   text-teal-500   border-teal-500/25',   glow: 'bg-teal-500/20',   border: 'border-teal-500/30'   },
  manhua:  { gradient: 'from-amber-500  to-orange-500', badge: 'bg-amber-500/15  text-amber-500  border-amber-500/25',  glow: 'bg-amber-500/20',  border: 'border-amber-500/30'  },
  webtoon: { gradient: 'from-teal-500   to-cyan-600',   badge: 'bg-teal-500/15   text-teal-500   border-teal-500/25',   glow: 'bg-teal-500/20',   border: 'border-teal-500/30'   },
  comic:   { gradient: 'from-blue-500   to-indigo-600', badge: 'bg-blue-500/15   text-blue-500   border-blue-500/25',   glow: 'bg-blue-500/20',   border: 'border-blue-500/30'   },
}

const STATUS_STYLES: Record<string, string> = {
  ongoing:   'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  completed: 'bg-blue-500/10   text-blue-600    dark:text-blue-400    border-blue-500/20',
  hiatus:    'bg-amber-500/10  text-amber-600   dark:text-amber-400   border-amber-500/20',
  cancelled: 'bg-red-500/10    text-red-600     dark:text-red-400     border-red-500/20',
}

export default async function ComicDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const headersList = await headers()
  const ua = headersList.get('user-agent') ?? ''
  if (!isCrawler(ua)) {
    await (supabase as any).rpc('increment_view_count', { rec_id: id })
  }

  const { data: rawRec } = await supabase
    .from('recommendations')
    .select('*')
    .eq('id', id)
    .eq('is_approved', true)
    .single()

  if (!rawRec) notFound()
  const rec = rawRec as Recommendation

  const { data: { user } } = await supabase.auth.getUser()

  if (rec.content_rating === 'adult' || rec.content_rating === 'mature') {
    if (!user) {
      return (
        <div className="max-w-md mx-auto px-4 py-24 text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto">
            <ShieldAlert size={32} className="text-destructive" />
          </div>
          <h1 className="text-2xl font-black">Age Restricted</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            This comic contains {rec.content_rating === 'adult' ? '18+' : '17+'} content.
            Log in and enable adult content in settings to view it.
          </p>
          <div className="flex justify-center gap-3">
            <Link href="/browse"><Button variant="outline">Back to Browse</Button></Link>
            <Link href="/login"><Button>Log In</Button></Link>
          </div>
        </div>
      )
    }
    const { data: profileFlag } = await supabase
      .from('profiles')
      .select('adult_content_enabled')
      .eq('id', user.id)
      .single()
    if (!(profileFlag as any)?.adult_content_enabled) {
      return (
        <div className="max-w-md mx-auto px-4 py-24 text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto">
            <ShieldAlert size={32} className="text-destructive" />
          </div>
          <h1 className="text-2xl font-black">Adult Content Disabled</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Enable adult content in your profile settings to view this comic.
          </p>
          <div className="flex justify-center gap-3">
            <Link href="/browse"><Button variant="outline">Back to Browse</Button></Link>
            <Link href="/reader/dashboard/settings"><Button>Go to Settings</Button></Link>
          </div>
        </div>
      )
    }
  }

  const { data: profileData } = await supabase
    .from('profiles')
    .select('username, display_name, avatar_url, role, is_pro, pro_expires_at, verified_recommender, user_type')
    .eq('id', rec.user_id)
    .maybeSingle()

  const profile = profileData as {
    username:             string
    display_name:         string | null
    avatar_url:           string | null
    role:                 string
    is_pro:               boolean
    pro_expires_at:       string | null
    verified_recommender: boolean
    user_type:            string | null
  } | null

  const isGhostRec = rec.user_id === GHOST_ID

  const recommenderIsPro = profile
    ? profile.role === 'admin' ||
      (profile.is_pro && (!profile.pro_expires_at || new Date(profile.pro_expires_at) > new Date()))
    : false

  const recommenderIsVerified = profile?.verified_recommender ?? false
  const recommenderName       = isGhostRec
    ? 'Ghost'
    : (profile?.display_name || profile?.username || 'unknown')

  let submitRoute = '/reader/dashboard/recommendations/new'
  if (user) {
    const { data: currentUserProfile } = await supabase
      .from('profiles')
      .select('role, is_pro, pro_expires_at, user_type')
      .eq('id', user.id)
      .single()
    const isAdminOrMod = ['admin', 'moderator'].includes((currentUserProfile as any)?.role ?? '')
    const isPro        = (currentUserProfile as any)?.is_pro &&
      (!(currentUserProfile as any)?.pro_expires_at ||
        new Date((currentUserProfile as any).pro_expires_at) > new Date())
    const isCreator    = (currentUserProfile as any)?.user_type === 'creator'
    if (isAdminOrMod || isPro) {
      submitRoute = isCreator
        ? '/pro/creator/dashboard/works/new'
        : '/pro/reader/dashboard/recommendations/new'
    } else if (isCreator) {
      submitRoute = '/creator/dashboard/works/new'
    }
  }

  let userVote: 'up' | 'down' | null = null
  let isSaved = false
  if (user) {
    const [voteRes, saveRes] = await Promise.all([
      (supabase as any).from('votes').select('vote_type').eq('user_id', user.id).eq('recommendation_id', id).maybeSingle(),
      (supabase as any).from('saves').select('id').eq('user_id', user.id).eq('recommendation_id', id).maybeSingle(),
    ])
    userVote = (voteRes.data?.vote_type as 'up' | 'down') ?? null
    isSaved  = !!saveRes.data
  }

  const typeStyle = TYPE_STYLES[rec.type] ?? {
    gradient: 'from-primary to-rose-600',
    badge:    'bg-primary/15 text-primary border-primary/25',
    glow:     'bg-primary/15',
    border:   'border-primary/20',
  }

  const stats = [
    { icon: ThumbsUp,      label: 'Upvotes', value: rec.upvotes      ?? 0 },
    { icon: Star,          label: 'Reviews', value: rec.review_count ?? 0 },
    { icon: Bookmark,      label: 'Saves',   value: rec.save_count   ?? 0 },
    { icon: MessageSquare, label: 'Score',   value: rec.score        ?? 0 },
  ]

  return (
    <>
      <ComicJsonLd rec={rec} id={id} recommenderName={recommenderName} />

      <div
        className={`${display.variable} ${mono.variable} min-h-screen bg-[var(--ink)] text-[var(--paper)]`}
        style={{
          '--ink': PALETTE.ink,
          '--panel': PALETTE.panel,
          '--paper': PALETTE.paper,
        } as React.CSSProperties}
      >

        {/* ══════════════════════════ CINEMATIC HERO ══════════════════════════
            FIX: was h-[52vh] md:h-[72vh] — on most phones that's 400–650px of
            mostly-blurred-background dead space before any real content shows.
            Cut to a height that still reads as "cinematic" without pushing the
            dossier card (and everything after it) a full screen down.
        */}
        <div className="relative h-[34vh] md:h-[46vh] min-h-[260px] max-h-[420px] overflow-hidden">
          {rec.cover_url && (
            <img
              src={`/api/image-proxy?url=${encodeURIComponent(rec.cover_url)}`}
              alt=""
              aria-hidden
              className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-30"
            />
          )}
          <div className={`absolute inset-0 bg-gradient-to-br ${typeStyle.gradient} opacity-20 mix-blend-overlay`} />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--ink)] via-[var(--ink)]/70 to-[var(--ink)]/10" />
          <div className="absolute inset-0 bg-gradient-to-b from-[var(--ink)]/60 via-transparent to-transparent" />

          <div className="absolute top-5 left-4 md:left-6 z-10">
            <Link
              href="/browse"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--ink)]/40 border border-[var(--paper)]/10 text-xs text-[var(--paper)]/70 hover:text-[var(--paper)] hover:border-[var(--paper)]/30 backdrop-blur-md transition-colors"
            >
              <ArrowLeft size={12} />
              Browse
            </Link>
          </div>

          {/* Editorial title, anchored to the bottom of the hero.
              FIX: pb-28/md:pb-36 left a large empty band under the title
              before the dossier strip's negative margin even kicked in.
              Trimmed so the title sits closer to where the dossier overlaps. */}
          <div className="absolute bottom-0 inset-x-0 z-10">
            <div className="max-w-6xl mx-auto px-4 md:px-6 pb-14 md:pb-20">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold border capitalize ${typeStyle.badge}`}>
                  {rec.type}
                </span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border capitalize ${STATUS_STYLES[rec.status] ?? ''}`}>
                  {rec.status}
                </span>
                {rec.is_featured && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 backdrop-blur-sm">
                    <Star size={8} className="fill-amber-400" />
                    Featured
                  </span>
                )}
              </div>
              <h1
                className="font-[family-name:var(--font-display)] text-3xl md:text-5xl font-black italic leading-[0.95] tracking-tight max-w-3xl text-[var(--paper)] drop-shadow-[0_4px_24px_rgba(0,0,0,0.5)]"
              >
                {rec.title}
              </h1>
            </div>
          </div>
        </div>

        {/* ══════════════════════════ DOSSIER STRIP ══════════════════════════
            FIX: -mt-20 md:-mt-28 was tuned for the taller hero. With the hero
            shortened, this is reduced proportionally so the cover overlaps the
            hero by the same visual amount without creating a gap or clipping. */}
        <div className="relative max-w-6xl mx-auto px-4 md:px-6 -mt-12 md:-mt-16 z-20">
          <div className="flex flex-col md:flex-row gap-6 md:gap-10">

            <div className="shrink-0 mx-auto md:mx-0">
              <div className="relative flex">
                <div
                  className={`hidden sm:flex items-center justify-center w-7 rounded-l-lg border-y border-l ${typeStyle.border} bg-[var(--ink)]/60 backdrop-blur-md`}
                >
                  <span className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.25em] text-[var(--paper)]/60 -rotate-90 whitespace-nowrap">
                    {rec.type} · {rec.status}
                  </span>
                </div>

                <div className="relative w-40 md:w-48 aspect-[3/4] rounded-r-lg sm:rounded-l-none rounded-lg overflow-hidden border-y border-r border-[var(--paper)]/10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] bg-[var(--panel)]">
                  <div className={`absolute -inset-4 rounded-2xl ${typeStyle.glow} blur-2xl opacity-30 -z-10`} />
                  {rec.cover_url ? (
                    <img
                      src={`/api/image-proxy?url=${encodeURIComponent(rec.cover_url)}`}
                      alt={rec.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen size={36} className="text-[var(--paper)]/30" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex-1 min-w-0 pt-1 md:pt-3 space-y-4">

              <div className="flex flex-wrap gap-x-5 gap-y-1.5 font-[family-name:var(--font-mono)] text-xs text-[var(--paper)]/50">
                {rec.author && <span className="flex items-center gap-1.5"><User size={12} />{rec.author}</span>}
                {rec.artist && rec.artist !== rec.author && <span className="flex items-center gap-1.5"><Palette size={12} />{rec.artist}</span>}
                {rec.year_released && <span className="flex items-center gap-1.5"><Calendar size={12} />{rec.year_released}</span>}
                {rec.chapter_count && <span className="flex items-center gap-1.5"><Hash size={12} />{rec.chapter_count} ch.</span>}
                <span className="px-1.5 py-0.5 rounded border border-[var(--paper)]/10 text-[var(--paper)]/40 capitalize">
                  {rec.content_rating?.replace('_', ' ')}
                </span>
              </div>

              {rec.genres && rec.genres.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {rec.genres.map((genre: string) => (
                    <Link key={genre} href={`/browse?genre=${genre}`}>
                      <span className="inline-flex px-2.5 py-1 rounded-full text-[11px] font-medium border border-[var(--paper)]/10 text-[var(--paper)]/60 hover:border-[var(--paper)]/30 hover:text-[var(--paper)] transition-colors">
                        {genre}
                      </span>
                    </Link>
                  ))}
                </div>
              )}

              {/* Stats ticker */}
              <div className="flex items-stretch rounded-xl border border-[var(--paper)]/10 bg-[var(--paper)]/[0.03] divide-x divide-[var(--paper)]/10 overflow-hidden backdrop-blur-sm">
                {stats.map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex-1 px-3 md:px-5 py-2.5 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <Icon size={12} className="text-[var(--paper)]/40" />
                      <p className="font-[family-name:var(--font-mono)] text-lg md:text-xl font-bold tabular-nums leading-none text-[var(--paper)]">
                        {value}
                      </p>
                    </div>
                    <p className="mt-1 text-[9px] uppercase tracking-widest text-[var(--paper)]/40">{label}</p>
                  </div>
                ))}
              </div>

              {rec.official_platforms && rec.official_platforms.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {rec.official_platforms.map((platform: string, i: number) => (
                    <div
                      key={platform}
                      className="flex items-center gap-1.5 pl-2.5 pr-2 py-1.5 rounded-full border border-[var(--paper)]/10 bg-[var(--paper)]/[0.03] text-[11px] text-[var(--paper)]/60 hover:border-[var(--paper)]/25 transition-colors"
                    >
                      <Globe size={10} className="text-[var(--paper)]/40" />
                      <span className="font-medium">{platform}</span>
                      {rec.official_links?.[i] && (
                        <a href={rec.official_links[i]} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                          <ExternalLink size={10} className="text-[var(--paper)]/40 hover:text-[var(--paper)] transition-colors" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Control deck ──
              FIX 1: this was `sticky bottom-3 md:static` — on mobile that made
              it float mid-viewport, overlapping the bottom nav tabs AND the
              floating "+" submit FAB from the layout shell, which is exactly
              the broken collision in the screenshots. It's now always static
              and simply sits in the page flow right after the dossier, like
              every other section — no overlap with anything else on screen.
              FIX 2: flex-wrap items were given no sizing rules, so on narrow
              viewports they each took an entire row → huge vertical gaps.
              items-stretch + flex-wrap with each child sized to content
              (via the shrink-0/whitespace-nowrap fixes in the child components)
              now lets 2–3 buttons share a row on mobile instead of 1 each. */}
          <div className="relative z-20 mt-5 md:mt-7">
            <div
              className={`flex flex-wrap items-stretch gap-2 p-2.5 md:p-3 rounded-2xl border ${typeStyle.border} bg-[var(--ink)]/70 backdrop-blur-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.6)]`}
            >
              <VoteButtons
                recommendationId={id}
                initialUpvotes={rec.upvotes}
                initialDownvotes={rec.downvotes}
                initialVote={userVote}
                isLoggedIn={!!user}
                comicTitle={rec.title}
              />
              <SaveButton
                recommendationId={id}
                initialSaved={isSaved}
                isLoggedIn={!!user}
                comicTitle={rec.title}
              />
              <ReadingProgressButton
                comicId={id}
                chapterCount={rec.chapter_count}
                isLoggedIn={!!user}
              />
              {user && <AddToListButton recommendationId={id} userId={user.id} />}
              <AddToCollectionButton recommendationId={id} isLoggedIn={!!user} />
              <div className="sm:ml-auto">
                <ShareButton title={rec.title} url={`${SITE_URL}/comic/${id}`} />
              </div>
            </div>
          </div>
        </div>

        {/* ══════════════════════════ MAIN CONTENT ══════════════════════════
            FIX: mt-12/md:mt-16 + space-y-14 was excessive once the deck above
            no longer floats — tightened so sections read as connected, not
            scattered with dead air between every block. */}
        <div className="max-w-6xl mx-auto px-4 md:px-6 mt-8 md:mt-10 pb-24 space-y-10">

          <div className="grid grid-cols-1 md:grid-cols-[1.6fr_1fr] gap-5 md:gap-6">
            <div className="relative rounded-2xl border border-[var(--paper)]/10 bg-[var(--paper)]/[0.025] backdrop-blur-sm p-6 md:p-8 overflow-hidden">
              <div className={`absolute -top-10 -right-10 w-40 h-40 rounded-full ${typeStyle.glow} blur-3xl opacity-20`} />
              <h2 className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.2em] text-[var(--paper)]/40 mb-3">
                About
              </h2>
              <p className="text-[15px] leading-relaxed text-[var(--paper)]/75">{rec.description}</p>
            </div>

            {rec.why_recommend ? (
              <div className={`relative rounded-2xl border ${typeStyle.border} bg-[var(--paper)]/[0.03] p-6 md:p-7 flex flex-col`}>
                <h2 className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.2em] text-[var(--paper)]/40 mb-3">
                  Why Read This
                </h2>
                <p className="font-[family-name:var(--font-display)] italic text-lg leading-snug text-[var(--paper)]/85 flex-1">
                  &ldquo;{rec.why_recommend}&rdquo;
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-[var(--paper)]/15 p-6 md:p-7 flex items-center justify-center text-center">
                <p className="text-xs text-[var(--paper)]/30">No recommender note for this one yet.</p>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-dashed border-[var(--paper)]/15 bg-[var(--paper)]/[0.02] p-5 md:p-6">
            <SubmitYourOwnButton
              isLoggedIn={!!user}
              submitRoute={submitRoute}
              comicId={id}
            />
          </div>

          <div className="flex items-center justify-between py-4 border-t border-[var(--paper)]/10 text-xs text-[var(--paper)]/40">
            <div className="flex items-center gap-2 flex-wrap">
              <span>Recommended by</span>
              <RecommenderLink
                username={profile?.username ?? ''}
                displayName={recommenderName}
                isLoggedIn={!!user}
                isGhost={isGhostRec}
                role={profile?.role}
                isPro={recommenderIsPro}
                isVerified={recommenderIsVerified}
                comicTitle={rec.title}
                userType={profile?.user_type ?? null}
              />
            </div>
            <span className="font-[family-name:var(--font-mono)] shrink-0">{formatDate(rec.created_at)}</span>
          </div>

          <section className="pt-2 border-t border-[var(--paper)]/10 space-y-4">
            <h2 className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.2em] text-[var(--paper)]/40">
              Reviews
            </h2>
            <ReviewSection
              recommendationId={id}
              currentUserId={user?.id ?? null}
              isLoggedIn={!!user}
            />
          </section>

          <section className="pt-2 border-t border-[var(--paper)]/10 space-y-4">
            <h2 className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.2em] text-[var(--paper)]/40">
              Sponsored Picks
            </h2>
            <Suspense fallback={<div className="h-40 bg-[var(--paper)]/[0.03] animate-pulse rounded-2xl border border-[var(--paper)]/10" />}>
              <ContextualOffers
                comicId={id}
                comicTitle={rec.title}
                genre={rec.genres?.[0] || 'Action'}
                maxOffers={3}
              />
            </Suspense>
          </section>

          <section className="pt-2 border-t border-[var(--paper)]/10 space-y-4">
            <h2 className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.2em] text-[var(--paper)]/40">
              Next Reads
            </h2>
            <SimilarComics
              comicId={id}
              contentRating={rec.content_rating}
              showAdult={rec.content_rating === 'adult' || rec.content_rating === 'mature'}
            />
          </section>

        </div>
      </div>
    </>
  )
}