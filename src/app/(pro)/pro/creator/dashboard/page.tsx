import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ProAvatar } from '@/components/pro/ProAvatar'
import { ProBadge } from '@/components/pro/ProBadge'
import {
  BookOpen, Users, ThumbsUp, Eye, Bookmark,
  ArrowRight, Plus, Link as LinkIcon, Settings,
  Star, ChevronRight, ExternalLink, Palette,
  TrendingUp, Target, Zap, BarChart2, MessageSquare,
  Flame, Award, Activity,
} from 'lucide-react'
import { formatDate, formatNumber, timeAgo } from '@/lib/utils/format'
import { cn } from '@/lib/utils'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Pro Creator Studio' }

export default async function ProCreatorDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileData } = await supabase
    .from('profiles').select('*').eq('id', user.id).single()
  if (!profileData) redirect('/login')
  const profile = profileData as any

  const isAdmin = profile.role === 'admin' || profile.role === 'moderator'
  const isPro   = isAdmin || (profile.is_pro && (!profile.pro_expires_at || new Date(profile.pro_expires_at) > new Date()))
  if (!isPro) redirect('/pricing?reason=pro_required')

  const workIds = await supabase
    .from('recommendations').select('id').eq('user_id', user.id)
    .then(r => (r.data ?? []).map((x: any) => x.id))

  const sevenDaysAgo  = new Date(Date.now() - 7  * 24 * 60 * 60 * 1000).toISOString()
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const monthStart    = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

  const [
    { data: works, count: worksCount },
    { count: followersCount },
    { count: newFollowersThisMonth },
    { count: profileViewsTotal },
    { count: profileViewsThisMonth },
    { data: recentReviews },
    { data: allReviews },
    topWork,
    trendingWork,
    { data: analyticsData },
  ] = await Promise.all([
    supabase
      .from('recommendations')
      .select('id, title, cover_url, type, upvotes, save_count, view_count, review_count, score, is_approved, created_at', { count: 'exact' })
      .eq('user_id', user.id)
      .order('score', { ascending: false })
      .limit(6),
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', user.id),
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', user.id).gte('created_at', monthStart),
    (supabase as any).from('profile_views').select('*', { count: 'exact', head: true }).eq('profile_id', user.id),
    (supabase as any).from('profile_views').select('*', { count: 'exact', head: true }).eq('profile_id', user.id).gte('viewed_at', monthStart),
    workIds.length > 0
      ? supabase
          .from('reviews')
          .select('id, content, rating, created_at, profiles!reviews_user_id_fkey(username, avatar_url), recommendations(title, id)')
          .in('recommendation_id', workIds)
          .order('created_at', { ascending: false })
          .limit(4)
      : Promise.resolve({ data: [] }),
    workIds.length > 0
      ? supabase.from('reviews').select('rating').in('recommendation_id', workIds).not('rating', 'is', null)
      : Promise.resolve({ data: [] }),
    (supabase
      .from('recommendations')
      .select('id, title, cover_url, upvotes, view_count, save_count, score, review_count')
      .eq('user_id', user.id).eq('is_approved', true)
      .order('score', { ascending: false })
      .limit(1).single() as any),
    (workIds.length > 0
      ? supabase
          .from('recommendations')
          .select('id, title, cover_url, upvotes, view_count, save_count')
          .eq('user_id', user.id).eq('is_approved', true)
          .gte('created_at', sevenDaysAgo)
          .order('upvotes', { ascending: false })
          .limit(1).single()
      : Promise.resolve({ data: null })) as any,
    workIds.length > 0
      ? (supabase as any)
          .from('recommendation_analytics')
          .select('recommendation_id, date, views, saves, upvotes')
          .in('recommendation_id', workIds)
          .gte('date', thirtyDaysAgo)
          .order('date', { ascending: false })
          .limit(300)
      : Promise.resolve({ data: [] }),
  ])

  // ── Computed metrics ───────────────────────────────────────────
  const totalUpvotes   = (works ?? []).reduce((s: number, w: any) => s + (w.upvotes    ?? 0), 0)
  const totalViews     = (works ?? []).reduce((s: number, w: any) => s + (w.view_count ?? 0), 0)
  const totalSaves     = (works ?? []).reduce((s: number, w: any) => s + (w.save_count ?? 0), 0)
  const totalReviews   = (works ?? []).reduce((s: number, w: any) => s + (w.review_count ?? 0), 0)

  const last30Views    = (analyticsData ?? []).reduce((s: number, a: any) => s + (a.views  ?? 0), 0)
  const last30Saves    = (analyticsData ?? []).reduce((s: number, a: any) => s + (a.saves  ?? 0), 0)
  const last30Upvotes  = (analyticsData ?? []).reduce((s: number, a: any) => s + (a.upvotes ?? 0), 0)

  const engagementRate = totalViews > 0
    ? ((totalSaves / totalViews) * 100).toFixed(1)
    : '0.0'

  const ratings        = (allReviews ?? []).map((r: any) => r.rating).filter(Boolean)
  const avgRating      = ratings.length > 0
    ? ratings.reduce((s: number, r: number) => s + r, 0) / ratings.length
    : null

  // Rating breakdown 1-5
  const ratingBreakdown = [5, 4, 3, 2, 1].map(n => ({
    star:  n,
    count: ratings.filter((r: number) => r === n).length,
    pct:   ratings.length > 0 ? (ratings.filter((r: number) => r === n).length / ratings.length) * 100 : 0,
  }))

  // Work health score: (upvotes * 2 + saves * 3 + reviews * 5) / max possible
  const worksWithHealth = (works ?? []).map((w: any) => {
    const score = (w.upvotes ?? 0) * 2 + (w.save_count ?? 0) * 3 + (w.review_count ?? 0) * 5
    return { ...w, healthScore: score }
  })
  const maxHealth = Math.max(...worksWithHealth.map((w: any) => w.healthScore), 1)

  // Best genre from works
  const genreMap: Record<string, number> = {}
  ;(works ?? []).forEach((w: any) => {
    if (w.type) genreMap[w.type] = (genreMap[w.type] ?? 0) + (w.upvotes ?? 0)
  })
  const bestType = Object.entries(genreMap).sort((a, b) => b[1] - a[1])[0]?.[0]

  // Milestones
  const followerMilestones = [10, 50, 100, 500, 1000, 5000]
  const nextMilestone      = followerMilestones.find(m => m > (followersCount ?? 0)) ?? 5000
  const milestoneProgress  = Math.min(((followersCount ?? 0) / nextMilestone) * 100, 100)

  const upvoteMilestones   = [50, 100, 500, 1000, 5000, 10000]
  const nextUpvoteMilestone = upvoteMilestones.find(m => m > totalUpvotes) ?? 10000
  const upvoteProgress     = Math.min((totalUpvotes / nextUpvoteMilestone) * 100, 100)

  const initials  = (profile.display_name || profile.username).slice(0, 2).toUpperCase()
  const hasLinks  = profile.patreon_url || profile.kickstarter_url || profile.comic_url
  const isPending = (works ?? []).some((w: any) => !w.is_approved)

  const stats = [
    { label: 'Works',        value: worksCount ?? 0,    icon: BookOpen,   bg: 'bg-teal-500/10',    text: 'text-teal-500',    href: '/pro/creator/dashboard/works'     },
    { label: 'Followers',    value: followersCount ?? 0, icon: Users,     bg: 'bg-violet-500/10',  text: 'text-violet-500',  href: '/pro/creator/dashboard/audience'  },
    { label: 'Total Upvotes',value: totalUpvotes,        icon: ThumbsUp,  bg: 'bg-emerald-500/10', text: 'text-emerald-500', href: '/pro/creator/dashboard/analytics' },
    { label: 'Views (30d)',  value: last30Views,         icon: TrendingUp,bg: 'bg-blue-500/10',    text: 'text-blue-500',    href: '/pro/creator/dashboard/analytics' },
  ]

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">

      {/* ── Pro studio header ────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-teal-500/30 bg-gradient-to-br from-teal-500/10 via-cyan-500/5 to-amber-500/5 p-5 md:p-7">
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-teal-500/10 blur-2xl pointer-events-none" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-teal-500/40 to-transparent" />

        <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <ProAvatar
            src={profile.avatar_url ? profile.avatar_url : undefined}
            fallback={initials}
            size="lg"
            isPro={isPro}
            isAdmin={isAdmin}
          />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-black truncate">{profile.display_name || profile.username}</h1>
              <ProBadge role={profile.role} isPro={isPro} label={isAdmin ? 'Admin' : 'Pro Creator'} />
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isAdmin ? 'Admin · Lifetime Pro' : `Pro Studio · ${profile.pro_expires_at ? `Renews ${formatDate(profile.pro_expires_at)}` : 'Lifetime access'}`}
            </p>
          </div>
          <div className="flex gap-2 shrink-0 w-full sm:w-auto">
            <Link href="/pro/creator/dashboard/settings" className="flex-1 sm:flex-none">
              <Button variant="outline" size="sm" className="w-full sm:w-auto gap-1.5 border-teal-500/30 hover:border-teal-500/60 h-8 text-xs">
                <Settings size={12} />Settings
              </Button>
            </Link>
            <Link href="/pro/creator/dashboard/works/new" className="flex-1 sm:flex-none">
              <Button size="sm" className="w-full sm:w-auto gap-1.5 bg-teal-500 hover:bg-teal-600 border-0 text-white h-8 text-xs">
                <Plus size={12} />Add Work
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Nudges ──────────────────────────────────────────────── */}
      <div className="space-y-2">
        {!hasLinks && (
          <div className="flex items-center gap-3 p-3 rounded-xl border border-teal-500/20 bg-teal-500/5">
            <div className="w-7 h-7 rounded-lg bg-teal-500/15 flex items-center justify-center shrink-0">
              <LinkIcon size={13} className="text-teal-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black text-teal-700 dark:text-teal-400">Add your creator links</p>
              <p className="text-[10px] text-muted-foreground">Patreon, Kickstarter, or your comic URL</p>
            </div>
            <Link href="/pro/creator/dashboard/links">
              <Button size="sm" variant="outline" className="shrink-0 border-teal-500/30 text-teal-600 hover:bg-teal-500/10 h-7 text-xs px-2.5">
                Add <ArrowRight size={11} />
              </Button>
            </Link>
          </div>
        )}
        {isPending && (
          <div className="flex items-center gap-3 p-3 rounded-xl border border-amber-500/20 bg-amber-500/5">
            <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
              <Zap size={13} className="text-amber-500" />
            </div>
            <p className="text-xs text-amber-700 dark:text-amber-400 flex-1">You have works pending approval</p>
            <Link href="/pro/creator/dashboard/works">
              <Button size="sm" variant="outline" className="shrink-0 border-amber-500/30 text-amber-600 hover:bg-amber-500/10 h-7 text-xs px-2.5">
                View <ChevronRight size={11} />
              </Button>
            </Link>
          </div>
        )}
        {/* Pro insight tip */}
        {bestType && totalUpvotes > 0 && (
          <div className="flex items-center gap-3 p-3 rounded-xl border border-cyan-500/20 bg-cyan-500/5">
            <div className="w-7 h-7 rounded-lg bg-cyan-500/15 flex items-center justify-center shrink-0">
              <Activity size={13} className="text-cyan-500" />
            </div>
            <p className="text-xs text-cyan-700 dark:text-cyan-400 flex-1">
              Your <span className="font-black capitalize">{bestType}</span> works perform best — consider submitting more in that category.
            </p>
          </div>
        )}
      </div>

      {/* ── Stats grid ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map(({ label, value, icon: Icon, bg, text, href }) => (
          <Link key={label} href={href}
            className="group relative overflow-hidden p-4 rounded-2xl border border-border bg-card hover:border-teal-500/40 transition-all duration-200"
          >
            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center mb-3', bg)}>
              <Icon size={15} className={text} />
            </div>
            <p className="text-xl font-black tabular-nums">{formatNumber(value)}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
            <ArrowRight size={11} className="absolute bottom-3 right-3 text-muted-foreground/20 group-hover:text-muted-foreground/50 group-hover:translate-x-0.5 transition-all" />
          </Link>
        ))}
      </div>

      {/* ── 30-day pulse ─────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Flame size={14} className="text-orange-500" />
            <h2 className="text-xs font-black uppercase tracking-wider text-muted-foreground">30-Day Pulse</h2>
          </div>
          <Link href="/pro/creator/dashboard/analytics" className="text-xs text-teal-500 hover:underline flex items-center gap-0.5">
            Full analytics <ChevronRight size={11} />
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Views',   value: last30Views,   icon: Eye,      color: 'text-blue-500',    bg: 'bg-blue-500/10'    },
            { label: 'Saves',   value: last30Saves,   icon: Bookmark, color: 'text-violet-500',  bg: 'bg-violet-500/10'  },
            { label: 'Upvotes', value: last30Upvotes, icon: ThumbsUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="p-3 rounded-xl border border-teal-500/15 bg-teal-500/5 space-y-2">
              <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center', bg)}>
                <Icon size={13} className={color} />
              </div>
              <p className="text-lg font-black tabular-nums">{formatNumber(value)}</p>
              <p className="text-[10px] text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Audience snapshot ────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 rounded-2xl border border-border bg-card space-y-1">
          <div className="flex items-center gap-1.5 mb-2">
            <Users size={13} className="text-violet-500" />
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Audience</span>
          </div>
          <p className="text-2xl font-black tabular-nums">{formatNumber(followersCount ?? 0)}</p>
          <p className="text-[10px] text-muted-foreground">Total followers</p>
          {(newFollowersThisMonth ?? 0) > 0 && (
            <p className="text-[10px] text-emerald-600 font-semibold">+{newFollowersThisMonth} this month</p>
          )}
        </div>
        <div className="p-4 rounded-2xl border border-border bg-card space-y-1">
          <div className="flex items-center gap-1.5 mb-2">
            <Eye size={13} className="text-blue-500" />
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Profile Views</span>
          </div>
          <p className="text-2xl font-black tabular-nums">{formatNumber(profileViewsThisMonth ?? 0)}</p>
          <p className="text-[10px] text-muted-foreground">This month</p>
          <p className="text-[10px] text-muted-foreground">{formatNumber(profileViewsTotal ?? 0)} total</p>
        </div>
      </div>

      {/* ── Engagement rate ──────────────────────────────────────── */}
      <div className="p-4 rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Activity size={14} className="text-teal-500" />
            <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">Engagement Rate</span>
          </div>
          <span className="text-lg font-black text-teal-500 tabular-nums">{engagementRate}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-teal-500 to-cyan-400 transition-all duration-700"
            style={{ width: `${Math.min(parseFloat(engagementRate) * 10, 100)}%` }}
          />
        </div>
        <p className="text-[10px] text-muted-foreground mt-2">
          Save rate across all works · {formatNumber(totalViews)} total views, {formatNumber(totalSaves)} saves
        </p>
      </div>

      {/* ── Milestones ───────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Target size={14} className="text-violet-500" />
          <h2 className="text-xs font-black uppercase tracking-wider text-muted-foreground">Milestones</h2>
        </div>
        <div className="space-y-3">
          {/* Follower milestone */}
          <div className="p-3 rounded-xl border border-border bg-card space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold">Followers</span>
              <span className="text-[10px] text-muted-foreground tabular-nums">
                {formatNumber(followersCount ?? 0)} / {formatNumber(nextMilestone)}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-teal-500 transition-all duration-700"
                style={{ width: `${milestoneProgress}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground">
              {nextMilestone - (followersCount ?? 0)} more to reach {formatNumber(nextMilestone)} followers
            </p>
          </div>

          {/* Upvote milestone */}
          <div className="p-3 rounded-xl border border-border bg-card space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold">Total Upvotes</span>
              <span className="text-[10px] text-muted-foreground tabular-nums">
                {formatNumber(totalUpvotes)} / {formatNumber(nextUpvoteMilestone)}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-700"
                style={{ width: `${upvoteProgress}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground">
              {nextUpvoteMilestone - totalUpvotes} more upvotes to reach {formatNumber(nextUpvoteMilestone)}
            </p>
          </div>
        </div>
      </div>

      {/* ── Review sentiment ─────────────────────────────────────── */}
      {avgRating !== null && ratings.length > 0 && (
        <div className="p-4 rounded-2xl border border-border bg-card">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare size={14} className="text-amber-500" />
            <h2 className="text-xs font-black uppercase tracking-wider text-muted-foreground">Review Sentiment</h2>
            <div className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
              <Star size={10} className="fill-amber-400 text-amber-400" />
              <span className="text-xs font-black text-amber-600">{avgRating.toFixed(1)}</span>
              <span className="text-[10px] text-muted-foreground">/ 5</span>
            </div>
          </div>
          <div className="space-y-1.5">
            {ratingBreakdown.map(({ star, count, pct }) => (
              <div key={star} className="flex items-center gap-2">
                <div className="flex items-center gap-0.5 w-12 shrink-0">
                  {Array.from({ length: star }).map((_, i) => (
                    <Star key={i} size={8} className="fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-amber-400 transition-all duration-700"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground w-6 text-right tabular-nums shrink-0">{count}</span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground mt-3">{ratings.length} total reviews across all works</p>
        </div>
      )}

      {/* ── Work health scores ───────────────────────────────────── */}
      {worksWithHealth.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Award size={14} className="text-teal-500" />
              <h2 className="text-xs font-black uppercase tracking-wider text-muted-foreground">Work Health</h2>
            </div>
            <Link href="/pro/creator/dashboard/works" className="text-xs text-teal-500 hover:underline flex items-center gap-0.5">
              Manage <ChevronRight size={11} />
            </Link>
          </div>
          <div className="space-y-2">
            {worksWithHealth.map((work: any) => {
              const healthPct = (work.healthScore / maxHealth) * 100
              const healthColor = healthPct >= 70 ? 'from-emerald-500 to-teal-500'
                : healthPct >= 40 ? 'from-amber-400 to-orange-400'
                : 'from-rose-400 to-red-500'
              return (
                <div key={work.id} className="p-3 rounded-xl border border-border bg-card">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-11 rounded-md overflow-hidden bg-muted shrink-0">
                      {work.cover_url
                        ? <img src={`/api/image-proxy?url=${encodeURIComponent(work.cover_url)}`} alt={work.title} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center"><BookOpen size={9} className="text-muted-foreground/40" /></div>
                      }
                    </div>
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-black truncate">{work.title}</p>
                        <span className={cn(
                          'text-[9px] font-black px-1.5 py-0.5 rounded shrink-0',
                          work.is_approved ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
                        )}>
                          {work.is_approved ? '✓' : '⏳'}
                        </span>
                      </div>
                      <div className="h-1 rounded-full bg-muted overflow-hidden">
                        <div className={cn('h-full rounded-full bg-gradient-to-r transition-all duration-700', healthColor)}
                          style={{ width: `${healthPct}%` }} />
                      </div>
                      <div className="flex items-center gap-3 text-[9px] text-muted-foreground">
                        <span className="flex items-center gap-0.5"><ThumbsUp size={8} className="text-emerald-500" />{work.upvotes}</span>
                        <span className="flex items-center gap-0.5"><Bookmark size={8} className="text-violet-500" />{work.save_count}</span>
                        <span className="flex items-center gap-0.5"><MessageSquare size={8} className="text-blue-500" />{work.review_count}</span>
                        <span className="flex items-center gap-0.5"><Eye size={8} className="text-muted-foreground" />{formatNumber(work.view_count)}</span>
                      </div>
                    </div>
                    <Link href={`/comic/${work.id}`}>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 shrink-0">
                        <ExternalLink size={10} className="text-muted-foreground" />
                      </Button>
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Trending this week ───────────────────────────────────── */}
      {trendingWork.data && (
        <div className="p-4 rounded-2xl border border-orange-500/20 bg-orange-500/5">
          <div className="flex items-center gap-2 mb-3">
            <Flame size={14} className="text-orange-500" />
            <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">Trending This Week</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-14 rounded-lg overflow-hidden bg-muted shrink-0">
              {trendingWork.data.cover_url
                ? <img src={`/api/image-proxy?url=${encodeURIComponent(trendingWork.data.cover_url)}`} alt={trendingWork.data.title} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center"><BookOpen size={12} className="text-muted-foreground/40" /></div>
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black truncate">{trendingWork.data.title}</p>
              <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1"><ThumbsUp size={9} className="text-emerald-500" />{formatNumber(trendingWork.data.upvotes)}</span>
                <span className="flex items-center gap-1"><Eye size={9} className="text-blue-500" />{formatNumber(trendingWork.data.view_count)}</span>
              </div>
            </div>
            <Link href={`/comic/${trendingWork.data.id}`}>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0">
                <ExternalLink size={11} className="text-muted-foreground" />
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* ── Recent reviews ───────────────────────────────────────── */}
      {recentReviews && (recentReviews as any[]).length > 0 && (
        <div>
          <h2 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-3">Recent Reviews</h2>
          <div className="space-y-2">
            {(recentReviews as any[]).map((review: any) => (
              <div key={review.id} className="p-3 rounded-xl border border-border bg-card space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar className="h-5 w-5 shrink-0">
                      <AvatarImage src={review.profiles?.avatar_url ? review.profiles.avatar_url : undefined} />
                      <AvatarFallback className="text-[8px] bg-muted">{review.profiles?.username?.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className="text-[11px] font-semibold truncate">@{review.profiles?.username}</span>
                    {review.rating && (
                      <div className="flex items-center gap-0.5 shrink-0">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} size={8} className={i < review.rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/20'} />
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">{timeAgo(review.created_at)}</span>
                </div>
                <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">{review.content}</p>
                <p className="text-[10px] text-teal-500 font-semibold truncate">on "{review.recommendations?.title}"</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Creator links ────────────────────────────────────────── */}
      {hasLinks && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-black uppercase tracking-wider text-muted-foreground">Your Links</h2>
            <Link href="/pro/creator/dashboard/links" className="text-xs text-teal-500 hover:underline flex items-center gap-0.5">
              Edit <ChevronRight size={11} />
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {profile.comic_url && (
              <a href={profile.comic_url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-teal-500/30 bg-teal-500/10 text-teal-600 dark:text-teal-400 text-xs font-semibold hover:bg-teal-500/20 transition-colors"
              >
                <BookOpen size={11} />Read My Comic
              </a>
            )}
            {profile.patreon_url && (
              <a href={profile.patreon_url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-orange-500/30 bg-orange-500/10 text-orange-600 text-xs font-semibold hover:bg-orange-500/20 transition-colors"
              >
                🎨 Patreon
              </a>
            )}
            {profile.kickstarter_url && (
              <a href={profile.kickstarter_url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-green-500/30 bg-green-500/10 text-green-600 text-xs font-semibold hover:bg-green-500/20 transition-colors"
              >
                🚀 Kickstarter
              </a>
            )}
          </div>
        </div>
      )}

      {/* ── Pro status footer ────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-teal-500/20 bg-teal-500/5 p-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center shrink-0">
            <Zap size={14} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black text-teal-700 dark:text-teal-400">
              {isAdmin ? 'Admin — lifetime access' : profile.pro_expires_at ? `Pro Creator until ${formatDate(profile.pro_expires_at)}` : 'Pro Creator — lifetime access'}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Analytics, milestones, sentiment tracking & priority review</p>
          </div>
          <Link href="/pro/creator/dashboard/analytics">
            <Button variant="outline" size="sm" className="shrink-0 border-teal-500/30 text-teal-600 h-7 text-xs px-2.5 gap-1">
              <BarChart2 size={11} />Analytics
            </Button>
          </Link>
        </div>
      </div>

    </div>
  )
}