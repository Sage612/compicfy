import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { PageShell, PageHeader } from '@/components/dashboard/PageHeader'
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

function Row({
  rank,
  u,
  isMe,
  init,
  note,
}: {
  rank: string
  u: LeaderboardUser
  isMe: boolean
  init: string
  note?: string
}) {
  return (
    <Link
      href={`/profile/${u.username}`}
      className={cn(
        'flex items-center gap-3 rounded-xl border bg-card px-3 py-2.5 transition-colors',
        isMe ? 'border-foreground' : 'border-border hover:border-foreground/30',
      )}
    >
      <span className="w-8 shrink-0 text-right font-dashboard-serif text-base tabular-nums text-muted-foreground">
        {rank}
      </span>
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarImage src={u.avatar_url ?? undefined} />
        <AvatarFallback className="text-[11px] bg-muted text-muted-foreground">{init}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground truncate">
          {u.display_name || u.username}
          {isMe && <span className="ml-2 text-xs text-muted-foreground">You</span>}
        </p>
        {note && <p className="text-[11px] text-muted-foreground">{note}</p>}
      </div>
      <div className="flex items-baseline gap-4 shrink-0 text-xs text-muted-foreground tabular-nums">
        <span><span className="text-foreground">{fmt(u.total_recommendations ?? 0)}</span> recs</span>
        <span><span className="text-foreground">{fmt(u.total_votes_received ?? 0)}</span> votes</span>
      </div>
    </Link>
  )
}

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
    <PageShell width="narrow">
      <PageHeader
        title="Leaderboard"
        eyebrow="Community"
        subtitle="Top contributors by votes received."
        backHref="/pro/reader/dashboard"
        backLabel="Dashboard"
        isPro
      />

      {users.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-14 text-center space-y-1">
          <p className="font-dashboard-serif text-base text-foreground">No rankings yet</p>
          <p className="text-xs text-muted-foreground">Contributors appear here once they receive votes.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {users.map((u, i) => (
            <Row key={u.id} rank={String(i + 1)} u={u} isMe={u.id === user.id} init={init(u)} />
          ))}
        </div>
      )}

      {/* Own rank if outside the top 50 */}
      {!meHere && me && (
        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground/70">Your ranking</p>
          <Row
            rank="50+"
            u={me}
            isMe
            init={init(me)}
            note="Get more votes to climb the board"
          />
        </div>
      )}
    </PageShell>
  )
}
