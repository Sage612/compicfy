import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  BookOpen, Users, ThumbsUp, Eye, Bookmark,
  ArrowRight, Plus, Link as LinkIcon, Settings,
  Star, MessageSquare, ChevronRight, ExternalLink,
  Palette, TrendingUp, Target, Zap,
} from 'lucide-react'
import { formatDate, formatNumber, timeAgo } from '@/lib/utils/format'
import { cn } from '@/lib/utils'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Creator Studio' }

export default async function CreatorDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileData } = await supabase
    .from('profiles').select('*').eq('id', user.id).single()
  if (!profileData) redirect('/login')
  const profile = profileData as any

  const workIds = await supabase
    .from('recommendations').select('id').eq('user_id', user.id)
    .then(r => (r.data ?? []).map((x: any) => x.id))

  const [
    { data: works, count: worksCount },
    { count: followersCount },
    { data: recentReviews },
    topWork,
  ] = await Promise.all([
    supabase
      .from('recommendations')
      .select('id, title, cover_url, type, upvotes, save_count, view_count, review_count, score, is_approved, created_at', { count: 'exact' })
      .eq('user_id', user.id)
      .order('score', { ascending: false })
      .limit(5),
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', user.id),
    workIds.length > 0
      ? supabase
          .from('reviews')
          .select('id, content, rating, created_at, profiles!reviews_user_id_fkey(username, avatar_url), recommendations(title)')
          .in('recommendation_id', workIds)
          .order('created_at', { ascending: false })
          .limit(3)
      : Promise.resolve({ data: [] }),
    (supabase
      .from('recommendations')
      .select('id, title, cover_url, upvotes, view_count, save_count, score')
      .eq('user_id', user.id)
      .eq('is_approved', true)
      .order('score', { ascending: false })
      .limit(1)
      .single() as any),
  ])

  const totalUpvotes = (works ?? []).reduce((s: number, w: any) => s + (w.upvotes ?? 0), 0)
  const totalViews   = (works ?? []).reduce((s: number, w: any) => s + (w.view_count ?? 0), 0)
  const totalSaves   = (works ?? []).reduce((s: number, w: any) => s + (w.save_count ?? 0), 0)
  const avgRating    = recentReviews && recentReviews.length > 0
    ? (recentReviews as any[]).filter(r => r.rating).reduce((s: number, r: any) => s + r.rating, 0) /
      (recentReviews as any[]).filter(r => r.rating).length
    : null

  const initials  = (profile.display_name || profile.username).slice(0, 2).toUpperCase()
  const hasLinks  = profile.patreon_url || profile.kickstarter_url || profile.comic_url
  const isPending = (works ?? []).some((w: any) => !w.is_approved)

  const stats = [
    { label: 'Works',     value: worksCount ?? 0,    icon: BookOpen,   bg: 'bg-teal-500/10',    text: 'text-teal-500',    href: '/creator/dashboard/works'    },
    { label: 'Followers', value: followersCount ?? 0, icon: Users,     bg: 'bg-violet-500/10',  text: 'text-violet-500',  href: '/creator/dashboard/audience' },
    { label: 'Upvotes',   value: totalUpvotes,        icon: ThumbsUp,  bg: 'bg-emerald-500/10', text: 'text-emerald-500', href: '/creator/dashboard/works'    },
    { label: 'Views',     value: totalViews,          icon: Eye,       bg: 'bg-blue-500/10',    text: 'text-blue-500',    href: '/creator/dashboard/works'    },
  ]

  // Milestone config
  const followerMilestones = [10, 50, 100, 500, 1000]
  const nextMilestone = followerMilestones.find(m => m > (followersCount ?? 0)) ?? 1000
  const milestoneProgress = Math.min(((followersCount ?? 0) / nextMilestone) * 100, 100)

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">

      {/* ── Studio header ───────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-teal-500/30 bg-gradient-to-br from-teal-500/10 via-cyan-500/5 to-transparent p-5 md:p-7">
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-teal-500/10 blur-2xl pointer-events-none" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-teal-500/40 to-transparent" />

        <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="relative shrink-0">
            <div className="absolute -inset-1 rounded-full bg-teal-500/20 blur-sm" />
            <Avatar className="relative h-14 w-14 border-2 border-teal-500/40">
              <AvatarImage src={profile.avatar_url ? profile.avatar_url : undefined} />
              <AvatarFallback className="text-lg bg-teal-500 text-white font-bold">{initials}</AvatarFallback>
            </Avatar>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-black truncate">{profile.display_name || profile.username}</h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/25">
                <Palette size={8} />Creator
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Studio · since {formatDate(profile.member_since)}</p>
            {profile.bio && <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{profile.bio}</p>}
          </div>

          <div className="flex gap-2 shrink-0 w-full sm:w-auto">
            <Link href="/creator/dashboard/settings" className="flex-1 sm:flex-none">
              <Button variant="outline" size="sm" className="w-full sm:w-auto gap-1.5 border-teal-500/30 hover:border-teal-500/60 h-8 text-xs">
                <Settings size={12} />Settings
              </Button>
            </Link>
            <Link href="/creator/dashboard/works/new" className="flex-1 sm:flex-none">
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
            <Link href="/creator/dashboard/links">
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
            <Link href="/creator/dashboard/works">
              <Button size="sm" variant="outline" className="shrink-0 border-amber-500/30 text-amber-600 hover:bg-amber-500/10 h-7 text-xs px-2.5">
                View <ChevronRight size={11} />
              </Button>
            </Link>
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

      {/* ── Follower milestone ───────────────────────────────────── */}
      <div className="p-4 rounded-2xl border border-border bg-card space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target size={14} className="text-violet-500" />
            <span className="text-xs font-black">Follower Milestone</span>
          </div>
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
          {nextMilestone - (followersCount ?? 0)} more followers to reach {formatNumber(nextMilestone)}
        </p>
      </div>

      {/* ── Top performing work ──────────────────────────────────── */}
      {topWork.data && (
        <div className="p-4 rounded-2xl border border-border bg-card">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={14} className="text-teal-500" />
            <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">Top Performing Work</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-14 rounded-lg overflow-hidden bg-muted shrink-0">
              {topWork.data.cover_url
                ? <img src={`/api/image-proxy?url=${encodeURIComponent(topWork.data.cover_url)}`} alt={topWork.data.title} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center"><BookOpen size={12} className="text-muted-foreground/40" /></div>
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black truncate">{topWork.data.title}</p>
              <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1"><ThumbsUp size={9} className="text-emerald-500" />{formatNumber(topWork.data.upvotes)}</span>
                <span className="flex items-center gap-1"><Eye size={9} className="text-blue-500" />{formatNumber(topWork.data.view_count)}</span>
                <span className="flex items-center gap-1"><Bookmark size={9} className="text-violet-500" />{formatNumber(topWork.data.save_count)}</span>
              </div>
            </div>
            <Link href={`/comic/${topWork.data.id}`}>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0">
                <ExternalLink size={12} className="text-muted-foreground" />
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* ── Works list ──────────────────────────────────────────── */}
      {works && works.length > 0 ? (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-black uppercase tracking-wider text-muted-foreground">Your Works</h2>
            <Link href="/creator/dashboard/works" className="text-xs text-teal-500 hover:underline flex items-center gap-0.5">
              Manage all <ChevronRight size={11} />
            </Link>
          </div>
          <div className="space-y-2">
            {(works as any[]).map((work: any) => (
              <div key={work.id} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:border-teal-500/30 transition-colors">
                <div className="w-9 h-12 rounded-lg overflow-hidden bg-muted shrink-0">
                  {work.cover_url
                    ? <img src={`/api/image-proxy?url=${encodeURIComponent(work.cover_url)}`} alt={work.title} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center"><BookOpen size={10} className="text-muted-foreground/40" /></div>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black truncate">{work.title}</p>
                  <span className={cn('inline-flex mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold',
                    work.is_approved ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
                  )}>
                    {work.is_approved ? '✓ Approved' : '⏳ Pending'}
                  </span>
                </div>
                <div className="hidden sm:flex gap-3 text-[10px] text-muted-foreground shrink-0">
                  <span className="flex items-center gap-1"><ThumbsUp size={9} className="text-emerald-500" />{work.upvotes}</span>
                  <span className="flex items-center gap-1"><Eye size={9} className="text-blue-500" />{formatNumber(work.view_count)}</span>
                  <span className="flex items-center gap-1"><Bookmark size={9} className="text-violet-500" />{work.save_count}</span>
                </div>
                <Link href={`/comic/${work.id}`}>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0">
                    <ExternalLink size={11} className="text-muted-foreground" />
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-2xl border border-dashed border-teal-500/30 bg-teal-500/5 p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-teal-500/15 flex items-center justify-center mx-auto">
            <BookOpen size={22} className="text-teal-500" />
          </div>
          <div>
            <p className="font-black text-sm">Share your first work</p>
            <p className="text-xs text-muted-foreground mt-1">Submit a comic you created and let the community discover it.</p>
          </div>
          <Link href="/creator/dashboard/works/new">
            <Button size="sm" className="gap-1.5 bg-teal-500 hover:bg-teal-600 border-0 text-white">
              <Plus size={12} />Submit Your Work
            </Button>
          </Link>
        </div>
      )}

      {/* ── Recent reviews ───────────────────────────────────────── */}
      {recentReviews && (recentReviews as any[]).length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-black uppercase tracking-wider text-muted-foreground">Recent Reviews</h2>
              {avgRating && (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                  <Star size={9} className="fill-amber-400 text-amber-400" />
                  <span className="text-[10px] font-black text-amber-600">{avgRating.toFixed(1)}</span>
                </div>
              )}
            </div>
          </div>
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

      {/* ── Pro upgrade CTA ─────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-teal-500/20 bg-gradient-to-br from-teal-500/5 to-transparent p-5">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center shrink-0">
            <Zap size={16} className="text-white" />
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <p className="font-black text-sm">Unlock Pro Creator</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Deep analytics, audience insights, milestone tracking, review sentiment, engagement rates, and priority review queue.
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {['Deep analytics', 'Engagement rates', 'Audience insights', 'Priority review'].map(f => (
                <span key={f} className="px-2 py-0.5 rounded-full text-[10px] bg-teal-500/10 text-teal-600 border border-teal-500/20 font-medium">{f}</span>
              ))}
            </div>
          </div>
        </div>
        <Link href="/pricing" className="block mt-4">
          <Button size="sm" className="w-full gap-1.5 bg-teal-500 hover:bg-teal-600 border-0 text-white">
            Upgrade to Pro Creator <ArrowRight size={12} />
          </Button>
        </Link>
      </div>

      {/* ── Support links ────────────────────────────────────────── */}
      {hasLinks && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-black uppercase tracking-wider text-muted-foreground">Your Links</h2>
            <Link href="/creator/dashboard/links" className="text-xs text-teal-500 hover:underline flex items-center gap-0.5">
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
    </div>
  )
}