import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ProfileCompletionBanner } from '@/components/dashboard/ProfileCompletionBanner'
import { CurrentlyReadingSection } from '@/components/recommendations/CurrentlyReadingSection'
import { Button } from '@/components/ui/button'
import {
  BookOpen,
  Bookmark,
  Plus,
  Settings,
  Flame,
  ArrowRight,
  BookMarked,
  ChevronRight,
  LayoutList,
  Users,
  UserPlus,
  Radar,
  Star,
  Target,
  Zap,
  Sparkles,
  TrendingUp,
} from 'lucide-react'
import Link from 'next/link'
import { formatDate, formatNumber, timeAgo } from '@/lib/utils/format'
import { FREE_LIMITS } from '@/lib/utils/constants'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Dashboard' }

const TYPE_COLORS: Record<string, string> = {
  manga:   'bg-rose-500/10   text-rose-500   border-rose-500/20',
  manhwa:  'bg-teal-500/10   text-teal-500   border-teal-500/20',
  manhua:  'bg-amber-500/10  text-amber-500  border-amber-500/20',
  webtoon: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  comic:   'bg-blue-500/10   text-blue-500   border-blue-500/20',
}

function proxyCover(url: string | null | undefined): string {
  if (!url) return ''
  if (url.startsWith('data:')) return url
  if (url.startsWith('/')) return url
  if (url.includes('/api/image-proxy')) return url
  return `/api/image-proxy?url=${encodeURIComponent(url)}`
}

export default async function ReaderDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileData } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profileData) redirect('/login')
  const profile = profileData as any

  const { data: followData } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', user.id)

  const followingIds = (followData ?? []).map((f: any) => f.following_id)

  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const [
    { count: listsCount },
    { count: savedCount },
    { count: followingCount },
    { count: reviewCount },
    { count: monthlyRecCount },
    { data: currentlyReading },
    { data: rawFeedItems },
    { data: listsForTracker },
  ] = await Promise.all([
    supabase.from('reading_lists').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('saves').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', user.id),
    supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase
      .from('recommendations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', startOfMonth.toISOString()),
    supabase
      .from('reading_list_items')
      .select('id, list_id, status, progress_chapter, last_read_at, added_at, reading_lists!inner(user_id), recommendations(id, title, cover_url, type, status, chapter_count)')
      .eq('reading_lists.user_id', user.id)
      .eq('status', 'reading')
      .order('added_at', { ascending: false })
      .limit(6),
    followingIds.length > 0
      ? supabase
          .from('recommendations')
          .select(`id, title, cover_url, type, created_at, user_id, profiles!recommendations_user_id_fkey(username, display_name, avatar_url)`)
          .in('user_id', followingIds)
          .eq('is_approved', true)
          .not('content_rating', 'in', '("adult","mature")')
          .order('created_at', { ascending: false })
          .limit(4)
      : Promise.resolve({ data: [] }),
    supabase.from('reading_lists').select('id, name').eq('user_id', user.id).order('created_at', { ascending: false }),
  ])

  const { count: collectionsCount } = await (supabase as any)
    .from('collections')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  const recCount = monthlyRecCount ?? 0
  const recPct = Math.min((recCount / FREE_LIMITS.recommendations_per_month) * 100, 100)
  const followPct = Math.min(((followingCount ?? 0) / FREE_LIMITS.follows) * 100, 100)
  const listPct = Math.min(((listsCount ?? 0) / FREE_LIMITS.lists) * 100, 100)
  const collectionPct = Math.min(((collectionsCount ?? 0) / FREE_LIMITS.collections) * 100, 100)

  const feedItems = (rawFeedItems ?? []).map((r: any) => {
    const p = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles
    return { ...r, profiles: p ?? null }
  })

  const initials = (profile.display_name || profile.username).slice(0, 2).toUpperCase()
  const isFollowingNobody = (followingCount ?? 0) === 0
  const hasReadingItems = (currentlyReading ?? []).length > 0

  const stats = [
    {
      label: 'Recommendations',
      value: profile.total_recommendations ?? 0,
      icon: BookOpen,
      href: '/reader/dashboard/recommendations',
      bg: 'bg-violet-500/10 dark:bg-violet-500/20',
      text: 'text-violet-500',
      glow: 'group-hover:shadow-violet-500/10',
    },
    {
      label: 'Saved Comics',
      value: savedCount ?? 0,
      icon: Bookmark,
      href: '/reader/dashboard/saved',
      bg: 'bg-rose-500/10 dark:bg-rose-500/20',
      text: 'text-rose-500',
      glow: 'group-hover:shadow-rose-500/10',
    },
    {
      label: 'Reading Lists',
      value: listsCount ?? 0,
      icon: BookMarked,
      href: '/reader/dashboard/lists',
      bg: 'bg-primary/10 dark:bg-primary/20',
      text: 'text-primary',
      glow: 'group-hover:shadow-primary/10',
    },
    {
      label: 'Reviews Written',
      value: reviewCount ?? 0,
      icon: Star,
      href: '/reader/dashboard/reviews',
      bg: 'bg-amber-500/10 dark:bg-amber-500/20',
      text: 'text-amber-500',
      glow: 'group-hover:shadow-amber-500/10',
    },
  ]

  const quickActions = [
    {
      href: '/reader/dashboard/recommendations/new',
      icon: Plus,
      label: 'Submit a Recommendation',
      desc: 'Share your favorite discovery with the community',
      bg: 'bg-primary/10 dark:bg-primary/20',
      text: 'text-primary',
    },
    {
      href: '/feed',
      icon: LayoutList,
      label: 'Following Feed',
      desc: 'Check out recent recommendations from readers you follow',
      bg: 'bg-violet-500/10 dark:bg-violet-500/20',
      text: 'text-violet-500',
    },
    {
      href: '/reader/dashboard/lists',
      icon: BookMarked,
      label: 'Reading Lists',
      desc: 'Organize, curate, and track your ongoing titles',
      bg: 'bg-teal-500/10 dark:bg-teal-500/20',
      text: 'text-teal-500',
    },
    {
      href: '/browse',
      icon: Flame,
      label: 'Browse Comics',
      desc: 'Explore popular trends and fresh genre drops',
      bg: 'bg-rose-500/10 dark:bg-rose-500/20',
      text: 'text-rose-500',
    },
  ]

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-card via-card/90 to-card/50 p-6 md:p-8 shadow-sm">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -bottom-12 -left-12 w-44 h-44 rounded-full bg-violet-500/10 blur-2xl" />
        </div>

        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4 min-w-0">
            <div className="relative shrink-0">
              <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-primary via-violet-500 to-rose-500 opacity-30 blur-sm" />
              <Avatar className="relative h-16 w-16 border-2 border-background shadow-md">
                <AvatarImage src={profile.avatar_url ?? undefined} />
                <AvatarFallback className="text-xl bg-gradient-to-br from-primary to-violet-600 text-primary-foreground font-black">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-black tracking-tight truncate">
                  Hey, {profile.display_name || profile.username}!
                </h1>
                <Sparkles size={16} className="text-amber-500 shrink-0 hidden sm:inline-block" />
              </div>
              <p className="text-xs md:text-sm text-muted-foreground flex items-center gap-2">
                <span>Reader</span>
                <span>•</span>
                <span>Member since {formatDate(profile.member_since)}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto">
            <Link href="/reader/dashboard/settings" className="flex-1 sm:flex-none">
              <Button variant="outline" size="sm" className="w-full gap-2 rounded-xl text-xs font-semibold hover:bg-muted/60 transition-colors">
                <Settings size={14} />
                Settings
              </Button>
            </Link>
            <Link href="/reader/dashboard/recommendations/new" className="flex-1 sm:flex-none">
              <Button size="sm" className="w-full gap-2 rounded-xl text-xs font-semibold shadow-sm hover:shadow-primary/20 transition-all">
                <Plus size={14} />
                Recommend
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

      {/* Free Plan Limits */}
      <div className="rounded-3xl border border-border/60 bg-card p-5 md:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 dark:bg-amber-500/20 flex items-center justify-center">
              <Target size={14} className="text-amber-500" />
            </div>
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Free Plan Status</h2>
              <p className="text-xs font-semibold">Usage & Resource Limits</p>
            </div>
          </div>
          <Link href="/pricing">
            <Button size="sm" variant="outline" className="h-7 text-xs px-3 gap-1.5 rounded-xl border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 transition-colors">
              <Zap size={12} className="fill-amber-500/30" />
              Upgrade to Pro
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
          {[
            { label: 'Recs this month', current: recCount, limit: FREE_LIMITS.recommendations_per_month, pct: recPct, color: 'bg-violet-500' },
            { label: 'Following', current: followingCount ?? 0, limit: FREE_LIMITS.follows, pct: followPct, color: 'bg-primary' },
            { label: 'Reading Lists', current: listsCount ?? 0, limit: FREE_LIMITS.lists, pct: listPct, color: 'bg-teal-500' },
            { label: 'Collections', current: collectionsCount ?? 0, limit: FREE_LIMITS.collections, pct: collectionPct, color: 'bg-indigo-500' },
          ].map(({ label, current, limit, pct, color }) => (
            <div key={label} className="p-3 rounded-2xl bg-muted/40 border border-border/40 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-muted-foreground">{label}</span>
                <span className={`font-mono font-bold ${pct >= 80 ? 'text-amber-500' : 'text-foreground'}`}>
                  {current}/{limit}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${pct >= 90 ? 'bg-amber-500' : color}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <TrendingUp size={14} /> Overview Metrics
          </h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map(({ label, value, icon: Icon, href, bg, text, glow }) => (
            <Link
              key={label}
              href={href}
              className={`group relative overflow-hidden p-5 rounded-3xl border border-border/60 bg-card hover:border-primary/40 hover:shadow-xl ${glow} transition-all duration-300`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-11 h-11 rounded-2xl ${bg} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                  <Icon size={20} className={text} />
                </div>
                <ArrowRight size={14} className="text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </div>
              <p className="text-3xl font-black tracking-tight tabular-nums">{formatNumber(value)}</p>
              <p className="text-xs font-medium text-muted-foreground mt-1">{label}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Reading Tracker */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Reading Tracker</h2>
        {!hasReadingItems ? (
          <div className="relative overflow-hidden rounded-3xl border border-dashed border-primary/30 bg-primary/5 p-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto ring-8 ring-primary/5">
              <BookOpen size={24} className="text-primary" />
            </div>
            <div className="max-w-md mx-auto">
              <p className="font-black text-base">What are you reading right now?</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Keep track of chapter progress and quickly pick up right where you left off.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 justify-center pt-1">
              <Link href="/browse">
                <Button size="sm" className="gap-2 rounded-xl text-xs font-semibold shadow-sm">
                  <BookOpen size={14} />
                  Find something to read
                </Button>
              </Link>
              <Link href="/reader/dashboard/lists">
                <Button size="sm" variant="outline" className="gap-2 rounded-xl text-xs font-semibold border-primary/30 text-primary hover:bg-primary/10">
                  <BookMarked size={14} />
                  My Lists
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <CurrentlyReadingSection
            initialItems={(currentlyReading ?? []).map((item: any) => ({ ...item, status: item.status ?? 'reading' }))}
            lists={listsForTracker ?? []}
            listsHref="/reader/dashboard/lists"
          />
        )}
      </div>

      {/* Following Feed */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">From People You Follow</h2>
          {!isFollowingNobody && (
            <Link href="/feed" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
              View all <ChevronRight size={13} />
            </Link>
          )}
        </div>

        {isFollowingNobody ? (
          <div className="relative overflow-hidden rounded-3xl border border-dashed border-border/80 bg-card p-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-violet-500/10 flex items-center justify-center mx-auto ring-8 ring-violet-500/5">
              <UserPlus size={24} className="text-violet-500" />
            </div>
            <div className="max-w-sm mx-auto">
              <p className="font-black text-base">Follow community readers</p>
              <p className="text-xs text-muted-foreground mt-1">
                Discover updates, top recommendations, and reviews from people whose taste matches yours.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 justify-center pt-1">
              <Link href="/feed?tab=discover">
                <Button size="sm" className="gap-2 rounded-xl text-xs font-semibold">
                  <Users size={14} />
                  Discover Readers
                </Button>
              </Link>
              <Link href="/browse">
                <Button size="sm" variant="outline" className="gap-2 rounded-xl text-xs font-semibold">
                  <Radar size={14} />
                  Browse Comics
                </Button>
              </Link>
            </div>
          </div>
        ) : feedItems.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {feedItems.map((rec: any) => {
              const p = rec.profiles
              const typeStyle = TYPE_COLORS[rec.type] ?? 'bg-muted text-muted-foreground border-border'
              return (
                <Link
                  key={rec.id}
                  href={`/comic/${rec.id}`}
                  className="group flex items-center gap-3.5 p-3.5 rounded-2xl border border-border/60 bg-card hover:border-primary/40 hover:shadow-md transition-all duration-200"
                >
                  <div className="w-12 h-16 rounded-xl overflow-hidden bg-muted shrink-0 shadow-sm relative">
                    {rec.cover_url ? (
                      <img
                        src={proxyCover(rec.cover_url)}
                        alt={rec.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpen size={16} className="text-muted-foreground opacity-40" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold line-clamp-1 group-hover:text-primary transition-colors">
                      {rec.title}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize ${typeStyle}`}>
                        {rec.type}
                      </span>
                      <span className="text-[11px] text-muted-foreground truncate">
                        by @{p?.username ?? 'user'} • {timeAgo(rec.created_at)}
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={14} className="text-muted-foreground/30 group-hover:text-muted-foreground shrink-0" />
                </Link>
              )
            })}
          </div>
        ) : (
          <div className="flex items-center justify-between p-4 rounded-2xl border border-dashed border-border bg-card/60 text-xs text-muted-foreground">
            <div className="flex items-center gap-2.5">
              <LayoutList size={16} className="text-muted-foreground/50 shrink-0" />
              <span>The readers you follow haven't posted any updates recently.</span>
            </div>
            <Link href="/feed?tab=discover">
              <Button variant="ghost" size="sm" className="text-xs gap-1 text-primary hover:bg-primary/10 rounded-xl">
                Discover Readers <ChevronRight size={12} />
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {quickActions.map(({ href, icon: Icon, label, desc, bg, text }) => (
            <Link key={href} href={href}>
              <div className="group flex items-center gap-4 p-4 rounded-2xl border border-border/60 bg-card hover:border-primary/40 hover:shadow-md transition-all duration-200">
                <div className={`w-11 h-11 rounded-2xl ${bg} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300`}>
                  <Icon size={18} className={text} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold group-hover:text-primary transition-colors">{label}</p>
                  <p className="text-[11px] text-muted-foreground truncate mt-0.5">{desc}</p>
                </div>
                <ArrowRight size={14} className="text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
