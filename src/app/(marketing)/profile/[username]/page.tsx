// src/app/profile/[username]/page.tsx
//
// Reader profile, redesigned as a "shrine": hero + instant tabs
// (Pulse / Shrine / Party / Activity / Library). Every tab's content is loaded
// here on the server in one go, so switching tabs is instant.

import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import type { Recommendation } from '@/types/app.types'
import { getDashboardRoutes } from '@/lib/utils/routes'
import { PinnedFavoritesEditor } from '@/components/profile/PinnedFavoritesEditor'
import { ProfileBadges } from '@/components/profile/ProfileBadges'
import { MangaDNACard } from '@/components/profile/MangaDNACard'
import { getSuggestedMatches } from '@/lib/taste/getSuggestedMatches'
import { isProUser, isPatronUser, isAdmin as isAdminCheck } from '@/lib/access'
import { getProfileExtras } from '@/lib/profile/getProfileExtras'
import { getParty, getOtherShrines } from '@/lib/profile/getShrineExtras'
import { ShrineTabs, type ShrineTab } from '@/components/profile/shrine/ShrineTabs'
import { ProfileHero } from '@/components/profile/shrine/ProfileHero'
import {
  ActivitySection, Empty, HallOfFameSection, LibrarySection, ObsessedSection,
  OtherShrinesSection, PartySection, PinnedMomentSection, SignalsSection, TasteSection,
} from '@/components/profile/shrine/sections'

const GHOST_ID = '00000000-0000-0000-0000-000000000000'

// Old ?tab= values still work (shared links, bookmarks).
const TAB_ALIASES: Record<string, string> = {
  recommendations: 'library',
  lists:           'library',
  taste:           'shrine',
  journal:         'activity',
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
  current_streak: number | null
  longest_streak: number | null
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params
  return { title: `@${username}` }
}

export default async function ProfilePage({ params, searchParams }: Props) {
  const { username } = await params
  const { tab: tabParam } = await searchParams
  const initialTab = TAB_ALIASES[tabParam ?? ''] ?? tabParam ?? 'pulse'

  const supabase = await createClient()
  const { data: { user: viewer } } = await supabase.auth.getUser()

  const { data: profileData } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username.toLowerCase())
    .single()

  if (!profileData) notFound()

  if ((profileData as any).user_type === 'creator') {
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
    current_streak:           (profileData as any).current_streak ?? 0,
    longest_streak:           (profileData as any).longest_streak ?? 0,
  }

  const isGhost  = profile.id === GHOST_ID
  const isOwner  = viewer?.id === profile.id && !isGhost
  const isPro    = isProUser(profile)
  const isPatron = isPatronUser(profile)
  const isAdmin  = isAdminCheck(profile)
  const showGold = isPro && !isAdmin

  const ownerRoutes = getDashboardRoutes(
    (profileData as any)?.user_type === 'creator' ? 'creator' : 'reader',
    isPro,
  )

  if (viewer?.id && viewer.id !== profile.id && !isGhost) {
    try {
      await (supabase as any).rpc('track_profile_view', {
        p_profile_id: profile.id,
        p_viewer_id:  viewer.id,
      })
    } catch { /* Non-critical */ }
  }

  // ── Pinned recommendation (Library tab) ──
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

  // ── Hall of fame: pinned favorites + the owner's candidate pool ──
  type Fav = { id: string; title: string; author: string | null; cover_url: string | null }
  let pinnedFavorites: Fav[] = []
  let favoriteCandidates: { id: string; title: string; cover_url: string | null }[] = []

  if (!isGhost && profile.pinned_favorite_ids && profile.pinned_favorite_ids.length > 0) {
    const { data: favData } = await supabase
      .from('recommendations')
      .select('id, title, author, cover_url')
      .in('id', profile.pinned_favorite_ids)

    const byId = new Map((favData ?? []).map((r: any) => [r.id, r]))
    pinnedFavorites = profile.pinned_favorite_ids
      .map(id => byId.get(id))
      .filter((r): r is Fav => !!r)
  }

  if (isOwner && !isGhost) {
    const [{ data: savedRows }, { data: ownRecs }] = await Promise.all([
      supabase.from('saves').select('recommendations(id, title, cover_url)').eq('user_id', profile.id).limit(50),
      supabase.from('recommendations').select('id, title, cover_url').eq('user_id', profile.id).eq('is_approved', true).limit(50),
    ])

    const savedComics = (savedRows ?? []).map((r: any) => r.recommendations).filter(Boolean)
    const seen = new Set<string>()
    favoriteCandidates = [...savedComics, ...(ownRecs ?? [])].filter((c: any) => {
      if (seen.has(c.id)) return false
      seen.add(c.id)
      return true
    })
  }

  // ── Recommendations, lists, follow counts ──
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

  // ── Taste match with the viewer ──
  let viewerMatch: Awaited<ReturnType<typeof getSuggestedMatches>>[number] | null = null
  if (viewer && viewer.id !== profile.id && !isGhost) {
    const { data: viewerProfileForPro } = await supabase
      .from('profiles')
      .select('role, is_pro, pro_expires_at, is_patron, patron_expires_at')
      .eq('id', viewer.id)
      .maybeSingle()

    const viewerIsPro = viewerProfileForPro ? isProUser(viewerProfileForPro as any) : false
    const matches = await getSuggestedMatches(supabase, viewer.id, viewerIsPro)
    viewerMatch = matches.find(m => m.userId === profile.id) ?? null
  }

  // ── Shrine data: everything every tab needs, fetched together ──
  const [extras, party, otherShrines] = isGhost
    ? [null, [], []] as const
    : await Promise.all([
        getProfileExtras(supabase, profile.id, { includeJournal: true, includeTaste: true }),
        getParty(supabase, profile.id),
        getOtherShrines(supabase, profile.id),
      ])

  const recommendations = (recData ?? []) as Recommendation[]
  const isFollowing     = !!isFollowingData
  const totalRecs       = totalRecsCount ?? 0
  const gridRecs        = recommendations.slice(0, 6)

  const lists: any[] = isGhost ? [] : await Promise.all(
    (listsData ?? []).map(async (list: any) => {
      const [{ count }, { data: coverItems }] = await Promise.all([
        supabase.from('reading_list_items').select('*', { count: 'exact', head: true }).eq('list_id', list.id),
        supabase.from('reading_list_items').select('recommendations(cover_url)').eq('list_id', list.id).limit(4),
      ])
      const coverUrls = (coverItems ?? []).map((i: any) => i.recommendations?.cover_url).filter(Boolean) as string[]
      return { ...list, item_count: count ?? 0, _cover_urls: coverUrls }
    }),
  )

  const initials       = (profile.display_name || profile.username).slice(0, 2).toUpperCase()
  const favoriteGenres = Array.isArray(profile.favorite_genres) ? profile.favorite_genres : []
  const topGenre       = extras?.genreProfile?.points[0]?.axis ?? favoriteGenres[0] ?? null
  const canEditHall    = isPro || isPatron || isAdmin

  // The banner is the reader's pinned favorites and nothing else.
  // No favorites pinned = no banner.
  const bannerCovers = pinnedFavorites
    .map(c => c.cover_url)
    .filter((u): u is string => !!u)
    .slice(0, 3)

  const hero = (
    <ProfileHero
      profile={profile}
      initials={initials}
      isGhost={isGhost}
      isOwner={isOwner}
      isPro={isPro}
      isAdmin={isAdmin}
      showGold={showGold}
      canFollow={!isOwner && !isGhost && !!viewer}
      isFollowing={isFollowing}
      isLoggedIn={!!viewer}
      editHref={ownerRoutes.settings}
      bannerCovers={bannerCovers}
      kicker={topGenre ? `${topGenre} reader` : null}
      stats={{
        chapters:  extras?.totalChaptersRead ?? 0,
        followers: followersCount ?? 0,
        following: followingCount ?? 0,
        recs:      totalRecs,
        completed: completedSeriesCount,
        reviews:   profile.total_reviews ?? 0,
      }}
      match={viewerMatch}
    />
  )

  const library = (
    <LibrarySection
      isGhost={isGhost}
      isOwner={isOwner}
      username={profile.username}
      newRecHref={ownerRoutes.newRec}
      pinnedRec={pinnedRec}
      recs={gridRecs}
      totalRecs={totalRecs}
      lists={lists}
    />
  )

  // ── Ghost ("The Archivist") has no shrine, just the archive ──
  if (isGhost) {
    return (
      <div className="sh-page">
        <div className={`sh-root`} data-tier="default">
          {hero}
          <div className="sh-panel">{library}</div>
        </div>
      </div>
    )
  }

  const pulseHasContent = !!extras?.obsessed || !!extras?.quote || pinnedFavorites.length > 0 || isOwner

  const tabs: ShrineTab[] = [
    {
      id: 'pulse',
      label: 'Pulse',
      content: (
        <>
          {extras?.obsessed && (
            <ObsessedSection data={extras.obsessed} streak={profile.current_streak ?? 0} />
          )}
          <HallOfFameSection
            items={pinnedFavorites}
            isOwner={isOwner}
            canEdit={canEditHall}
            editor={
              isOwner && canEditHall ? (
                <PinnedFavoritesEditor
                  initialPinnedIds={profile.pinned_favorite_ids ?? []}
                  candidates={favoriteCandidates}
                />
              ) : null
            }
          />
          {extras?.quote && <PinnedMomentSection quote={extras.quote} />}
          {!pulseHasContent && (
            <section className="sh-section">
              <Empty title="Nothing pinned yet" hint={`@${profile.username} hasn't set up their shrine yet.`} />
            </section>
          )}
        </>
      ),
    },
    {
      id: 'shrine',
      label: 'Shrine',
      content: (
        <>
          <TasteSection
            genreProfile={extras?.genreProfile ?? null}
            favoriteGenres={favoriteGenres}
            shareSlot={
              isOwner && favoriteGenres.length > 0 ? (
                <MangaDNACard
                  username={profile.username}
                  displayName={profile.display_name || profile.username}
                  avatarUrl={profile.avatar_url}
                  genres={favoriteGenres}
                  isPro={isPro || isAdmin}
                  isOwner={isOwner}
                  dividerMode
                />
              ) : null
            }
          />
          {extras?.signals && <SignalsSection signals={extras.signals} />}
          <section className="sh-section">
            <ProfileBadges
              approvedRecs={totalRecs}
              totalReviews={profile.total_reviews ?? 0}
              totalVotes={profile.total_votes_received ?? 0}
              completedSeries={completedSeriesCount}
              verifiedRecommender={profile.verified_recommender ?? false}
              isPro={isPro || isAdmin}
              isGhost={isGhost}
            />
          </section>
        </>
      ),
    },
    ...(party.length > 0
      ? [{ id: 'party', label: 'Party', content: <PartySection members={[...party]} /> }]
      : []),
    {
      id: 'activity',
      label: 'Activity',
      content: (
        <ActivitySection items={extras?.journal ?? []} isOwner={isOwner} username={profile.username} />
      ),
    },
    { id: 'library', label: 'Library', content: library },
  ]

  return (
    <div className="sh-page">
      <div className={`sh-root`} data-tier={showGold ? 'gold' : 'default'}>
        {hero}
        <ShrineTabs tabs={tabs} initial={initialTab} />
        {otherShrines.length > 0 && (
          <div className="sh-body">
            <OtherShrinesSection people={[...otherShrines]} />
          </div>
        )}
      </div>
    </div>
  )
}