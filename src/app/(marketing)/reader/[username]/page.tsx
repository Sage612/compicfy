import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import {
  CalendarDays, BookOpen, Star, ThumbsUp,
  Globe, BookMarked, Users, Pin, ArrowRight, PenLine,
} from 'lucide-react'
import { formatDate } from '@/lib/utils/format'
import type { Recommendation } from '@/types/database.types'
import type { Metadata } from 'next'
import { FollowButton } from '@/components/user/FollowButton'
import { ComicCard } from '@/components/recommendations/ComicCard'
import { ProAvatar } from '@/components/pro/ProAvatar'
import { ProBadge } from '@/components/pro/ProBadge'
import { VerifiedBadge } from '@/components/pro/VerifiedBadge'
import { Button } from '@/components/ui/button'
import { TasteTags } from '@/components/profile/TasteTags'
import { TasteCompatibility } from '@/components/profile/TasteCompatibility'
import { ProfileShelf } from '@/components/profile/ProfileShelf'
import { MangaDNACard } from '@/components/profile/MangaDNACard'
import { ProfileBadges } from '@/components/profile/ProfileBadges'

const GHOST_ID = '00000000-0000-0000-0000-000000000000'

interface Props {
  params: Promise<{ username: string }>
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
  profile_theme: string | null
  verified_recommender: boolean | null
  pinned_recommendation_id: string | null
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
  Action:         'bg-red-500/10    text-red-500    border-red-500/20',
  Adventure:      'bg-orange-500/10 text-orange-500 border-orange-500/20',
  Comedy:         'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  Drama:          'bg-orange-600/10 text-orange-600 border-orange-600/20',
  Fantasy:        'bg-violet-500/10 text-violet-500 border-violet-500/20',
  Horror:         'bg-zinc-500/10   text-zinc-400   border-zinc-500/20',
  Mystery:        'bg-slate-500/10  text-slate-400  border-slate-500/20',
  Romance:        'bg-pink-500/10   text-pink-500   border-pink-500/20',
  'Sci-Fi':       'bg-cyan-500/10   text-cyan-500   border-cyan-500/20',
  'Slice of Life':'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  Sports:         'bg-amber-500/10  text-amber-500  border-amber-500/20',
  Supernatural:   'bg-purple-500/10 text-purple-500 border-purple-500/20',
  Thriller:       'bg-red-700/10    text-red-600    border-red-700/20',
  Isekai:         'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
  'Martial Arts': 'bg-rose-600/10   text-rose-600   border-rose-600/20',
  'School Life':  'bg-sky-500/10    text-sky-500    border-sky-500/20',
  Historical:     'bg-stone-500/10  text-stone-400  border-stone-500/20',
  Psychological:  'bg-fuchsia-500/10 text-fuchsia-500 border-fuchsia-500/20',
  Shounen:        'bg-blue-500/10   text-blue-500   border-blue-500/20',
  Shoujo:         'bg-pink-400/10   text-pink-400   border-pink-400/20',
  Seinen:         'bg-zinc-600/10   text-zinc-400   border-zinc-600/20',
  Josei:          'bg-rose-400/10   text-rose-400   border-rose-400/20',
  Yuri:           'bg-purple-400/10 text-purple-400 border-purple-400/20',
  Yaoi:           'bg-indigo-400/10 text-indigo-400 border-indigo-400/20',
  Mecha:          'bg-teal-500/10   text-teal-500   border-teal-500/20',
}

const DEFAULT_GENRE_COLOR = 'bg-muted text-muted-foreground border-border'

export default async function ReaderProfilePage({ params }: Props) {
  const { username } = await params
  const supabase = await createClient()

  // ── LIGHTWEIGHT GATEKEEPER CHECK ──
  // Step 1: Fetch ONLY username and user_type to determine routing immediately
  const { data: initialCheck } = await supabase
    .from('profiles')
    .select('username, user_type')
    .eq('username', username.toLowerCase())
    .single() as { data: { username: string; user_type: string } | null }

  if (!initialCheck) notFound()

  // Step 2: Creators don't belong here — escape/redirect early before heavy queries run
  if (initialCheck.user_type === 'creator') {
    redirect(`/creator/${username}`)
  }

  // ── HEAVY DATA FETCHING LAYER ──
  // If user is a reader, safely proceed to execute full dashboard data layout
  const { data: { user: viewer } } = await supabase.auth.getUser()

  const { data: profileData } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username.toLowerCase())
    .single()

  if (!profileData) notFound()

  const profile: ProfileData = {
    ...(profileData as any),
    is_pro:                  (profileData as any).is_pro ?? false,
    pro_expires_at:           (profileData as any).pro_expires_at ?? null,
    profile_theme:            (profileData as any).profile_theme ?? 'default',
    verified_recommender:     (profileData as any).verified_recommender ?? false,
    pinned_recommendation_id: (profileData as any).pinned_recommendation_id ?? null,
    favorite_genres:          (profileData as any).favorite_genres ?? [],
  }

  const isGhost = profile.id === GHOST_ID

  let viewerGenres: string[] = []
  if (viewer && viewer.id !== profile.id && !isGhost) {
    const { data: viewerProfile } = await supabase
      .from('profiles')
      .select('favorite_genres')
      .eq('id', viewer.id)
      .single()
    viewerGenres = (viewerProfile as any)?.favorite_genres ?? []
  }

  const isOwner  = viewer?.id === profile.id && !isGhost
  const isPro    = !!(profile.is_pro && (!profile.pro_expires_at || new Date(profile.pro_expires_at) > new Date()))
  const isAdmin  = profile.role === 'admin'
  const showGold = isPro && !isAdmin

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

  const recommendations = (recData ?? []) as Recommendation[]
  const isFollowing     = !!isFollowingData
  const totalRecs       = totalRecsCount ?? 0
  const gridRecs        = recommendations.slice(0, 6)
  const hasMore         = totalRecs > 6

  const lists: ReadingList[] = isGhost ? [] : await Promise.all(
    (listsData ?? []).map(async (list: any) => {
      const { count } = await supabase
        .from('reading_list_items')
        .select('*', { count: 'exact', head: true })
        .eq('list_id', list.id)
      return { ...list, item_count: count ?? 0 }
    })
  )

  const initials       = (profile.display_name || profile.username).slice(0, 2).toUpperCase()
  const favoriteGenres = Array.isArray(profile.favorite_genres) ? profile.favorite_genres : []

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">

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
                <Link href={
                  (profileData as any)?.user_type === 'creator'
                    ? '/creator/dashboard/settings'
                    : '/reader/dashboard/settings'
                }>
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

          {/* Bio */}
          {profile.bio && (
            <p className="text-sm leading-relaxed text-muted-foreground mb-3 max-w-lg">{profile.bio}</p>
          )}

          {/* Website */}
          {profile.website && !isGhost && (
            <a href={profile.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline mb-3">
              <Globe size={11} />
              {profile.website.replace(/^https?:\/\//, '')}
            </a>
          )}

          {/* ── Stats — single compact row ── */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mb-4 text-xs text-muted-foreground">
            {!isGhost && (
              <>
                <span className="flex items-center gap-1">
                  <Users size={11} className="text-primary/60" />
                  <strong className="text-foreground font-black">{followersCount ?? 0}</strong> followers
                </span>
                <span className="text-border">·</span>
                <span className="flex items-center gap-1">
                  <strong className="text-foreground font-black">{followingCount ?? 0}</strong> following
                </span>
                <span className="text-border">·</span>
              </>
            )}
            <span className="flex items-center gap-1">
              <BookOpen size={11} className="text-primary/60" />
              <strong className="text-foreground font-black">{totalRecs}</strong>
              {isGhost ? ' archived' : ' recs'}
            </span>
            {(profile.total_reviews ?? 0) > 0 && (
              <>
                <span className="text-border">·</span>
                <span className="flex items-center gap-1">
                  <Star size={11} className="text-amber-500/70" />
                  <strong className="text-foreground font-black">{profile.total_reviews ?? 0}</strong> reviews
                </span>
              </>
            )}
            {(profile.total_votes_received ?? 0) > 0 && (
              <>
                <span className="text-border">·</span>
                <span className="flex items-center gap-1">
                  <ThumbsUp size={11} className="text-emerald-500/70" />
                  <strong className="text-foreground font-black">{profile.total_votes_received ?? 0}</strong> votes
                </span>
              </>
            )}
            {!isGhost && (
              <>
                <span className="text-border">·</span>
                <span className="flex items-center gap-1">
                  <CalendarDays size={11} className="text-primary/60" />
                  Joined {formatDate(profile.member_since)}
                </span>
              </>
            )}
          </div>

          {/* ── Genres + Taste Identity — merged, compact ── */}
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

          {/* Taste Compatibility */}
          {!isGhost && !isOwner && viewer && viewerGenres.length > 0 && favoriteGenres.length > 0 && (
            <div className="mb-3">
              <TasteCompatibility
                viewerGenres={viewerGenres}
                profileGenres={favoriteGenres}
                profileName={profile.display_name || profile.username}
              />
            </div>
          )}

          {/* Manga DNA */}
          {!isGhost && favoriteGenres.length > 0 && (
            <div className="mb-3">
              <MangaDNACard
                username={profile.username}
                displayName={profile.display_name || profile.username}
                avatarUrl={profile.avatar_url}
                genres={favoriteGenres}
                isPro={isPro || isAdmin}
                isOwner={isOwner}
              />
            </div>
          )}

          {/* Achievement Badges */}
          <ProfileBadges
            approvedRecs={totalRecs}
            totalReviews={profile.total_reviews ?? 0}
            totalVotes={profile.total_votes_received ?? 0}
            completedSeries={completedSeriesCount ?? 0}
            verifiedRecommender={profile.verified_recommender ?? false}
            isPro={isPro || isAdmin}
            isGhost={isGhost}
          />

          {/* Ghost lore */}
          {isGhost && (
            <p className="text-xs text-indigo-400/70 italic leading-relaxed max-w-md mt-2">
              An archivist of forgotten recommendations. Comics submitted here live on even when their recommenders are gone.
            </p>
          )}
        </div>
      </div>

      {/* ── MANGA SHELF ── */}
      <ProfileShelf
        recommendations={recommendations}
        totalRecs={totalRecs}
        isPro={isPro || isAdmin}
        isGhost={isGhost}
        isOwner={isOwner}
        username={profile.username}
        showGold={showGold}
      />

      {/* ── PINNED ── */}
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
                  ? <img src={pinnedRec.cover_url} alt={pinnedRec.title} className="w-full h-full object-cover" />
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

      {/* ── RECOMMENDATIONS ── */}
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
            <Link href="/dashboard/recommendations/new" className="mt-5">
              <Button size="sm" className="gap-2"><PenLine size={13} />Submit your first rec</Button>
            </Link>
          )}
        </div>
      )}

      {/* ── PUBLIC READING LISTS ── */}
      {!isGhost && lists.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-black">Reading Lists</h2>
            <div className="h-0.5 flex-1 bg-gradient-to-r from-primary/40 to-transparent" />
            <span className="text-xs text-muted-foreground shrink-0">{lists.length} public</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {lists.map((list) => (
              <Link key={list.id} href={`/lists/${list.id}`} className="group relative p-4 rounded-2xl border border-border bg-card hover:border-primary/40 hover:shadow-md transition-all duration-200 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                      <BookMarked size={14} className="text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-black truncate group-hover:text-primary transition-colors">{list.name}</p>
                      {list.description && <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{list.description}</p>}
                    </div>
                  </div>
                  <Globe size={12} className="text-emerald-500 shrink-0 mt-1" />
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <BookOpen size={11} className="text-primary/60" />
                    <span><strong className="text-foreground font-black">{list.item_count}</strong> comic{list.item_count !== 1 ? 's' : ''}</span>
                  </div>
                  <span className="text-[10px] font-bold text-primary group-hover:translate-x-0.5 transition-transform">View →</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}