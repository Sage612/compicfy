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
  return /googlebot|bingbot|slurp|duckduckbot|baiduspider|yandex|facebot|ia_archiver|twitterbot|linkedinbot|whatsapp|telegrambot/i.test(userAgent)
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

  const typeLabel = rec.type ? rec.type.charAt(0).toUpperCase() + rec.type.slice(1) : 'Comic'
  const genreList = rec.genres?.slice(0, 3).join(', ') ?? ''

  const rawDesc = [
    `${rec.title} is a ${typeLabel.toLowerCase()}`,
    rec.author ? `by ${rec.author}` : null,
    genreList ? `in the genres ${genreList}` : null,
    rec.status ? `— currently ${rec.status}.` : null,
    rec.description ? rec.description : 'Discover where to read it and what the community thinks.',
  ].filter(Boolean).join(' ')

  const description = truncateAtWord(rawDesc, 155)
  const keywords = [
    rec.title, `${rec.title} ${rec.type}`, `${rec.title} review`, `${rec.title} where to read`,
    `${rec.title} recommendation`, ...(rec.genres ?? []), rec.author ?? null, typeLabel,
    'manga recommendation', 'manhwa recommendation', 'manhua recommendation', 'webtoon recommendation',
  ].filter((k): k is string => !!k && k.trim().length > 0)

  const ogParams = new URLSearchParams({
    title: rec.title ?? '',
    description: description ?? '',
    ...(rec.cover_url ? { cover: rec.cover_url } : {}),
    ...(rec.type ? { type: rec.type } : {}),
  })
  const ogImageUrl = `${SITE_URL}/api/og?${ogParams.toString()}`
  const pageUrl = `${SITE_URL}/comic/${id}`
  const pageTitle = `${rec.title} ${typeLabel}`

  return {
    title: pageTitle,
    description,
    keywords,
    alternates: { canonical: pageUrl },
    openGraph: {
      title: pageTitle,
      description,
      type: 'article',
      url: pageUrl,
      siteName: 'Compicfy',
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: `${rec.title} cover` }],
    },
    twitter: { card: 'summary_large_image', title: pageTitle, description, images: [ogImageUrl] },
  }
}

function ComicJsonLd({ rec, id, recommenderName }: { rec: Recommendation; id: string; recommenderName: string }) {
  const typeLabel = rec.type ? rec.type.charAt(0).toUpperCase() + rec.type.slice(1) : 'Comic'
  const ratingValue = ratioToStars(rec.upvotes ?? 0, rec.downvotes ?? 0)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Book',
    name: rec.title,
    description: rec.description ? truncateAtWord(rec.description, 300) : undefined,
    url: `${SITE_URL}/comic/${id}`,
    ...(rec.cover_url ? { image: rec.cover_url } : {}),
    ...(rec.author ? { author: { '@type': 'Person', name: rec.author } } : {}),
    ...(rec.year_released ? { datePublished: String(rec.year_released) } : {}),
    bookFormat: 'GraphicNovel',
    inLanguage: rec.original_language ?? 'ja',
    genre: rec.genres ?? [],
    ...(rec.review_count > 0 ? {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue,
        ratingCount: rec.review_count,
        reviewCount: rec.review_count,
        bestRating: 5,
        worstRating: 1,
      },
    } : {}),
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: 'Browse', item: `${SITE_URL}/browse` },
        { '@type': 'ListItem', position: 3, name: rec.title, item: `${SITE_URL}/comic/${id}` },
      ],
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${SITE_URL}/comic/${id}`,
      name: `${rec.title} — ${typeLabel} Recommendation`,
      description: `Community recommendation for ${rec.title}. Recommended by ${recommenderName} on Compicfy.`,
      publisher: { '@type': 'Organization', name: 'Compicfy', url: SITE_URL, logo: `${SITE_URL}/icons/icon-192.png` },
    },
  }
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
}

const TYPE_STYLES: Record<string, { gradient: string; badge: string; glow: string; border: string }> = {
  manga: { gradient: 'from-rose-500 to-pink-600', badge: 'bg-rose-500/15 text-rose-500 border-rose-500/25', glow: 'bg-rose-500/20', border: 'border-rose-500/30' },
  manhwa: { gradient: 'from-teal-500 to-cyan-600', badge: 'bg-teal-500/15 text-teal-500 border-teal-500/25', glow: 'bg-teal-500/20', border: 'border-teal-500/30' },
  manhua: { gradient: 'from-amber-500 to-orange-500', badge: 'bg-amber-500/15 text-amber-500 border-amber-500/25', glow: 'bg-amber-500/20', border: 'border-amber-500/30' },
  webtoon: { gradient: 'from-teal-500 to-cyan-600', badge: 'bg-teal-500/15 text-teal-500 border-teal-500/25', glow: 'bg-teal-500/20', border: 'border-teal-500/30' },
  comic: { gradient: 'from-blue-500 to-indigo-600', badge: 'bg-blue-500/15 text-blue-500 border-blue-500/25', glow: 'bg-blue-500/20', border: 'border-blue-500/30' },
}

const STATUS_STYLES: Record<string, string> = {
  ongoing: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  completed: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  hiatus: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  cancelled: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
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
        <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto"><ShieldAlert size={28} className="text-destructive" /></div>
          <h1 className="text-xl font-black">Age Restricted</h1>
          <p className="text-muted-foreground text-sm">This comic contains {rec.content_rating === 'adult' ? '18+' : '17+'} content. Log in and enable adult content in settings to view it.</p>
          <div className="flex justify-center gap-3">
            <Link href="/browse"><Button variant="outline">Back to Browse</Button></Link>
            <Link href="/login"><Button>Log In</Button></Link>
          </div>
        </div>
      )
    }
    const { data: profileFlag } = await supabase.from('profiles').select('adult_content_enabled').eq('id', user.id).single()
    if (!(profileFlag as any)?.adult_content_enabled) {
      return (
        <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto"><ShieldAlert size={28} className="text-destructive" /></div>
          <h1 className="text-xl font-black">Adult Content Disabled</h1>
          <p className="text-muted-foreground text-sm">Enable adult content in your profile settings to view this comic.</p>
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
    username: string; display_name: string | null; avatar_url: string | null; role: string;
    is_pro: boolean; pro_expires_at: string | null; verified_recommender: boolean; user_type: string | null;
  } | null

  const isGhostRec = rec.user_id === GHOST_ID
  const recommenderIsPro = profile ? profile.role === 'admin' || (profile.is_pro && (!profile.pro_expires_at || new Date(profile.pro_expires_at) > new Date())) : false
  const recommenderIsVerified = profile?.verified_recommender ?? false
  const recommenderName = isGhostRec ? 'Ghost' : (profile?.display_name || profile?.username || 'unknown')

  let submitRoute = '/reader/dashboard/recommendations/new'
  if (user) {
    const { data: currentUserProfile } = await supabase.from('profiles').select('role, is_pro, pro_expires_at, user_type').eq('id', user.id).single()
    const isAdminOrMod = ['admin', 'moderator'].includes((currentUserProfile as any)?.role ?? '')
    const isPro = (currentUserProfile as any)?.is_pro && (!(currentUserProfile as any)?.pro_expires_at || new Date((currentUserProfile as any).pro_expires_at) > new Date())
    const isCreator = (currentUserProfile as any)?.user_type === 'creator'
    if (isAdminOrMod || isPro) {
      submitRoute = isCreator ? '/pro/creator/dashboard/works/new' : '/pro/reader/dashboard/recommendations/new'
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
    isSaved = !!saveRes.data
  }

  const typeStyle = TYPE_STYLES[rec.type] ?? {
    gradient: 'from-primary to-rose-600', badge: 'bg-primary/15 text-primary border-primary/25', glow: 'bg-primary/15', border: 'border-primary/20',
  }

  const stats = [
    { icon: ThumbsUp, label: 'Upvotes', value: rec.upvotes ?? 0 },
    { icon: Star, label: 'Reviews', value: rec.review_count ?? 0 },
    { icon: Bookmark, label: 'Saves', value: rec.save_count ?? 0 },
    { icon: MessageSquare, label: 'Score', value: rec.score ?? 0 },
  ]

  return (
    <>
      <ComicJsonLd rec={rec} id={id} recommenderName={recommenderName} />
      <div className={`${display.variable} ${mono.variable} min-h-screen bg-[#0b0b0e] text-[#f3efe7]`}>
        
        {/* HERO */}
        <div className="relative h-[38vh] md:h-[48vh] overflow-hidden">
          {rec.cover_url && (
            <img src={`/api/image-proxy?url=${encodeURIComponent(rec.cover_url)}`} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover scale-105 blur-2xl opacity-20" />
          )}
          <div className={`absolute inset-0 bg-gradient-to-br ${typeStyle.gradient} opacity-15 mix-blend-overlay`} />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0b0b0e] via-[#0b0b0e]/60 to-transparent" />
          <div className="absolute top-4 left-4 md:left-6 z-10">
            <Link href="/browse" className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 border border-white/10 text-xs text-white/80 hover:text-white hover:border-white/20 backdrop-blur-md transition-colors">
              <ArrowLeft size={12} />Browse
            </Link>
          </div>
          <div className="absolute bottom-4 inset-x-0 z-10">
            <div className="max-w-5xl mx-auto px-4 md:px-6">
              <div className="flex flex-wrap items-center gap-1.5 mb-2">
                <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold border capitalize ${typeStyle.badge}`}>{rec.type}</span>
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border capitalize ${STATUS_STYLES[rec.status] ?? ''}`}>{rec.status}</span>
                {rec.is_featured && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    <Star size={8} className="fill-amber-400" />Featured
                  </span>
                )}
              </div>
              <h1 className="font-[family-name:var(--font-display)] text-3xl md:text-5xl font-black italic leading-[1.1] tracking-tight max-w-3xl text-white drop-shadow-md">{rec.title}</h1>
            </div>
          </div>
        </div>

        {/* CONTAINER STRIP */}
        <div className="relative max-w-5xl mx-auto px-4 md:px-6 -mt-12 z-20">
          <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-start">
            
            {/* COVER */}
            <div className="shrink-0 mx-auto md:mx-0">
              <div className="relative flex">
                <div className={`hidden sm:flex items-center justify-center w-6 rounded-l-lg border-y border-l ${typeStyle.border} bg-black/80 backdrop-blur-md`}>
                  <span className="font-[family-name:var(--font-mono)] text-[9px] uppercase tracking-[0.2em] text-white/50 -rotate-90 whitespace-nowrap">{rec.type} · {rec.status}</span>
                </div>
                <div className="relative w-36 md:w-44 aspect-[3/4] rounded-r-lg sm:rounded-l-none rounded-lg overflow-hidden border border-white/10 shadow-xl bg-[#15151a]">
                  <div className={`absolute -inset-2 rounded-2xl ${typeStyle.glow} blur-xl opacity-20 -z-10`} />
                  {rec.cover_url ? ( <img src={`/api/image-proxy?url=${encodeURIComponent(rec.cover_url)}`} alt={rec.title} className="w-full h-full object-cover" /> ) : (
                    <div className="w-full h-full flex items-center justify-center"><BookOpen size={28} className="text-white/20" /></div>
                  )}
                </div>
              </div>
            </div>

            {/* BLOCK META & STATS */}
            <div className="flex-1 w-full pt-1 space-y-4">
              <div className="flex flex-wrap gap-x-4 gap-y-1 font-[family-name:var(--font-mono)] text-xs text-white/60">
                {rec.author && <span className="flex items-center gap-1"><User size={12} />{rec.author}</span>}
                {rec.artist && rec.artist !== rec.author && <span className="flex items-center gap-1"><Palette size={12} />{rec.artist}</span>}
                {rec.year_released && <span className="flex items-center gap-1"><Calendar size={12} />{rec.year_released}</span>}
                {rec.chapter_count && <span className="flex items-center gap-1"><Hash size={12} />{rec.chapter_count} ch.</span>}
                <span className="px-1 py-0.5 rounded border border-white/10 text-white/40 text-[10px] uppercase">{rec.content_rating?.replace('_', ' ')}</span>
              </div>

              {rec.genres && rec.genres.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {rec.genres.map((genre: string) => (
                    <Link key={genre} href={`/browse?genre=${genre}`}>
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] border border-white/10 text-white/70 hover:border-white/30 hover:text-white transition-colors">{genre}</span>
                    </Link>
                  ))}
                </div>
              )}

              {/* STATS STRIP */}
              <div className="flex items-stretch rounded-xl border border-white/10 bg-white/[0.02] divide-x divide-white/10 overflow-hidden backdrop-blur-sm w-full max-w-2xl">
                {stats.map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex-1 py-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Icon size={12} className="text-white/40" />
                      <p className="font-[family-name:var(--font-mono)] text-base font-bold tabular-nums text-white">{value}</p>
                    </div>
                    <p className="text-[9px] uppercase tracking-wider text-white/40">{label}</p>
                  </div>
                ))}
              </div>

              {/* PLATFORMS */}
              {rec.official_platforms && rec.official_platforms.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {rec.official_platforms.map((platform: string, i: number) => (
                    <div key={platform} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-white/10 bg-white/[0.02] text-[11px] text-white/70">
                      <Globe size={10} className="text-white/40" />
                      <span>{platform}</span>
                      {rec.official_links?.[i] && (
                        <a href={rec.official_links[i]} target="_blank" rel="noopener noreferrer">
                          <ExternalLink size={10} className="text-white/40 hover:text-white transition-colors" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* LOCKED CONTROL DECK (Grid-to-Flex structure avoids container overflow) */}
          <div className="mt-6 z-30">
            <div className={`grid grid-cols-2 md:flex items-center gap-2 p-2 rounded-xl border ${typeStyle.border} bg-[#0e0e12]/90 backdrop-blur-md shadow-lg w-full overflow-hidden`}>
              <div className="col-span-2 md:col-span-1 flex items-center justify-start">
                <VoteButtons recommendationId={id} initialUpvotes={rec.upvotes} initialDownvotes={rec.downvotes} initialVote={userVote} isLoggedIn={!!user} comicTitle={rec.title} />
              </div>
              <div className="hidden md:block w-px h-5 bg-white/10 mx-1" />
              <div className="flex items-center justify-center md:justify-start">
                <SaveButton recommendationId={id} initialSaved={isSaved} isLoggedIn={!!user} comicTitle={rec.title} />
              </div>
              <div className="flex items-center justify-center md:justify-start">
                <ReadingProgressButton comicId={id} chapterCount={rec.chapter_count} isLoggedIn={!!user} />
              </div>
              <div className="hidden md:block w-px h-5 bg-white/10 mx-1" />
              {user && (
                <div className="col-span-1 flex justify-center md:justify-start">
                  <AddToListButton recommendationId={id} userId={user.id} />
                </div>
              )}
              <div className="col-span-1 flex justify-center md:justify-start">
                <AddToCollectionButton recommendationId={id} isLoggedIn={!!user} />
              </div>
              <div className="col-span-2 md:col-span-1 md:ml-auto flex justify-end p-1 md:p-0">
                <ShareButton title={rec.title} url={`${SITE_URL}/comic/${id}`} />
              </div>
            </div>
          </div>
        </div>

        {/* DETAILS GRID & LOWER SECTIONS */}
        <div className="max-w-5xl mx-auto px-4 md:px-6 mt-8 pb-16 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-[1.6fr_1fr] gap-4">
            <div className="relative rounded-xl border border-white/10 bg-white/[0.01] backdrop-blur-sm p-5 overflow-hidden">
              <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full ${typeStyle.glow} blur-3xl opacity-15`} />
              <h2 className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wider text-white/40 mb-2">About</h2>
              <p className="text-sm leading-relaxed text-white/80">{rec.description}</p>
            </div>
            {rec.why_recommend ? (
              <div className={`relative rounded-xl border ${typeStyle.border} bg-white/[0.01] p-5 flex flex-col`}>
                <h2 className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wider text-white/40 mb-2">Why Read This</h2>
                <p className="font-[family-name:var(--font-display)] italic text-base leading-relaxed text-white/90 flex-1">&ldquo;{rec.why_recommend}&rdquo;</p>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-white/10 p-5 flex items-center justify-center text-center">
                <p className="text-xs text-white/30">No recommender note for this one yet.</p>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.01] p-4">
            <SubmitYourOwnButton isLoggedIn={!!user} submitRoute={submitRoute} comicId={id} />
          </div>

          <div className="flex items-center justify-between py-3 border-t border-white/10 text-xs text-white/40">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span>Recommended by</span>
              <RecommenderLink username={profile?.username ?? ''} displayName={recommenderName} isLoggedIn={!!user} isGhost={isGhostRec} role={profile?.role} isPro={recommenderIsPro} isVerified={recommenderIsVerified} comicTitle={rec.title} userType={profile?.user_type ?? null} />
            </div>
            <span className="font-[family-name:var(--font-mono)] text-[11px]">{formatDate(rec.created_at)}</span>
          </div>

          <section className="pt-2 border-t border-white/10 space-y-3">
            <h2 className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wider text-white/40">Reviews</h2>
            <ReviewSection recommendationId={id} currentUserId={user?.id ?? null} isLoggedIn={!!user} />
          </section>

          <section className="pt-2 border-t border-white/10 space-y-3">
            <h2 className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wider text-white/40">Sponsored Picks</h2>
            <Suspense fallback={<div className="h-28 bg-white/[0.01] animate-pulse rounded-xl border border-white/10" />}>
              <ContextualOffers comicId={id} comicTitle={rec.title} genre={rec.genres?.[0] || 'Action'} maxOffers={3} />
            </Suspense>
          </section>

          <section className="pt-2 border-t border-white/10 space-y-3">
            <h2 className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wider text-white/40">Next Reads</h2>
            <SimilarComics comicId={id} contentRating={rec.content_rating} showAdult={rec.content_rating === 'adult' || rec.content_rating === 'mature'} />
          </section>

        </div>
      </div>
    </>
  )
}
