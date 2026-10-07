import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  CalendarDays, BookOpen, Star, ThumbsUp,
  Globe, Users, Pin, ArrowRight, PenLine, Sparkles,
} from 'lucide-react'
import { formatDate } from '@/lib/utils/format'
import type { Recommendation } from '@/types/app.types'
import { getDashboardRoutes } from '@/lib/utils/routes'
import type { Metadata } from 'next'
import { FollowButton } from '@/components/user/FollowButton'
import { ComicCard } from '@/components/recommendations/ComicCard'
import { ProAvatar } from '@/components/pro/ProAvatar'
import { ProBadge } from '@/components/pro/ProBadge'
import { VerifiedBadge } from '@/components/pro/VerifiedBadge'
import { Button } from '@/components/ui/button'
import { TasteTags } from '@/components/profile/TasteTags'
import { MangaDNACard } from '@/components/profile/MangaDNACard'
import { CurrentlyObsessedCard } from '@/components/profile/CurrentlyObsessedCard'
import { QuoteScrapbook } from '@/components/profile/QuoteScrapbook'
import { ReadingSignals } from '@/components/profile/ReadingSignals'
import { MemoryWall } from '@/components/profile/MemoryWall'
import { ProfileBadges } from '@/components/profile/ProfileBadges'
import { ProfileTabs } from '@/components/profile/ProfileTabs'
import { PinnedFavoritesEditor } from '@/components/profile/PinnedFavoritesEditor'
import { getProfileExtras } from '@/lib/profile/getProfileExtras'
import { getSuggestedMatches } from '@/lib/taste/getSuggestedMatches'
import { isProUser, isPatronUser, isAdmin as isAdminCheck } from '@/lib/access'
import { Suspense } from 'react'

const GHOST_ID = '00000000-0000-0000-0000-000000000000'

const proxyCover = (url: string | null): string => {
  if (!url) return ''
  if (url.startsWith('/') || url.startsWith('blob:')) return url
  return `/api/image-proxy?url=${encodeURIComponent(url)}`
}

interface Props {
  params:       Promise<{ username: string }>
  searchParams: Promise<{ tab?: string }>
}

interface ProfileData {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  website: string | null
  role: string
  is_banned: boolean
  member_since: string
  total_recommendations: number | null
  total_reviews: number | null
  total_votes_received: number | null
  favorite_genres: string[] | null
  favorite_platforms: string[] | null
  is_pro: boolean | null
  pro_expires_at: string | null
  is_patron: boolean | null
  patron_expires_at: string | null
  profile_theme: string | null
  verified_recommender: boolean | null
  pinned_recommendation_id: string | null
  pinned_favorite_ids: string[] | null
  current_streak: number
  longest_streak: number
}

interface ReadingList {
  id: string
  name: string
  description: string | null
  is_public: boolean
  item_count: number
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params
  return { title: `@${username}` }
}

const GENRE_COLORS: Record<string, string> = {
  Action:           'bg-red-500/10    text-red-500    border-red-500/20',
  Adventure:        'bg-orange-500/10 text-orange-500 border-orange-500/20',
  Comedy:           'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  Drama:            'bg-orange-600/10 text-orange-600 border-orange-600/20',
  Fantasy:          'bg-violet-500/10 text-violet-500 border-violet-500/20',
  Horror:           'bg-zinc-500/10   text-zinc-400   border-zinc-500/20',
  Mystery:          'bg-slate-500/10  text-slate-400  border-slate-500/20',
  Romance:          'bg-pink-500/10   text-pink-500   border-pink-500/20',
  'Sci-Fi':         'bg-cyan-500/10   text-cyan-500   border-cyan-500/20',
  'Slice of Life':  'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  Sports:           'bg-amber-500/10  text-amber-500  border-amber-500/20',
  Supernatural:     'bg-purple-500/10 text-purple-500 border-purple-500/20',
  Thriller:         'bg-red-700/10    text-red-600    border-red-700/20',
  Isekai:           'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
  'Martial Arts':   'bg-rose-600/10   text-rose-600   border-rose-600/20',
  'School Life':    'bg-sky-500/10    text-sky-500    border-sky-500/20',
  Historical:       'bg-stone-500/10  text-stone-400  border-stone-500/20',
  Psychological:    'bg-fuchsia-500/10 text-fuchsia-500 border-fuchsia-500/20',
  Shounen:          'bg-blue-500/10   text-blue-500   border-blue-500/20',
  Shoujo:           'bg-pink-400/10   text-pink-400   border-pink-400/20',
  Seinen:           'bg-zinc-600/10   text-zinc-400   border-zinc-600/20',
  Josei:            'bg-rose-400/10   text-rose-400   border-rose-400/20',
  Yuri:             'bg-purple-400/10 text-purple-400 border-purple-400/20',
  Yaoi:             'bg-indigo-400/10 text-indigo-400 border-indigo-400/20',
  Mecha:            'bg-teal-500/10   text-teal-500   border-teal-500/20',
}

const DEFAULT_GENRE_COLOR = 'bg-muted text-muted-foreground border-border'

export default async function ProfilePage({ params, searchParams }: Props) {
  const { username } = await params
  const { tab: tabParam } = await searchParams
  const activeTab =
    tabParam === 'lists' || tabParam === 'taste' || tabParam === 'journal'
      ? tabParam
      : 'recommendations'

  const supabase = await createClient()

  const { data: { user: viewer } } = await supabase.auth.getUser()

  const { data: profileData } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username.toLowerCase())
    .single()

  if (!profileData) notFound()

  if ((profileData as any).user_type === 'creator') {
    const { redirect } = await import('next/navigation')
    redirect(`/creator/${username}`)
  }

  const profile: ProfileData = {
    ...(profileData as any),
    is_pro:                   (profileData as any).is_pro ?? false,
    pro_expires_at:           (profileData as any).pro_expires_at ?? null,
    is_patron:                (profileData as any).is_patron ?? false,
    patron_expires_at:        (profileData as any).patron_expires_at ?? null,
    profile_theme:            (profileData as any).profile_theme ?? 'default',
    verified_recommender:     (profileData as any).verified_recommender ?? false,
    pinned_recommendation_id: (profileData as any).pinned_recommendation_id ?? null,
    pinned_favorite_ids:      (profileData as any).pinned_favorite_ids ?? [],
    favorite_genres:          (profileData as any).favorite_genres ?? [],
  }

  const isGhost  = profile.id === GHOST_ID
  const isOwner  = viewer?.id === profile.id && !isGhost
  // Fixed: was hand-rolled `is_pro && not-expired`/`role === 'admin'` with
  // no patron awareness in isPro, and isPatron computed separately with
  // its own hand-rolled expiry check. isProUser()/isPatronUser()/
  // isAdminCheck() from @/lib/access are the real SSOT and already handle
  // admin-implies-everything + patron-implies-pro correctly.
  const isPro    = isProUser(profile)
  const isPatron = isPatronUser(profile)
  const isAdmin  = isAdminCheck(profile)
  const showGold = isPro && !isAdmin

  // ── Owner dashboard routes — aware of user_type and pro status ──────────────
  const ownerRoutes = getDashboardRoutes(
    (profileData as any)?.user_type === 'creator' ? 'creator' : 'reader',
    isPro
  )

  if (viewer?.id && viewer.id !== profile.id && !isGhost) {
    try {
      await (supabase as any).rpc('track_profile_view', {
        p_profile_id: profile.id,
        p_viewer_id:  viewer.id,
      })
    } catch { /* Non-critical */ }
  }

  let pinnedRec: Recommendation | null = null
  if (profile.pinned_recommendation_id) {
    const { data: pinned } = await (supabase as any)
      .from('recommendations')
      .select('*')
      .eq('id', profile.pinned_recommendation_id)
      .eq('is_approved', true)
      .maybeSingle()
    pinnedRec = (pinned as Recommendation) ?? null
  }

  // ── Item #5: pinned favorites grid data ─────────────────────────────
  // Resolve the actual pinned comics (for display) and, if this is the
  // owner's own profile, the full candidate pool (saves + own recs) for
  // the editor to pick new pins from.
  let pinnedFavorites: { id: string; title: string; cover_url: string | null }[] = []
  let favoriteCandidates: { id: string; title: string; cover_url: string | null }[] = []

  if (!isGhost && profile.pinned_favorite_ids && profile.pinned_favorite_ids.length > 0) {
    const { data: favData } = await supabase
      .from('recommendations')
      .select('id, title, cover_url')
      .in('id', profile.pinned_favorite_ids)

    // Preserve the stored order — .in() doesn't guarantee it.
    const byId = new Map((favData ?? []).map((r: any) => [r.id, r]))
    pinnedFavorites = profile.pinned_favorite_ids
      .map(id => byId.get(id))
      .filter((r): r is any => !!r)
  }

  if (isOwner && !isGhost) {
    const [{ data: savedRows }, { data: ownRecs }] = await Promise.all([
      supabase
        .from('saves')
        .select('recommendations(id, title, cover_url)')
        .eq('user_id', profile.id)
        .limit(50),
      supabase
        .from('recommendations')
        .select('id, title, cover_url')
        .eq('user_id', profile.id)
        .eq('is_approved', true)
        .limit(50),
    ])

    const savedComics = (savedRows ?? [])
      .map((r: any) => r.recommendations)
      .filter(Boolean)

    const seen = new Set<string>()
    favoriteCandidates = [...savedComics, ...(ownRecs ?? [])].filter((c: any) => {
      if (seen.has(c.id)) return false
      seen.add(c.id)
      return true
    })
  }

  let recQuery = supabase
    .from('recommendations')
    .select('*')
    .eq('user_id', profile.id)
    .eq('is_approved', true)
    .not('content_rating', 'in', '("adult","mature")')
    .order('created_at', { ascending: false })
    .limit(18)

  if (profile.pinned_recommendation_id) {
    recQuery = recQuery.neq('id', profile.pinned_recommendation_id)
  }

  const totalRecsQuery = (supabase as any)
    .from('recommendations')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', profile.id)
    .eq('is_approved', true)
    .not('content_rating', 'in', '("adult","mature")')

  const [
    { data: recData },
    { count: totalRecsCount },
    { data: listsData },
    { count: followersCount },
    { count: followingCount },
    { data: isFollowingData },
  ] = await Promise.all([
    recQuery,
    totalRecsQuery,
    isGhost
      ? Promise.resolve({ data: [] })
      : supabase
          .from('reading_lists')
          .select('id, name, description, is_public')
          .eq('user_id', profile.id)
          .eq('is_public', true)
          .order('created_at', { ascending: false })
          .limit(6),
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', profile.id),
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', profile.id),
    viewer && !isOwner && !isGhost
      ? supabase.from('follows').select('id').eq('follower_id', viewer.id).eq('following_id', profile.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  let completedSeriesCount = 0
  if (!isGhost) {
    const { data: userListIds } = await (supabase as any)
      .from('reading_lists')
      .select('id')
      .eq('user_id', profile.id)

    if (userListIds && (userListIds as any[]).length > 0) {
      const listIds = (userListIds as any[]).map((l: any) => l.id)
      const { count } = await supabase
        .from('reading_list_items')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed')
        .in('list_id', listIds)
      completedSeriesCount = count ?? 0
    }
  }

  const extras = isGhost
    ? null
    : await getProfileExtras(supabase, profile.id, { includeJournal: activeTab === 'journal' })

  // ── Taste compatibility — now sourced from the confidence-scored vector
  // pipeline (user_compatibility_scores) instead of the old client-side
  // Jaccard/engagement widget. Only meaningful between two distinct
  // logged-in users viewing each other, same guard conditions as before.
  let viewerMatch: Awaited<ReturnType<typeof getSuggestedMatches>>[number] | null = null
  if (viewer && viewer.id !== profile.id && !isGhost) {
    const { data: viewerProfileForPro } = await supabase
      .from('profiles')
      .select('role, is_pro, pro_expires_at, is_patron, patron_expires_at')
      .eq('id', viewer.id)
      .maybeSingle()

    // Fixed: was hand-rolled `is_pro && not-expired` with no admin/patron
    // fallback — an admin viewing someone else's profile would never see
    // Pro-tier match behavior. Uses the SSOT now.
    const viewerIsPro = viewerProfileForPro ? isProUser(viewerProfileForPro as any) : false

    // Pull the viewer's full match list and find this specific profile in
    // it, rather than a dedicated one-off query — reuses the same
    // precomputed table and confidence logic /matches already relies on.
    const matches = await getSuggestedMatches(supabase, viewer.id, viewerIsPro)
    viewerMatch = matches.find(m => m.userId === profile.id) ?? null
  }

  const recommendations = (recData ?? []) as Recommendation[]
  const isFollowing     = !!isFollowingData
  const totalRecs       = totalRecsCount ?? 0
  const gridRecs        = recommendations.slice(0, 6)
  const hasMore         = totalRecs > 6

  const lists: ReadingList[] = isGhost ? [] : await Promise.all(
    (listsData ?? []).map(async (list: any) => {
      const [{ count }, { data: coverItems }] = await Promise.all([
        supabase.from('reading_list_items').select('*', { count: 'exact', head: true }).eq('list_id', list.id),
        supabase.from('reading_list_items').select('recommendations(cover_url)').eq('list_id', list.id).limit(4),
      ])
      const coverUrls = (coverItems ?? []).map((i: any) => i.recommendations?.cover_url).filter(Boolean) as string[]
      return { ...list, item_count: count ?? 0, _cover_urls: coverUrls }
    })
  )

  const initials       = (profile.display_name || profile.username).slice(0, 2).toUpperCase()
  const favoriteGenres = Array.isArray(profile.favorite_genres) ? profile.favorite_genres : []

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-6">

      {/* ── PROFILE CARD ── */}
      <div className={`relative rounded-2xl overflow-hidden border ${
        isGhost  ? 'border-indigo-500/30' :
        showGold ? 'border-amber-500/30'  :
                   'border-border'
      } bg-card shadow-sm`}>

        {/* Banner */}
        <div className="relative h-28 md:h-36 overflow-hidden">
          <div className={`absolute inset-0 ${
            isGhost
              ? 'bg-gradient-to-br from-indigo-900/60 via-slate-800/40 to-violet-900/30'
              : showGold
              ? 'bg-gradient-to-br from-amber-500/30 via-orange-500/15 to-transparent'
              : 'bg-gradient-to-br from-primary/20 via-primary/5 to-transparent'
          }`} />
          {isGhost && (
            <>
              <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 15% 60%, #4f46e5 0%, transparent 45%), radial-gradient(circle at 85% 25%, #7c3aed 0%, transparent 40%), radial-gradient(circle at 50% 90%, #2563eb 0%, transparent 35%)' }} />
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(rgba(99,102,241,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.4) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
            </>
          )}
          {showGold && !isGhost && (
            <>
              <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, #f59e0b 0%, transparent 50%), radial-gradient(circle at 80% 30%, #ea580c 0%, transparent 40%)' }} />
              <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" />
            </>
          )}
          {!isGhost && !showGold && (
            <div className="absolute inset-0 opacity-15" style={{ backgroundImage: 'radial-gradient(circle at 20% 60%, var(--color-primary) 0%, transparent 50%), radial-gradient(circle at 80% 30%, var(--color-primary) 0%, transparent 40%)' }} />
          )}
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-card to-transparent" />
        </div>

        {/* Card body */}
        <div className="px-5 pb-5 -mt-12 relative">

          {/* Avatar + action row */}
          <div className="flex items-end justify-between gap-3 mb-3">
            <div className={`relative shrink-0 rounded-full p-[3px] ${
              isGhost  ? 'bg-gradient-to-br from-indigo-500 to-violet-600' :
              isAdmin  ? 'bg-gradient-to-br from-primary to-primary/60'    :
              showGold ? 'bg-gradient-to-br from-amber-400 to-orange-500'  :
                         'bg-gradient-to-br from-border to-border'
            } shadow-lg`}>
              <ProAvatar
                src={profile.avatar_url}
                fallback={initials}
                size="xl"
                isPro={isPro}
                isAdmin={isAdmin}
                className="border-2 border-card"
              />
            </div>

            <div className="flex items-center gap-2 pb-1 shrink-0">
              {isGhost && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 text-xs font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                  The Archivist
                </div>
              )}
              {!isOwner && !isGhost && viewer && (
                <FollowButton profileId={profile.id} initialFollowing={isFollowing} isLoggedIn={!!viewer} />
              )}
              {isOwner && (
                <Link href={ownerRoutes.settings}>
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">Edit Profile</Button>
                </Link>
              )}
            </div>
          </div>

          {/* Name + badges */}
          <div className="mb-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-black tracking-tight leading-tight">
                {profile.display_name || profile.username}
              </h1>
              <ProBadge role={profile.role} isPro={isPro} />
              {profile.verified_recommender && <VerifiedBadge />}
            </div>
            <p className="text-sm text-muted-foreground">@{profile.username}</p>
          </div>

          {profile.bio && (
            <p className="text-sm leading-relaxed text-muted-foreground mb-3 max-w-lg">{profile.bio}</p>
          )}

          {profile.website && !isGhost && (
            <a href={profile.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline mb-3">
              <Globe size={11} />
              {profile.website.replace(/^https?:\/\//, '')}
            </a>
          )}

          {/* ── Unified stat strip (replaces scattered inline stats) ──
              Fixed 5-column grid, not scrollable — a stat strip is meant
              to be read at a glance, not swiped through. Fit fixed by:
              tighter gap-1, no uppercase/tracking-wide (letter-spacing
              was pushing "FOLLOWERS" past its column at narrow widths),
              and min-w-0 + truncate as a safety net so a label never
              forces the grid wider than the card. */}
          {!isGhost && (
            <div className="mb-4 p-3 rounded-xl bg-muted/40 border border-border space-y-2">
              <div className="grid grid-cols-5 gap-1">
                {[
                  { label: 'Followers', value: followersCount ?? 0 },
                  { label: 'Following', value: followingCount ?? 0 },
                  { label: 'Recs',      value: totalRecs },
                  { label: 'Completed', value: completedSeriesCount },
                  { label: 'Reviews',   value: profile.total_reviews ?? 0 },
                ].map(stat => (
                  <div key={stat.label} className="min-w-0 text-center">
                    <p className="text-sm sm:text-base font-black tabular-nums">{stat.value}</p>
                    <p className="text-[8px] sm:text-[9px] text-muted-foreground font-medium leading-tight truncate px-0.5">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
              <p className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground pt-1 border-t border-border/60">
                <CalendarDays size={10} className="text-primary/60" />
                Joined {formatDate(profile.member_since)}
              </p>
            </div>
          )}

          {isGhost && (
            <div className="flex items-center gap-4 mb-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <BookOpen size={11} className="text-primary/60" />
                <strong className="text-foreground font-black">{totalRecs}</strong> archived
              </span>
            </div>
          )}

          {/* ── Item #5: Top-3 pinned favorites grid ──
              Owner sees the editable picker (Pro/Patron/Admin — enforced
              server-side by the API route; free owners see the grid with
              locked/empty slots and an upgrade nudge instead of the picker).
              Visitors just see whatever's pinned, or nothing at all. */}
          {!isGhost && (isOwner || pinnedFavorites.length > 0) && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Pin size={12} className="text-primary" />
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  {isOwner ? 'Your Favorites' : 'Favorites'}
                </p>
              </div>
              {isOwner ? (
                (isPro || isPatron || isAdmin) ? (
                  <PinnedFavoritesEditor
                    initialPinnedIds={profile.pinned_favorite_ids ?? []}
                    candidates={favoriteCandidates}
                  />
                ) : (
                  <div className="grid grid-cols-3 gap-3">
                    {[0, 1, 2].map(slot => (
                      <Link
                        key={slot}
                        href="/pricing"
                        className="aspect-[2/3] rounded-xl border border-dashed border-amber-500/30 bg-amber-500/5 flex flex-col items-center justify-center gap-1.5 text-amber-600 hover:bg-amber-500/10 transition-colors"
                      >
                        <Pin size={14} />
                        <span className="text-[9px] font-bold text-center px-1">Pro feature</span>
                      </Link>
                    ))}
                  </div>
                )
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {pinnedFavorites.map(comic => (
                    <Link
                      key={comic.id}
                      href={`/comic/${comic.id}`}
                      className="group aspect-[2/3] rounded-xl overflow-hidden border border-border bg-muted relative"
                    >
                      {comic.cover_url ? (
                        <img
                          src={proxyCover(comic.cover_url)}
                          alt={comic.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <BookOpen size={18} className="text-muted-foreground opacity-40" />
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                        <p className="text-white text-[10px] font-bold line-clamp-2">{comic.title}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Genres */}
          {favoriteGenres.length > 0 && !isGhost && (
            <div className="mb-3 space-y-2">
              <div className="flex flex-wrap gap-1.5">
                {favoriteGenres.map((genre: string) => (
                  <Link key={genre} href={`/browse?genre=${encodeURIComponent(genre)}`}>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border transition-all hover:scale-105 cursor-pointer ${GENRE_COLORS[genre] ?? DEFAULT_GENRE_COLOR}`}>
                      {genre}
                    </span>
                  </Link>
                ))}
              </div>
              <TasteTags genres={favoriteGenres} compact />
            </div>
          )}

          {/* Taste Compatibility — confidence-scored match, same
              soft/high display logic as /matches and the feed sidebar
              widget, so this number always agrees with those surfaces. */}
          {viewerMatch && (
            <div className="mb-3">
              <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-muted/50 border border-border text-xs">
                <Sparkles size={14} className={viewerMatch.confidenceTier === 'high' ? 'text-emerald-500' : 'text-amber-500'} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`font-black ${viewerMatch.confidenceTier === 'high' ? 'text-emerald-500' : 'text-amber-500'}`}>
                      {viewerMatch.confidenceTier === 'high' ? `${viewerMatch.similarityPct}%` : `~${viewerMatch.similarityPct}%`} taste match
                    </span>
                    {viewerMatch.confidenceTier === 'medium' && (
                      <>
                        <span className="text-muted-foreground">·</span>
                        <span className="text-muted-foreground">still learning their taste</span>
                      </>
                    )}
                  </div>
                  {viewerMatch.sharedGenres.length > 0 && (
                    <p className="text-muted-foreground/70 mt-0.5 truncate">
                      Both like {viewerMatch.sharedGenres.join(', ')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <ProfileBadges
            approvedRecs={totalRecs}
            totalReviews={profile.total_reviews ?? 0}
            totalVotes={profile.total_votes_received ?? 0}
            completedSeries={completedSeriesCount ?? 0}
            verifiedRecommender={profile.verified_recommender ?? false}
            isPro={isPro || isAdmin}
            isGhost={isGhost}
          />

          {isGhost && (
            <p className="text-xs text-indigo-400/70 italic leading-relaxed max-w-md mt-2">
              An archivist of forgotten recommendations. Comics submitted here live on even when their recommenders are gone.
            </p>
          )}
        </div>
      </div>

      {/* ── Tabbed content ── */}
      {!isGhost && (
        <Suspense>
          <ProfileTabs username={profile.username} />
        </Suspense>
      )}

      {(isGhost || activeTab === 'recommendations') && (
        <>
          {!isGhost && extras?.obsessed && (
            <CurrentlyObsessedCard
              data={extras.obsessed}
              currentStreak={profile.current_streak ?? 0}
              longestStreak={profile.longest_streak ?? 0}
              totalChaptersRead={extras.totalChaptersRead}
              showGold={showGold}
            />
          )}
          {!isGhost && extras?.quote && <QuoteScrapbook quote={extras.quote} />}

          {pinnedRec && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Pin size={14} className="text-amber-500" />
                <h2 className="text-sm font-black text-amber-600 uppercase tracking-wider">Pinned</h2>
              </div>
              <div className={`rounded-2xl border ${showGold ? 'border-amber-500/30 bg-amber-500/5' : 'border-border bg-card'} overflow-hidden`}>
                <div className="flex gap-4 p-4">
                  <div className="w-20 h-28 sm:w-24 sm:h-32 rounded-xl overflow-hidden bg-muted shrink-0 shadow-sm">
                    {pinnedRec.cover_url
                      ? <img src={proxyCover(pinnedRec.cover_url)} alt={pinnedRec.title} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center"><BookOpen size={20} className="text-muted-foreground opacity-40" /></div>
                    }
                  </div>
                  <div className="flex-1 min-w-0 space-y-2 py-1">
                    <div>
                      <Link href={`/comic/${pinnedRec.id}`} className="font-black text-base hover:text-primary transition-colors line-clamp-2 leading-tight">
                        {pinnedRec.title}
                      </Link>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border bg-primary/10 text-primary border-primary/20 capitalize">{pinnedRec.type}</span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize ${
                          pinnedRec.status === 'ongoing'   ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                          pinnedRec.status === 'completed' ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' :
                          pinnedRec.status === 'hiatus'    ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
                          'bg-muted text-muted-foreground border-border'
                        }`}>{pinnedRec.status}</span>
                      </div>
                    </div>
                    {pinnedRec.description && (
                      <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">{pinnedRec.description}</p>
                    )}
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1"><ThumbsUp size={10} className="text-emerald-500" />{pinnedRec.upvotes ?? 0}</span>
                      <span className="flex items-center gap-1"><Star size={10} className="text-amber-500" />{pinnedRec.review_count ?? 0}</span>
                    </div>
                    <Link href={`/comic/${pinnedRec.id}`} className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                      View comic <ArrowRight size={11} />
                    </Link>
                  </div>
                </div>
              </div>
            </section>
          )}

          {gridRecs.length > 0 ? (
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black">{isGhost ? 'Archived Recommendations' : 'Recent Recommendations'}</h2>
                <div className={`h-0.5 flex-1 bg-gradient-to-r ${isGhost ? 'from-indigo-500/40' : showGold ? 'from-amber-500/40' : 'from-primary/40'} to-transparent`} />
                {hasMore && (
                  <Link href={`/profile/${profile.username}/recommendations`} className="flex items-center gap-1 text-xs font-bold text-primary hover:underline shrink-0">
                    See all {totalRecs}<ArrowRight size={12} />
                  </Link>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {gridRecs.map((rec) => <ComicCard key={rec.id} recommendation={rec} />)}
              </div>
              {hasMore && (
                <Link href={`/profile/${profile.username}/recommendations`} className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl border border-border hover:border-primary/40 hover:bg-primary/5 text-sm font-semibold text-muted-foreground hover:text-primary transition-all duration-200">
                  See all {totalRecs} recommendations<ArrowRight size={14} />
                </Link>
              )}
            </section>
          ) : (
            <div className="relative flex flex-col items-center justify-center py-16 rounded-2xl border border-dashed border-border overflow-hidden">
              <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
              <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
              <div className="relative mb-6 w-36 h-36 mx-auto">
                <div className="absolute top-0 left-0 w-20 h-28 rounded-2xl border-2 border-border bg-card rotate-[-12deg] opacity-40" />
                <div className="absolute top-2 left-6 w-20 h-28 rounded-2xl border-2 border-border bg-card rotate-[-5deg] opacity-60" />
                <div className="absolute top-4 left-10 w-20 h-28 rounded-2xl border-2 border-primary/30 bg-card shadow-xl flex flex-col items-center justify-center gap-1">
                  <BookOpen size={18} className="text-primary opacity-60" />
                  <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest text-center px-1">{isGhost ? 'Archive' : 'Empty'}</span>
                </div>
              </div>
              <p className="font-black text-sm">{isGhost ? 'The archive is empty' : 'No recommendations yet'}</p>
              <p className="text-xs text-muted-foreground mt-1 text-center px-4">
                {isGhost
                  ? 'Comics find their way here when their recommenders move on. More always arrive.'
                  : isOwner
                  ? 'Share a comic you love and help the community find their next read.'
                  : `@${profile.username} hasn't shared any recommendations yet.`
                }
              </p>
              {isOwner && !isGhost && (
                <Link href={ownerRoutes.newRec} className="mt-5">
                  <Button size="sm" className="gap-2"><PenLine size={13} />Submit your first rec</Button>
                </Link>
              )}
            </div>
          )}
        </>
      )}

      {!isGhost && activeTab === 'lists' && (
        lists.length > 0 ? (
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black">Reading Lists</h2>
              <div className="h-0.5 flex-1 bg-gradient-to-r from-primary/40 to-transparent" />
              <span className="text-xs text-muted-foreground shrink-0">{lists.length} public</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {lists.map((list, idx) => {
                const THEME_GRAD: Record<number, string> = {
                  0: 'from-primary/60 via-primary/20 to-primary/5',
                  1: 'from-violet-500/60 via-violet-500/20 to-violet-500/5',
                  2: 'from-rose-500/60 via-rose-500/20 to-rose-500/5',
                  3: 'from-amber-500/60 via-amber-500/20 to-amber-500/5',
                  4: 'from-emerald-500/60 via-emerald-500/20 to-emerald-500/5',
                  5: 'from-indigo-500/60 via-indigo-500/20 to-indigo-500/5',
                }
                const THEME_BORDER: Record<number, string> = {
                  0: 'border-primary/30',     1: 'border-violet-500/30',
                  2: 'border-rose-500/30',    3: 'border-amber-500/30',
                  4: 'border-emerald-500/30', 5: 'border-indigo-500/30',
                }
                const THEME_ACCENT: Record<number, string> = {
                  0: 'text-primary',     1: 'text-violet-400',
                  2: 'text-rose-400',    3: 'text-amber-400',
                  4: 'text-emerald-400', 5: 'text-indigo-400',
                }
                const ti       = idx % 6
                const covers   = (list as any)._cover_urls ?? []
                const dominant = covers[0] ?? null
                const stack    = covers.slice(1, 3)

                return (
                  <Link key={list.id} href={`/lists/${list.id}`}
                    className={`group relative rounded-2xl border overflow-hidden h-36 cursor-pointer ${THEME_BORDER[ti]}`}
                  >
                    <div className="absolute inset-0">
                      {dominant
                        ? <img src={`/api/image-proxy?url=${encodeURIComponent(dominant)}`} alt="" className="absolute inset-0 w-full h-full object-cover" aria-hidden />
                        : <div className={`absolute inset-0 bg-gradient-to-br ${THEME_GRAD[ti]}`} />
                      }
                    </div>
                    {stack.length > 0 && (
                      <div className="absolute bottom-10 right-2 flex items-end z-10">
                        {stack.map((url: string, i: number) => (
                          <div key={i} className="relative rounded-lg overflow-hidden border-2 border-black/40 shadow-xl"
                            style={{
                              width: 28 - i * 4, height: 38 - i * 5,
                              marginLeft: i === 0 ? 0 : -8,
                              zIndex: stack.length - i,
                              opacity: 1 - i * 0.15,
                              transform: `rotate(${i % 2 === 0 ? 5 : -4}deg) translateY(${i * 2}px)`,
                            }}>
                            <img src={`/api/image-proxy?url=${encodeURIComponent(url)}`} alt="" className="w-full h-full object-cover" aria-hidden />
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10" />
                    <div className="absolute top-2 left-2 z-20">
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-black/40 text-emerald-400 border border-emerald-500/30 backdrop-blur-sm">
                        <Globe size={7} /> Public
                      </span>
                    </div>
                    {list.item_count > 0 && (
                      <div className="absolute top-2 right-2 z-20">
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-black/40 backdrop-blur-sm border border-white/10 ${THEME_ACCENT[ti]}`}>
                          <BookOpen size={7} /> {list.item_count}
                        </span>
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 z-20 p-2.5 space-y-1">
                      <p className="text-white font-black text-xs leading-snug line-clamp-2 drop-shadow-md">{list.name}</p>
                      {list.description && <p className="text-white/60 text-[9px] line-clamp-1">{list.description}</p>}
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 rounded-2xl border border-dashed border-border text-center space-y-2">
            <Globe size={24} className="text-muted-foreground opacity-40" />
            <p className="font-black text-sm">No public reading lists</p>
            <p className="text-xs text-muted-foreground">
              {isOwner ? 'Make a reading list public to show it here.' : `@${profile.username} hasn't shared any public lists yet.`}
            </p>
          </div>
        )
      )}

      {!isGhost && activeTab === 'journal' && (
        <MemoryWall items={extras?.journal ?? []} isOwner={isOwner} username={profile.username} />
      )}

      {!isGhost && activeTab === 'taste' && (
        <section className="space-y-4">
          {favoriteGenres.length > 0 ? (
            <MangaDNACard
              username={profile.username}
              displayName={profile.display_name || profile.username}
              avatarUrl={profile.avatar_url}
              genres={favoriteGenres}
              isPro={isPro || isAdmin}
              isOwner={isOwner}
              radarMode
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-16 rounded-2xl border border-dashed border-border text-center space-y-2">
              <Sparkles size={24} className="text-muted-foreground opacity-40" />
              <p className="font-black text-sm">No taste data yet</p>
              <p className="text-xs text-muted-foreground">
                {isOwner ? 'Pick your favorite genres in settings to build your Manga DNA.' : `@${profile.username} hasn't set up their taste profile yet.`}
              </p>
            </div>
          )}
          {extras?.signals && <ReadingSignals signals={extras.signals} />}
        </section>
      )}
    </div>
  )
}