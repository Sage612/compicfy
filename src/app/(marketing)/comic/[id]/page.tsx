import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { ReviewSection } from '@/components/recommendations/ReviewSection'
import { MyReadingSources } from '@/components/recommendations/MyReadingSources'
import { AddToListButton } from '@/components/recommendations/AddToListButton'
import { AddToCollectionButton } from '@/components/collections/AddToCollectionButton'
import { SimilarComics } from '@/components/recommendations/SimilarComics'
import { ReportButton } from '@/components/recommendations/ReportButton'
import { getDashboardRoutes } from '@/lib/utils/routes'
import { isProUser } from '@/lib/access'
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
import type { Recommendation } from '@/types/app.types'
import { Button } from '@/components/ui/button'
import { Suspense } from 'react'
import { ContextualOffers } from '@/components/affiliate/ContextualOffers'
import { ReadingProgressButton } from '@/components/recommendations/ReadingProgressButton'
import { SubmitYourOwnButton } from '@/components/recommendations/SubmitYourOwnButton'
import { RecommenderLink } from '@/components/recommendations/RecommenderLink'
import { MoreInfoSection } from '@/components/comic-detail/MoreInfoSection'
import { headers } from 'next/headers'
import { Fraunces, JetBrains_Mono } from 'next/font/google'
import { TYPE_META, DEFAULT_TYPE_META, resolveStatusMeta } from '@/lib/utils/constants'

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
      siteName:    'ComPicfy',
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
    ...((rec.review_count ?? 0) > 0
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
      description: `Community recommendation for ${rec.title}. Recommended by ${recommenderName} on ComPicfy.`,
      publisher: {
        '@type': 'Organization',
        name:    'ComPicfy',
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

  let currentUserProfile: { role: string; is_pro: boolean; pro_expires_at: string | null; user_type: string | null } | null = null
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('role, is_pro, pro_expires_at, is_patron, patron_expires_at, user_type')
      .eq('id', user.id)
      .single()
    currentUserProfile = data as any
  }

  const currentUserIsPro = currentUserProfile ? isProUser(currentUserProfile as any) : false
  const currentUserType: 'reader' | 'creator' = currentUserProfile?.user_type === 'creator' ? 'creator' : 'reader'
  const currentUserRoutes = getDashboardRoutes(currentUserType, currentUserIsPro)

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
            <Link href={currentUserRoutes.settings}><Button>Go to Settings</Button></Link>
          </div>
        </div>
      )
    }
  }

  const { data: profileData } = await supabase
    .from('profiles')
    .select('username, display_name, avatar_url, role, is_pro, pro_expires_at, is_patron, patron_expires_at, verified_recommender, user_type')
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

  const submitRoute = user ? currentUserRoutes.newRec : '/reader/dashboard/recommendations/new'

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

  const typeStyle = TYPE_META[rec.type as keyof typeof TYPE_META] ?? DEFAULT_TYPE_META
  const statusMeta = resolveStatusMeta(rec.status, (rec as any).translation_status)

  const stats = [
    { icon: ThumbsUp,      label: 'Upvotes', value: rec.upvotes      ?? 0 },
    { icon: Star,          label: 'Reviews', value: rec.review_count ?? 0 },
    { icon: Bookmark,      label: 'Saves',   value: rec.save_count   ?? 0 },
    { icon: MessageSquare, label: 'Score',   value: rec.score        ?? 0 },
  ]

  // REFACTORED: High-density toolbar - no wrapper bloat, exact same components & props
  const actionDeck = (
    <div className="space-y-2.5">
      <div className="grid grid-cols-2 gap-2">
        <VoteButtons
          recommendationId={id}
          initialUpvotes={rec.upvotes ?? 0}
          initialDownvotes={rec.downvotes ?? 0}
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
      </div>
      <ReadingProgressButton
        comicId={id}
        chapterCount={rec.chapter_count}
        isLoggedIn={!!user}
      />
      {user && <AddToListButton recommendationId={id} userId={user.id} />}
      <AddToCollectionButton recommendationId={id} isLoggedIn={!!user} />
      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-dossier-foreground/[0.06]">
        <ShareButton title={rec.title} url={`${SITE_URL}/comic/${id}`} fullWidth />
        <ReportButton
          entityType="recommendation"
          entityId={id}
          isLoggedIn={!!user}
          asButton
        />
      </div>
    </div>
  )

  return (
    <>
      <ComicJsonLd rec={rec} id={id} recommenderName={recommenderName} />

      <div className={`${display.variable} ${mono.variable} min-h-screen bg-dossier text-dossier-foreground`}>
        {/* REFACTORED HEADER: Reduced from 22vh/30vh to tight 88px/112px - eliminates empty hero gap */}
        <div className="relative h-[88px] md:h-[112px] overflow-hidden border-b border-dossier-foreground/[0.06]">
          {rec.cover_url ? (
            <img
              src={`/api/image-proxy?url=${encodeURIComponent(rec.cover_url)}`}
              alt=""
              aria-hidden
              className="absolute inset-0 w-full h-full object-cover scale-105 blur-[28px] opacity-[0.35]"
            />
          ) : (
            <div className={`absolute inset-0 bg-gradient-to-br ${typeStyle.gradient} opacity-10`} />
          )}
          <div className={`absolute inset-0 bg-gradient-to-br ${typeStyle.gradient} opacity-[0.12] mix-blend-overlay`} />
          <div className="absolute inset-0 bg-gradient-to-t from-dossier via-dossier/70 to-dossier/20" />

          <div className="absolute inset-x-0 top-0 h-full max-w-[1280px] mx-auto px-4 md:px-6 flex items-start pt-4">
            <Link
              href="/browse"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-dossier-panel/70 border border-dossier-foreground/10 text-[11px] font-medium text-dossier-foreground/60 hover:text-dossier-foreground hover:border-dossier-foreground/20 backdrop-blur-md transition-colors"
            >
              <ArrowLeft size={12} />
              Browse
            </Link>
          </div>
        </div>

        {/* REFACTORED LAYOUT: Integrated hero - cover left of title on desktop, no -mt-10 gap black hole */}
        <div className="relative max-w-[1280px] mx-auto px-4 md:px-6 -mt-8 md:-mt-9 z-20">
          {/* DESKTOP: 3-col editorial grid [cover+actions | main | secondary rail] - REMOVED dummy offset div */}
          <div className="grid grid-cols-1 lg:grid-cols-[208px_minmax(0,1fr)_260px] gap-6 lg:gap-8 items-start">

            {/* LEFT RAIL: Cover + Sticky Action Deck */}
            <aside className="lg:sticky lg:top-6 order-1">
              <div className="flex lg:flex-col gap-4 lg:gap-5">
                {/* Cover with editorial spine label */}
                <div className="relative flex shrink-0">
                  {/* Editorial spine - desktop only */}
                  <div className={`hidden lg:flex items-center justify-center w-[26px] rounded-l-[12px] border-y border-l ${typeStyle.border} bg-dossier-panel/80 backdrop-blur-md`}>
                    <span className="font-[family-name:var(--font-mono)] text-[9px] uppercase tracking-[0.28em] text-dossier-foreground/50 -rotate-90 whitespace-nowrap">
                      {rec.type} • {rec.status}
                    </span>
                  </div>
                  <div className="relative w-[132px] lg:w-[182px] aspect-[2/3] rounded-xl lg:rounded-l-none lg:rounded-r-xl overflow-hidden border border-dossier-foreground/10 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.6)] bg-dossier-panel">
                    <div className={`absolute -inset-6 rounded-2xl ${typeStyle.detailGlow} blur-2xl opacity-20 -z-10`} />
                    {rec.cover_url ? (
                      <img
                        src={`/api/image-proxy?url=${encodeURIComponent(rec.cover_url)}`}
                        alt={rec.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpen size={32} className="text-dossier-foreground/25" />
                      </div>
                    )}
                    <div className="absolute top-2 left-2 flex gap-1.5">
                      <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold border capitalize backdrop-blur-md ${typeStyle.badge}`}>
                        {rec.type}
                      </span>
                    </div>
                    {rec.is_featured && (
                      <div className="absolute top-2 right-2">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 backdrop-blur-md">
                          <Star size={8} className="fill-amber-300" />
                          Featured
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Mobile title block - tight flow, no extra margin */}
                <div className="lg:hidden flex-1 min-w-0 pt-1 space-y-2.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border capitalize ${statusMeta.badge}`}>
                      {statusMeta.label}
                    </span>
                    <span className="px-1.5 py-0.5 rounded-md border border-dossier-foreground/10 text-dossier-foreground/40 text-[10px] capitalize">
                      {rec.content_rating?.replace('_', ' ')}
                    </span>
                  </div>
                  <h1 className="font-[family-name:var(--font-display)] text-[26px] font-[900] italic leading-[0.95] tracking-[-0.02em] text-dossier-foreground line-clamp-3">
                    {rec.title}
                  </h1>
                  {/* Inline mono meta bar - mobile */}
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-[family-name:var(--font-mono)] text-[11px] text-dossier-foreground/50">
                    {rec.author && <span>{rec.author}</span>}
                    {rec.author && rec.year_released && <span className="text-dossier-foreground/20">•</span>}
                    {rec.year_released && <span>{rec.year_released}</span>}
                    {rec.chapter_count && <><span className="text-dossier-foreground/20">•</span><span>{rec.chapter_count} ch</span></>}
                  </div>
                </div>
              </div>

              {/* Desktop sticky actions */}
              <div className="hidden lg:block mt-5">
                {actionDeck}
                <div className="mt-4 pt-4 border-t border-dossier-foreground/[0.06] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-widest text-dossier-foreground/30">Recommender</span>
                    <span className="font-[family-name:var(--font-mono)] text-[10px] text-dossier-foreground/30">{rec.created_at ? formatDate(rec.created_at) : ''}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-dossier-foreground/50">
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
                </div>
              </div>
            </aside>

            {/* CENTER: Main dossier */}
            <main className="order-2 min-w-0 space-y-5">
              {/* Desktop Title Block - integrated immediately to right of cover, no gap */}
              <div className="hidden lg:block space-y-3.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold border capitalize ${statusMeta.badge}`}>
                    {statusMeta.label}
                  </span>
                  <span className="px-2 py-1 rounded-md border border-dossier-foreground/10 text-dossier-foreground/40 text-[10px] capitalize tracking-wide">
                    {rec.content_rating?.replace('_', ' ')}
                  </span>
                </div>
                <h1 className="font-[family-name:var(--font-display)] text-[40px] xl:text-[48px] font-[900] italic leading-[0.9] tracking-[-0.03em] text-dossier-foreground">
                  {rec.title}
                </h1>
                {/* REFACTORED: Inline High-Density Metadata Bar with • dividers */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-[family-name:var(--font-mono)] text-[12px] leading-none text-dossier-foreground/60 border-y border-dossier-foreground/[0.06] py-2.5">
                  {rec.author && <span className="inline-flex items-center gap-1.5"><User size={12} className="text-dossier-foreground/30" />{rec.author}</span>}
                  {rec.artist && rec.artist !== rec.author && (
                    <>
                      <span className="text-dossier-foreground/15">•</span>
                      <span className="inline-flex items-center gap-1.5"><Palette size={12} className="text-dossier-foreground/30" />{rec.artist}</span>
                    </>
                  )}
                  {rec.year_released && (
                    <>
                      <span className="text-dossier-foreground/15">•</span>
                      <span className="inline-flex items-center gap-1.5"><Calendar size={12} className="text-dossier-foreground/30" />{rec.year_released}</span>
                    </>
                  )}
                  {rec.chapter_count && (
                    <>
                      <span className="text-dossier-foreground/15">•</span>
                      <span className="inline-flex items-center gap-1.5"><Hash size={12} className="text-dossier-foreground/30" />{rec.chapter_count} ch.</span>
                    </>
                  )}
                </div>
              </div>

              {/* Platforms - compact inline badges */}
              {rec.official_platforms && rec.official_platforms.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-widest text-dossier-foreground/30 mr-1">Read on</span>
                  {rec.official_platforms.map((platform: string, i: number) => (
                    <div
                      key={platform}
                      className="group flex items-center gap-1.5 pl-2.5 pr-2 py-1 rounded-full border border-dossier-foreground/10 bg-dossier-panel/50 text-[11px] text-dossier-foreground/60 hover:border-dossier-foreground/20 hover:bg-dossier-panel hover:text-dossier-foreground transition-all"
                    >
                      <Globe size={10} className="text-dossier-foreground/40 group-hover:text-dossier-foreground/60" />
                      <span className="font-medium">{platform}</span>
                      {rec.official_links?.[i] && (
                        <a
                          href={rec.official_links[i]}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Open ${platform} link`}
                          className="ml-0.5 -mr-0.5 p-0.5 rounded-full hover:bg-dossier-foreground/10"
                        >
                          <ExternalLink size={10} className="text-dossier-foreground/40 group-hover:text-dossier-foreground transition-colors" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <MyReadingSources
                comicId={id}
                isLoggedIn={!!user}
                isPro={currentUserIsPro}
              />

              {rec.more_info_link && (
                <MoreInfoSection
                  link={rec.more_info_link}
                  source={rec.more_info_link_source}
                  verifiedAt={rec.more_info_link_verified_at}
                />
              )}

              {/* Mobile meta bar for artist if different */}
              <div className="lg:hidden flex flex-wrap gap-1.5">
                {rec.artist && rec.artist !== rec.author && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full border border-dossier-foreground/10 text-[11px] text-dossier-foreground/50"><Palette size={10} />{rec.artist}</span>
                )}
              </div>

              {rec.genres && rec.genres.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {rec.genres.map((genre: string) => (
                    <Link key={genre} href={`/browse?genre=${genre}`}>
                      <span className="inline-flex px-2.5 py-1 rounded-full text-[11px] font-medium border border-dossier-foreground/10 bg-dossier-panel/30 text-dossier-foreground/55 hover:border-dossier-foreground/25 hover:text-dossier-foreground hover:bg-dossier-panel/60 transition-colors">
                        {genre}
                      </span>
                    </Link>
                  ))}
                </div>
              )}

              {/* REFACTORED: Stats bar - tighter, divided */}
              <div className="flex items-stretch rounded-xl border border-dossier-foreground/10 bg-dossier-panel/40 divide-x divide-dossier-foreground/10 overflow-hidden backdrop-blur-sm">
                {stats.map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex-1 px-3 lg:px-4 py-2.5 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <Icon size={11} className="text-dossier-foreground/30" />
                      <p className="font-[family-name:var(--font-mono)] text-[16px] lg:text-[18px] font-bold tabular-nums leading-none text-dossier-foreground">
                        {value}
                      </p>
                    </div>
                    <p className="mt-1 text-[9px] uppercase tracking-widest text-dossier-foreground/35">{label}</p>
                  </div>
                ))}
              </div>

              {/* Mobile Action Deck */}
              <div className="lg:hidden">
                {actionDeck}
              </div>

              {/* REFACTORED: Editorial Asymmetry - About + Why Read paired */}
              <div className={`grid grid-cols-1 ${rec.why_recommend ? 'lg:grid-cols-[1.55fr_1fr]' : ''} gap-4 lg:gap-5 pt-1`}>
                <div className="relative rounded-2xl border border-dossier-foreground/10 bg-dossier-panel/30 backdrop-blur-sm p-5 lg:p-6 overflow-hidden">
                  <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full ${typeStyle.detailGlow} blur-3xl opacity-15`} />
                  <h2 className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.2em] text-dossier-foreground/35 mb-3">
                    About
                  </h2>
                  <p className="text-[14px] leading-[1.65] text-dossier-foreground/75 max-w-prose">{rec.description}</p>
                </div>

                {rec.why_recommend && (
                  <div className={`relative rounded-2xl border ${typeStyle.border} bg-dossier-panel/50 p-5 lg:p-6 flex flex-col`}>
                    <h2 className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.2em] text-dossier-foreground/35 mb-3">
                      Why Read This
                    </h2>
                    <p className="font-[family-name:var(--font-display)] italic text-[17px] leading-[1.35] text-dossier-foreground/85 flex-1">
                      &ldquo;{rec.why_recommend}&rdquo;
                    </p>
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-dashed border-dossier-foreground/15 bg-dossier-panel/20 p-4 lg:p-5">
                <SubmitYourOwnButton
                  isLoggedIn={!!user}
                  submitRoute={submitRoute}
                  comicId={id}
                />
              </div>

              {/* Mobile recommender row - desktop has it in left rail */}
              <div className="lg:hidden flex items-center justify-between py-3 border-y border-dossier-foreground/10 text-xs text-dossier-foreground/40">
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
                <span className="font-[family-name:var(--font-mono)] shrink-0">{rec.created_at ? formatDate(rec.created_at) : ''}</span>
              </div>

              <section className="pt-1 space-y-3">
                <h2 className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.2em] text-dossier-foreground/35">
                  Reviews
                </h2>
                <ReviewSection
                  recommendationId={id}
                  currentUserId={user?.id ?? null}
                  isLoggedIn={!!user}
                  recommenderId={rec.user_id}
                  currentUserRole={currentUserProfile?.role ?? null}
                />
              </section>

              <Suspense fallback={<div className="h-32 bg-dossier-panel/30 animate-pulse rounded-2xl border border-dossier-foreground/10" />}>
                <ContextualOffers
                  comicId={id}
                  comicTitle={rec.title}
                  genre={rec.genres?.[0] || 'Action'}
                  maxOffers={3}
                />
              </Suspense>

              <section className="pt-1 border-t border-dossier-foreground/10 space-y-3">
                <h2 className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.2em] text-dossier-foreground/35">
                  Next Reads
                </h2>
                <SimilarComics
                  comicId={id}
                  contentRating={rec.content_rating}
                  showAdult={rec.content_rating === 'adult' || rec.content_rating === 'mature'}
                />
              </section>
            </main>

            {/* RIGHT RAIL: Secondary column - desktop space utilization */}
            <aside className="hidden lg:block order-3">
              <div className="sticky top-6 space-y-4">
                <div className="rounded-2xl border border-dossier-foreground/10 bg-dossier-panel/30 p-4 space-y-3">
                  <p className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-widest text-dossier-foreground/30">Dossier Meta</p>
                  <div className="space-y-2.5 font-[family-name:var(--font-mono)] text-[11px] text-dossier-foreground/60">
                    <div className="flex justify-between"><span className="text-dossier-foreground/30">Type</span><span className="capitalize text-dossier-foreground/80">{rec.type}</span></div>
                    <div className="flex justify-between"><span className="text-dossier-foreground/30">Status</span><span className="text-dossier-foreground/80">{statusMeta.label}</span></div>
                    <div className="flex justify-between"><span className="text-dossier-foreground/30">Rating</span><span className="text-dossier-foreground/80">{rec.content_rating}</span></div>
                    {rec.year_released && <div className="flex justify-between"><span className="text-dossier-foreground/30">Year</span><span className="text-dossier-foreground/80">{rec.year_released}</span></div>}
                  </div>
                </div>
                <div className="rounded-2xl border border-dossier-foreground/[0.06] bg-dossier-panel/20 p-1">
                  <Suspense fallback={<div className="h-20 animate-pulse" />}>
                    <ContextualOffers
                      comicId={id}
                      comicTitle={rec.title}
                      genre={rec.genres?.[0] || 'Action'}
                      maxOffers={1}
                    />
                  </Suspense>
                </div>
              </div>
            </aside>

          </div>
        </div>

        {/* Bottom padding for mobile */}
        <div className="h-20 lg:h-12" />
      </div>
    </>
  )
}
