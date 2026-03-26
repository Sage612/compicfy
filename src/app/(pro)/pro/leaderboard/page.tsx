import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ProBadge } from '@/components/pro/ProBadge'
import { VerifiedBadge } from '@/components/pro/VerifiedBadge'
import { Trophy, Crown, ThumbsUp, Bookmark, Eye, BookOpen } from 'lucide-react'
import { formatNumber } from '@/lib/utils/format'
import { cn } from '@/lib/utils'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Pro Leaderboard | Compicfy' }

export default async function ProLeaderboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_pro, pro_expires_at')
    .eq('id', user.id)
    .single() as { data: any }

  const isPro = profile?.is_pro && (!profile.pro_expires_at || new Date(profile.pro_expires_at) > new Date())
  if (!isPro && profile?.role !== 'admin') redirect('/pricing?reason=pro_required')

  const { data: leaderboard } = await (supabase as any)
    .rpc('get_pro_leaderboard', { p_limit: 20 }) as { data: any[] }

  const myEntry = leaderboard?.find((e: any) => e.user_id === user.id)

  const rankColors: Record<number, string> = {
    1: 'text-amber-400',
    2: 'text-slate-400',
    3: 'text-amber-700',
  }

  const rankBg: Record<number, string> = {
    1: 'border-amber-500/40 bg-amber-500/5',
    2: 'border-slate-400/30 bg-slate-400/5',
    3: 'border-amber-700/30 bg-amber-700/5',
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Trophy size={16} className="text-white" />
          </div>
          <h1 className="text-2xl font-black tracking-tight">Pro Leaderboard</h1>
        </div>
        <p className="text-muted-foreground text-sm pl-0.5">
          Top Pro contributors this month
        </p>
      </div>

      {/* My rank card */}
      {myEntry && (
        <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 space-y-1">
          <p className="text-xs font-black text-amber-600 uppercase tracking-wider">Your Rank</p>
          <div className="flex items-center gap-3">
            <span className="text-3xl font-black text-amber-500">#{myEntry.rank ?? '—'}</span>
            <div className="text-sm text-muted-foreground">
              Score: <strong className="text-foreground">{myEntry.score}</strong>
            </div>
          </div>
        </div>
      )}

      {/* Scoring explanation */}
      <div className="p-4 rounded-2xl border border-border bg-card space-y-2">
        <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">How scoring works</p>
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><BookOpen size={10} className="text-violet-500" />Recommendation = 10pts</span>
          <span className="flex items-center gap-1"><ThumbsUp size={10} className="text-emerald-500" />Upvote = 3pts</span>
          <span className="flex items-center gap-1"><Bookmark size={10} className="text-rose-500" />Save = 2pts</span>
          <span className="flex items-center gap-1"><Eye size={10} className="text-blue-500" />View = 1pt</span>
        </div>
      </div>

      {/* Leaderboard */}
      {!leaderboard || leaderboard.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border border-dashed border-border space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto">
            <Trophy size={22} className="text-muted-foreground opacity-40" />
          </div>
          <div>
            <p className="font-black text-sm">No entries yet this month</p>
            <p className="text-xs text-muted-foreground mt-1">Submit recommendations to earn points</p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {leaderboard.map((entry: any) => {
            const isMe = entry.user_id === user.id
            const initials = (entry.display_name || entry.username).slice(0, 2).toUpperCase()
            const rank = entry.rank ?? 99

            return (
              <div
                key={entry.user_id}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-2xl border transition-colors',
                  isMe
                    ? 'border-amber-500/40 bg-amber-500/5'
                    : rankBg[rank] ?? 'border-border bg-card'
                )}
              >
                {/* Rank */}
                <div className="w-8 shrink-0 text-center">
                  {rank <= 3 ? (
                    <Crown size={18} className={cn('mx-auto', rankColors[rank])} />
                  ) : (
                    <span className="text-sm font-black text-muted-foreground">#{rank}</span>
                  )}
                </div>

                {/* Avatar */}
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarImage src={entry.avatar_url ?? undefined} />
                  <AvatarFallback className="text-xs font-black bg-gradient-to-br from-primary to-violet-500 text-white">
                    {initials}
                  </AvatarFallback>
                </Avatar>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Link href={`/profile/${entry.username}`} className="text-xs font-black hover:text-primary transition-colors truncate">
                      {entry.display_name || entry.username}
                    </Link>
                    <ProBadge role={entry.role} isPro={entry.is_pro} size="sm" />
                    {isMe && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20 font-bold">
                        You
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2 mt-0.5 text-[10px] text-muted-foreground">
                    <span>{entry.recommendations_count} recs</span>
                    <span>{entry.total_upvotes} votes</span>
                  </div>
                </div>

                {/* Score */}
                <div className="shrink-0 text-right">
                  <p className={cn('text-sm font-black', rank <= 3 ? rankColors[rank] : 'text-foreground')}>
                    {formatNumber(entry.score)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">pts</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}