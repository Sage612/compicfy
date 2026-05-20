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

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://compicfy.cloud'
const GHOST_ID = '00000000-0000-0000-0000-000000000000'

interface Props {
  params: Promise<{ id: string }>
}

// ── Helpers ───────────────────────────────────────────────────────

/** Truncate at word boundary so we never cut mid-word */
function truncateAtWord(str: string, max: number): string {
  if (str.length <= max) return str
  const cut = str.slice(0, max)
  const lastSpace = cut.lastIndexOf(' ')
  return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut) + '…'
}

/**
 * Convert upvote ratio to a 1–5 star rating.
 * 100% upvotes → 5.0, 50% → 3.0, 0% → 1.0
 * Formula: 1 + (ratio * 4)
 */
function ratioToStars(upvotes: number, downvotes: number): number {
  const total = upvotes + downvotes
  if (total === 0) return 4 // default when no votes yet
  const ratio = upvotes / total
  return Math.round((1 + ratio * 4) * 10) / 10 // one decimal place
}

/** Return true when the request is from a known crawler */
function isCrawler(userAgent: string): boolean {
  return /googlebot|bingbot|slurp|duckduckbot|baiduspider|yandex|facebot|ia_archiver|twitterbot|linkedinbot|whatsapp|telegrambot/i
    .test(userAgent)
}

// ── Metadata ──────────────────────────────────────────────────────

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

  // Build description — truncate the whole thing to 155 chars (safe for all search engines)
  const rawDesc = [
    `${rec.title} is a ${typeLabel.toLowerCase()}`,
    rec.author   ? `by ${rec.author}`           : null,
    genreList    ? `in the genres ${genreList}`  : null,
    rec.status   ? `— currently ${rec.status}.` : null,
    rec.description ? rec.description           : 'Discover where to read it and what the community thinks.',
  ].filter(Boolean).join(' ')

  const description = truncateAtWord(rawDesc, 155)

  // Keywords — filter empty strings so null author doesn't add a blank entry
  const keywords = [
    rec.title,
    `${rec.title} ${rec.type}`,
    `${rec.title} review`,
    `${rec.title} where to read`,
    `${rec.title} recommendation`,
    ...(rec.genres ?? []),
    rec.author ?? null,      // null filtered out below
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

// ── JSON-LD ───────────────────────────────────────────────────────

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

    // Aggregate rating — only include when we have actual review data
    ...(rec.review_count > 0
      ? {
          aggregateRating: {
            '@type':       'AggregateRating',
            ratingValue,           // 1–5 derived from upvote ratio
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

// ── Style maps ────────────────────────────────────────────────────

const TYPE_STYLES: Record<string, { gradient: string; badge: string; glow: string; border: string }> = {
  manga:   { gradient: 'from-rose-500   to-pink-600',   badge: 'bg-rose-500/15   text-rose-500   border-rose-500/25',   glow: 'bg-rose-500/20',   border: 'border-rose-500/30'   },
  manhwa:  { gradient: 'from-violet-500 to-purple-600', badge: 'bg-violet-500/15 text-violet-500 border-violet-500/25', glow: 'bg-violet-500/20', border: 'border-violet-500/30' },
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

// ── Page ──────────────────────────────────────────────────────────

export default async function ComicDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  // ── Bot-safe view count increment ────────────────────────────────
  // Only increment for real users — crawlers inflated analytics badly
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

  // ── Age gate ──────────────────────────────────────────────────────
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
            <Link href="/dashboard/settings"><Button>Go to Settings</Button></Link>
          </div>
        </div>
      )
    }
  }

  const { data: profileData } = await supabase
    .from('profiles')
    .select('username, display_name, avatar_url, role, is_pro, pro_expires_at, verified_recommender')
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
  } | null

  // Ghost check — use UUID not username
  const isGhostRec = rec.user_id === GHOST_ID

  const recommenderIsPro = profile
    ? profile.role === 'admin' ||
      (profile.is_pro && (!profile.pro_expires_at || new Date(profile.pro_expires_at) > new Date()))
    : false

  const recommenderIsVerified = profile?.verified_recommender ?? false
  const recommenderName       = isGhostRec
    ? 'Ghost'
    : (profile?.display_name || profile?.username || 'unknown')

 // Determine correct submission route for current user
  let submitRoute = '/dashboard/recommendations/new'
  if (user) {
    const { data: currentUserProfile } = await supabase
      .from('profiles')
      .select('role, is_pro, pro_expires_at')
      .eq('id', user.id)
      .single()
    const isAdminOrMod = ['admin', 'moderator'].includes((currentUserProfile as any)?.role ?? '')
    const isPro = (currentUserProfile as any)?.is_pro &&
      (!(currentUserProfile as any)?.pro_expires_at ||
        new Date((currentUserProfile as any).pro_expires_at) > new Date())
    if (isAdminOrMod || isPro) {
      submitRoute = '/pro/recommendations/new'
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

  return (
    <>
      <ComicJsonLd rec={rec} id={id} recommenderName={recommenderName} />

      <div className="min-h-screen">

        {/* ── CINEMATIC HERO ── */}
        <div className="relative h-56 md:h-72 overflow-hidden">
          {rec.cover_url && (
            <img
              src={rec.cover_url}
              alt=""
              className="absolute inset-0 w-full h-full object-cover scale-110 blur-xl opacity-25 dark:opacity-20"
              aria-hidden
            />
          )}
          <div className={`absolute inset-0 bg-gradient-to-br ${typeStyle.gradient} opacity-15 dark:opacity-25`} />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
          <div className="absolute top-4 left-4 z-10">
            <Link
              href="/browse"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-background/80 border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft size={13} />
              Browse
            </Link>
          </div>
        </div>

        {/* ── CONTENT ── */}
        <div className="max-w-5xl mx-auto px-4 -mt-28 md:-mt-40 relative z-10 pb-20">
          <div className="flex flex-col md:flex-row gap-8">

            {/* ── LEFT: Cover + actions ── */}
            <div className="flex flex-col gap-3 md:w-52 shrink-0">

              <div className="relative">
                <div className={`absolute -inset-3 rounded-lg ${typeStyle.glow} blur-2xl opacity-40`} />
                <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-muted border border-border shadow-xl">
                  {rec.cover_url ? (
                    <img src={rec.cover_url} alt={rec.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen size={40} className="text-muted-foreground opacity-40" />
                    </div>
                  )}
                  <div className="absolute top-2 left-2">
                    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold border capitalize ${typeStyle.badge}`}>
                      {rec.type}
                    </span>
                  </div>
                  {rec.is_featured && (
                    <div className="absolute top-2 right-2">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-500 border border-amber-500/30 backdrop-blur-sm">
                        <Star size={8} className="fill-amber-500" />
                        Featured
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Read On — most important action, comes first ── */}
              {rec.official_platforms && rec.official_platforms.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Read On</p>
                  {rec.official_platforms.map((platform: string, i: number) => (
                    <div key={platform} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-card text-xs hover:border-primary/40 transition-colors">
                      <Globe size={11} className="text-muted-foreground shrink-0" />
                      <span className="truncate flex-1 font-medium">{platform}</span>
                      {rec.official_links?.[i] && (
                        <a href={rec.official_links[i]} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                          <ExternalLink size={11} className="text-muted-foreground hover:text-primary transition-colors" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* ── Core actions ── */}
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

              {/* ── List / Collection ── */}
              {user && <AddToListButton recommendationId={id} userId={user.id} />}
              <AddToCollectionButton recommendationId={id} isLoggedIn={!!user} />

              {/* ── Share ── */}
              <ShareButton
                title={rec.title}
                url={`${SITE_URL}/comic/${id}`}
              />
            </div>

            {/* ── RIGHT: Details ── */}
            <div className="flex-1 min-w-0 space-y-6 pt-2 md:pt-20">

              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border capitalize ${STATUS_STYLES[rec.status] ?? ''}`}>
                    {rec.status}
                  </span>
                  <span className="text-xs text-muted-foreground border border-border rounded px-2 py-0.5 capitalize">
                    {rec.content_rating?.replace('_', ' ')}
                  </span>
                </div>

                <h1 className="text-3xl md:text-4xl font-black leading-tight tracking-tight">{rec.title}</h1>

                <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
                  {rec.author  && <span className="flex items-center gap-1.5"><User    size={13} />{rec.author}</span>}
                  {rec.artist  && rec.artist !== rec.author && <span className="flex items-center gap-1.5"><Palette  size={13} />{rec.artist}</span>}
                  {rec.year_released  && <span className="flex items-center gap-1.5"><Calendar size={13} />{rec.year_released}</span>}
                  {rec.chapter_count  && <span className="flex items-center gap-1.5"><Hash     size={13} />{rec.chapter_count} ch.</span>}
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {rec.genres?.map((genre: string) => (
                    <Link key={genre} href={`/browse?genre=${genre}`}>
                      <span className="inline-flex px-2 py-0.5 rounded text-xs font-semibold bg-muted border border-border hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition-colors cursor-pointer">
                        {genre}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {[
                  { icon: ThumbsUp,      label: 'Upvotes', value: rec.upvotes,      color: 'text-emerald-500', bg: 'bg-emerald-500/8' },
                  { icon: Star,          label: 'Reviews', value: rec.review_count, color: 'text-amber-500',   bg: 'bg-amber-500/8'  },
                  { icon: Bookmark,      label: 'Saves',   value: rec.save_count,   color: 'text-blue-500',    bg: 'bg-blue-500/8'   },
                  { icon: MessageSquare, label: 'Score',   value: rec.score,        color: 'text-violet-500',  bg: 'bg-violet-500/8' },
                ].map(({ icon: Icon, label, value, color, bg }) => (
                  <div key={label} className={`flex flex-col items-center gap-1 p-3 rounded-lg ${bg} border border-border`}>
                    <Icon size={14} className={color} />
                    <p className="text-lg font-black tabular-nums leading-none">{value ?? 0}</p>
                    <p className="text-[10px] text-muted-foreground font-medium">{label}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <h2 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">About</h2>
                <p className="text-sm leading-relaxed text-foreground/80">{rec.description}</p>
              </div>

              {rec.why_recommend && (
                <div className="space-y-2">
                  <h2 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Why Read This?</h2>
                  <div className={`relative pl-5 pr-4 py-4 rounded-lg border ${typeStyle.border} bg-card`}>
                    <div className={`absolute left-0 top-3 bottom-3 w-1 rounded-full bg-gradient-to-b ${typeStyle.gradient}`} />
                    <p className="text-sm leading-relaxed italic text-muted-foreground">"{rec.why_recommend}"</p>
                  </div>
                </div>
              )}

              {/* Submit Your Own — CTA lives here, not in the sidebar */}
              <SubmitYourOwnButton
                isLoggedIn={!!user}
                submitRoute={submitRoute}
                comicId={id}
              />

              {/* ── Recommender attribution ── */}
              <div className="flex items-center justify-between py-3 border-t border-border text-xs text-muted-foreground">
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
                  />
                </div>
                <span className="shrink-0">{formatDate(rec.created_at)}</span>
              </div>

              <div className="space-y-3">
                <h2 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Reviews</h2>
                <ReviewSection
                  recommendationId={id}
                  currentUserId={user?.id ?? null}
                  isLoggedIn={!!user}
                />
              </div>

              <Suspense fallback={<div className="h-40 bg-muted/30 animate-pulse rounded-2xl border border-border mt-6" />}>
                <ContextualOffers
                  comicId={id}
                  comicTitle={rec.title}
                  genre={rec.genres?.[0] || 'Action'}
                  maxOffers={3}
                />
              </Suspense>

              <div className="space-y-3 pt-2">
                <h2 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">You Might Also Like</h2>
                <SimilarComics
                  comicId={id}
                  contentRating={rec.content_rating}
                  showAdult={rec.content_rating === 'adult' || rec.content_rating === 'mature'}
                />
              </div>

            </div>
          </div>
        </div>
      </div>
    </>
  )
}
