import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ProAvatar } from '@/components/pro/ProAvatar'
import { VerifiedBadge } from '@/components/pro/VerifiedBadge'
import { ProBadge } from '@/components/pro/ProBadge'
import { ProfileCompletionBanner } from '@/components/dashboard/ProfileCompletionBanner'
import { CurrentlyReadingSection } from '@/components/recommendations/CurrentlyReadingSection'
import { Button } from '@/components/ui/button'
import {
  Crown, BarChart2, Eye, Download, Trophy,
  BookOpen, Bookmark, ThumbsUp, ArrowRight,
  Sparkles, Zap, ChevronRight, Plus, Settings,
  LayoutList, BookMarked, Flame, Users, UserPlus,
} from 'lucide-react'
import { formatDate, formatNumber, timeAgo } from '@/lib/utils/format'
import { cn } from '@/lib/utils'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Pro Dashboard' }

const TYPE_COLORS: Record<string, string> = {
  manga:   'bg-rose-500/10   text-rose-500   border-rose-500/20',
  manhwa:  'bg-violet-500/10 text-violet-500 border-violet-500/20',
  manhua:  'bg-amber-500/10  text-amber-500  border-amber-500/20',
  webtoon: 'bg-teal-500/10   text-teal-500   border-teal-500/20',
  comic:   'bg-blue-500/10   text-blue-500   border-blue-500/20',
}

export default async function ProDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileData } = await (supabase as any)
    .from('profiles').select('*').eq('id', user.id).single()

  if (!profileData) redirect('/login')
  const profile = profileData as any

  const isAdmin = profile.role === 'admin'
  const isPro   = isAdmin ||
    (profile.is_pro && (!profile.pro_expires_at || new Date(profile.pro_expires_at) > new Date()))

  if (!isPro) redirect('/pricing?reason=pro_required')

  const { data: followData } = await supabase
    .from('follows').select('following_id').eq('follower_id', user.id)

  const followingIds = (followData ?? []).map((f: any) => f.following_id)

  const [
    { count: totalRecs },
    { count: savedCount },
    { count: listsCount },
    { count: followingCount },
    { data: topRecs },
    { data: leaderboardData },
    { count: viewsThisMonth },
    { data: currentlyReading },
    { data: rawFeedItems },
    { data: listsForTracker },
  ] = await Promise.all([
    supabase.from('recommendations').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_approved', true),
    supabase.from('saves').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('reading_lists').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', user.id),
    supabase.from('recommendations').select('id, title, cover_url, upvotes, save_count, view_count, type').eq('user_id', user.id).eq('is_approved', true).order('score', { ascending: false }).limit(3),
    (supabase as any).from('pro_leaderboard').select('rank, score').eq('user_id', user.id).order('month', { ascending: false }).limit(1).maybeSingle(),
    (supabase as any).from('profile_views').select('*', { count: 'exact', head: true }).eq('profile_id', user.id).gte('viewed_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
    supabase.from('reading_list_items')
      .select('id, list_id, status, progress_chapter, last_read_at, added_at, reading_lists!inner(user_id), recommendations(id, title, cover_url, type, status, chapter_count)')
      .eq('reading_lists.user_id', user.id).eq('status', 'reading')
      .order('added_at', { ascending: false }).limit(6),
    followingIds.length > 0
      ? (supabase as any)
          .from('recommendations')
          .select(`
            id, title, cover_url, type, created_at, user_id,
            profiles!recommendations_user_id_fkey(username, display_name, avatar_url)
          `)
          .in('user_id', followingIds)
          .eq('is_approved', true)
          .not('content_rating', 'in', '("adult","mature")')
          .order('created_at', { ascending: false })
          .limit(4)
      : Promise.resolve({ data: [] }),
    (supabase as any).from('reading_lists').select('id, name').eq('user_id', user.id).order('created_at', { ascending: false }),
  ])

  const feedItems = (rawFeedItems ?? []).map((r: any) => {
    const p = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles
    return { ...r, profiles: p ?? null }
  })

  const leaderboardEntry  = leaderboardData as { rank: number; score: number } | null
  const initials          = (profile.display_name || profile.username || 'U').slice(0, 2).toUpperCase()
  const isFollowingNobody = (followingCount ?? 0) === 0
  const hasReadingItems   = (currentlyReading ?? []).length > 0

  const proTools = [
    { href: '/pro/analytics',     icon: BarChart2, label: 'View Analytics',  desc: 'See your rec performance',          color: 'bg-violet-500/10', text: 'text-violet-500' },
    { href: '/pro/profile-views', icon: Eye,       label: 'Profile Views',   desc: `${viewsThisMonth ?? 0} this month`, color: 'bg-blue-500/10',   text: 'text-blue-500'   },
    { href: '/pro/export',        icon: Download,  label: 'Export Lists',    desc: 'Download as CSV or PDF',            color: 'bg-primary/10',    text: 'text-primary'    },
    { href: '/pro/leaderboard',   icon: Trophy,    label: 'Leaderboard',     desc: leaderboardEntry?.rank ? `Rank #${leaderboardEntry.rank}` : 'See your rank', color: 'bg-amber-500/10', text: 'text-amber-500' },
  ]

  const quickActions = [
    { href: '/pro/recommendations/new', icon: Plus,       label: 'Submit a Recommendation', desc: 'Share a comic with the community', bg: 'bg-primary/10',    text: 'text-primary'    },
    { href: '/feed',                           icon: LayoutList, label: 'Following Feed',           desc: 'Latest from people you follow',   bg: 'bg-violet-500/10', text: 'text-violet-500' },
    { href: '/pro/lists',                      icon: BookMarked, label: 'Reading Lists',            desc: 'Manage your reading collection',  bg: 'bg-teal-500/10',   text: 'text-teal-500'   },
    { href: '/browse',                         icon: Flame,      label: 'Browse Comics',            desc: 'Discover new recommendations',    bg: 'bg-rose-500/10',   text: 'text-rose-500'   },
  ]

  const statsRow1 = [
    { label: 'Recommendations', value: totalRecs ?? 0,      icon: BookOpen,   color: 'text-violet-500', bg: 'bg-violet-500/10', href: '/pro/recommendations' },
    { label: 'Saved Comics',     value: savedCount ?? 0,     icon: Bookmark,   color: 'text-primary',    bg: 'bg-primary/10',    href: '/pro/saved'           },
    { label: 'Reading Lists',    value: listsCount ?? 0,     icon: BookMarked, color: 'text-teal-500',   bg: 'bg-teal-500/10',   href: '/pro/lists'           },
    { label: 'Following',        value: followingCount ?? 0, icon: Users,      color: 'text-primary',    bg: 'bg-primary/10',    href: '/feed'                },
  ]

  const statsRow2 = [
    { label: 'Profile Views', value: viewsThisMonth ?? 0, icon: Eye,   color: 'text-blue-500',  bg: 'bg-blue-500/10'  },
    { label: 'Leaderboard',   value: leaderboardEntry?.rank ? `#${leaderboardEntry.rank}` : '—', icon: Trophy, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  ]

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">

      {/* Gold welcome banner */}
      <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent p-6 md:p-8">
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-amber-500/10 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-orange-500/10 blur-xl pointer-events-none" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <ProAvatar src={profile.avatar_url} fallback={initials} size="lg" isPro={isPro} isAdmin={isAdmin} />
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-black truncate">Hey, {profile.display_name || profile.username}! </h1>
              <ProBadge role={profile.role} isPro={isPro} />
              {profile.verified_recommender && <VerifiedBadge />}
            </div>
            <p className="text-sm text-muted-foreground">
              {isAdmin
                ? 'Admin · Lifetime Pro access'
                : <>Pro since {formatDate(profile.member_since)} · {profile.pro_expires_at ? `Renews ${formatDate(profile.pro_expires_at)}` : 'Lifetime access'}</>
              }
            </p>
            {leaderboardEntry?.rank && (
              <p className="text-xs text-amber-600 font-semibold flex items-center gap-1">
                <Trophy size={11} />
                Leaderboard Rank #{leaderboardEntry.rank} this month
              </p>
            )}
          </div>
          <div className="flex gap-2 shrink-0">
            <Link href="/pro/settings">
              <Button variant="outline" size="sm" className="gap-1.5 border-amber-500/30 hover:border-amber-500/60">
                <Settings size={13} />
                Settings
              </Button>
            </Link>
            <Link href="/pro/recommendations/new">
              <Button size="sm" className="gap-1.5 bg-gradient-to-r from-amber-400 to-orange-500 border-0 text-white shadow-md shadow-amber-500/20">
                <BookOpen size={13} />
                Recommend
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <ProfileCompletionBanner hasAvatar={!!profile.avatar_url} hasBio={!!profile.bio} hasWebsite={!!profile.website} />

      {/* Stats row 1 */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Your Stats</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {statsRow1.map(({ label, value, icon: Icon, color, bg, href }) => (
            <Link key={label} href={href} className="group p-4 rounded-2xl border border-border bg-card hover:border-primary/40 hover:shadow-lg transition-all duration-200">
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-3', bg)}>
                <Icon size={18} className={color} />
              </div>
              <p className="text-2xl font-black tabular-nums">{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{label}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Stats row 2 */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Pro Stats</h2>
        <div className="grid grid-cols-2 gap-3">
          {statsRow2.map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="p-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 space-y-3">
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', bg)}>
                <Icon size={18} className={color} />
              </div>
              <p className="text-2xl font-black tabular-nums">{value}</p>
              <p className="text-xs text-muted-foreground leading-tight">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Pro Tools */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Pro Tools</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {proTools.map(({ href, icon: Icon, label, desc, color, text }) => (
            <Link key={href} href={href}>
              <div className="group flex items-center gap-4 p-4 rounded-2xl border border-border bg-card hover:border-amber-500/40 hover:shadow-md transition-all duration-200 cursor-pointer">
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform', color)}>
                  <Icon size={17} className={text} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold group-hover:text-amber-600 transition-colors">{label}</p>
                  <p className="text-xs text-muted-foreground truncate">{desc}</p>
                </div>
                <ArrowRight size={14} className="text-muted-foreground/30 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all shrink-0" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Top performing recs */}
      {topRecs && topRecs.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Top Recommendations</h2>
            <Link href="/pro/analytics" className="text-xs text-amber-500 hover:underline flex items-center gap-1">
              Full analytics <ChevronRight size={12} />
            </Link>
          </div>
          <div className="space-y-2">
            {(topRecs as any[]).map((rec: any, i: number) => (
              <Link key={rec.id} href={`/comic/${rec.id}`} className="group flex items-center gap-3 p-3 rounded-2xl border border-border bg-card hover:border-amber-500/30 transition-colors">
                <span className="text-lg font-black text-muted-foreground/30 w-6 shrink-0">#{i + 1}</span>
                <div className="w-10 h-14 rounded-lg overflow-hidden bg-muted shrink-0">
                  {rec.cover_url
                    ? <img src={rec.cover_url} alt={rec.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    : <div className="w-full h-full flex items-center justify-center"><BookOpen size={12} className="text-muted-foreground opacity-40" /></div>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black line-clamp-1 group-hover:text-amber-600 transition-colors">{rec.title}</p>
                  <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold border capitalize mt-1', TYPE_COLORS[rec.type] ?? 'bg-muted text-muted-foreground border-border')}>
                    {rec.type}
                  </span>
                </div>
                <div className="flex gap-3 text-xs text-muted-foreground shrink-0">
                  <span className="flex items-center gap-1"><ThumbsUp size={10} className="text-emerald-500" />{rec.upvotes}</span>
                  <span className="flex items-center gap-1"><Bookmark size={10} className="text-blue-500" />{rec.save_count}</span>
                  <span className="flex items-center gap-1"><Eye size={10} className="text-violet-500" />{formatNumber(rec.view_count)}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Reading tracker */}
      {!hasReadingItems ? (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Reading Tracker</h2>
          <div className="relative overflow-hidden rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-6 text-center space-y-4">
            <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-primary/10 blur-2xl pointer-events-none" />
            <div className="w-12 h-12 rounded-2xl bg-primary/15 flex items-center justify-center mx-auto">
              <BookOpen size={20} className="text-primary" />
            </div>
            <div>
              <p className="font-black text-sm">What are you reading right now?</p>
              <p className="text-xs text-muted-foreground mt-1">Track your progress and never lose your place.</p>
            </div>
            <div className="flex gap-3 justify-center">
              <Link href="/browse">
                <Button size="sm" className="gap-1.5">
                  <BookOpen size={13} />
                  Find something to read
                </Button>
              </Link>
              <Link href="/pro/lists">
                <Button size="sm" variant="outline" className="gap-1.5 border-primary/30 hover:border-primary/60 text-primary">
                  <BookMarked size={13} />
                  My Lists
                </Button>
              </Link>
            </div>
          </div>
          <CurrentlyReadingSection initialItems={[]} lists={(listsForTracker ?? [])} listsHref="/pro/lists" />
        </div>
      ) : (
        <CurrentlyReadingSection
          initialItems={(currentlyReading ?? [])}
          lists={(listsForTracker ?? [])}
          listsHref="/pro/lists"
        />
      )}

      {/* Following feed */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">From People You Follow</h2>
          {!isFollowingNobody && (
            <Link href="/feed" className="text-xs text-primary hover:underline flex items-center gap-1">
              View all <ChevronRight size={12} />
            </Link>
          )}
        </div>

        {isFollowingNobody ? (
          <div className="relative overflow-hidden rounded-2xl border border-dashed border-primary/20 bg-primary/5 p-6 text-center space-y-4">
            <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-primary/10 blur-2xl pointer-events-none" />
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
              <UserPlus size={20} className="text-primary" />
            </div>
            <div>
              <p className="font-black text-sm">Follow readers you trust</p>
              <p className="text-xs text-muted-foreground mt-1">Their recommendations will appear here.</p>
            </div>
            <Link href="/feed?tab=discover">
              <Button size="sm" className="gap-1.5">
                <UserPlus size={13} />
                Discover Readers
              </Button>
            </Link>
          </div>
        ) : feedItems.length > 0 ? (
          <div className="space-y-2">
            {feedItems.map((rec: any) => {
              const p = rec.profiles
              return (
                <Link key={rec.id} href={`/comic/${rec.id}`} className="group flex items-center gap-3 p-3 rounded-2xl border border-border bg-card hover:border-primary/30 transition-colors">
                  <div className="w-10 h-14 rounded-lg overflow-hidden bg-muted shrink-0">
                    {rec.cover_url
                      ? <img src={rec.cover_url} alt={rec.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      : <div className="w-full h-full flex items-center justify-center"><BookOpen size={12} className="text-muted-foreground opacity-40" /></div>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black line-clamp-1 group-hover:text-primary transition-colors">{rec.title}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold border capitalize', TYPE_COLORS[rec.type] ?? 'bg-muted text-muted-foreground border-border')}>
                        {rec.type}
                      </span>
                      <span className="text-[10px] text-muted-foreground">by @{p?.username} · {timeAgo(rec.created_at)}</span>
                    </div>
                  </div>
                  <ChevronRight size={13} className="text-muted-foreground/30 group-hover:text-muted-foreground shrink-0" />
                </Link>
              )
            })}
          </div>
        ) : (
          <div className="flex items-center gap-3 p-4 rounded-2xl border border-dashed border-border bg-card/50 text-sm text-muted-foreground">
            <LayoutList size={16} className="text-muted-foreground/40 shrink-0" />
            <span>The people you follow haven't shared any recommendations yet.</span>
            <Link href="/feed?tab=discover" className="ml-auto shrink-0">
              <Button variant="ghost" size="sm" className="text-xs gap-1 text-primary">Try Discover <ChevronRight size={11} /></Button>
            </Link>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {quickActions.map(({ href, icon: Icon, label, desc, bg, text }) => (
            <Link key={href} href={href}>
              <div className="group flex items-center gap-4 p-4 rounded-2xl border border-border bg-card hover:border-primary/40 hover:shadow-md transition-all duration-200 cursor-pointer">
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform', bg)}>
                  <Icon size={17} className={text} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold group-hover:text-primary transition-colors">{label}</p>
                  <p className="text-xs text-muted-foreground truncate">{desc}</p>
                </div>
                <ArrowRight size={14} className="text-muted-foreground/30 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all shrink-0" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Pro membership status */}
      <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
        <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-amber-500/10 blur-xl pointer-events-none" />
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0 shadow-sm">
            <Zap size={18} className="text-white" />
          </div>
          <div className="flex-1 space-y-1">
            <p className="font-black text-sm text-amber-700 dark:text-amber-400">
              {isAdmin ? 'Admin — lifetime access' : profile.pro_expires_at ? `Pro until ${formatDate(profile.pro_expires_at)}` : 'Pro — lifetime access'}
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {isAdmin
                ? 'Full platform access with no restrictions. Your actions are logged for accountability.'
                : 'Unlimited recommendations, analytics, export, leaderboard, and priority review for your submissions.'
              }
            </p>
          </div>
        </div>
      </div>

    </div>
  )
}