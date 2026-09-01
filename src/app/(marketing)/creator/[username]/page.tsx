import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  BookOpen, Star, ThumbsUp, Users, Globe,
  ExternalLink, CalendarDays, Palette, Heart,
} from 'lucide-react'
import { formatDate } from '@/lib/utils/format'
import type { Recommendation } from '@/types/app.types'
import { getDashboardRoutes } from '@/lib/utils/routes'
import type { Metadata } from 'next'
import { FollowButton } from '@/components/user/FollowButton'
import { ComicCard } from '@/components/recommendations/ComicCard'
import { ProAvatar } from '@/components/pro/ProAvatar'
import { ProBadge } from '@/components/pro/ProBadge'
import { Button } from '@/components/ui/button'
import { CreatorProfileTabs } from '@/components/profile/CreatorProfileTabs'
import { Suspense } from 'react'

interface Props {
  params:       Promise<{ username: string }>
  searchParams: Promise<{ tab?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params
  return { title: `${username} – Creator` }
}

export default async function CreatorProfilePage({ params, searchParams }: Props) {
  const { username } = await params
  const { tab: tabParam } = await searchParams
  const activeTab = tabParam === 'about' ? 'about' : 'works'

  const supabase = await createClient()

  const { data: { user: viewer } } = await supabase.auth.getUser()

  const { data: profileData } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username.toLowerCase())
    .single()

  if (!profileData) notFound()

  const userType = (profileData as any).user_type
  if (userType && userType !== 'creator') notFound()

  const profile  = profileData as any
  const isOwner  = viewer?.id === profile.id
  const isPro    = !!(profile.is_pro && (!profile.pro_expires_at || new Date(profile.pro_expires_at) > new Date()))
  const isAdmin  = profile.role === 'admin'
  const initials = (profile.display_name || profile.username).slice(0, 2).toUpperCase()

  // ── Owner dashboard routes — aware of creator type and pro status ────────────
  const ownerRoutes = getDashboardRoutes('creator', isPro)

  const [
    { data: works },
    { count: followersCount },
    { data: isFollowingData },
  ] = await Promise.all([
    supabase
      .from('recommendations')
      .select('*')
      .eq('user_id', profile.id)
      .eq('is_approved', true)
      .not('content_rating', 'in', '("adult","mature")')
      .order('upvotes', { ascending: false })
      .limit(12),
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', profile.id),
    viewer && !isOwner
      ? supabase.from('follows').select('id').eq('follower_id', viewer.id).eq('following_id', profile.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const isFollowing  = !!isFollowingData
  const allWorks     = (works ?? []) as Recommendation[]
  const totalWorks   = allWorks.length
  const totalUpvotes = allWorks.reduce((s, w) => s + (w.upvotes ?? 0), 0)
  const totalReviews = allWorks.reduce((s, w) => s + ((w as any).review_count ?? 0), 0)

  const genreSet = new Set<string>()
  allWorks.forEach(w => (w.genres ?? []).forEach((g: string) => genreSet.add(g)))
  const creatorGenres = Array.from(genreSet).slice(0, 8)

  const hasLinks = profile.comic_url || profile.patreon_url || profile.kickstarter_url || profile.website

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-6">

      {/* Hero */}
      <div className="relative rounded-2xl overflow-hidden border border-teal-500/30 bg-card shadow-sm">

        <div className="relative h-32 md:h-44 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-teal-500/30 via-cyan-500/15 to-transparent" />
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, #14b8a6 0%, transparent 50%), radial-gradient(circle at 80% 30%, #06b6d4 0%, transparent 40%)' }} />
          <div className="absolute inset-0 hidden md:block pointer-events-none overflow-hidden">
            <div className="absolute top-4 right-12 w-24 h-32 rounded border border-teal-500/20 rotate-6 opacity-40" />
            <div className="absolute top-8 right-32 w-16 h-22 rounded border border-teal-500/15 -rotate-3 opacity-30" />
            <div className="absolute top-2 right-52 w-12 h-18 rounded border border-teal-500/10 rotate-12 opacity-20" />
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-card to-transparent" />
          <div className="absolute top-4 left-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-teal-500/20 border border-teal-500/30 text-teal-400 text-xs font-black backdrop-blur-sm">
              <Palette size={11} />Creator
            </span>
          </div>
        </div>

        <div className="px-5 pb-6 -mt-14 relative">
          <div className="flex items-end justify-between gap-3 mb-4">
            <div className="relative shrink-0 rounded-full p-[3px] bg-gradient-to-br from-teal-400 to-cyan-500 shadow-lg shadow-teal-500/20">
              <ProAvatar src={profile.avatar_url} fallback={initials} size="xl" isPro={isPro} isAdmin={isAdmin} className="border-2 border-card" />
            </div>
            <div className="flex items-center gap-2 pb-1">
              {!isOwner && viewer && (
                <FollowButton profileId={profile.id} initialFollowing={isFollowing} isLoggedIn={!!viewer} />
              )}
              {isOwner && (
                <Link href={ownerRoutes.settings}>
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 border-teal-500/30 hover:border-teal-500/60">
                    Edit Profile
                  </Button>
                </Link>
              )}
            </div>
          </div>

          <div className="mb-3">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight">{profile.display_name || profile.username}</h1>
              <ProBadge role={profile.role} isPro={isPro} />
            </div>
            <p className="text-sm text-muted-foreground">@{profile.username}</p>
          </div>

          {profile.bio && <p className="text-sm leading-relaxed text-muted-foreground mb-4 max-w-xl">{profile.bio}</p>}

          {/* ── Unified stat strip (matches reader profile page's pattern) ──
              4 columns, not 5 — creators don't have a "Following" count or
              a reading-behavior stat like "Completed Series" worth padding
              in just to hit a round number. Join date moved to a caption
              below, same treatment as the reader page. */}
          <div className="mb-4 p-3 rounded-xl bg-teal-500/5 border border-teal-500/20 space-y-2">
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'Followers', value: followersCount ?? 0 },
                { label: 'Works',     value: totalWorks },
                { label: 'Upvotes',   value: totalUpvotes },
                { label: 'Reviews',   value: totalReviews },
              ].map(stat => (
                <div key={stat.label} className="text-center">
                  <p className="text-base font-black tabular-nums">{stat.value}</p>
                  <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-wide">{stat.label}</p>
                </div>
              ))}
            </div>
            <p className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground pt-1 border-t border-teal-500/10">
              <CalendarDays size={10} className="text-teal-500/60" />
              Joined {formatDate(profile.member_since)}
            </p>
          </div>

          {hasLinks && (
            <div className="flex flex-wrap gap-2">
              {profile.comic_url && (
                <a href={profile.comic_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-teal-500/30 bg-teal-500/10 text-teal-600 dark:text-teal-400 text-xs font-semibold hover:bg-teal-500/20 transition-colors">
                  <BookOpen size={11} />Read their Comic<ExternalLink size={10} />
                </a>
              )}
              {profile.patreon_url && (
                <a href={profile.patreon_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-orange-500/30 bg-orange-500/10 text-orange-600 text-xs font-semibold hover:bg-orange-500/20 transition-colors">
                  Support on Patreon<ExternalLink size={10} />
                </a>
              )}
              {profile.kickstarter_url && (
                <a href={profile.kickstarter_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 text-xs font-semibold hover:bg-emerald-500/20 transition-colors">
                  Back their book<ExternalLink size={10} />
                </a>
              )}
              {profile.website && (
                <a href={profile.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border text-muted-foreground text-xs font-semibold hover:text-foreground hover:border-border/80 transition-colors">
                  <Globe size={11} />{profile.website.replace(/^https?:\/\//, '').split('/')[0]}<ExternalLink size={10} />
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Tabbed content ── */}
      <Suspense>
        <CreatorProfileTabs username={profile.username} />
      </Suspense>

      {activeTab === 'works' && (
        allWorks.length > 0 ? (
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 flex-1">
                <h2 className="text-lg font-black">Works</h2>
                <div className="h-0.5 flex-1 bg-gradient-to-r from-teal-500/40 to-transparent" />
              </div>
              <span className="text-xs text-muted-foreground">{totalWorks} published</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {allWorks.map(work => <ComicCard key={work.id} recommendation={work} />)}
            </div>
          </section>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 rounded-2xl border border-dashed border-teal-500/20 bg-teal-500/5 space-y-3 text-center">
            <div className="w-14 h-14 rounded-2xl bg-teal-500/10 flex items-center justify-center">
              <Palette size={24} className="text-teal-500 opacity-60" />
            </div>
            <p className="font-black text-sm">No works published yet</p>
            <p className="text-xs text-muted-foreground max-w-xs">
              {isOwner ? 'Submit your first comic to let the community discover your work.' : `@${profile.username} hasn't published any works yet.`}
            </p>
            {isOwner && (
              <Link href={ownerRoutes.newRec}>
                <Button size="sm" className="gap-1.5 bg-teal-500 hover:bg-teal-600 border-0 text-white">
                  <BookOpen size={13} />Submit Your First Work
                </Button>
              </Link>
            )}
          </div>
        )
      )}

      {activeTab === 'about' && (
        (profile.bio || creatorGenres.length > 0) ? (
          <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground">About</h2>
            {profile.bio && <p className="text-sm leading-relaxed text-foreground/80">{profile.bio}</p>}
            {creatorGenres.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Heart size={11} className="text-teal-500" />Genres they create in
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {creatorGenres.map(g => (
                    <Link key={g} href={`/browse?genre=${encodeURIComponent(g)}`}>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border border-teal-500/20 bg-teal-500/8 text-teal-600 dark:text-teal-400 hover:bg-teal-500/15 transition-colors cursor-pointer">{g}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </section>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 rounded-2xl border border-dashed border-border text-center space-y-2">
            <Heart size={24} className="text-muted-foreground opacity-40" />
            <p className="font-black text-sm">Nothing here yet</p>
            <p className="text-xs text-muted-foreground">
              {isOwner ? 'Add a bio in settings to tell readers about yourself.' : `@${profile.username} hasn't added a bio yet.`}
            </p>
          </div>
        )
      )}
    </div>
  )
}