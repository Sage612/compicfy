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
  Bookmark, Croissant, Flag, Layers, ShieldAlert,
  Star, ThumbsUp, MessageSquare,
} from 'lucide-react'
import Link from 'next/link'
import { formatDate, timeAgo } from '@/lib/utils/format'
import { VoteButtons } from '@/components/recommendations/VoteButtons'
import { SaveButton } from '@/components/recommendations/SaveButton'
import type { Metadata } from 'next'
import type { Recommendation } from '@/types/app.types'
import { Button } from '@/components/ui/button'
import { Suspense } from 'react'
import { ContextualOffers } from '@/components/affiliate/ContextualOffers'
import { BakeButton } from '@/components/recommendations/BakeButton'
import { SubmitYourOwnButton } from '@/components/recommendations/SubmitYourOwnButton'
import { RecommenderLink } from '@/components/recommendations/RecommenderLink'
import { MoreInfoSection } from '@/components/comic-detail/MoreInfoSection'
import { TagList } from '@/components/comic-detail/TagList'
import { ComicHero } from '@/components/comic-detail/ComicHero'
import { RatingsHistogram } from '@/components/comic-detail/RatingsHistogram'
import { ActionDock } from '@/components/comic-detail/ActionDock'
import { TrackingProvider } from '@/components/comic-detail/TrackingProvider'
import { TrackBar } from '@/components/comic-detail/TrackBar'
import { MomentStrip } from '@/components/comic-detail/MomentStrip'
import { ProgressStrip } from '@/components/comic-detail/ProgressStrip'
import { FriendsActivity } from '@/components/comic-detail/FriendsActivity'
import { OfficialPlatforms } from '@/components/comic-detail/OfficialPlatforms'
import { SectionNav, type NavItem } from '@/components/comic-detail/SectionNav'
import type { SheetRow } from '@/components/comic-detail/TrackSheet'
import {
  getFriendActivity, getMyMoments, getMyTracking, getRatingBreakdown,
} from '@/lib/tracking/queries'
import type { MyTracking } from '@/lib/tracking/types'
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

// Same caching pitfall already documented in the vote route: Next.js can
// cache a Server Component's data fetches (Supabase uses `fetch`
// internally) unless explicitly opted out. Without this, a refresh right
// after voting could serve a stale cached read of the `votes` row instead
// of the fresh one — showing the vote as cleared even though it's
// correctly persisted server-side.
export const dynamic = 'force-dynamic'
export const revalidate = 0

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
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
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
    is_patron?:           boolean | null
    patron_expires_at?:   string | null
    verified_recommender: boolean
    user_type:            string | null
  } | null

  const isGhostRec = rec.user_id === GHOST_ID

  // Fixed: was hand-rolled `role === 'admin' || (is_pro && not-expired)`
  // with no patron awareness — isProUser() from @/lib/access is the SSOT
  // and already covers admin/patron/pro correctly, same as
  // currentUserIsPro above in this same file.
  const recommenderIsPro = profile ? isProUser(profile as any) : false

  const recommenderIsVerified = profile?.verified_recommender ?? false
  const recommenderName       = isGhostRec
    ? 'Ghost'
    : (profile?.display_name || profile?.username || 'unknown')

  const submitRoute = user ? currentUserRoutes.newRec : '/reader/dashboard/recommendations/new'

  // ── Everything that depends on who is looking, fetched together ──
  const NOT_TRACKING: MyTracking = { listId: null, status: null, subStatus: null, chapter: null, lastReadAt: null }

  const [voteRes, saveRes, ratingRes, myTracking, myMoments, ratingBreakdown, friends] = await Promise.all([
    user
      ? (supabase as any).from('votes').select('vote_type').eq('user_id', user.id).eq('recommendation_id', id).maybeSingle()
      : Promise.resolve({ data: null }),
    user
      ? (supabase as any).from('saves').select('id').eq('user_id', user.id).eq('recommendation_id', id).maybeSingle()
      : Promise.resolve({ data: null }),
    user
      ? (supabase as any).from('reviews').select('rating').eq('user_id', user.id).eq('recommendation_id', id).maybeSingle()
      : Promise.resolve({ data: null }),
    user ? getMyTracking(supabase, user.id, id) : Promise.resolve(NOT_TRACKING),
    user ? getMyMoments(supabase, user.id, id) : Promise.resolve([]),
    getRatingBreakdown(supabase, id),
    user ? getFriendActivity(supabase, user.id, id) : Promise.resolve({ followsAnyone: false, events: [] }),
  ])

  const userVote: 'up' | 'down' | null = (voteRes.data?.vote_type as 'up' | 'down') ?? null
  const isSaved = !!saveRes.data
  const existingRating: number | null =
    typeof ratingRes.data?.rating === 'number' ? ratingRes.data.rating : null

  const typeStyle  = TYPE_META[rec.type as keyof typeof TYPE_META] ?? DEFAULT_TYPE_META
  const statusMeta = resolveStatusMeta(rec.status, (rec as any).translation_status)

  const totalVotes = (rec.upvotes ?? 0) + (rec.downvotes ?? 0)
  const upvotePct  = totalVotes > 0 ? Math.round(((rec.upvotes ?? 0) / totalVotes) * 100) : null

  const stats = [
    { icon: ThumbsUp,      label: 'Upvotes', value: rec.upvotes      ?? 0 },
    { icon: Star,          label: 'Reviews', value: rec.review_count ?? 0 },
    { icon: Bookmark,      label: 'Saves',   value: rec.save_count   ?? 0 },
    { icon: MessageSquare, label: 'Score',   value: rec.score        ?? 0 },
  ]

  const officialPlatforms = (rec.official_platforms ?? []).map((name, i) => ({
    name,
    link: rec.official_links?.[i] ?? null,
  }))
  const readAheadPlatform = officialPlatforms.find(p => p.link && p.name.toLowerCase().includes('webtoon'))

  const shareUrl = `${SITE_URL}/comic/${id}`

  // The "more" rows inside the track sheet. Rendered here (server) and passed through.
  const sheetRows: SheetRow[] = [
    ...(user ? [{
      key: 'list',
      label: 'Add to list',
      hint: 'Put it on one of your reading lists',
      icon: <Bookmark size={16} className="text-dossier-foreground/72" />,
      content: <AddToListButton recommendationId={id} userId={user.id} inline />,
    }] : []),
    {
      key: 'collection',
      label: 'Add to collection',
      hint: 'Group it with other comics',
      icon: <Layers size={16} className="text-dossier-foreground/72" />,
      content: <AddToCollectionButton recommendationId={id} isLoggedIn={!!user} inline />,
    },
    {
      key: 'bake',
      label: 'Let it bake',
      hint: 'Stash chapters and get pinged later',
      icon: <Croissant size={16} className="text-dossier-foreground/72" />,
      content: (
        <BakeButton
          comicId={id}
          chapterCount={rec.chapter_count}
          isLoggedIn={!!user}
          isPro={currentUserIsPro}
          inline
        />
      ),
    },
    {
      key: 'report',
      label: 'Report',
      hint: 'Flag a problem with this page',
      icon: <Flag size={16} className="text-dossier-foreground/72" />,
      content: <ReportButton entityType="recommendation" entityId={id} isLoggedIn={!!user} asButton />,
    },
  ]

  const navItems: NavItem[] = [
    ...(user && myTracking.status ? [{ id: 'progress', label: 'Progress' }] : []),
    { id: 'details', label: 'Details' },
    ...(user ? [{ id: 'friends', label: 'Friends' }] : []),
    { id: 'reviews', label: 'Reviews' },
    { id: 'similar', label: 'Similar' },
  ]

  const sectionHeading =
    'font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.2em] text-dossier-foreground/65'

  return (
    <>
      <ComicJsonLd rec={rec} id={id} recommenderName={recommenderName} />

      <div className={`${display.variable} ${mono.variable} min-h-screen bg-dossier text-dossier-foreground`}>
        <TrackingProvider
          recommendationId={id}
          title={rec.title}
          totalChapters={rec.chapter_count}
          comicStatus={rec.status}
          signedIn={!!user}
          initial={{
            status:     myTracking.status,
            subStatus:  myTracking.subStatus,
            chapter:    myTracking.chapter,
            lastReadAt: myTracking.lastReadAt,
          }}
          initialRating={existingRating}
          initialMoments={myMoments}
          sheetRows={sheetRows}
        >
          <ComicHero
            title={rec.title}
            author={rec.author}
            artist={rec.artist}
            year={rec.year_released}
            typeLabel={typeStyle.label}
            typeBadgeClass={typeStyle.badge}
            gradientClass={typeStyle.gradient}
            statusLabel={statusMeta.label}
            contentRating={rec.content_rating}
            coverUrl={rec.cover_url}
            bannerUrl={rec.banner_url}
            isFeatured={!!rec.is_featured}
            chapterCount={rec.chapter_count}
            lastChapterAgo={rec.last_chapter_released_at ? timeAgo(rec.last_chapter_released_at) : null}
            description={rec.description}
            officialPlatforms={officialPlatforms}
            shareUrl={shareUrl}
          />

          <div className="max-w-3xl mx-auto px-4 md:px-6 mt-6 space-y-6 pb-[calc(170px+env(safe-area-inset-bottom,0px))] lg:pb-32">

            <div className="border-t border-dossier-foreground/10 pt-5">
              <RatingsHistogram breakdown={ratingBreakdown} upvotePct={upvotePct} voteCount={totalVotes} />
            </div>

            {/* The one place you log. Big, obvious, one tap. */}
            <div className="space-y-3">
              <TrackBar />
              <MomentStrip />
            </div>

            {/* Upvote / Downvote / Save: one panel, same on every screen size */}
            <div className="grid grid-cols-3 divide-x divide-dossier-foreground/15 overflow-hidden rounded-2xl border border-dossier-foreground/20 bg-dossier-panel/40">
              <VoteButtons
                variant="tiles"
                recommendationId={id}
                initialUpvotes={rec.upvotes ?? 0}
                initialDownvotes={rec.downvotes ?? 0}
                initialVote={userVote}
                isLoggedIn={!!user}
                comicTitle={rec.title}
              />
              <SaveButton
                variant="tile"
                recommendationId={id}
                initialSaved={isSaved}
                isLoggedIn={!!user}
                comicTitle={rec.title}
                count={rec.save_count ?? 0}
              />
            </div>

            <SectionNav items={navItems} />

            <ProgressStrip />

            {/* ── Details ── */}
            <section id="details" className="scroll-mt-20 space-y-5">
              <h2 className={sectionHeading}>Details</h2>

              {rec.why_recommend && (
                <div className={`rounded-2xl border ${typeStyle.border} bg-dossier-panel/40 p-5`}>
                  <p className={`${sectionHeading} mb-3`}>Why read this</p>
                  <p className="font-[family-name:var(--font-dossier-display)] italic text-lg leading-snug text-dossier-foreground/85">
                    &ldquo;{rec.why_recommend}&rdquo;
                  </p>
                </div>
              )}

              <TagList
                recommendationId={id}
                isLoggedIn={!!user}
                heading="Genres & Tags"
                leadingItems={(rec.genres ?? []).map(g => ({ label: g, href: `/browse?genre=${g}` }))}
              />

              <div className="flex items-stretch rounded-xl border border-dossier-foreground/10 bg-dossier-panel/40 divide-x divide-dossier-foreground/10 overflow-hidden">
                {stats.map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex-1 px-2 py-2.5 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <Icon size={12} className="text-dossier-foreground/65" />
                      <p className="font-[family-name:var(--font-mono)] text-lg font-bold tabular-nums leading-none text-dossier-foreground">
                        {value}
                      </p>
                    </div>
                    <p className="mt-1 text-[10px] uppercase tracking-widest text-dossier-foreground/65">{label}</p>
                  </div>
                ))}
              </div>

              <div id="sources" className="scroll-mt-20 space-y-5">
                <OfficialPlatforms platforms={officialPlatforms} />

                <div className="space-y-2">
                  <p className={sectionHeading}>Your reading sources</p>
                  <p className="text-[11px] text-dossier-foreground/65 -mt-1">
                    Personal links you&rsquo;ve saved. Prefer official platforms above when you can.
                  </p>
                  <MyReadingSources comicId={id} isLoggedIn={!!user} isPro={currentUserIsPro} />
                </div>
              </div>

              {readAheadPlatform && (
                <div className="rounded-2xl border border-dashed border-dossier-foreground/15 bg-dossier-panel/20 p-5 space-y-2">
                  <p className="font-[family-name:var(--font-dossier-display)] italic text-lg font-semibold text-dossier-foreground">
                    Read ahead on {readAheadPlatform.name}
                  </p>
                  <p className="text-sm text-dossier-foreground/80">
                    Get early access to upcoming chapters with {readAheadPlatform.name}&rsquo;s fast-pass system.
                  </p>
                  <a
                    href={readAheadPlatform.link ?? undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center px-4 h-9 rounded-xl border border-dossier-foreground/15 text-sm font-semibold text-dossier-foreground/80"
                  >
                    Open {readAheadPlatform.name}
                  </a>
                </div>
              )}

              {rec.more_info_link && (
                <MoreInfoSection
                  link={rec.more_info_link}
                  source={rec.more_info_link_source}
                  verifiedAt={rec.more_info_link_verified_at}
                />
              )}
            </section>

            {/* ── Friends ── */}
            {user && (
              <FriendsActivity
                events={friends.events}
                followsAnyone={friends.followsAnyone}
                myChapter={myTracking.chapter}
              />
            )}

            {/* ── Reviews ── */}
            <section id="reviews" className="scroll-mt-20 pt-2 border-t border-dossier-foreground/10 space-y-4">
              <h2 className={sectionHeading}>Reviews</h2>
              <ReviewSection
                recommendationId={id}
                currentUserId={user?.id ?? null}
                isLoggedIn={!!user}
                recommenderId={rec.user_id}
                currentUserRole={currentUserProfile?.role ?? null}
              />
            </section>

            {/* ── Similar ── */}
            <section id="similar" className="scroll-mt-20 pt-2 border-t border-dossier-foreground/10 space-y-4">
              <h2 className={sectionHeading}>Next reads</h2>
              <SimilarComics
                comicId={id}
                contentRating={rec.content_rating}
                showAdult={rec.content_rating === 'adult' || rec.content_rating === 'mature'}
                layout="scroll"
                hideHeading
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

            <div className="rounded-2xl border border-dashed border-dossier-foreground/15 bg-dossier-panel/20 p-5">
              <SubmitYourOwnButton isLoggedIn={!!user} submitRoute={submitRoute} comicId={id} />
            </div>

            {/* ── Recommender ── */}
            {!isGhostRec && profile ? (
              <div className="rounded-2xl border border-dossier-foreground/10 bg-dossier-panel/40 p-5">
                <p className={`${sectionHeading} mb-3`}>Recommender</p>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {profile.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt=""
                        className="h-10 w-10 rounded-full border border-dossier-foreground/10 object-cover shrink-0"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full border border-dossier-foreground/10 bg-dossier flex items-center justify-center text-xs font-bold text-dossier-foreground/65 shrink-0">
                        {recommenderName.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium truncate text-dossier-foreground">{recommenderName}</p>
                      {profile.username && (
                        <p className="font-[family-name:var(--font-mono)] font-medium text-[11px] text-dossier-foreground/65 truncate">
                          @{profile.username}
                        </p>
                      )}
                    </div>
                  </div>
                  {(recommenderIsVerified || recommenderIsPro) && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      {recommenderIsVerified && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-dossier-foreground/15 text-dossier-foreground/80">
                          Verified
                        </span>
                      )}
                      {recommenderIsPro && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-amber-500/30 text-amber-400">
                          Pro
                        </span>
                      )}
                    </div>
                  )}
                </div>
                {profile.username && (
                  <Link
                    href={profile.user_type === 'creator' ? `/creator/${profile.username}` : `/profile/${profile.username}`}
                    className="mt-3 flex items-center justify-center w-full h-8 rounded-[10px] border border-dossier-foreground/10 bg-dossier/60 font-[family-name:var(--font-mono)] font-medium text-[11px] text-dossier-foreground/88 hover:text-dossier-foreground hover:border-dossier-foreground/30 transition-colors"
                  >
                    View profile →
                  </Link>
                )}
                <p className="mt-3 text-right font-[family-name:var(--font-mono)] font-medium text-[11px] text-dossier-foreground/60">
                  {rec.created_at ? formatDate(rec.created_at) : ''}
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-between py-4 border-t border-dossier-foreground/10 text-xs text-dossier-foreground/65">
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
                <span className="font-[family-name:var(--font-mono)] font-medium">{rec.created_at ? formatDate(rec.created_at) : ''}</span>
              </div>
            )}
          </div>
          <ActionDock />
        </TrackingProvider>
      </div>
    </>
  )
}