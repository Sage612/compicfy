import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ProAvatar } from '@/components/pro/ProAvatar'
import { ProBadge } from '@/components/pro/ProBadge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  BookOpen, Users, ThumbsUp, Eye, Bookmark,
  ArrowRight, Plus, Link as LinkIcon, Settings,
  Star, Crown, Zap, ChevronRight, BarChart2,
  TrendingUp, ExternalLink, Palette,
} from 'lucide-react'
import { formatDate, formatNumber, timeAgo } from '@/lib/utils/format'
import { cn } from '@/lib/utils'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Pro Creator Dashboard' }

export default async function ProCreatorDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileData } = await supabase
    .from('profiles').select('*').eq('id', user.id).single()

  if (!profileData) redirect('/login')
  const profile = profileData as any

  const isAdmin = profile.role === 'admin'
  const isPro   = isAdmin ||
    (profile.is_pro && (!profile.pro_expires_at || new Date(profile.pro_expires_at) > new Date()))

  if (!isPro) redirect('/pricing?reason=pro_required')

  const [
    { data: works, count: worksCount },
    { count: followersCount },
    { count: viewsThisMonth },
    { data: recentReviews },
    { data: analyticsData },
  ] = await Promise.all([
    supabase
      .from('recommendations')
      .select('id, title, cover_url, type, upvotes, save_count, view_count, review_count, score, created_at, is_approved', { count: 'exact' })
      .eq('user_id', user.id)
      .order('score', { ascending: false })
      .limit(5),
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', user.id),
    (supabase as any).from('profile_views').select('*', { count: 'exact', head: true }).eq('profile_id', user.id)
      .gte('viewed_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
    supabase
      .from('reviews')
      .select('id, content, rating, created_at, recommendation_id, profiles!reviews_user_id_fkey(username, avatar_url), recommendations(title)')
      .in('recommendation_id',
        await supabase.from('recommendations').select('id').eq('user_id', user.id)
          .then(r => (r.data ?? []).map((x: any) => x.id))
      )
      .order('created_at', { ascending: false })
      .limit(4),
    supabase
      .from('recommendation_analytics')
      .select('views, saves, upvotes, date')
      .in('recommendation_id',
        await supabase.from('recommendations').select('id').eq('user_id', user.id)
          .then(r => (r.data ?? []).map((x: any) => x.id))
      )
      .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('date', { ascending: false }),
  ])

  const totalUpvotes   = (works ?? []).reduce((s: number, w: any) => s + (w.upvotes ?? 0), 0)
  const totalViews     = (works ?? []).reduce((s: number, w: any) => s + (w.view_count ?? 0), 0)
  const totalSaves     = (works ?? []).reduce((s: number, w: any) => s + (w.save_count ?? 0), 0)
  const last30Views    = (analyticsData ?? []).reduce((s: number, a: any) => s + (a.views ?? 0), 0)
  const initials       = (profile.display_name || profile.username).slice(0, 2).toUpperCase()
  const hasLinks       = profile.patreon_url || profile.kickstarter_url || profile.comic_url

  const stats = [
    { label: 'Works Submitted',  value: worksCount ?? 0,      icon: BookOpen,  bg: 'bg-teal-500/10',   text: 'text-teal-500',   href: '/pro/creator/dashboard/works'    },
    { label: 'Followers',        value: followersCount ?? 0,  icon: Users,     bg: 'bg-violet-500/10', text: 'text-violet-500', href: '/pro/creator/dashboard/audience' },
    { label: 'Total Upvotes',    value: totalUpvotes,         icon: ThumbsUp,  bg: 'bg-emerald-500/10',text: 'text-emerald-500',href: '/pro/creator/dashboard/analytics'},
    { label: 'Views (30 days)',  value: last30Views,          icon: TrendingUp,bg: 'bg-blue-500/10',   text: 'text-blue-500',   href: '/pro/creator/dashboard/analytics'},
  ]

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">

      {/* Pro creator banner — teal + gold gradient */}
      <div className="relative overflow-hidden rounded-2xl border border-teal-500/30 bg-gradient-to-br from-teal-500/10 via-cyan-500/5 to-amber-500/5 p-6 md:p-8">
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-teal-500/10 blur-2xl pointer-events-none" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-teal-500/40 to-transparent" />
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <ProAvatar src={profile.avatar_url ? `/api/image-proxy?url=${encodeURIComponent(profile.avatar_url)}` : fallback} fallback={initials} size="lg" isPro={isPro} isAdmin={isAdmin} />
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-black truncate">{profile.display_name || profile.username}</h1>
              <ProBadge role={profile.role} isPro={isPro} />
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/25">
                <Palette size={9} />Pro Creator
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {isAdmin ? 'Admin · Lifetime Pro access' : <>Pro Creator · {profile.pro_expires_at ? `Renews ${formatDate(profile.pro_expires_at)}` : 'Lifetime access'}</>}
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Link href="/pro/creator/dashboard/settings">
              <Button variant="outline" size="sm" className="gap-1.5 border-teal-500/30 hover:border-teal-500/60">
                <Settings size={13} />Settings
              </Button>
            </Link>
            <Link href="/pro/creator/dashboard/works/new">
              <Button size="sm" className="gap-1.5 bg-teal-500 hover:bg-teal-600 border-0 text-white">
                <Plus size={13} />Add Work
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Support links alert */}
      {!hasLinks && (
        <div className="flex items-start gap-4 p-4 rounded-2xl border border-teal-500/30 bg-teal-500/5">
          <div className="w-9 h-9 rounded-xl bg-teal-500/15 flex items-center justify-center shrink-0">
            <LinkIcon size={16} className="text-teal-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black text-teal-700 dark:text-teal-400">Add your creator links</p>
            <p className="text-xs text-muted-foreground mt-0.5">Let readers support you on Patreon, Kickstarter, or your comic platform.</p>
          </div>
          <Link href="/pro/creator/dashboard/links">
            <Button size="sm" variant="outline" className="shrink-0 border-teal-500/30 text-teal-600 hover:bg-teal-500/10 gap-1.5">
              Add Links <ArrowRight size={12} />
            </Button>
          </Link>
        </div>
      )}

      {/* Stats */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Your Stats</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {stats.map(({ label, value, icon: Icon, bg, text, href }) => (
            <Link key={label} href={href}
              className="group relative overflow-hidden p-4 rounded-2xl border border-border bg-card hover:border-teal-500/40 hover:shadow-lg transition-all duration-200"
            >
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-3', bg)}>
                <Icon size={18} className={text} />
              </div>
              <p className="text-2xl font-black tabular-nums">{formatNumber(value)}</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{label}</p>
              <ArrowRight size={12} className="absolute bottom-4 right-4 text-muted-foreground/30 group-hover:text-muted-foreground/60 group-hover:translate-x-0.5 transition-all" />
            </Link>
          ))}
        </div>
      </div>

      {/* Pro analytics teaser */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Analytics</h2>
          <Link href="/pro/creator/dashboard/analytics" className="text-xs text-teal-500 hover:underline flex items-center gap-1">
            Full analytics <ChevronRight size={12} />
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total Views',  value: formatNumber(totalViews),  icon: Eye,      color: 'text-blue-500',   bg: 'bg-blue-500/10'   },
            { label: 'Total Saves',  value: formatNumber(totalSaves),  icon: Bookmark, color: 'text-violet-500', bg: 'bg-violet-500/10' },
            { label: 'Profile Views',value: viewsThisMonth ?? 0,      icon: Users,    color: 'text-teal-500',   bg: 'bg-teal-500/10'   },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className={cn('p-4 rounded-2xl border border-teal-500/20 space-y-2', 'bg-teal-500/5')}>
              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', bg)}>
                <Icon size={15} className={color} />
              </div>
              <p className="text-xl font-black tabular-nums">{value}</p>
              <p className="text-[10px] text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Works */}
      {works && works.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Your Works</h2>
            <Link href="/pro/creator/dashboard/works" className="text-xs text-teal-500 hover:underline flex items-center gap-1">
              Manage all <ChevronRight size={12} />
            </Link>
          </div>
          <div className="space-y-2">
            {(works as any[]).map((work: any) => (
              <div key={work.id} className="group flex items-center gap-3 p-3 rounded-2xl border border-border bg-card hover:border-teal-500/30 transition-colors">
                <div className="w-10 h-14 rounded-lg overflow-hidden bg-muted shrink-0">
                  {work.cover_url
                    ? <img src={`/api/image-proxy?url=${encodeURIComponent(work.cover_url)}`} alt={work.title} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center"><BookOpen size={12} className="text-muted-foreground opacity-40" /></div>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black line-clamp-1">{work.title}</p>
                  <span className={cn('inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold capitalize mt-0.5',
                    work.is_approved ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
                  )}>
                    {work.is_approved ? 'Approved' : 'Pending'}
                  </span>
                </div>
                <div className="flex gap-3 text-[10px] text-muted-foreground shrink-0">
                  <span className="flex items-center gap-1"><ThumbsUp size={9} className="text-emerald-500" />{work.upvotes}</span>
                  <span className="flex items-center gap-1"><Eye size={9} className="text-blue-500" />{formatNumber(work.view_count)}</span>
                  <span className="flex items-center gap-1"><Bookmark size={9} className="text-violet-500" />{work.save_count}</span>
                </div>
                <Link href={`/comic/${work.id}`}>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0">
                    <ExternalLink size={12} className="text-muted-foreground" />
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent reviews */}
      {recentReviews && recentReviews.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Recent Reviews on Your Works</h2>
          <div className="space-y-2">
            {(recentReviews as any[]).map((review: any) => (
              <div key={review.id} className="p-3 rounded-2xl border border-border bg-card space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar className="h-6 w-6 shrink-0">
                      <AvatarImage src={review.profiles?.avatar_url ? `/api/image-proxy?url=${encodeURIComponent(review.profiles.avatar_url)}` : undefined} />
                      <AvatarFallback className="text-[9px] bg-muted">{review.profiles?.username?.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-semibold truncate">@{review.profiles?.username}</span>
                    {review.rating && (
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: review.rating }).map((_, i) => (
                          <Star key={i} size={9} className="fill-amber-400 text-amber-400" />
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">{timeAgo(review.created_at)}</span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{review.content}</p>
                <p className="text-[10px] text-teal-500 font-semibold">on "{review.recommendations?.title}"</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pro status */}
      <div className="relative overflow-hidden rounded-2xl border border-teal-500/20 bg-teal-500/5 p-5">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center shrink-0 shadow-sm">
            <Zap size={18} className="text-white" />
          </div>
          <div className="flex-1 space-y-1">
            <p className="font-black text-sm text-teal-700 dark:text-teal-400">
              {isAdmin ? 'Admin — lifetime access' : profile.pro_expires_at ? `Pro Creator until ${formatDate(profile.pro_expires_at)}` : 'Pro Creator — lifetime access'}
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Deep analytics, unlimited works, audience insights, and priority review for your submissions.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

