import { createClient as createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Sparkles, Users } from 'lucide-react'
import { getSuggestedMatches } from '@/lib/taste/getSuggestedMatches'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Suggested Matches' }

function proxyCover(url: string | null | undefined): string {
  if (!url) return ""
  if (url.startsWith('data:')) return url
  if (url.startsWith('/')) return url
  if (url.includes('/api/image-proxy')) return url
  return `/api/image-proxy?url=${encodeURIComponent(url)}`
}

export default async function MatchesPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Top 10 precomputed matches — matches the cron's TOP_MATCHES_PER_USER cap.
  // Raise both together if this ever needs to show more.
  const matches = await getSuggestedMatches(supabase, user.id, 10)

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
          <Sparkles size={16} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight">Readers Like You</h1>
          <p className="text-muted-foreground text-sm">
            People whose taste in comics lines up with yours
          </p>
        </div>
      </div>

      {/* Matches list */}
      {matches.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-2xl border border-dashed border-border space-y-3 text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Users size={24} className="text-primary opacity-60" />
          </div>
          <p className="font-black text-sm">No matches yet</p>
          <p className="text-xs text-muted-foreground max-w-xs">
            Add comics to your reading lists so we can find readers with similar taste. Matches update daily.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {matches.map(match => (
            <Link
              key={match.userId}
              href={`/profile/${match.username}`}
              className="group flex items-center gap-4 p-4 rounded-2xl border border-border bg-card hover:border-primary/30 transition-colors"
            >
              <div className="w-12 h-12 rounded-full overflow-hidden bg-muted shrink-0">
                {match.avatarUrl ? (
                  <img
                    src={proxyCover(match.avatarUrl)}
                    alt={match.displayName ?? match.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-sm font-black text-muted-foreground/60">
                    {(match.displayName ?? match.username).charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm group-hover:text-primary transition-colors truncate">
                  {match.displayName ?? match.username}
                </p>
                <p className="text-xs text-muted-foreground truncate">@{match.username}</p>
                {match.sharedGenres.length > 0 && (
                  <p className="text-xs text-muted-foreground/80 mt-1 truncate">
                    Both like {match.sharedGenres.join(', ')}
                  </p>
                )}
              </div>
              <div className="shrink-0 text-right">
                <span className="text-sm font-black text-emerald-500">{match.similarityPct}%</span>
                <p className="text-[10px] text-muted-foreground">match</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}