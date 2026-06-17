import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ProfileCompletionBanner } from '@/components/dashboard/ProfileCompletionBanner'
import { CurrentlyReadingSection } from '@/components/recommendations/CurrentlyReadingSection'
import { Button } from '@/components/ui/button'
import {
  BookOpen, Bookmark, Plus, Settings, ArrowRight,
  BookMarked, ChevronRight, LayoutList, Users, UserPlus,
  Radar, Star, Target, Zap, Flame, TrendingUp,
} from 'lucide-react'
import Link from 'next/link'
import { formatDate, formatNumber, timeAgo } from '@/lib/utils/format'
import { cn } from '@/lib/utils'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Dashboard' }

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

export default async function ReaderDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileData } = await supabase
    .from('profiles').select('*').eq('id', user.id).single()
  if (!profileData) redirect('/login')
  const profile = profileData as any

  const { data: followData } = await supabase
    .from('follows').select('following_id').eq('follower_id', user.id)
  const followingIds = (followData ?? []).map((f: any) => f.following_id)

  const [
    { count: listsCount },
    { count: savedCount },
    { count: followingCount },
    { count: reviewCount },
    { data: currentlyReading },
    { data: rawFeedItems },
    { data: listsForTracker },
    { data: savedComics },
    { data: recentRecs },
  ] = await Promise.all([
    supabase.from('reading_lists').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('saves').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', user.id),
    supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
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
    supabase.from('saves')
      .select('recommendations(type)')
      .eq('user_id', user.id)
      .limit(50),
    supabase.from('recommendations')
      .select('id, upvotes, view_count, save_count')
      .eq('user_id', user.id).eq('is_approved', true)
      .order('score', { ascending: false }).limit(10),
  ])

  // ── Genre taste breakdown ──────────────────────────────────────
  const genreMap: Record<string, number> = {}
  ;(savedComics ?? []).forEach((s: any) => {
    const t = s.recommendations?.type
    if (t) genreMap[t] = (genreMap[t] ?? 0) + 1
  })
  const totalSavedTyped  = Object.values(genreMap).reduce((a, b) => a + b, 0)
  const sortedGenres     = Object.entries(genreMap).sort((a, b) => b[1] - a[1]).slice(0, 4)

  // ── Rec performance totals ─────────────────────────────────────
  const totalRecUpvotes  = (recentRecs ?? []).reduce((s: number, r: any) => s + (r.upvotes ?? 0), 0)
  const totalRecViews    = (recentRecs ?? []).reduce((s: number, r: any) => s + (r.view_count ?? 0), 0)

  // ── Milestones ─────────────────────────────────────────────────
  const recCount          = profile.total_recommendations ?? 0
  const recMilestones     = [1, 5, 10, 25, 50, 100]
  const nextRecMilestone  = recMilestones.find(m => m > recCount) ?? 100
  const recMilestonePct   = Math.min((recCount / nextRecMilestone) * 100, 100)

  const feedItems    = (rawFeedItems ?? []).map((r: any) => ({
    ...r, profiles: Array.isArray(r.profiles) ? r.profiles[0] : r.profiles,
  }))
  const initials          = (profile.display_name || profile.username).slice(0, 2).toUpperCase()
  const isFollowingNobody = (followingCount ?? 0) === 0
  const hasReadingItems   = (currentlyReading ?? []).length > 0

  const stats = [
    { label: 'Recommendations', value: recCount,         icon: BookOpen,   href: '/reader/dashboard/recommendations', bg: 'bg-violet-500/10', text: 'text-violet-500' },
    { label: 'Saved Comics',    value: savedCount ?? 0,  icon: Bookmark,   href: '/reader/dashboard/saved',           bg: 'bg-rose-500/10',   text: 'text-rose-500'  },
    { label: 'Reading Lists',   value: listsCount ?? 0,  icon: BookMarked, href: '/reader/dashboard/lists',           bg: 'bg-primary/10',    text: 'text-primary'   },
    { label: 'Reviews Written', value: reviewCount ?? 0, icon: Star,       href: '/reader/dashboard/reviews',         bg: 'bg-amber-500/10',  text: 'text-amber-500' },
  ]

  const quickActions = [
    { href: '/reader/dashboard/recommendations/new', icon: Plus,       label: 'Submit a Rec',      desc: 'Share a comic with the community',  bg: 'bg-primary/10',    text: 'text-primary'    },
    { href: '/feed',                                 icon: LayoutList, label: 'Following Feed',    desc: 'Latest from people you follow',     bg: 'bg-violet-500/10', text: 'text-violet-500' },
    { href: '/reader/dashboard/lists',               icon: BookMarked, label: 'Reading Lists',     desc: 'Manage your reading collection',    bg: 'bg-teal-500/10',   text: 'text-teal-500'   },
    { href: '/browse',                               icon: Flame,      label: 'Browse Comics',     desc: 'Discover new recommendations',      bg: 'bg-rose-500/10',   text: 'text-rose-500'   },
  ]

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">

      {/* ── Welcome banner ───────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 md:p-7">
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-primary/5 blur-2xl pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="relative shrink-0">
            <div className="absolute -inset-1 rounded-full bg-primary/20 blur-sm" />
            <Avatar className="relative h-14 w-14 border-2 border-background">
              <AvatarImage src={profile.avatar_url ?? undefined} />
              <AvatarFallback className="text-lg bg-primary text-primary-foreground font-bold">{initials}</AvatarFallback>
            </Avatar>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-black truncate">Hey, {profile.display_name || profile.username}! 👋</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Reader · Since {formatDate(profile.member_since)}</p>
          </div>
          <div className="flex gap-2 shrink-0 w-full sm:w-auto">
            <Link href="/reader/dashboard/settings" className="flex-1 sm:flex-none">
              <Button variant="outline" size="sm" className="w-full sm:w-auto gap-1.5 h-8 text-xs">
                <Settings size={12} />Settings
              </Button>
            </Link>
            <Link href="/reader/dashboard/recommendations/new" className="flex-1 sm:flex-none">
              <Button size="sm" className="w-full sm:w-auto gap-1.5 h-8 text-xs">
                <BookOpen size={12} />Recommend
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <ProfileCompletionBanner
        hasAvatar={!!profile.avatar_url}
        hasBio={!!profile.bio}
        hasWebsite={!!profile.website}
      />

      {/* ── Stats ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map(({ label, value, icon: Icon, href, bg, text }) => (
          <Link key={label} href={href}
            className="group relative overflow-hidden p-4 rounded-2xl border border-border bg-card hover:border-primary/40 transition-all duration-200"
          >
            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center mb-3', bg)}>
              <Icon size={15} className={text} />
            </div>
            <p className="text-xl font-black tabular-nums">{formatNumber(value)}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{label}</p>
            <ArrowRight size={11} className="absolute bottom-3 right-3 text-muted-foreground/20 group-hover:text-muted-foreground/50 group-hover:translate-x-0.5 transition-all" />
          </Link>
        ))}
      </div>

      {/* ── Rec milestone ────────────────────────────────────────── */}
      {recCount > 0 && (
        <div className="p-4 rounded-2xl border border-border bg-card space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target size={13} className="text-violet-500" />
              <span className="text-xs font-black">Recommendation Milestone</span>
            </div>
            <span className="text-[10px] text-muted-foreground tabular-nums">
              {recCount} / {nextRecMilestone}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-primary transition-all duration-700"
              style={{ width: `${recMilestonePct}%` }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground">
            {nextRecMilestone - recCount} more recs to reach {nextRecMilestone}
          </p>
        </div>
      )}

      {/* ── Genre taste ──────────────────────────────────────────── */}
      {sortedGenres.length > 0 && (
        <div className="p-4 rounded-2xl border border-border bg-card">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={13} className="text-teal-500" />
            <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">Your Taste</span>
          </div>
          <div className="space-y-2">
            {sortedGenres.map(([type, count]) => (
              <div key={type} className="flex items-center gap-2">
                <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded border w-16 text-center shrink-0', TYPE_COLORS[type] ?? 'bg-muted text-muted-foreground border-border')}>
                  {TYPE_LABELS[type] ?? type}
                </span>
                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary/60 to-primary transition-all duration-700"
                    style={{ width: `${totalSavedTyped > 0 ? (count / totalSavedTyped) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground w-6 text-right tabular-nums shrink-0">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Rec performance snapshot ─────────────────────────────── */}
      {(recentRecs ?? []).length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 rounded-2xl border border-border bg-card space-y-1">
            <div className="flex items-center gap-1.5 mb-2">
              <Users size={12} className="text-emerald-500" />
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Rec Upvotes</span>
            </div>
            <p className="text-2xl font-black tabular-nums">{formatNumber(totalRecUpvotes)}</p>
            <p className="text-[10px] text-muted-foreground">across all your recs</p>
          </div>
          <div className="p-4 rounded-2xl border border-border bg-card space-y-1">
            <div className="flex items-center gap-1.5 mb-2">
              <Radar size={12} className="text-blue-500" />
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Rec Views</span>
            </div>
            <p className="text-2xl font-black tabular-nums">{formatNumber(totalRecViews)}</p>
            <p className="text-[10px] text-muted-foreground">total views on your recs</p>
          </div>
        </div>
      )}

      {/* ── Reading tracker ──────────────────────────────────────── */}
      {!hasReadingItems ? (
        <div className="space-y-3">
          <h2 className="text-xs font-black uppercase tracking-wider text-muted-foreground">Reading Tracker</h2>
          <div className="relative overflow-hidden rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/15 flex items-center justify-center mx-auto">
              <BookOpen size={20} className="text-primary" />
            </div>
            <div>
              <p className="font-black text-sm">What are you reading right now?</p>
              <p className="text-xs text-muted-foreground mt-1">Track your progress and never lose your place.</p>
            </div>
            <div className="flex gap-3 justify-center flex-wrap">
              <Link href="/browse">
                <Button size="sm" className="gap-1.5"><BookOpen size={13} />Find something</Button>
              </Link>
              <Link href="/reader/dashboard/lists">
                <Button size="sm" variant="outline" className="gap-1.5 border-primary/30 text-primary">
                  <BookMarked size={13} />My Lists
                </Button>
              </Link>
            </div>
          </div>
          <CurrentlyReadingSection initialItems={[]} lists={listsForTracker ?? []} listsHref="/reader/dashboard/lists" />
        </div>
      ) : (
        <CurrentlyReadingSection
          initialItems={currentlyReading ?? []}
          lists={listsForTracker ?? []}
          listsHref="/reader/dashboard/lists"
        />
      )}

      {/* ── Following feed ───────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-black uppercase tracking-wider text-muted-foreground">From People You Follow</h2>
          {!isFollowingNobody && (
            <Link href="/feed" className="text-xs text-primary hover:underline flex items-center gap-0.5">
              View all <ChevronRight size={11} />
            </Link>
          )}
        </div>

        {isFollowingNobody ? (
          <div className="rounded-2xl border border-dashed border-primary/20 bg-primary/5 p-6 text-center space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
              <UserPlus size={18} className="text-primary" />
            </div>
            <div>
              <p className="font-black text-sm">Follow readers you trust</p>
              <p className="text-xs text-muted-foreground mt-1">Their recommendations will appear here.</p>
            </div>
            <div className="flex gap-2 justify-center flex-wrap">
              <Link href="/feed?tab=discover">
                <Button size="sm" className="gap-1.5"><Users size={12} />Discover Readers</Button>
              </Link>
              <Link href="/browse">
                <Button size="sm" variant="outline" className="gap-1.5"><Radar size={12} />Browse Comics</Button>
              </Link>
            </div>
          </div>
        ) : feedItems.length > 0 ? (
          <div className="space-y-2">
            {feedItems.map((rec: any) => {
              const p = rec.profiles
              const typeStyle = TYPE_COLORS[rec.type] ?? 'bg-muted text-muted-foreground border-border'
              return (
                <Link key={rec.id} href={`/comic/${rec.id}`}
                  className="group flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:border-primary/30 transition-colors"
                >
                  <div className="w-9 h-12 rounded-lg overflow-hidden bg-muted shrink-0">
                    {rec.cover_url
                      ? <img src={rec.cover_url} alt={rec.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      : <div className="w-full h-full flex items-center justify-center"><BookOpen size={10} className="text-muted-foreground/40" /></div>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black line-clamp-1">{rec.title}</p>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <span className={cn('inline-flex px-1.5 py-0.5 rounded-full text-[9px] font-bold border capitalize', typeStyle)}>{rec.type}</span>
                      <span className="text-[10px] text-muted-foreground">@{p?.username} · {timeAgo(rec.created_at)}</span>
                    </div>
                  </div>
                  <ChevronRight size={12} className="text-muted-foreground/30 group-hover:text-muted-foreground shrink-0" />
                </Link>
              )
            })}
          </div>
        ) : (
          <div className="flex items-center gap-3 p-4 rounded-xl border border-dashed border-border bg-card/50 text-sm text-muted-foreground">
            <LayoutList size={15} className="text-muted-foreground/40 shrink-0" />
            <span className="text-xs">The people you follow haven't shared anything yet.</span>
            <Link href="/feed?tab=discover" className="ml-auto shrink-0">
              <Button variant="ghost" size="sm" className="text-xs gap-1 text-primary h-7">Discover <ChevronRight size={10} /></Button>
            </Link>
          </div>
        )}
      </div>

      {/* ── Quick actions ────────────────────────────────────────── */}
      <div>
        <h2 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-3">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {quickActions.map(({ href, icon: Icon, label, desc, bg, text }) => (
            <Link key={href} href={href}>
              <div className="group flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:border-primary/40 transition-all duration-200 cursor-pointer">
                <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform', bg)}>
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

      {/* ── Pro upgrade CTA ─────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent p-5">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0">
            <Zap size={16} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-sm">Unlock Pro Reader</p>
            <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
              Deep analytics, unlimited recs, export lists, leaderboard ranking, and priority review.
            </p>
            <div className="flex flex-wrap gap-1.5 pt-2">
              {['Analytics', 'Unlimited recs', 'Export lists', 'Leaderboard', 'Priority review'].map(f => (
                <span key={f} className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/10 text-amber-600 border border-amber-500/20 font-medium">{f}</span>
              ))}
            </div>
          </div>
        </div>
        <Link href="/pricing" className="block mt-4">
          <Button size="sm" className="w-full gap-1.5 bg-gradient-to-r from-amber-400 to-orange-500 border-0 text-white">
            Upgrade to Pro <ArrowRight size={12} />
          </Button>
        </Link>
      </div>

    </div>
  )
}