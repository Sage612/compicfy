import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Trophy, Crown, BookOpen, ThumbsUp } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { formatNumber } from '@/lib/utils/format'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Leaderboard' }

export default async function ProReaderLeaderboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: topUsers } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url, total_recommendations, total_votes_received')
    .eq('is_banned', false)
    .neq('username', 'ghost')
    .gt('total_recommendations', 0)
    .order('total_votes_received', { ascending: false })
    .limit(50)

  const RANK_STYLES = [
    { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30', label: '🥇' },
    { bg: 'bg-slate-400/20', text: 'text-slate-400', border: 'border-slate-400/30', label: '🥈' },
    { bg: 'bg-amber-700/20', text: 'text-amber-600', border: 'border-amber-700/30', label: '🥉' },
  ]

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
          <Trophy size={20} className="text-amber-500" />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight">Leaderboard</h1>
          <p className="text-sm text-muted-foreground">Top contributors this month</p>
        </div>
      </div>

      <div className="space-y-2">
        {(topUsers ?? []).map((u: any, i: number) => {
          const style    = RANK_STYLES[i] ?? { bg: 'bg-muted', text: 'text-muted-foreground', border: 'border-border', label: `#${i + 1}` }
          const initials = (u.display_name || u.username || 'U').slice(0, 2).toUpperCase()
          const isMe     = u.id === user.id
          return (
            <Link
              key={u.id}
              href={`/reader/${u.username}`}
              className={`flex items-center gap-3 p-3 rounded-2xl border transition-colors hover:border-primary/30 ${
                isMe ? 'border-primary/40 bg-primary/5' : 'border-border bg-card'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black shrink-0 border ${style.bg} ${style.text} ${style.border}`}>
                {i < 3 ? style.label : `#${i + 1}`}
              </div>
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarImage src={u.avatar_url} />
                <AvatarFallback className="text-xs font-black bg-primary text-primary-foreground">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black truncate">
                  {u.display_name || u.username}
                  {isMe && <span className="ml-1.5 text-[10px] text-primary font-bold">(you)</span>}
                </p>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground shrink-0">
                <span className="flex items-center gap-1"><BookOpen size={10} className="text-primary" />{formatNumber(u.total_recommendations)}</span>
                <span className="flex items-center gap-1"><ThumbsUp size={10} className="text-emerald-500" />{formatNumber(u.total_votes_received)}</span>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
