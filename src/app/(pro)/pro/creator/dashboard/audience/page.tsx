import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Users, Eye, TrendingUp, ArrowRight } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { formatDate, formatNumber } from '@/lib/utils/format'
import { getProfileRoute } from '@/lib/utils/routes'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Audience' }

export default async function ProCreatorAudiencePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [
    { count: followersCount },
    { data: recentFollowers },
    { count: profileViews },
    { count: viewsThisMonth },
  ] = await Promise.all([
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', user.id),
    supabase
      .from('follows')
      .select('follower_id, created_at, profiles!follows_follower_id_fkey(username, display_name, avatar_url, total_recommendations)')
      .eq('following_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20),
    (supabase as any).from('profile_views').select('*', { count: 'exact', head: true }).eq('profile_id', user.id),
    (supabase as any).from('profile_views').select('*', { count: 'exact', head: true }).eq('profile_id', user.id)
      .gte('viewed_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
  ])

  const stats = [
    { label: 'Total Followers',    value: followersCount  ?? 0, icon: Users,      bg: 'bg-violet-500/10', text: 'text-violet-500' },
    { label: 'Total Profile Views',value: profileViews    ?? 0, icon: Eye,        bg: 'bg-blue-500/10',   text: 'text-blue-500'   },
    { label: 'Views This Month',   value: viewsThisMonth  ?? 0, icon: TrendingUp,  bg: 'bg-teal-500/10',   text: 'text-teal-500'   },
  ]

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-teal-500/10 flex items-center justify-center shrink-0">
          <Users size={17} className="text-teal-500" />
        </div>
        <div className="min-w-0">
          <h1 className="text-xl font-black tracking-tight truncate">Audience</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Deep insights — Pro exclusive</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {stats.map(({ label, value, icon: Icon, bg, text }) => (
          <div key={label} className="p-4 rounded-2xl border border-teal-500/20 bg-teal-500/5 space-y-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${bg}`}>
              <Icon size={16} className={text} />
            </div>
            <p className="text-2xl font-black tabular-nums">{formatNumber(value)}</p>
            <p className="text-[10px] text-muted-foreground font-medium">{label}</p>
          </div>
        ))}
      </div>

      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Recent Followers</h2>
        {!recentFollowers?.length ? (
          <div className="flex flex-col items-center justify-center py-16 rounded-2xl border border-dashed border-border space-y-3">
            <Users size={28} className="text-muted-foreground/40" />
            <p className="font-black text-sm">No followers yet</p>
            <p className="text-xs text-muted-foreground">Submit your works and build your audience.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {(recentFollowers as any[]).map(follow => {
              const p = Array.isArray(follow.profiles) ? follow.profiles[0] : follow.profiles
              const initials = (p?.display_name || p?.username || 'U').slice(0, 2).toUpperCase()
              return (
                <Link key={follow.follower_id} href={p?.username ? getProfileRoute(p.username, 'reader') : '#'}
                  className="flex items-center gap-3 p-3 rounded-2xl border border-border bg-card hover:border-teal-500/30 transition-colors"
                >
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarImage src={p?.avatar_url} />
                    <AvatarFallback className="text-xs font-black bg-teal-500 text-white">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black truncate">{p?.display_name || p?.username}</p>
                    <p className="text-xs text-muted-foreground">{p?.total_recommendations ?? 0} recommendations · Followed {formatDate(follow.created_at)}</p>
                  </div>
                  <ArrowRight size={13} className="text-muted-foreground/40 shrink-0" />
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
