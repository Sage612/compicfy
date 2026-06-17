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
  BookOpen, Bookmark, ArrowRight, Zap, ChevronRight,
  Settings, LayoutList, BookMarked, Users, UserPlus,
  Star, Target, Flame, TrendingUp, Activity,
  MessageSquare, Award,
} from 'lucide-react'
import { formatDate, formatNumber, timeAgo } from '@/lib/utils/format'
import { cn } from '@/lib/utils'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Pro Reader Dashboard' }

const TYPE_COLORS: Record<string, string> = {
  manga:   'bg-rose-500/10  text-rose-500  border-rose-500/20',
  manhwa:  'bg-teal-500/10  text-teal-500  border-teal-500/20',
  manhua:  'bg-amber-500/10 text-amber-500 border-amber-500/20',
  webtoon: 'bg-teal-500/10  text-teal-500  border-teal-500/20',
  comic:   'bg-blue-500/10  text-blue-500  border-blue-500/20',
}

const TYPE_LABELS: Record<string, string> = {
  manga: 'Manga', manhwa: 'Manhwa', manhua: 'Manhua', webtoon: 'Webtoon', comic: 'Comic',
}

export default async function ProReaderDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileData } = await supabase
    .from('profiles').select('*').eq('user_id', user.id).single()
    ?? await supabase.from('profiles').select('*').eq('id', user.id).single()

  // fallback — the above is a trick to stay DRY; just do it properly:
  const { data: pd } = await supabase.from('profiles').select('*').eq('id', user.id).single()
if (!pd) redirect('/login')
const profile = pd as any

  const isAdmin = profile.role === 'admin' || profile.role === 'moderator'
  const isPro   = isAdmin || (profile.is_pro && (!profile.pro_expires_at || new Date(profile.pro_expires_at) > new Date()))
  if (!isPro) redirect('/pricing?reason=pro_required')

  const { data: followData } = await supabase
    .from('follows').select('following_id').eq('follower_id', user.id)
  const followingIds = (followData ?? []).map((f: any) => f.following_id)

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const monthStart    = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

  const [
    { count: totalRecs },
    { count: savedCount },
    { count: listsCount },
    { count: followingCount },
    { count: reviewCount },
    { data: topRecs },
    { data: leaderboardData },
    { count: profileViewsMonth },
    { count: profileViewsTotal },
    { data: currentlyReading },
    { data: rawFeedItems },
    { data: listsForTracker },
    { data: savedComics },
    { data: analyticsData },
    { data: readingListItems },
  ] = await Promise.all([
    supabase.from('recommendations').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_approved', true),
    supabase.from('saves').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('reading_lists').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', user.id),
    supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('recommendations')
      .select('id, title, cover_url, upvotes, save_count, view_count, type, score')
      .eq('user_id', user.id).eq('is_approved', true)
      .order('score', { ascending: false }).limit(3),
    (supabase as any).from('pro_leaderboard')
      .select('rank, score').eq('user_id', user.id)
      .order('month', { ascending: false }).limit(1).maybeSingle(),
    (supabase as any).from('profile_views').select('*', { count: 'exact', head: true })
      .eq('profile_id', user.id).gte('viewed_at', monthStart),
    (supabase as any).from('profile_views').select('*', { count: 'exact', head: true })
      .eq('profile_id', user.id),
    supabase.from('reading_list_items')
      .select('id, list_id, status, progress_chapter, last_read_at, added_at, reading_lists!inner(user_id), recommendations(id, title, cover_url, type, status, chapter_count)')
      .eq('reading_lists.user_id', user.id).eq('status', 'reading')
      .order('last_read_at', { ascending: false }).limit(6),
    followingIds.length > 0
      ? supabase.from('recommendations')
          .select('id, title, cover_url, type, created_at, user_id, profiles!recommendations_user_id_fkey(username, display_name, avatar_url)')
          .in('user_id', followingIds).eq('is_approved', true)
          .not('content_rating', 'in', '("adult","mature")')
          .order('created_at', { ascending: false }).limit(4)
      : Promise.resolve({ data: [] }),
    supabase.from('reading_lists').select('id, name').eq('user_id', user.id).order('created_at', { ascending: false }),
    supabase.from('saves').select('recommendations(type)').eq('user_id', user.id).limit(100),
    (supabase as any).from('recommendation_analytics')
      .select('views, saves, upvotes')
      .in('recommendation_id',
        await supabase.from('recommendations').select('id').eq('user_id', user.id)
          .then(r => (r.data ?? []).map((x: any) => x.id))
      )
      .gte('date', thirtyDaysAgo),
    supabase.from('reading_list_items')
      .select('status, progress_chapter, reading_lists!inner(user_id)')
      .eq('reading_lists.user_id', user.id),
  ])

  // ── Computed ───────────────────────────────────────────────────
  const genreMap: Record<string, number> = {}
  ;(savedComics ?? []).forEach((s: any) => {
    const t = s.recommendations?.type
    if (t) genreMap[t] = (genreMap[t] ?? 0) + 1
  })
  const totalSavedTyped = Object.values(genreMap).reduce((a, b) => a + b, 0)
  const sortedGenres    = Object.entries(genreMap).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const topGenre        = sortedGenres[0]?.[0]

  const last30Views   = (analyticsData ?? []).reduce((s: number, a: any) => s + (a.views   ?? 0), 0)
  const last30Saves   = (analyticsData ?? []).reduce((s: number, a: any) => s + (a.saves   ?? 0), 0)
  const last30Upvotes = (analyticsData ?? []).reduce((s: number, a: any) => s + (a.upvotes ?? 0), 0)

  const totalRecUpvotes = (topRecs ?? []).reduce((s: number, r: any) => s + (r.upvotes ?? 0), 0)
  const totalRecViews   = (topRecs ?? []).reduce((s: number, r: any) => s + (r.view_count ?? 0), 0)

  const completedCount = (readingListItems ?? []).filter((i: any) => i.status === 'completed').length
  const readingCount   = (readingListItems ?? []).filter((i: any) => i.status === 'reading').length

  const recCount         = totalRecs ?? 0
  const recMilestones    = [1, 5, 10, 25, 50, 100, 250]
  const nextRecMilestone = recMilestones.find(m => m > recCount) ?? 250
  const recMilestonePct  = Math.min((recCount / nextRecMilestone) * 100, 100)

  const leaderboardEntry  = leaderboardData as { rank: number; score: number } | null
  const feedItems         = (rawFeedItems ?? []).map((r: any) => ({
    ...r, profiles: Array.isArray(r.profiles) ? r.profiles[0] : r.profiles,
  }))
  const initials          = (profile.display_name || profile.username || 'U').slice(0, 2).toUpperCase()
  const isFollowingNobody = (followingCount ?? 0) === 0
  const hasReadingItems   = (currentlyReading ?? []).length > 0

  const statsRow = [
    { label: 'Recommendations', value: recCount,         icon: BookOpen,   color: 'text-violet-500', bg: 'bg-violet-500/10', href: '/pro/reader/dashboard/recommendations' },
    { label: 'Saved Comics',    value: savedCount ?? 0,  icon: Bookmark,   color: 'text-primary',    bg: 'bg-primary/10',    href: '/pro/reader/dashboard/saved'           },
    { label: 'Reading Lists',   value: listsCount ?? 0,  icon: BookMarked, color: 'text-teal-500',   bg: 'bg-teal-500/10',   href: '/pro/reader/dashboard/lists'           },
    { label: 'Reviews Written', value: reviewCount ?? 0, icon: Star,       color: 'text-amber-500',  bg: 'bg-amber-500/10',  href: '/pro/reader/dashboard/reviews'         },
  ]

  const proTools = [
    { href: '/pro/reader/dashboard/analytics',   icon: BarChart2, label: 'Analytics',     desc: 'Deep rec performance data',           color: 'bg-violet-500/10', text: 'text-violet-500' },
    { href: '/pro/reader/dashboard/analytics',   icon: Eye,       label: 'Profile Views', desc: `${formatNumber(profileViewsMonth ?? 0)} this month`, color: 'bg-blue-500/10', text: 'text-blue-500' },
    { href: '/pro/reader/dashboard/export',      icon: Download,  label: 'Export Lists',  desc: 'Download as CSV or PDF',              color: 'bg-primary/10',    text: 'text-primary'    },
    { href: '/pro/reader/dashboard/leaderboard', icon: Trophy,    label: 'Leaderboard',   desc: leaderboardEntry?.rank ? `Rank #${leaderboardEntry.rank} this month` : 'See your ranking', color: 'bg-amber-500/10', text: 'text-amber-500' },
  ]

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">

      {/* ── Pro welcome banner ───────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent p-5 md:p-7">
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-amber-500/10 blur-2xl pointer-events-none" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <ProAvatar
            src={profile.avatar_url ? `/api/image-proxy?url=${encodeURIComponent(profile.avatar_url)}` : undefined}
            fallback={initials} size="lg" isPro={isPro} isAdmin={isAdmin}
          />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-black truncate">Hey, {profile.display_name || profile.username}!</h1>
              <ProBadge role={profile.role} isPro={isPro} />
              {profile.verified_recommender && <VerifiedBadge />}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isAdmin ? 'Admin · Lifetime Pro' : `Pro Reader · ${profile.pro_expires_at ? `Renews ${formatDate(profile.pro_expires_at)}` : 'Lifetime access'}`}
            </p>
            {leaderboardEntry?.rank && (
              <p className="text-xs text-amber-600 font-semibold flex items-center gap-1 mt-1">
                <Trophy size={10} />Leaderboard Rank #{leaderboardEntry.rank} this month
              </p>
            )}
          </div>
          <div className="flex gap-2 shrink-0 w-full sm:w-auto">
            <Link href="/pro/reader/dashboard/settings" className="flex-1 sm:flex-none">
              <Button variant="outline" size="sm" className="w-full sm:w-auto gap-1.5 border-amber-500/30 hover:border-amber-500/60 h-8 text-xs">
                <Settings size={12} />Settings
              </Button>
            </Link>
            <Link href="/pro/reader/dashboard/recommendations/new" className="flex-1 sm:flex-none">
              <Button size="sm" className="w-full sm:w-auto gap-1.5 bg-gradient-to-r from-amber-400 to-orange-500 border-0 text-white shadow-md shadow-amber-500/20 h-8 text-xs">
                <BookOpen size={12} />Recommend
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <ProfileCompletionBanner hasAvatar={!!profile.avatar_url} hasBio={!!profile.bio} hasWebsite={!!profile.website} />

      {/* ── Pro insight tip ──────────────────────────────────────── */}
      {topGenre && (
        <div className="flex items-center gap-3 p-3 rounded-xl border border-cyan-500/20 bg-cyan-500/5">
          <div className="w-7 h-7 rounded-lg bg-cyan-500/15 flex items-center justify-center shrink-0">
            <Activity size={13} className="text-cyan-500" />
          </div>
          <p className="text-xs text-cyan-700 dark:text-cyan-400 flex-1">
            You save a lot of <span className="font-black capitalize">{TYPE_LABELS[topGenre] ?? topGenre}</span> — explore more in that category on the browse page.
          </p>
          <Link href={`/browse?type=${topGenre}`}>
            <Button size="sm" variant="outline" className="shrink-0 border-cyan-500/30 text-cyan-600 hover:bg-cyan-500/10 h-7 text-xs px-2.5">
              Browse <ChevronRight size={11} />
            </Button>
          </Link>
        </div>
      )}

      {/* ── Stats ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statsRow.map(({ label, value, icon: Icon, color, bg, href }) => (
          <Link key={label} href={href}
            className="group relative overflow-hidden p-4 rounded-2xl border border-border bg-card hover:border-amber-500/40 transition-all duration-200"
          >
            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center mb-3', bg)}>
              <Icon size={15} className={color} />
            </div>
            <p className="text-xl font-black tabular-nums">{formatNumber(value)}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{label}</p>
            <ArrowRight size={11} className="absolute bottom-3 right-3 text-muted-foreground/20 group-hover:text-muted-foreground/50 transition-all" />
          </Link>
        ))}
      </div>

      {/* ── 30-day rec pulse ─────────────────────────────────────── */}
      {(analyticsData ?? []).length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Flame size={13} className="text-orange-500" />
              <h2 className="text-xs font-black uppercase tracking-wider text-muted-foreground">30-Day Rec Pulse</h2>
            </div>
            <Link href="/pro/reader/dashboard/analytics" className="text-xs text-amber-500 hover:underline flex items-center gap-0.5">
              Full analytics <ChevronRight size={11} />
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Views',   value: last30Views,   icon: Eye,      color: 'text-blue-500',    bg: 'bg-blue-500/10'    },
              { label: 'Saves',   value: last30Saves,   icon: Bookmark, color: 'text-violet-500',  bg: 'bg-violet-500/10'  },
              { label: 'Upvotes', value: last30Upvotes, icon: Users,    color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className="p-3 rounded-xl border border-amber-500/15 bg-amber-500/5 space-y-2">
                <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center', bg)}>
                  <Icon size={13} className={color} />
                </div>
                <p className="text-lg font-black tabular-nums">{formatNumber(value)}</p>
                <p className="text-[10px] text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Reading stats ─────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-xl border border-border bg-card space-y-1.5">
          <div className="flex items-center gap-1.5">
            <BookOpen size={12} className="text-teal-500" />
            <span className="text-[10px] font-black uppercase text-muted-foreground">Reading</span>
          </div>
          <p className="text-xl font-black tabular-nums">{readingCount}</p>
          <p className="text-[10px] text-muted-foreground">in progress</p>
        </div>
        <div className="p-3 rounded-xl border border-border bg-card space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Award size={12} className="text-emerald-500" />
            <span className="text-[10px] font-black uppercase text-muted-foreground">Completed</span>
          </div>
          <p className="text-xl font-black tabular-nums">{completedCount}</p>
          <p className="text-[10px] text-muted-foreground">finished</p>
        </div>
        <div className="p-3 rounded-xl border border-border bg-card space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Eye size={12} className="text-blue-500" />
            <span className="text-[10px] font-black uppercase text-muted-foreground">Profile</span>
          </div>
          <p className="text-xl font-black tabular-nums">{formatNumber(profileViewsMonth ?? 0)}</p>
          <p className="text-[10px] text-muted-foreground">views this month</p>
        </div>
      </div>

      {/* ── Genre taste ──────────────────────────────────────────── */}
      {sortedGenres.length > 0 && (
        <div className="p-4 rounded-2xl border border-border bg-card">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={13} className="text-amber-500" />
            <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">Your Taste Profile</span>
          </div>
          <div className="space-y-2">
            {sortedGenres.map(([type, count]) => (
              <div key={type} className="flex items-center gap-2">
                <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded border w-16 text-center shrink-0', TYPE_COLORS[type] ?? 'bg-muted text-muted-foreground border-border')}>
                  {TYPE_LABELS[type] ?? type}
                </span>
                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-700"
                    style={{ width: `${totalSavedTyped > 0 ? (count / totalSavedTyped) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground w-6 text-right tabular-nums shrink-0">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Rec milestone ────────────────────────────────────────── */}
      <div className="p-4 rounded-2xl border border-border bg-card space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target size={13} className="text-violet-500" />
            <span className="text-xs font-black">Rec Milestone</span>
          </div>
          <span className="text-[10px] text-muted-foreground tabular-nums">{recCount} / {nextRecMilestone}</span>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-amber-400 transition-all duration-700"
            style={{ width: `${recMilestonePct}%` }}
          />
        </div>
        <p className="text-[10px] text-muted-foreground">
          {nextRecMilestone - recCount} more recs to reach {nextRecMilestone}
        </p>
      </div>

      {/* ── Pro tools ────────────────────────────────────────────── */}
      <div>
        <h2 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-3">Pro Tools</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {proTools.map(({ href, icon: Icon, label, desc, color, text }) => (
            <Link key={`${href}-${label}`} href={href}>
              <div className="group flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:border-amber-500/40 transition-all duration-200 cursor-pointer">
                <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform', color)}>
                  <Icon size={15} className={text} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold">{label}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{desc}</p>
                </div>
                <ArrowRight size={12} className="text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-all shrink-0" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Top recs ─────────────────────────────────────────────── */}
      {topRecs && topRecs.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-black uppercase tracking-wider text-muted-foreground">Top Recommendations</h2>
            <Link href="/pro/reader/dashboard/analytics" className="text-xs text-amber-500 hover:underline flex items-center gap-0.5">
              Analytics <ChevronRight size={11} />
            </Link>
          </div>
          <div className="space-y-2">
            {(topRecs as any[]).map((rec: any, i: number) => (
              <Link key={rec.id} href={`/comic/${rec.id}`}
                className="group flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:border-amber-500/30 transition-colors"
              >
                <span className="text-base font-black text-muted-foreground/25 w-5 shrink-0">#{i + 1}</span>
                <div className="w-9 h-12 rounded-md overflow-hidden bg-muted shrink-0">
                  {rec.cover_url
                    ? <img src={`/api/image-proxy?url=${encodeURIComponent(rec.cover_url)}`} alt={rec.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    : <div className="w-full h-full flex items-center justify-center"><BookOpen size={10} className="text-muted-foreground/40" /></div>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black line-clamp-1">{rec.title}</p>
                  <span className={cn('inline-flex px-1.5 py-0.5 rounded-full text-[9px] font-bold border capitalize mt-0.5', TYPE_COLORS[rec.type] ?? 'bg-muted text-muted-foreground border-border')}>
                    {rec.type}
                  </span>
                </div>
                <div className="flex gap-2.5 text-[10px] text-muted-foreground shrink-0">
                  <span className="flex items-center gap-0.5"><Users size={9} className="text-emerald-500" />{rec.upvotes}</span>
                  <span className="flex items-center gap-0.5"><Bookmark size={9} className="text-blue-500" />{rec.save_count}</span>
                  <span className="flex items-center gap-0.5"><Eye size={9} className="text-violet-500" />{formatNumber(rec.view_count)}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── Reading tracker ──────────────────────────────────────── */}
      {!hasReadingItems ? (
        <div className="space-y-3">
          <h2 className="text-xs font-black uppercase tracking-wider text-muted-foreground">Reading Tracker</h2>
          <div className="rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-6 text-center space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/15 flex items-center justify-center mx-auto">
              <BookOpen size={18} className="text-primary" />
            </div>
            <div>
              <p className="font-black text-sm">What are you reading right now?</p>
              <p className="text-xs text-muted-foreground mt-0.5">Track your progress and never lose your place.</p>
            </div>
            <div className="flex gap-2 justify-center flex-wrap">
              <Link href="/browse"><Button size="sm" className="gap-1.5"><BookOpen size={12} />Find something</Button></Link>
              <Link href="/pro/reader/dashboard/lists">
                <Button size="sm" variant="outline" className="gap-1.5 border-primary/30 text-primary"><BookMarked size={12} />My Lists</Button>
              </Link>
            </div>
          </div>
          <CurrentlyReadingSection initialItems={[]} lists={listsForTracker ?? []} listsHref="/pro/reader/dashboard/lists" />
        </div>
      ) : (
        <CurrentlyReadingSection initialItems={currentlyReading ?? []} lists={listsForTracker ?? []} listsHref="/pro/reader/dashboard/lists" />
      )}

      {/* ── Following feed ───────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-black uppercase tracking-wider text-muted-foreground">From People You Follow</h2>
          {!isFollowingNobody && <Link href="/feed" className="text-xs text-primary hover:underline flex items-center gap-0.5">View all <ChevronRight size={11} /></Link>}
        </div>
        {isFollowingNobody ? (
          <div className="rounded-2xl border border-dashed border-primary/20 bg-primary/5 p-6 text-center space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto"><UserPlus size={18} className="text-primary" /></div>
            <div>
              <p className="font-black text-sm">Follow readers you trust</p>
              <p className="text-xs text-muted-foreground mt-0.5">Their recommendations will appear here.</p>
            </div>
            <Link href="/feed?tab=discover"><Button size="sm" className="gap-1.5"><Users size={12} />Discover Readers</Button></Link>
          </div>
        ) : feedItems.length > 0 ? (
          <div className="space-y-2">
            {feedItems.map((rec: any) => {
              const p = rec.profiles
              return (
                <Link key={rec.id} href={`/comic/${rec.id}`}
                  className="group flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:border-primary/30 transition-colors"
                >
                  <div className="w-9 h-12 rounded-md overflow-hidden bg-muted shrink-0">
                    {rec.cover_url
                      ? <img src={`/api/image-proxy?url=${encodeURIComponent(rec.cover_url)}`} alt={rec.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      : <div className="w-full h-full flex items-center justify-center"><BookOpen size={10} className="text-muted-foreground/40" /></div>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black line-clamp-1">{rec.title}</p>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <span className={cn('inline-flex px-1.5 py-0.5 rounded-full text-[9px] font-bold border capitalize', TYPE_COLORS[rec.type] ?? 'bg-muted text-muted-foreground border-border')}>{rec.type}</span>
                      <span className="text-[10px] text-muted-foreground">@{p?.username} · {timeAgo(rec.created_at)}</span>
                    </div>
                  </div>
                  <ChevronRight size={12} className="text-muted-foreground/30 group-hover:text-muted-foreground shrink-0" />
                </Link>
              )
            })}
          </div>
        ) : (
          <div className="flex items-center gap-3 p-3 rounded-xl border border-dashed border-border bg-card/50 text-muted-foreground">
            <LayoutList size={14} className="text-muted-foreground/40 shrink-0" />
            <span className="text-xs">The people you follow haven't shared anything yet.</span>
            <Link href="/feed?tab=discover" className="ml-auto shrink-0">
              <Button variant="ghost" size="sm" className="text-xs gap-1 text-primary h-7">Discover <ChevronRight size={10} /></Button>
            </Link>
          </div>
        )}
      </div>

      {/* ── Pro status footer ────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0">
            <Zap size={14} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black text-amber-700 dark:text-amber-400">
              {isAdmin ? 'Admin — lifetime access' : profile.pro_expires_at ? `Pro until ${formatDate(profile.pro_expires_at)}` : 'Pro — lifetime access'}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Unlimited recs · analytics · export · leaderboard</p>
          </div>
          <Link href="/pro/reader/dashboard/analytics">
            <Button variant="outline" size="sm" className="shrink-0 border-amber-500/30 text-amber-600 h-7 text-xs px-2.5 gap-1">
              <BarChart2 size={11} />Analytics
            </Button>
          </Link>
        </div>
      </div>

    </div>
  )
}