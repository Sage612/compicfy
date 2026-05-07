import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
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

const THEME_GRADIENTS: Record<string, string> = {
  default:  'from-primary/20 via-violet-500/10 to-transparent',
  gold:     'from-amber-400/30 via-orange-500/15 to-transparent',
  rose:     'from-rose-500/25 via-pink-500/10 to-transparent',
  teal:     'from-teal-500/25 via-cyan-500/10 to-transparent',
  violet:   'from-violet-600/25 via-purple-500/10 to-transparent',
  amber:    'from-amber-500/25 via-yellow-500/10 to-transparent',
  midnight: 'from-slate-700/25 via-blue-900/10 to-transparent',
}

export default async function ProfilePage({ params }: Props) {
  const { username } = await params
  const supabase = await createClient()

  const { data: { user: viewer } } = await supabase.auth.getUser()

  let viewerRole: string | null = null
  if (viewer) {
    const { data: vp } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', viewer.id)
      .single()
    viewerRole = (vp as any)?.role ?? 'user'
  }

  const { data: profileData } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username.toLowerCase())
    .single()

  if (!profileData) notFound()

  const profile: ProfileData = {
    ...(profileData as any),
    is_pro:                   (profileData as any).is_pro ?? false,
    pro_expires_at:           (profileData as any).pro_expires_at ?? null,
    profile_theme:            (profileData as any).profile_theme ?? 'default',
    verified_recommender:     (profileData as any).verified_recommender ?? false,
    pinned_recommendation_id: (profileData as any).pinned_recommendation_id ?? null,
    favorite_genres:          (profileData as any).favorite_genres ?? [],
  }

  // Ghost profile — the archivist
  const isGhost  = profile.id === GHOST_ID
  const isOwner  = viewer?.id === profile.id && !isGhost

  const isPro    = !!(profile.is_pro && (!profile.pro_expires_at || new Date(profile.pro_expires_at) > new Date()))
  const isAdmin  = profile.role === 'admin'
  const showGold = isPro && !isAdmin

  // Ghost always uses midnight theme
  const profileTheme   = isGhost ? 'midnight' : (profile.profile_theme ?? 'default')
  const bannerGradient = isGhost
    ? 'from-indigo-900/40 via-slate-800/20 to-transparent'
    : showGold
    ? (THEME_GRADIENTS[profileTheme] ?? THEME_GRADIENTS.default)
    : THEME_GRADIENTS.default

  // Track profile view — skip for ghost and self
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
    .limit(6)

  if (profile.pinned_recommendation_id) {
    recQuery = recQuery.neq('id', profile.pinned_recommendation_id)
  }

  let totalRecsQuery = (supabase as any)
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
    supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', profile.id),
    supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', profile.id),
    viewer && !isOwner && !isGhost
      ? supabase
          .from('follows')
          .select('id')
          .eq('follower_id', viewer.id)
          .eq('following_id', profile.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const recommendations = (recData ?? []) as Recommendation[]
  const isFollowing     = !!isFollowingData
  const totalRecs       = totalRecsCount ?? 0
  const hasMore         = totalRecs > recommendations.length

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
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-10">

      {/* ── Profile card ── */}
      <div className={`rounded-2xl border overflow-hidden ${
        isGhost   ? 'border-indigo-500/30' :
        showGold  ? 'border-amber-500/30'  :
                    'border-border'
      } bg-card`}>

        {/* Banner */}
        <div className={`h-24 bg-gradient-to-br ${bannerGradient} relative`}>
          {isGhost && (
            <>
              <div className="absolute inset-0 opacity-20"
                style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, #4f46e5 0%, transparent 50%), radial-gradient(circle at 80% 20%, #7c3aed 0%, transparent 40%)' }}
              />
              <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />
            </>
          )}
          {showGold && !isGhost && (
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
          )}
        </div>

        <div className="px-6 pb-6 -mt-12 space-y-5">

          {/* ── Avatar row + follow button ── */}
          <div className="flex flex-row items-end justify-between gap-4">

            {/* Avatar + name */}
            <div className="flex flex-col sm:flex-row sm:items-end gap-3 flex-1 min-w-0">
              <ProAvatar
                src={profile.avatar_url}
                fallback={initials}
                size="xl"
                isPro={isPro}
                isAdmin={isAdmin}
                className="border-4 border-card shadow-lg shrink-0"
              />
              {/* Name sits below avatar on mobile, beside it on desktop */}
              <div className="space-y-1 pb-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-black truncate">
                    {profile.display_name || profile.username}
                  </h1>
                  <ProBadge role={profile.role} isPro={isPro} />
                  {profile.verified_recommender && <VerifiedBadge />}
                </div>
                <p className="text-sm text-muted-foreground">@{profile.username}</p>
              </div>
            </div>

            {/* Follow button — always on the right, aligned to bottom of avatar */}
            {!isOwner && !isGhost && viewer && (
              <div className="shrink-0 pb-1">
                <FollowButton
                  profileId={profile.id}
                  initialFollowing={isFollowing}
                  isLoggedIn={!!viewer}
                />
              </div>
            )}

            {/* Ghost pill */}
            {isGhost && (
              <div className="shrink-0 pb-1">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 text-xs font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                  The Archivist
                </div>
              </div>
            )}
          </div>

          {profile.bio && (
            <p className="text-sm leading-relaxed text-muted-foreground max-w-lg">{profile.bio}</p>
          )}

          <div className="flex flex-wrap gap-4">
            {!isGhost && (
              <>
                <Link
                  href={`/profile/${profile.username}`}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Users size={13} className="text-primary/60" />
                  <span><strong className="text-foreground font-black">{followersCount ?? 0}</strong> followers</span>
                </Link>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Users size={13} className="text-primary/60" />
                  <span><strong className="text-foreground font-black">{followingCount ?? 0}</strong> following</span>
                </div>
              </>
            )}
            {[
              { icon: BookOpen, value: profile.total_recommendations, label: 'recommendations' },
              { icon: Star,     value: profile.total_reviews,          label: 'reviews'         },
              { icon: ThumbsUp, value: profile.total_votes_received,   label: 'votes received'  },
            ].map(({ icon: Icon, value, label }) => (
              <div key={label} className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Icon size={13} className="text-primary/60" />
                <span><strong className="text-foreground font-black">{value ?? 0}</strong> {label}</span>
              </div>
            ))}
            {!isGhost && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <CalendarDays size={13} className="text-primary/60" />
                <span>Joined {formatDate(profile.member_since)}</span>
              </div>
            )}
          </div>

          {favoriteGenres.length > 0 && !isGhost && (
            <div className="flex flex-wrap gap-1.5">
              {favoriteGenres.map((genre: string) => (
                <Badge key={genre} variant="secondary" className="text-xs rounded-full">
                  {genre}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Pinned Recommendation ── */}
      {pinnedRec && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Pin size={14} className="text-amber-500" />
            <h2 className="text-sm font-black text-amber-600 uppercase tracking-wider">Pinned</h2>
          </div>
          <div className={`rounded-2xl border ${showGold ? 'border-amber-500/30 bg-amber-500/5' : 'border-border'}`}>
            <ComicCard recommendation={pinnedRec} />
          </div>
        </section>
      )}

      {/* ── Recommendations ── */}
      {recommendations.length > 0 ? (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-black">
              {isGhost ? 'Archived Recommendations' : 'Recent Recommendations'}
            </h2>
            <div className={`h-0.5 flex-1 bg-gradient-to-r ${
              isGhost  ? 'from-indigo-500/40' :
              showGold ? 'from-amber-500/40'  :
                         'from-primary/40'
            } to-transparent`} />
            {hasMore && (
              <Link
                href={`/profile/${profile.username}/recommendations`}
                className="flex items-center gap-1 text-xs font-bold text-primary hover:underline shrink-0"
              >
                See all {totalRecs}
                <ArrowRight size={12} />
              </Link>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {recommendations.map((rec) => (
              <ComicCard key={rec.id} recommendation={rec} />
            ))}
          </div>
          {hasMore && (
            <Link
              href={`/profile/${profile.username}/recommendations`}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl border border-border hover:border-primary/40 hover:bg-primary/5 text-sm font-semibold text-muted-foreground hover:text-primary transition-all duration-200"
            >
              See all {totalRecs} recommendations
              <ArrowRight size={14} />
            </Link>
          )}
        </section>
      ) : (
        <div className="relative flex flex-col items-center justify-center py-16 rounded-2xl border border-dashed border-border overflow-hidden">
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-violet-500/5 blur-3xl pointer-events-none" />
          <div className="relative mb-6 w-36 h-36 mx-auto">
            <div className="absolute top-0 left-0 w-20 h-28 rounded-2xl border-2 border-border bg-card rotate-[-12deg] opacity-40" />
            <div className="absolute top-2 left-6 w-20 h-28 rounded-2xl border-2 border-border bg-card rotate-[-5deg] opacity-60" />
            <div className="absolute top-4 left-10 w-20 h-28 rounded-2xl border-2 border-primary/30 bg-card shadow-xl flex flex-col items-center justify-center gap-1">
              <BookOpen size={18} className="text-primary opacity-60" />
              <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest text-center px-1">
                {isGhost ? 'Archive' : 'Empty'}
              </span>
            </div>
          </div>
          <p className="font-black text-sm">
            {isGhost ? 'The archive is empty' : 'No recommendations yet'}
          </p>
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
              <Button size="sm" className="gap-2 bg-gradient-to-r from-primary to-violet-500 border-0 hover:opacity-90 shadow-md shadow-primary/20">
                <PenLine size={13} />
                Submit your first rec
              </Button>
            </Link>
          )}
        </div>
      )}

      {/* ── Public Reading Lists — hidden for ghost ── */}
      {!isGhost && lists.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-black">Reading Lists</h2>
            <div className="h-0.5 flex-1 bg-gradient-to-r from-teal-500/40 to-transparent" />
            <span className="text-xs text-muted-foreground shrink-0">{lists.length} public</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {lists.map((list) => (
              <Link
                key={list.id}
                href={`/lists/${list.id}`}
                className="group relative p-4 rounded-2xl border border-border bg-card hover:border-teal-500/40 hover:shadow-md transition-all duration-200 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500/20 to-cyan-500/10 border border-teal-500/20 flex items-center justify-center shrink-0">
                      <BookMarked size={14} className="text-teal-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-black truncate group-hover:text-teal-600 transition-colors">
                        {list.name}
                      </p>
                      {list.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                          {list.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <Globe size={12} className="text-emerald-500 shrink-0 mt-1" />
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <BookOpen size={11} className="text-teal-500/60" />
                    <span>
                      <strong className="text-foreground font-black">{list.item_count}</strong>{' '}
                      comic{list.item_count !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-teal-600 group-hover:translate-x-0.5 transition-transform">
                    View →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}