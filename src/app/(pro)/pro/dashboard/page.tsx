import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ProAvatar } from '@/components/pro/ProAvatar'
import { VerifiedBadge } from '@/components/pro/VerifiedBadge'
import { ProBadge } from '@/components/pro/ProBadge'
import { Button } from '@/components/ui/button'
import {
  Crown, BarChart2, Eye, Download, Trophy,
  BookOpen, Bookmark, Star, ThumbsUp,
  ArrowRight, Sparkles, Zap, ChevronRight,
} from 'lucide-react'
import { formatDate, formatNumber } from '@/lib/utils/format'
import { cn } from '@/lib/utils' // Using your existing utility
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Pro Dashboard | Compicfy' }

export default async function ProDashboardPage() {
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

  const isPro = profile.is_pro &&
    (!profile.pro_expires_at || new Date(profile.pro_expires_at) > new Date())
  const isAdmin = profile.role === 'admin'

  if (!isPro && !isAdmin) redirect('/pricing?reason=pro_required')

  // Stats - Explicitly typing the results to avoid 'never' inference
  const [
    { count: totalRecs },
    { count: savedCount },
    { data: topRecs },
    { data: leaderboardData },
    { count: viewsThisMonth },
  ] = await Promise.all([
    supabase.from('recommendations').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_approved', true),
    supabase.from('saves').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('recommendations').select('id, title, cover_url, upvotes, save_count, view_count, type').eq('user_id', user.id).eq('is_approved', true).order('score', { ascending: false }).limit(3),
    supabase.from('pro_leaderboard').select('rank, score').eq('user_id', user.id).order('month', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('profile_views').select('*', { count: 'exact', head: true }).eq('profile_id', user.id).gte('viewed_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
  ])

  // Cast the leaderboard entry to access properties safely
  const leaderboardEntry = leaderboardData as { rank: number; score: number } | null

  const initials = (profile.display_name || profile.username || 'U').slice(0, 2).toUpperCase()

  const quickActions = [
    { href: '/pro/analytics',     icon: BarChart2, label: 'View Analytics',      desc: 'See your rec performance',     color: 'from-violet-500 to-purple-600' },
    { href: '/pro/profile-views', icon: Eye,        label: 'Profile Views',       desc: `${viewsThisMonth ?? 0} this month`, color: 'from-blue-500 to-indigo-600'  },
    { href: '/pro/export',         icon: Download,  label: 'Export Lists',        desc: 'Download as CSV or PDF',       color: 'from-teal-500 to-cyan-600'     },
    { href: '/pro/leaderboard',   icon: Trophy,    label: 'Leaderboard',         desc: leaderboardEntry?.rank ? `Rank #${leaderboardEntry.rank}` : 'See your rank', color: 'from-amber-400 to-orange-500' },
  ]

  const TYPE_COLORS: Record<string, string> = {
    manga:   'bg-rose-500/10   text-rose-500   border-rose-500/20',
    manhwa:  'bg-violet-500/10 text-violet-500 border-violet-500/20',
    manhua:  'bg-amber-500/10  text-amber-500  border-amber-500/20',
    webtoon: 'bg-teal-500/10   text-teal-500   border-teal-500/20',
    comic:   'bg-blue-500/10   text-blue-500   border-blue-500/20',
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">

      {/* Gold welcome banner */}
      <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent p-6 md:p-8">
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-amber-500/10 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-orange-500/10 blur-xl pointer-events-none" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />

        <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <ProAvatar
            src={profile.avatar_url}
            fallback={initials}
            size="lg"
            isPro={isPro}
            isAdmin={isAdmin}
          />
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-black truncate">
                {profile.display_name || profile.username}
              </h1>
              <ProBadge role={profile.role} isPro={isPro} />
              {profile.verified_recommender && <VerifiedBadge />}
            </div>
            <p className="text-sm text-muted-foreground">
              Pro since {formatDate(profile.member_since)} ·{' '}
              {profile.pro_expires_at
                ? `Renews ${formatDate(profile.pro_expires_at)}`
                : 'Lifetime access'}
            </p>
            {leaderboardEntry?.rank && (
              <p className="text-xs text-amber-600 font-semibold flex items-center gap-1">
                <Trophy size={11} />
                Leaderboard Rank #{leaderboardEntry.rank} this month
              </p>
            )}
          </div>
          <div className="flex gap-2 shrink-0">
            <Link href={`/profile/${profile.username}`}>
              <Button variant="outline" size="sm" className="gap-1.5 border-amber-500/30 hover:border-amber-500/60">
                View Profile
              </Button>
            </Link>
            <Link href="/pro/themes">
              <Button size="sm" className="gap-1.5 bg-gradient-to-r from-amber-400 to-orange-500 border-0 text-white shadow-md shadow-amber-500/20">
                <Sparkles size={13} />
                Themes
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Recommendations', value: totalRecs ?? 0,        icon: BookOpen, color: 'text-violet-500', bg: 'bg-violet-500/10' },
          { label: 'Saved Comics',     value: savedCount ?? 0,       icon: Bookmark, color: 'text-rose-500',   bg: 'bg-rose-500/10'   },
          { label: 'Profile Views',    value: viewsThisMonth ?? 0,  icon: Eye,       color: 'text-blue-500',   bg: 'bg-blue-500/10'   },
          { label: 'Leaderboard',      value: leaderboardEntry?.rank ? `#${leaderboardEntry.rank}` : '—', icon: Trophy, color: 'text-amber-500', bg: 'bg-amber-500/10' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="p-4 rounded-2xl border border-border bg-card space-y-3">
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', bg)}>
              <Icon size={18} className={color} />
            </div>
            <p className="text-2xl font-black tabular-nums">{value}</p>
            <p className="text-xs text-muted-foreground leading-tight">{label}</p>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Pro Tools</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {quickActions.map(({ href, icon: Icon, label, desc, color }) => (
            <Link key={href} href={href}>
              <div className="group flex items-center gap-4 p-4 rounded-2xl border border-border bg-card hover:border-amber-500/40 hover:shadow-md transition-all duration-200 cursor-pointer">
                <div className={cn('w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0 shadow-sm group-hover:scale-110 transition-transform', color)}>
                  <Icon size={17} className="text-white" />
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
            {topRecs.map((rec: any, i: number) => (
              <Link
                key={rec.id}
                href={`/comic/${rec.id}`}
                className="group flex items-center gap-3 p-3 rounded-2xl border border-border bg-card hover:border-amber-500/30 transition-colors"
              >
                <span className="text-lg font-black text-muted-foreground/30 w-6 shrink-0">#{i + 1}</span>
                <div className="w-10 h-14 rounded-lg overflow-hidden bg-muted shrink-0">
                  {rec.cover_url ? (
                    <img src={rec.cover_url} alt={rec.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen size={12} className="text-muted-foreground opacity-40" />
                    </div>
                  )}
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

      {/* Pro perks reminder */}
      <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
        <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-amber-500/10 blur-xl pointer-events-none" />
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0 shadow-sm">
            <Zap size={18} className="text-white" />
          </div>
          <div className="flex-1">
            <p className="font-black text-sm text-amber-700 dark:text-amber-400">All Pro perks active</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Unlimited recommendations · Unlimited saves · Advanced filters · Priority review · Ad-free
            </p>
          </div>
        </div>
      </div>

    </div>
  )
}