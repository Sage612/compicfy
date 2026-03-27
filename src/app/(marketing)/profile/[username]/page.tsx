import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import {
  CalendarDays, BookOpen, Star, ThumbsUp,
  Shield, Globe, BookMarked, Users, Pin,
} from 'lucide-react'
import { formatDate } from '@/lib/utils/format'
import type { Profile, Recommendation } from '@/types/database.types'
import type { Metadata } from 'next'
import { FollowButton } from '@/components/user/FollowButton'
import { ComicCard } from '@/components/recommendations/ComicCard'
import { ProAvatar } from '@/components/pro/ProAvatar'
import { ProBadge } from '@/components/pro/ProBadge'
import { VerifiedBadge } from '@/components/pro/VerifiedBadge'

interface Props {
  params: Promise<{ username: string }>
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

const ROLE_STYLES: Record<string, { badge: string; icon: boolean }> = {
  admin:     { badge: 'bg-primary/10 text-primary border-primary/20',    icon: true  },
  moderator: { badge: 'bg-blue-500/10 text-blue-600 border-blue-500/20', icon: false },
  user:      { badge: 'bg-muted text-muted-foreground border-border',     icon: false },
}

// Profile theme gradients
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
  const profile = profileData as Profile & {
    is_pro: boolean
    pro_expires_at: string | null
    profile_theme: string | null
    verified_recommender: boolean
    pinned_recommendation_id: string | null
  }

  const isOwner = viewer?.id === profile.id
  const isPrivileged = isOwner || viewerRole === 'admin' || viewerRole === 'moderator'

  const isPro = profile.is_pro &&
    (!profile.pro_expires_at || new Date(profile.pro_expires_at) > new Date())
  const isAdmin = profile.role === 'admin'
  const showGold = isPro && !isAdmin
  const profileTheme = profile.profile_theme ?? 'default'
  const bannerGradient = showGold
    ? THEME_GRADIENTS[profileTheme] ?? THEME_GRADIENTS.default
    : THEME_GRADIENTS.default

  // Track profile view (don't block render)
  if (viewer?.id && viewer.id !== profile.id) {
    (supabase as any).rpc('track_profile_view', {
      p_profile_id: profile.id,
      p_viewer_id: viewer.id,
    }).catch(() => {}) // fire and forget
  }

  // Fetch pinned recommendation if exists
  let pinnedRec: Recommendation | null = null
  if (profile.pinned_recommendation_id) {
    const { data: pinned } = await supabase
      .from('recommendations')
      .select('*')
      .eq('id', profile.pinned_recommendation_id)
      .eq('is_approved', true)
      .maybeSingle()
    pinnedRec = pinned as Recommendation | null
  }

  let recQuery = supabase
    .from('recommendations')
    .select('*')
    .eq('user_id', profile.id)
    .eq('is_approved', true)
    .order('created_at', { ascending: false })
    .limit(6)

  if (!isPrivileged) {
    recQuery = recQuery.not('content_rating', 'in', '("adult","mature")')
  }

  // Exclude pinned from regular list
  if (profile.pinned_recommendation_id) {
    recQuery = recQuery.neq('id', profile.pinned_recommendation_id)
  }

  const [
    { data: recData },
    { data: listsData },
    { count: followersCount },
    { count: followingCount },
    { data: isFollowingData },
  ] = await Promise.all([
    recQuery,
    supabase
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
    viewer && !isOwner
      ? supabase
          .from('follows')
          .select('id')
          .eq('follower_id', viewer.id)
          .eq('following_id', profile.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const recommendations = (recData ?? []) as Recommendation[]
  const isFollowing = !!isFollowingData
  const hasAdultRecs = recommendations.some(
    r => r.content_rating === 'adult' || r.content_rating === 'mature'
  )

  const lists: ReadingList[] = await Promise.all(
    (listsData ?? []).map(async (list: any) => {
      const { count } = await supabase
        .from('reading_list_items')
        .select('*', { count: 'exact', head: true })
        .eq('list_id', list.id)
      return { ...list, item_count: count ?? 0 }
    })
  )

  const initials = (profile.display_name || profile.username).slice(0, 2).toUpperCase()
  const roleStyle = ROLE_STYLES[profile.role] ?? ROLE_STYLES.user

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-10">

      {/* ── Profile card ── */}
      <div className={`rounded-2xl border overflow-hidden ${showGold ? 'border-amber-500/30' : 'border-border'} bg-card`}>

        {/* Banner — gold gradient for Pro users */}
        <div className={`h-24 bg-gradient-to-br ${bannerGradient} relative`}>
          {/* Gold shimmer line for Pro */}
          {showGold && (
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
          )}
        </div>

        <div className="px-6 pb-6 -mt-12 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4">

            {/* Pro Avatar with gold ring */}
            <ProAvatar
              src={profile.avatar_url}
              fallback={initials}
              size="xl"
              isPro={isPro}
              isAdmin={isAdmin}
              className="border-4 border-card shadow-lg shrink-0"
            />

            <div className="flex-1 min-w-0 space-y-1.5 sm:pb-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-black truncate">
                  {profile.display_name || profile.username}
                </h1>

                {/* Role badge */}
                {profile.role !== 'user' && (
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border capitalize ${roleStyle.badge}`}>
                    {roleStyle.icon && <Shield size={10} />}
                    {profile.role}
                  </span>
                )}

                {/* Pro badge */}
                <ProBadge role={profile.role} isPro={isPro} />

                {/* Verified badge */}
                {profile.verified_recommender && <VerifiedBadge />}
              </div>
              <p className="text-sm text-muted-foreground">@{profile.username}</p>
            </div>

            {!isOwner && (
              <div className="shrink-0 sm:pb-1">
                <FollowButton
                  profileId={profile.id}
                  initialFollowing={isFollowing}
                  isLoggedIn={!!viewer}
                />
              </div>
            )}
          </div>

          {profile.bio && (
            <p className="text-sm leading-relaxed text-muted-foreground max-w-lg">{profile.bio}</p>
          )}

          <div className="flex flex-wrap gap-4">
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
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <CalendarDays size={13} className="text-primary/60" />
              <span>Joined {formatDate(profile.member_since)}</span>
            </div>
          </div>

          {profile.favorite_genres?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {profile.favorite_genres.map((genre: string) => (
                <Badge key={genre} variant="secondary" className="text-xs rounded-full">
                  {genre}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Pinned Recommendation — Pro only ── */}
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
            <h2 className="text-lg font-black">Recent Recommendations</h2>
            <div className={`h-0.5 flex-1 bg-gradient-to-r ${showGold ? 'from-amber-500/40' : 'from-primary/40'} to-transparent`} />
            {isPrivileged && hasAdultRecs && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/20 shrink-0">
                Includes 18+
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {recommendations.map((rec) => (
              <ComicCard key={rec.id} recommendation={rec} />
            ))}
          </div>
        </section>
      ) : (
        <div className="text-center py-14 rounded-2xl border border-dashed border-border space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto">
            <BookOpen size={22} className="text-muted-foreground opacity-40" />
          </div>
          <div>
            <p className="font-black text-sm">No recommendations yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              @{profile.username} hasn't shared any recommendations yet.
            </p>
          </div>
        </div>
      )}

      {/* ── Public Reading Lists ── */}
      {lists.length > 0 && (
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
                          {list.description}</p>
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