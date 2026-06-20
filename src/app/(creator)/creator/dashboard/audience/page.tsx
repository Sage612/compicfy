import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Users, UserPlus, Eye, TrendingUp, ArrowRight, Lock } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { formatDate, formatNumber } from '@/lib/utils/format'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Audience' }

export default async function CreatorAudiencePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [
    { count: followersCount },
    { data: recentFollowers },
    { count: profileViews },
  ] = await Promise.all([
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', user.id),
    supabase
      .from('follows')
      .select('follower_id, created_at, profiles!follows_follower_id_fkey(username, display_name, avatar_url, total_recommendations)')
      .eq('following_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20),
    (supabase as any).from('profile_views').select('*', { count: 'exact', head: true }).eq('profile_id', user.id),
  ])

  const stats = [
    { label: 'Total Followers', value: followersCount ?? 0, icon: Users,      bg: 'bg-violet-500/10', text: 'text-violet-500' },
    { label: 'Profile Views',   value: profileViews   ?? 0, icon: Eye,        bg: 'bg-blue-500/10',   text: 'text-blue-500'  },
    { label: 'Views This Month',value: '—',                 icon: TrendingUp, bg: 'bg-teal-500/10',   text: 'text-teal-500'  },
  ]

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
            <Users size={16} className="text-violet-500" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight">Audience</h1>
            <p className="text-xs text-muted-foreground mt-0.5">People who follow your work.</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {stats.map(({ label, value, icon: Icon, bg, text }) => (
          <div key={label} className="p-4 rounded-2xl border border-border bg-card space-y-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${bg}`}>
              <Icon size={15} className={text} />
            </div>
            <p className="text-xl font-black tabular-nums">
              {typeof value === 'number' ? formatNumber(value) : value}
            </p>
            <p className="text-[10px] text-muted-foreground font-medium">{label}</p>
          </div>
        ))}
      </div>

      {/* Pro upsell — views this month is pro only */}
      <div className="flex items-center gap-3 p-3 rounded-xl border border-amber-500/20 bg-amber-500/5">
        <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
          <Lock size={13} className="text-amber-500" />
        </div>
        <p className="text-xs text-amber-700 dark:text-amber-400 flex-1">
          Monthly views, growth tracking, and deep audience insights are <strong>Pro only</strong>.
        </p>
        <Link href="/pricing">
          <Button size="sm" variant="outline" className="shrink-0 border-amber-500/30 text-amber-600 hover:bg-amber-500/10 h-7 text-xs px-2.5">
            Upgrade
          </Button>
        </Link>
      </div>

      {/* Followers list */}
      <div>
        <h2 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-3">Recent Followers</h2>
        {!recentFollowers?.length ? (
          <div className="flex flex-col items-center justify-center py-14 rounded-2xl border border-dashed border-border space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-violet-500/10 flex items-center justify-center">
              <UserPlus size={20} className="text-violet-500" />
            </div>
            <div className="text-center">
              <p className="font-black text-sm">No followers yet</p>
              <p className="text-xs text-muted-foreground mt-1">Submit your works and build your audience.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {(recentFollowers as any[]).map(follow => {
              const p        = Array.isArray(follow.profiles) ? follow.profiles[0] : follow.profiles
              const initials = (p?.display_name || p?.username || 'U').slice(0, 2).toUpperCase()
              return (
                <Link
                  key={follow.follower_id}
                  href={`/reader/${p?.username}`}
                  className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:border-primary/30 transition-colors"
                >
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage src={p?.avatar_url} />
                    <AvatarFallback className="text-xs font-black bg-violet-500 text-white">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black truncate">{p?.display_name || p?.username}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {p?.total_recommendations ?? 0} recs · Followed {formatDate(follow.created_at)}
                    </p>
                  </div>
                  <ArrowRight size={12} className="text-muted-foreground/40 shrink-0" />
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}