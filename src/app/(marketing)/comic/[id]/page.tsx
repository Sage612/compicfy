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

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?? 'https://compicfy.com'
const GHOST_ID = '00000000-0000-0000-0000-000000000000'

interface Props {
  params: Promise<{ id: string }>
}

function truncateAtWord(str: string, max: number): string {
  if (str.length <= max) return str
  const cut = str.slice(0, max)
  const lastSpace = cut.lastIndexOf(' ')
  return (lastSpace > 0? cut.slice(0, lastSpace) : cut) + '…'
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
  const { data } = await supabase.from('recommendations').select('title, description, type, genres, author, cover_url, status').eq('id', id).single()
  type RecMeta = Pick<Recommendation, 'title' | 'description' | 'type' | 'genres' | 'author' | 'cover_url' | 'status'>
  const rec = data as RecMeta | null
  if (!rec) return { title: 'Comic' }
  const typeLabel = rec.type? rec.type.charAt(0).toUpperCase() + rec.type.slice(1) : 'Comic'
  const genreList = rec.genres?.slice(0, 3).join(', ')?? ''
  const rawDesc = [
    `${rec.title} is a ${typeLabel.toLowerCase()}`,
    rec.author? `by ${rec.author}` : null,
    genreList? `in the genres ${genreList}` : null,
    rec.status? `— currently ${rec.status}.` : null,
    rec.description? rec.description : 'Discover where to read it and what the community thinks.',
  ].filter(Boolean).join(' ')
  const description = truncateAtWord(rawDesc, 155)
  const keywords = [rec.title, `${rec.title} ${rec.type}`, `${rec.title} review`, `${rec.title} where to read`, `${rec.title} recommendation`,...(rec.genres?? []), rec.author?? null, typeLabel, 'manga recommendation', 'manhwa recommendation', 'manhua recommendation', 'webtoon recommendation'].filter((k): k is string =>!!k && k.trim().length > 0)
  const ogParams = new URLSearchParams({ title: rec.title?? '', description: description?? '',...(rec.cover_url? { cover: rec.cover_url } : {}),...(rec.type? { type: rec.type } : {}), })
  const ogImageUrl = `${SITE_URL}/api/og?${ogParams.toString()}`
  const pageUrl = `${SITE_URL}/comic/${id}`
  const pageTitle = `${rec.title} ${typeLabel}`
  return { title: pageTitle, description, keywords, alternates: { canonical: pageUrl }, openGraph: { title: pageTitle, description, type: 'article', url: pageUrl, siteName: 'ComPicfy', images: [{ url: ogImageUrl, width: 1200, height: 630, alt: `${rec.title} cover` }], }, twitter: { card: 'summary_large_image', title: pageTitle, description, images: [ogImageUrl], }, }
}

function ComicJsonLd({ rec, id, recommenderName }: { rec: Recommendation; id: string; recommenderName: string }) {
  const typeLabel = rec.type? rec.type.charAt(0).toUpperCase() + rec.type.slice(1) : 'Comic'
  const ratingValue = ratioToStars(rec.upvotes?? 0, rec.downvotes?? 0)
  const jsonLd = { '@context': 'https://schema.org', '@type': 'Book', name: rec.title, description: rec.description? truncateAtWord(rec.description, 300) : undefined, url: `${SITE_URL}/comic/${id}`,...(rec.cover_url? { image: rec.cover_url } : {}),...(rec.author? { author: { '@type': 'Person', name: rec.author } } : {}),...(rec.year_released? { datePublished: String(rec.year_released) } : {}), bookFormat: 'GraphicNovel', inLanguage: rec.original_language?? 'ja', genre: rec.genres?? [],...((rec.review_count?? 0) > 0? { aggregateRating: { '@type': 'AggregateRating', ratingValue, ratingCount: rec.review_count, reviewCount: rec.review_count, bestRating: 5, worstRating: 1, }, } : {}), breadcrumb: { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL }, { '@type': 'ListItem', position: 2, name: 'Browse', item: `${SITE_URL}/browse` }, { '@type': 'ListItem', position: 3, name: rec.title, item: `${SITE_URL}/comic/${id}` },], }, mainEntityOfPage: { '@type': 'WebPage', '@id': `${SITE_URL}/comic/${id}`, name: `${rec.title} — ${typeLabel} Recommendation`, description: `Community recommendation for ${rec.title}. Recommended by ${recommenderName} on ComPicfy.`, publisher: { '@type': 'Organization', name: 'ComPicfy', url: SITE_URL, logo: `${SITE_URL}/icons/icon-192.png`, }, }, }
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
}

export default async function ComicDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const headersList = await headers()
  const ua = headersList.get('user-agent')?? ''
  if (!isCrawler(ua)) { await (supabase as any).rpc('increment_view_count', { rec_id: id }) }
  const { data: rawRec } = await supabase.from('recommendations').select('*').eq('id', id).eq('is_approved', true).single()
  if (!rawRec) notFound()
  const rec = rawRec as Recommendation
  const { data: { user } } = await supabase.auth.getUser()
  let currentUserProfile: { role: string; is_pro: boolean; pro_expires_at: string | null; user_type: string | null } | null = null
  if (user) { const { data } = await supabase.from('profiles').select('role, is_pro, pro_expires_at, is_patron, patron_expires_at, user_type').eq('id', user.id).single(); currentUserProfile = data as any }
  const currentUserIsPro = currentUserProfile? isProUser(currentUserProfile as any) : false
  const currentUserType: 'reader' | 'creator' = currentUserProfile?.user_type === 'creator'? 'creator' : 'reader'
  const currentUserRoutes = getDashboardRoutes(currentUserType, currentUserIsPro)

  if (rec.content_rating === 'adult' || rec.content_rating === 'mature') {
    if (!user) {
      return (
        <div className="max-w-md mx-auto px-4 py-24 text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto"><ShieldAlert size={32} className="text-destructive" /></div>
          <h1 className="text-2xl font-black">Age Restricted</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">This comic contains {rec.content_rating === 'adult'? '18+' : '17+'} content. Log in and enable adult content in settings to view it.</p>
          <div className="flex justify-center gap-3"><Link href="/browse"><Button variant="outline">Back to Browse</Button></Link><Link href="/login"><Button>Log In</Button></Link></div>
        </div>
      )
    }
    const { data: profileFlag } = await supabase.from('profiles').select('adult_content_enabled').eq('id', user.id).single()
    if (!(profileFlag as any)?.adult_content_enabled) {
      return (
        <div className="max-w-md mx-auto px-4 py-24 text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto"><ShieldAlert size={32} className="text-destructive" /></div>
          <h1 className="text-2xl font-black">Adult Content Disabled</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">Enable adult content in your profile settings to view this comic.</p>
          <div className="flex justify-center gap-3"><Link href="/browse"><Button variant="outline">Back to Browse</Button></Link><Link href={currentUserRoutes.settings}><Button>Go to Settings</Button></Link></div>
        </div>
      )
    }
  }

  const { data: profileData } = await supabase.from('profiles').select('username, display_name, avatar_url, role, is_pro, pro_expires_at, is_patron, patron_expires_at, verified_recommender, user_type').eq('id', rec.user_id).maybeSingle()
  const profile = profileData as { username: string; display_name: string | null; avatar_url: string | null; role: string; is_pro: boolean; pro_expires_at: string | null; verified_recommender: boolean; user_type: string | null } | null
  const isGhostRec = rec.user_id === GHOST_ID
  const recommenderIsPro = profile? profile.role === 'admin' || (profile.is_pro && (!profile.pro_expires_at || new Date(profile.pro_expires_at) > new Date())) : false
  const recommenderIsVerified = profile?.verified_recommender?? false
  const recommenderName = isGhostRec? 'Ghost' : (profile?.display_name || profile?.username || 'unknown')
  const submitRoute = user? currentUserRoutes.newRec : '/reader/dashboard/recommendations/new'
  let userVote: 'up' | 'down' | null = null
  let isSaved = false
  if (user) {
    const [voteRes, saveRes] = await Promise.all([(supabase as any).from('votes').select('vote_type').eq('user_id', user.id).eq('recommendation_id', id).maybeSingle(), (supabase as any).from('saves').select('id').eq('user_id', user.id).eq('recommendation_id', id).maybeSingle(),])
    userVote = (voteRes.data?.vote_type as 'up' | 'down')?? null
    isSaved =!!saveRes.data
  }
  const typeStyle = TYPE_META[rec.type as keyof typeof TYPE_META]?? DEFAULT_TYPE_META
  const statusMeta = resolveStatusMeta(rec.status, (rec as any).translation_status)
  const stats = [
    { icon: ThumbsUp, label: 'Upvotes', value: rec.upvotes?? 0 },
    { icon: Star, label: 'Reviews', value: rec.review_count?? 0 },
    { icon: Bookmark, label: 'Saves', value: rec.save_count?? 0 },
    { icon: MessageSquare, label: 'Score', value: rec.score?? 0 },
  ]

  const actionDeck = (
    <div className="space-y-2">
      <p className="font-[family-name:var(--font-mono)] text- uppercase tracking-[0.2em] text-dossier-foreground/30 px-1">Actions</p>
      <div className="rounded-xl border border-dossier-foreground/[0.08] bg-dossier-panel/40 backdrop-blur-sm p-2 space-y-2">
        <div className="grid grid-cols-2 gap-1.5">
          <VoteButtons recommendationId={id} initialUpvotes={rec.upvotes?? 0} initialDownvotes={rec.downvotes?? 0} initialVote={userVote} isLoggedIn={!!user} comicTitle={rec.title} />
          <SaveButton recommendationId={id} initialSaved={isSaved} isLoggedIn={!!user} comicTitle={rec.title} />
        </div>
        <ReadingProgressButton comicId={id} chapterCount={rec.chapter_count} isLoggedIn={!!user} />
        {user && <AddToListButton recommendationId={id} userId={user.id} />}
        <AddToCollectionButton recommendationId={id} isLoggedIn={!!user} />
        <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-dossier-foreground/[0.07]">
          <ShareButton title={rec.title} url={`${SITE_URL}/comic/${id}`} fullWidth />
          <ReportButton entityType="recommendation" entityId={id} isLoggedIn={!!user} asButton />
        </div>
      </div>
      <div className="rounded-lg border border-dossier-foreground/[0.06] bg-dossier-panel/20 px-2 py-1.5 grid grid-cols-4 divide-x divide-dossier-foreground/[0.06]">
        {stats.map(({ icon: Icon, label, value }) => (
          <div key={label} className="text-center px-1">
            <p className="font-[family-name:var(--font-mono)] text- font-bold tabular-nums leading-none">{value}</p>
            <p className="mt-0.5 text- uppercase tracking-widest opacity-40">{label}</p>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <>
      <ComicJsonLd rec={rec} id={id} recommenderName={recommenderName} />
      <div className={`${display.variable} ${mono.variable} min-h-screen bg-dossier text-dossier-foreground`}>
        {/* TINY HEADER */}
        <div className="relative h- md:h- overflow-hidden border-b border-dossier-foreground/[0.05]">
          {rec.cover_url? <img src={`/api/image-proxy?url=${encodeURIComponent(rec.cover_url)}`} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-[0.18]" /> : <div className={`absolute inset-0 bg-gradient-to-r ${typeStyle.gradient} opacity-[0.06]`} />}
          <div className="absolute inset-0 bg-gradient-to-b from-dossier/10 to-dossier" />
          <div className="relative z-10 max-w- mx-auto px-4 md:px-6 h-full flex items-center">
            <Link href="/browse" className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-dossier-panel/70 border border-dossier-foreground/10 text- text-dossier-foreground/60 hover:text-dossier-foreground backdrop-blur-md"><ArrowLeft size={10} /> Browse</Link>
          </div>
        </div>

        {/* HERO */}
        <div className="max-w- mx-auto px-4 md:px-6 pt-4 md:pt-5">
          <div className="flex flex-col md:flex-row gap-4 md:gap-6">
            <div className="shrink-0 w-full md:w- flex justify-center md:justify-start">
              <div className="relative flex w- md:w-">
                <div className={`hidden md:flex w-5 rounded-l-lg border-y border-l ${typeStyle.border} bg-dossier-panel/60 items-center justify-center`}><span className="font-[family-name:var(--font-mono)] text- uppercase tracking-[0.2em] text-dossier-foreground/40 -rotate-90 whitespace-nowrap">{rec.type}</span></div>
                <div className="relative flex-1 aspect-[3/4] rounded-lg md:rounded-l-none overflow-hidden border border-dossier-foreground/10 shadow-[0_10px_24px_-12px_rgba(0,0,0,0.5)] bg-dossier-panel">
                  {rec.cover_url? <img src={`/api/image-proxy?url=${encodeURIComponent(rec.cover_url)}`} alt={rec.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><BookOpen size={20} className="opacity-20" /></div>}
                  <div className="absolute top-1 left-1"><span className={`px-1.5 py-0.5 rounded text- font-bold border capitalize ${typeStyle.badge}`}>{rec.type}</span></div>
                </div>
              </div>
            </div>
            <div className="flex-1 min-w-0 space-y-2.5">
              <div className="flex items-center gap-1.5"><span className={`px-1.5 py-0.5 rounded text- font-bold border capitalize ${statusMeta.badge}`}>{statusMeta.label}</span><span className="px-1.5 py-0.5 rounded border border-dossier-foreground/10 text- font-[family-name:var(--font-mono)] opacity-40">{rec.content_rating?.replace('_',' ')}</span></div>
              <h1 className="font-[family-name:var(--font-display)] text- md:text- font-black italic leading-[0.95] tracking-tight">{rec.title}</h1>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-[family-name:var(--font-mono)] text- opacity-50 border-y border-dossier-foreground/[0.06] py-2">
                {rec.author && <span className="inline-flex items-center gap-1"><User size={10} /> {rec.author}</span>}
                {rec.artist && rec.artist!==rec.author && <><span className="opacity-20">•</span><span className="inline-flex items-center gap-1"><Palette size={10} /> {rec.artist}</span></>}
                {rec.year_released && <><span className="opacity-20">•</span><span>{rec.year_released}</span></>}
                {rec.chapter_count && <><span className="opacity-20">•</span><span>{rec.chapter_count} ch</span></>}
              </div>
              {rec.genres && <div className="flex flex-wrap gap-1">{rec.genres.map((g:string)=><Link key={g} href={`/browse?genre=${g}`}><span className="px-2 py-0.5 rounded-full text- border border-dossier-foreground/10 opacity-60 hover:opacity-100">{g}</span></Link>)}</div>}
              {rec.official_platforms && rec.official_platforms.length>0 && <div className="flex flex-wrap gap-1.5">{rec.official_platforms.map((p:string,i:number)=><div key={p} className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full border border-dossier-foreground/10 bg-dossier-panel/30 text-"><Globe size={10} className="opacity-40" /> {p}{rec.official_links?.[i] && <a href={rec.official_links[i]} target="_blank" rel="noopener noreferrer" className="ml-0.5 p-0.5 rounded-full bg-dossier-foreground/10"><ExternalLink size={8}/></a>}</div>)}</div>}
              <MyReadingSources comicId={id} isLoggedIn={!!user} isPro={currentUserIsPro} />
              {rec.more_info_link && <MoreInfoSection link={rec.more_info_link} source={rec.more_info_link_source} verifiedAt={rec.more_info_link_verified_at} />}
            </div>
          </div>
        </div>

        <div className="max-w- mx-auto px-4 md:px-6 mt-5 pb-20">
          <div className="grid grid-cols-1 md:grid-cols-[148px_minmax(0,1fr)] gap-5 items-start">
            <aside className="hidden md:block sticky top-4">{actionDeck}</aside>
            <main className="min-w-0 space-y-5">
              <div className="md:hidden">{actionDeck}</div>
              <div className={`grid grid-cols-1 ${rec.why_recommend?'md:grid-cols-[1.6fr_1fr]':''} gap-3`}>
                <div className="rounded-xl border border-dossier-foreground/[0.06] bg-dossier-panel/20 p-4"><h2 className="font-[family-name:var(--font-mono)] text- uppercase tracking-[0.2em] opacity-30 mb-2">About</h2><p className="text- leading-[1.6] opacity-70">{rec.description}</p></div>
                {rec.why_recommend && <div className={`rounded-xl border ${typeStyle.border} bg-dossier-panel/30 p-4`}><h2 className="font-[family-name:var(--font-mono)] text- uppercase tracking-[0.2em] opacity-30 mb-2">Why Read This</h2><p className="font-[family-name:var(--font-display)] italic text- leading-[1.35]">“{rec.why_recommend}”</p></div>}
              </div>
              <div className="rounded-xl border border-dashed border-dossier-foreground/10 bg-dossier-panel/10 p-3"><SubmitYourOwnButton isLoggedIn={!!user} submitRoute={submitRoute} comicId={id} /></div>
              <section className="space-y-3 pt-3 border-t border-dossier-foreground/[0.06]"><h2 className="font-[family-name:var(--font-mono)] text- uppercase tracking-[0.2em] opacity-30">Reviews</h2><ReviewSection recommendationId={id} currentUserId={user?.id??null} isLoggedIn={!!user} recommenderId={rec.user_id} currentUserRole={currentUserProfile?.role??null} /></section>
              <Suspense fallback={<div className="h-20 bg-dossier-panel/20 animate-pulse rounded-xl" />}><ContextualOffers comicId={id} comicTitle={rec.title} genre={rec.genres?.[0]||'Action'} maxOffers={3} /></Suspense>
              <section className="space-y-3 pt-3 border-t border-dossier-foreground/[0.06]"><h2 className="font-[family-name:var(--font-mono)] text- uppercase tracking-[0.2em] opacity-30">Next Reads</h2><SimilarComics comicId={id} contentRating={rec.content_rating} showAdult={rec.content_rating==='adult'||rec.content_rating==='mature'} /></section>
            </main>
          </div>
        </div>
      </div>
    </>
  )
}