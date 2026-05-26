import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Trophy, BookOpen, ThumbsUp } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Leaderboard | Pro' }

interface LeaderboardUser {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  total_recommendations: number
  total_votes_received: number
}

function fmt(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

const RANK_STYLES = [
  { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30', medal: '🥇' },
  { bg: 'bg-slate-400/20', text: 'text-slate-400', border: 'border-slate-400/30', medal: '🥈' },
  { bg: 'bg-amber-700/20', text: 'text-amber-600', border: 'border-amber-700/30', medal: '🥉' },
]

export default async function ProReaderLeaderboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: topUsers } = await (supabase as any)
    .from('profiles')
    .select('id, username, display_name, avatar_url, total_recommendations, total_votes_received')
    .eq('is_banned', false)
    .not('role', 'in', '("admin","moderator")')
    .gt('total_recommendations', 0)
    .order('total_votes_received', { ascending: false })
    .order('total_recommendations', { ascending: false })
    .limit(50)

  const users: LeaderboardUser[] = topUsers ?? []
  const myRank = users.findIndex(u => u.id === user.id)
  const meHere = myRank >= 0

  const { data: myProfile } = !meHere
    ? await supabase.from('profiles')
        .select('id, username, display_name, avatar_url, total_recommendations, total_votes_received')
        .eq('id', user.id).single()
    : { data: null }

  const me = meHere ? users[myRank] : (myProfile as LeaderboardUser | null)

  const init = (u: Partial<LeaderboardUser> | null) => 
    (u?.display_name || u?.username || 'U').slice(0, 2).toUpperCase()

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
          <Trophy size={20} className="text-amber-500" />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight">Leaderboard</h1>
          <p className="text-sm text-muted-foreground">Top contributors ranked by votes received</p>
        </div>
      </div>

      {/* Podium — top 3 */}
      {users.length >= 3 && (
        <div className="grid grid-cols-3 gap-3">
          {[users[1], users[0], users[2]].map((u, podiumIdx) => {
            const rank  = podiumIdx === 0 ? 1 : podiumIdx === 1 ? 0 : 2
            const style = RANK_STYLES[rank]
            const isMe  = u.id === user.id
            return (
              <Link key={u.id} href={`/profile/${u.username}`}
                className={cn('flex flex-col items-center gap-2 p-3 rounded-2xl border transition-colors',
                  isMe ? 'border-primary/40 bg-primary/5' : `${style.border} ${style.bg}`)}>
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarImage src={u.avatar_url ?? undefined} />
                  <AvatarFallback className={cn('text-xs font-black', style.bg, style.text)}>{init(u)}</AvatarFallback>
                </Avatar>
                <div className="text-center min-w-0 w-full">
                  <p className="text-xs font-black truncate">{u.display_name || u.username}</p>
                  {isMe && <span className="text-[9px] text-primary">(you)</span>}
                  <p className={cn('text-base font-black', style.text)}>{style.medal}</p>
                </div>
                <p className="text-[10px] text-muted-foreground">{fmt(u.total_votes_received)} votes</p>
              </Link>
            )
          })}
        </div>
      )}

      {/* Full list */}
      <div className="space-y-2">
        {users.map((u: LeaderboardUser, i: number) => {
          const style = RANK_STYLES[i] ?? { bg: 'bg-muted/40', text: 'text-muted-foreground', border: 'border-border', medal: `${i + 1}` }
          const isMe  = u.id === user.id
          return (
            <Link key={u.id} href={`/profile/${u.username}`}
              className={cn('flex items-center gap-3 p-3 rounded-2xl border transition-colors hover:border-primary/30',
                isMe ? 'border-amber-500/40 bg-amber-500/5' : 'border-border bg-card')}>
              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black shrink-0 border', style.bg, style.text, style.border)}>
                {i < 3 ? style.medal : i + 1}
              </div>
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarImage src={u.avatar_url ?? undefined} />
                <AvatarFallback className="text-xs font-black bg-primary/10 text-primary">{init(u)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black truncate">
                  {u.display_name || u.username}
                  {isMe && <span className="ml-1.5 text-[10px] text-amber-500 font-bold">(you)</span>}
                </p>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground shrink-0">
                <span className="flex items-center gap-1"><BookOpen size={10} className="text-primary" />{fmt(u.total_recommendations)}</span>
                <span className="flex items-center gap-1"><ThumbsUp size={10} className="text-emerald-500" />{fmt(u.total_votes_received)}</span>
              </div>
            </Link>
          )
        })}
      </div>

      {/* User's own rank if not in top 50 */}
      {!meHere && me && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground text-center">— Your ranking —</p>
          <div className="flex items-center gap-3 p-3 rounded-2xl border border-amber-500/40 bg-amber-500/5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black shrink-0 bg-muted/40 text-muted-foreground border border-border">50+</div>
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarImage src={me.avatar_url ?? undefined} />
              <AvatarFallback className="text-xs font-black bg-amber-500/10 text-amber-500">{init(me)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black truncate">
                {me.display_name || me.username}
                <span className="ml-1.5 text-[10px] text-amber-500 font-bold">(you)</span>
              </p>
              <p className="text-[10px] text-muted-foreground">Get more votes to climb the board</p>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground shrink-0">
              <span className="flex items-center gap-1"><BookOpen size={10} className="text-primary" />{fmt(me.total_recommendations ?? 0)}</span>
              <span className="flex items-center gap-1"><ThumbsUp size={10} className="text-emerald-500" />{fmt(me.total_votes_received ?? 0)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}