import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ProfileCompletionBanner } from '@/components/dashboard/ProfileCompletionBanner'
import { CurrentlyReadingSection } from '@/components/recommendations/CurrentlyReadingSection'
import { Button } from '@/components/ui/button'
import {
  BookOpen, Bookmark, Plus, Settings, Flame, Trophy, ArrowRight,
  BookMarked, ChevronRight, LayoutList, Users, UserPlus, Radar,
} from 'lucide-react'
import Link from 'next/link'
import { formatDate, timeAgo } from '@/lib/utils/format'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Dashboard' }

const TYPE_COLORS: Record<string, string> = {
  manga:   'bg-rose-500/10   text-rose-500   border-rose-500/20',
  manhwa:  'bg-violet-500/10 text-violet-500 border-violet-500/20',
  manhua:  'bg-amber-500/10  text-amber-500  border-amber-500/20',
  webtoon: 'bg-teal-500/10   text-teal-500   border-teal-500/20',
  comic:   'bg-blue-500/10   text-blue-500   border-blue-500/20',
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileData } = await (supabase as any)
    .from('profiles').select('*').eq('id', user.id).single()

  if (!profileData) redirect('/login')
  const profile = profileData as any

  const isAdmin   = profile.role === 'admin'
  const isPaidPro = !isAdmin &&
    profile.is_pro &&
    (!profile.pro_expires_at || new Date(profile.pro_expires_at) > new Date())

  if (isPaidPro) redirect('/pro/dashboard')

  const { data: followData } = await (supabase as any)
    .from('follows').select('following_id').eq('follower_id', user.id)

  const followingIds = (followData ?? []).map((f: any) => f.following_id)

  const [
    { count: listsCount },
    { count: savedCount },
    { count: followingCount },
    { data: currentlyReading },
    { data: feedItems },
    { data: listsForTracker },
  ] = await Promise.all([
    supabase.from('reading_lists').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('saves').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', user.id),
    supabase.from('reading_list_items')
      .select('id, list_id, status, progress_chapter, last_read_at, added_at, reading_lists!inner(user_id), recommendations(id, title, cover_url, type, status, chapter_count)')
      .eq('reading_lists.user_id', user.id).eq('status', 'reading')
      .order('added_at', { ascending: false }).limit(6),
    followingIds.length > 0
      ? supabase.from('recommendations')
          .select('id, title, cover_url, type, created_at, user_id, profiles(username, display_name, avatar_url)')
          .in('user_id', followingIds).eq('is_approved', true)
          .not('content_rating', 'in', '("adult","mature")')
          .order('created_at', { ascending: false }).limit(4)
      : Promise.resolve({ data: [] }),
    supabase.from('reading_lists').select('id, name').eq('user_id', user.id).order('created_at', { ascending: false }),
  ])

  const initials         = (profile.display_name || profile.username).slice(0, 2).toUpperCase()
  const isFollowingNobody = (followingCount ?? 0) === 0
  const hasReadingItems   = (currentlyReading ?? []).length > 0

  const stats = [
    { label: 'Recommendations', value: profile.total_recommendations ?? 0, icon: BookOpen,   href: '/dashboard/recommendations', bg: 'bg-violet-500/10', text: 'text-violet-500' },
    { label: 'Saved Comics',     value: savedCount ?? 0,                     icon: Bookmark,   href: '/dashboard/saved',           bg: 'bg-rose-500/10',   text: 'text-rose-500'  },
    { label: 'Reading Lists',    value: listsCount ?? 0,                     icon: BookMarked, href: '/dashboard/lists',           bg: 'bg-teal-500/10',   text: 'text-teal-500'  },
    { label: 'Following',        value: followingCount ?? 0,                 icon: Users,      href: '/feed',                      bg: 'bg-primary/10',    text: 'text-primary'   },
  ]

  const quickActions = [
    { href: '/dashboard/recommendations/new', icon: Plus,        label: 'Submit a Recommendation', desc: 'Share a comic with the community', gradient: 'from-violet-500 to-purple-600' },
    { href: '/feed',                           icon: LayoutList,  label: 'Following Feed',           desc: 'Latest from people you follow',   gradient: 'from-primary to-violet-500'   },
    { href: '/dashboard/lists',                icon: BookMarked,  label: 'Reading Lists',            desc: 'Manage your reading collection',  gradient: 'from-teal-500 to-cyan-600'    },
    { href: '/browse',                         icon: Flame,       label: 'Browse Comics',            desc: 'Discover new recommendations',    gradient: 'from-rose-500 to-pink-600'    },
  ]

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">

      {/* Welcome banner */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 md:p-8">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-primary/5 blur-2xl" />
          <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-violet-500/5 blur-xl" />
        </div>
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="relative shrink-0">
            <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-primary to-violet-500 opacity-30 blur-sm" />
            <Avatar className="relative h-16 w-16 border-2 border-background">
              <AvatarImage src={profile.avatar_url ?? undefined} />
              <AvatarFallback className="text-xl bg-gradient-to-br from-primary to-violet-500 text-white font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-black truncate">
              Hey, {profile.display_name || profile.username}! 
            </h1>
            <p className="text-sm text-muted-foreground">
              Member since {formatDate(profile.member_since)} · Keep sharing great reads.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Link href="/dashboard/settings">
              <Button variant="outline" size="sm" className="gap-1.5">
                <Settings size={13} />
                Settings
              </Button>
            </Link>
            <Link href="/dashboard/recommendations/new">
              <Button size="sm" className="gap-1.5">
                <BookOpen size={13} />
                Recommend
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Profile completion banner */}
      <ProfileCompletionBanner
        hasAvatar={!!profile.avatar_url}
        hasBio={!!profile.bio}
        hasWebsite={!!profile.website}
      />

      {/* Stats grid */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Your Stats</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {stats.map(({ label, value, icon: Icon, href, bg, text }) => (
            <Link
              key={label}
              href={href}
              className="group relative overflow-hidden p-4 rounded-2xl border border-border bg-card hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200"
            >
              <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-3`}>
                <Icon size={18} className={text} />
              </div>
              <p className="text-2xl font-black tabular-nums">{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{label}</p>
              <ArrowRight size={12} className="absolute bottom-4 right-4 text-muted-foreground/30 group-hover:text-muted-foreground/60 group-hover:translate-x-0.5 transition-all" />
            </Link>
          ))}
        </div>
      </div>

      {/* ── Reading tracker ──
          If nothing is being tracked, show a prominent CTA instead
          of just the empty search box alone.                       */}
      {!hasReadingItems ? (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Reading Tracker</h2>
          <div className="relative overflow-hidden rounded-2xl border border-dashed border-teal-500/30 bg-teal-500/5 p-6 text-center space-y-4">
            <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-teal-500/10 blur-2xl pointer-events-none" />
            <div className="w-12 h-12 rounded-2xl bg-teal-500/15 flex items-center justify-center mx-auto">
              <BookOpen size={20} className="text-teal-600" />
            </div>
            <div>
              <p className="font-black text-sm">What are you reading right now?</p>
              <p className="text-xs text-muted-foreground mt-1">
                Track your progress, set a status, and never lose your place.
              </p>
            </div>
            <div className="flex gap-3 justify-center">
              <Link href="/browse">
                <Button size="sm" className="gap-1.5 bg-gradient-to-r from-teal-500 to-cyan-600 border-0 hover:opacity-90 shadow-md shadow-teal-500/20 text-white">
                  <BookOpen size={13} />
                  Find something to read
                </Button>
              </Link>
              <Link href="/dashboard/lists">
                <Button size="sm" variant="outline" className="gap-1.5 border-teal-500/30 hover:border-teal-500/60 text-teal-600">
                  <BookMarked size={13} />
                  My Lists
                </Button>
              </Link>
            </div>
          </div>
          {/* Still render the section so the search box is available */}
          <CurrentlyReadingSection
            initialItems={[]}
            lists={(listsForTracker ?? []) as any}
          />
        </div>
      ) : (
        <CurrentlyReadingSection
          initialItems={(currentlyReading ?? []) as any}
          lists={(listsForTracker ?? []) as any}
        />
      )}

      {/* ── Following feed preview ──
          If following nobody: show a prompt to find people.
          If following but no recs yet: show a gentle nudge.
          Otherwise: show the feed items.                           */}
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
          /* Not following anyone */
          <div className="relative overflow-hidden rounded-2xl border border-dashed border-primary/20 bg-primary/5 p-6 text-center space-y-4">
            <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-primary/10 blur-2xl pointer-events-none" />
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
              <UserPlus size={20} className="text-primary" />
            </div>
            <div>
              <p className="font-black text-sm">Follow readers you trust</p>
              <p className="text-xs text-muted-foreground mt-1">
                Their recommendations will appear here so you never miss a great pick.
              </p>
            </div>
            <div className="flex gap-3 justify-center">
              <Link href="/feed?tab=discover">
                <Button size="sm" className="gap-1.5 bg-gradient-to-r from-primary to-violet-500 border-0 hover:opacity-90 shadow-md shadow-primary/20">
                  <Users size={13} />
                  Discover Readers
                </Button>
              </Link>
              <Link href="/browse">
                <Button size="sm" variant="outline" className="gap-1.5">
                  <Radar size={13} />
                  Browse Comics
                </Button>
              </Link>
            </div>
          </div>
        ) : feedItems && feedItems.length > 0 ? (
          /* Has following + has items */
          <div className="space-y-2">
            {(feedItems as any[]).map((rec: any) => {
              const p         = rec.profiles
              const typeStyle = TYPE_COLORS[rec.type] ?? 'bg-muted text-muted-foreground border-border'
              return (
                <Link
                  key={rec.id}
                  href={`/comic/${rec.id}`}
                  className="group flex items-center gap-3 p-3 rounded-2xl border border-border bg-card hover:border-primary/30 transition-colors"
                >
                  <div className="w-10 h-14 rounded-lg overflow-hidden bg-muted shrink-0">
                    {rec.cover_url
                      ? <img src={rec.cover_url} alt={rec.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      : <div className="w-full h-full flex items-center justify-center"><BookOpen size={12} className="text-muted-foreground opacity-40" /></div>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black line-clamp-1 group-hover:text-primary transition-colors">{rec.title}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold border capitalize ${typeStyle}`}>
                        {rec.type}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        by @{p?.username} · {timeAgo(rec.created_at)}
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={13} className="text-muted-foreground/30 group-hover:text-muted-foreground shrink-0" />
                </Link>
              )
            })}
          </div>
        ) : (
          /* Has following but they haven't posted yet */
          <div className="flex items-center gap-3 p-4 rounded-2xl border border-dashed border-border bg-card/50 text-sm text-muted-foreground">
            <LayoutList size={16} className="text-muted-foreground/40 shrink-0" />
            <span>The people you follow haven't shared any recommendations yet.</span>
            <Link href="/feed?tab=discover" className="ml-auto shrink-0">
              <Button variant="ghost" size="sm" className="text-xs gap-1 text-primary">
                Try Discover <ChevronRight size={11} />
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {quickActions.map(({ href, icon: Icon, label, desc, gradient }) => (
            <Link key={href} href={href}>
              <div className="group flex items-center gap-4 p-4 rounded-2xl border border-border bg-card hover:border-primary/40 hover:shadow-md transition-all duration-200 cursor-pointer">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shrink-0 shadow-sm group-hover:scale-110 transition-transform`}>
                  <Icon size={17} className="text-white" />
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

      {/* Achievement teaser */}
      <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
        <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-amber-500/10 blur-xl pointer-events-none" />
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 flex items-center justify-center shrink-0">
            <Trophy size={22} className="text-amber-500" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-sm">Achievements coming soon</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Earn badges for sharing great comics and helping the community grow
            </p>
          </div>
        </div>
      </div>

    </div>
  )
}