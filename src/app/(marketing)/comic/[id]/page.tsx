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
  variable: '--font-dossier-display',
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
    .select('title, description, type, genres, author, cover_url, status, chapter_count')
    .eq('id', id)
    .single()

  type RecMeta = Pick<Recommendation, 'title' | 'description' | 'type' | 'genres' | 'author' | 'cover_url' | 'status' | 'chapter_count'>
  const rec = data as RecMeta | null
  if (!rec) return { title: 'Comic' }

  const typeLabel = rec.type
    ? rec.type.charAt(0).toUpperCase() + rec.type.slice(1)
    : 'Comic'

  const description = truncateAtWord(
    `Read ${rec.title} (${typeLabel}). ${
      rec.chapter_count ? `${rec.chapter_count} chapters.` : ''
    } ${
      rec.genres?.length ? `Genres: ${rec.genres.slice(0, 3).join(', ')}.` : ''
    } Find official platforms, community reviews, and similar recommendations on ComPicfy.`,
    155
  )

  const keywords = [
    rec.title,
    `read ${rec.title}`,
    `read ${rec.title} online`,
    `${rec.title} chapters`,
    `${rec.title} latest chapter`,
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
    '@type':    'ComicSeries',
    name:        rec.title,
    description: rec.description
      ? truncateAtWord(rec.description, 300)
      : undefined,
    url:         `${SITE_URL}/comic/${id}`,
    ...(rec.cover_url     ? { image: rec.cover_url }                                          : {}),
    ...(rec.author        ? { author: { '@type': 'Person', name: rec.author } }              : {}),
    ...(rec.artist        ? { illustrator: { '@type': 'Person', name: rec.artist } }          : {}),
    ...(rec.year_released ? { datePublished: String(rec.year_released) }                     : {}),
    ...(rec.chapter_count ? { numberOfEpisodes: rec.chapter_count }                          : {}),
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
        ...(rec.type ? [{
          '@type': 'ListItem',
          position: 3,
          name: rec.type.charAt(0).toUpperCase() + rec.type.slice(1),
          item: `${SITE_URL}/browse?type=${rec.type}`
        }] : []),
        {
          '@type': 'ListItem',
          position: rec.type ? 4 : 3,
          name: rec.title,
          item: `${SITE_URL}/comic/${id}`
        },
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

  const metaItems = [
    rec.author && { key: 'author', icon: User, label: rec.author },
    rec.artist && rec.artist !== rec.author && { key: 'artist', icon: Palette, label: rec.artist },
    rec.year_released && { key: 'year', icon: Calendar, label: String(rec.year_released) },
    rec.chapter_count && { key: 'chapters', icon: Hash, label: `${rec.chapter_count} ch.` },
  ].filter(Boolean) as { key: string; icon: typeof User; label: string }[]

  const actionDeck = (
    <div className="rounded-xl border border-dossier-foreground/10 bg-dossier-panel/60 backdrop-blur-sm p-2.5 space-y-2">
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

      <div className="space-y-1.5">
        {user && <AddToListButton recommendationId={id} userId={user.id} />}
        <AddToCollectionButton recommendationId={id} isLoggedIn={!!user} />
      </div>

      <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-dossier-foreground/10">
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

        <div className="relative h-20 md:h-[12vh] md:min-h-[92px] md:max-h-[132px] overflow-hidden">
          {rec.cover_url ? (
            <img
              src={`/api/image-proxy?url=${encodeURIComponent(rec.cover_url)}`}
              alt=""
              aria-hidden
              className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-40"
            />
          ) : (
            <div className={`absolute inset-0 bg-gradient-to-br ${typeStyle.gradient} opacity-10`} />
          )}
          <div className={`absolute inset-0 bg-gradient-to-br ${typeStyle.gradient} opacity-15 mix-blend-overlay`} />
          <div className="absolute inset-0 bg-gradient-to-t from-dossier via-dossier/60 to-dossier/10" />

          <div className="absolute top-5 left-4 md:left-6 z-10">
            <Link
              href="/browse"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-dossier-panel/60 border border-dossier-foreground/10 text-xs text-dossier-foreground/70 hover:text-dossier-foreground hover:border-dossier-foreground/30 backdrop-blur-md transition-colors"
            >
              <ArrowLeft size={12} />
              Browse
            </Link>
          </div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 md:px-6 -mt-4 md:-mt-7 z-20 pb-24">

          <div className="flex flex-col md:flex-row md:items-start gap-6 md:gap-8">

            <div className="md:w-52 shrink-0 order-1">
              <div className="mx-auto md:mx-0 w-44 md:w-52 space-y-4">

                <div className="relative flex">
                  <div
                    className={`hidden md:flex items-center justify-center w-7 rounded-l-lg border-y border-l ${typeStyle.border} bg-dossier-panel/60 backdrop-blur-md`}
                  >
                    <span className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.25em] text-dossier-foreground/60 -rotate-90 whitespace-nowrap">
                      {rec.type} · {rec.status}{rec.year_released ? ` · ${rec.year_released}` : ''}
                    </span>
                  </div>

                  <div className="relative w-44 md:w-[180px] aspect-[3/4] rounded-r-lg md:rounded-l-none rounded-lg overflow-hidden border-y border-r border-dossier-foreground/10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] bg-dossier-panel">
                    <div className={`absolute -inset-4 rounded-2xl ${typeStyle.detailGlow} blur-2xl opacity-30 -z-10`} />
                    {rec.cover_url ? (
                      <img
                        src={`/api/image-proxy?url=${encodeURIComponent(rec.cover_url)}`}
                        alt={rec.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpen size={36} className="text-dossier-foreground/30" />
                      </div>
                    )}

                    <div className="absolute top-2 left-2 z-10">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold border capitalize backdrop-blur-sm ${typeStyle.badge}`}>
                        {rec.type}
                      </span>
                    </div>
                    {rec.is_featured && (
                      <div className="absolute top-2 right-2 z-10">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 backdrop-blur-sm">
                          <Star size={8} className="fill-amber-400" />
                          Featured
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="hidden md:block">
                  {actionDeck}
                </div>
              </div>
            </div>

            <div className="md:hidden order-2 space-y-1.5 -mt-1">
              <div className="flex flex-wrap items-center justify-center gap-2">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border capitalize ${statusMeta.badge}`}>
                  {statusMeta.label}
                </span>
                <span className="px-1.5 py-0.5 rounded border border-dossier-foreground/10 text-dossier-foreground/40 text-[10px] capitalize">
                  {rec.content_rating?.replace('_', ' ')}
                </span>
              </div>
              <h1 className="font-[family-name:var(--font-dossier-display)] text-2xl font-black italic leading-[0.95] tracking-tight text-center text-dossier-foreground">
                {rec.title}
              </h1>
            </div>

            <div className="flex-1 min-w-0 pt-1 md:pt-2 space-y-2 md:space-y-3 order-3">

              <div className="hidden md:block space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border capitalize ${statusMeta.badge}`}>
                    {statusMeta.label}
                  </span>
                  <span className="px-1.5 py-0.5 rounded border border-dossier-foreground/10 text-dossier-foreground/40 text-[10px] capitalize">
                    {rec.content_rating?.replace('_', ' ')}
                  </span>
                  {(recommenderIsVerified || recommenderIsPro) && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-dossier-panel/60 border border-dossier-foreground/10 text-[10px] font-[family-name:var(--font-mono)] text-dossier-foreground/50">
                      {recommenderIsVerified && recommenderIsPro
                        ? 'Verified · Pro rec'
                        : recommenderIsVerified
                        ? 'Verified'
                        : 'Pro rec'}
                    </span>
                  )}
                </div>
                <h1 className="font-[family-name:var(--font-dossier-display)] text-4xl md:text-5xl font-black italic leading-[0.95] tracking-tight text-dossier-foreground">
                  {rec.title}
                </h1>
              </div>

              {metaItems.length > 0 && (
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-1.5 gap-y-1 font-[family-name:var(--font-mono)] text-[11px] md:text-xs text-dossier-foreground/50 md:border-y md:border-dossier-foreground/10 md:py-2.5">
                  {metaItems.map((item, i) => (
                    <span key={item.key} className="flex items-center gap-x-1.5">
                      {i > 0 && <span className="text-dossier-foreground/20 mx-0.5">•</span>}
                      <span className="flex items-center gap-1.5">
                        <item.icon size={12} className="text-dossier-foreground/30" />
                        {item.label}
                      </span>
                    </span>
                  ))}
                  {rec.type && (
                    <span className="hidden md:flex items-center gap-1.5">
                      <span className="text-dossier-foreground/20 mx-0.5">•</span>
                      <Globe size={12} className="text-dossier-foreground/30" />
                      {rec.type}
                    </span>
                  )}
                </div>
              )}

              {rec.genres && rec.genres.length > 0 && (
                <div className="flex flex-wrap justify-center md:justify-start gap-1.5">
                  {rec.genres.map((genre: string) => (
                    <Link key={genre} href={`/browse?genre=${genre}`}>
                      <span className="inline-flex px-2.5 py-1 rounded-full text-[11px] font-medium border border-dossier-foreground/10 text-dossier-foreground/60 hover:border-dossier-foreground/30 hover:text-dossier-foreground transition-colors">
                        {genre}
                      </span>
                    </Link>
                  ))}
                </div>
              )}

              {rec.official_platforms && rec.official_platforms.length > 0 && (
                <div className="flex md:flex-wrap justify-center md:justify-start gap-2 overflow-x-auto md:overflow-visible no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
                  {rec.official_platforms.map((platform: string, i: number) => (
                    <div
                      key={platform}
                      className="flex items-center gap-1.5 pl-2.5 pr-2 py-1.5 rounded-full border border-dossier-foreground/10 bg-dossier-panel/40 text-[11px] text-dossier-foreground/60 hover:border-dossier-foreground/25 transition-colors shrink-0 whitespace-nowrap"
                    >
                      <Globe size={10} className="text-dossier-foreground/40 shrink-0" />
                      <span className="font-medium">{platform}</span>
                      {rec.official_links?.[i] && (
                        <a
                          href={rec.official_links[i]}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Open ${platform} link`}
                        >
                          <ExternalLink size={10} className="text-dossier-foreground/40 hover:text-dossier-foreground transition-colors" />
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

              <div className="flex items-stretch rounded-xl border border-dossier-foreground/10 bg-dossier-panel/40 divide-x divide-dossier-foreground/10 overflow-hidden backdrop-blur-sm">
                {stats.map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex-1 px-2 md:px-5 py-2.5 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <Icon size={12} className="text-dossier-foreground/40" />
                      <p className="font-[family-name:var(--font-mono)] text-lg md:text-xl font-bold tabular-nums leading-none text-dossier-foreground">
                        {value}
                      </p>
                    </div>
                    <p className="mt-1 text-[9px] uppercase tracking-widest text-dossier-foreground/40">{label}</p>
                  </div>
                ))}
              </div>

              <div className="md:hidden">
                {actionDeck}
              </div>

              <div className="space-y-10 pt-6 md:pt-8">

          <div className={`grid grid-cols-1 ${rec.why_recommend ? 'md:grid-cols-[1.6fr_1fr]' : ''} gap-3 md:gap-4`}>
            <div className="relative rounded-2xl border border-dossier-foreground/10 bg-dossier-panel/30 backdrop-blur-sm p-5 md:p-6 overflow-hidden">
              <div className={`absolute -top-10 -right-10 w-40 h-40 rounded-full ${typeStyle.detailGlow} blur-3xl opacity-20`} />
              <h2 className="relative font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.2em] text-dossier-foreground/40 mb-3">
                About
              </h2>

              <p className="relative text-[15px] leading-relaxed text-dossier-foreground/75 max-w-prose">{rec.description}</p>
            </div>

            {rec.why_recommend && (
              <div className={`relative rounded-2xl border ${typeStyle.border} bg-dossier-panel/40 p-5 md:p-6 flex flex-col`}>
                <h2 className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.2em] text-dossier-foreground/40 mb-3">
                  Why Read This
                </h2>
                <p className="font-[family-name:var(--font-dossier-display)] italic text-lg leading-snug text-dossier-foreground/85 flex-1">
                  &ldquo;{rec.why_recommend}&rdquo;
                </p>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-dashed border-dossier-foreground/15 bg-dossier-panel/20 p-5 md:p-6">
            <SubmitYourOwnButton
              isLoggedIn={!!user}
              submitRoute={submitRoute}
              comicId={id}
            />
          </div>

          <div className="flex items-center justify-between py-4 border-t border-dossier-foreground/10 text-xs text-dossier-foreground/40">
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

            <div className="flex items-center gap-3 shrink-0">
              <span className="font-[family-name:var(--font-mono)]">{rec.created_at ? formatDate(rec.created_at) : ''}</span>
            </div>
          </div>

          <section className="pt-2 border-t border-dossier-foreground/10 space-y-4">
            <h2 className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.2em] text-dossier-foreground/40">
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

          <Suspense fallback={<div className="h-40 bg-dossier-panel/30 animate-pulse rounded-2xl border border-dossier-foreground/10" />}>
            <ContextualOffers
              comicId={id}
              comicTitle={rec.title}
              genre={rec.genres?.[0] || 'Action'}
              maxOffers={3}
            />
          </Suspense>

          <section className="pt-2 border-t border-dossier-foreground/10 space-y-4">
            <h2 className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.2em] text-dossier-foreground/40">
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

            {!isGhostRec && profile && (
              <div className="hidden lg:block w-60 shrink-0 order-4">
                <div className="sticky top-6 rounded-2xl border border-dossier-foreground/10 bg-dossier-panel/40 backdrop-blur-sm p-4">
                  <p className="font-[family-name:var(--font-mono)] text-[9px] uppercase tracking-[0.2em] text-dossier-foreground/40 mb-3">
                    Recommender
                  </p>
                  <div className="flex items-center gap-3 min-w-0">
                    {profile.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt=""
                        className="h-10 w-10 rounded-full border border-dossier-foreground/10 object-cover shrink-0"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full border border-dossier-foreground/10 bg-dossier-panel flex items-center justify-center text-xs font-bold text-dossier-foreground/40 shrink-0">
                        {recommenderName.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium truncate text-dossier-foreground">{recommenderName}</p>
                      {profile.username && (
                        <p className="font-[family-name:var(--font-mono)] text-[11px] text-dossier-foreground/40 truncate">
                          @{profile.username}
                        </p>
                      )}
                    </div>
                  </div>

                  {(recommenderIsVerified || recommenderIsPro) && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {recommenderIsVerified && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-dossier-foreground/15 text-dossier-foreground/60">
                          Verified
                        </span>
                      )}
                      {recommenderIsPro && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-amber-500/30 text-amber-400">
                          Pro
                        </span>
                      )}
                    </div>
                  )}

                  {profile.username && (
                    <Link
                      href={`/${profile.username}`}
                      className="mt-3 flex items-center justify-center w-full h-8 rounded-[10px] border border-dossier-foreground/10 bg-dossier-panel/60 font-[family-name:var(--font-mono)] text-[11px] text-dossier-foreground/70 hover:text-dossier-foreground hover:border-dossier-foreground/30 transition-colors"
                    >
                      View profile →
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}