import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Sparkles, Users, Crown } from 'lucide-react'
import { getSuggestedMatches } from '@/lib/taste/getSuggestedMatches'
import { isProUser } from '@/lib/access'
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
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fixed: this was hand-rolled `is_pro && not-expired` with NO admin or
  // patron fallback at all — an admin viewing this page could never
  // register as Pro, which is exactly the bug being reported. isProUser()
  // from @/lib/access is the real SSOT (isAdmin || isPatronUser ||
  // is_pro-and-not-expired) and is what every other fixed file in this
  // app now uses.
  const { data: viewerProfile } = await supabase
    .from('profiles')
    .select('role, is_pro, pro_expires_at, is_patron, patron_expires_at')
    .eq('id', user.id)
    .maybeSingle()

  const isPro = viewerProfile ? isProUser(viewerProfile as any) : false

  // Item #17 — Free: top 3/weekly display freeze. Pro: top 10, always current.
  const matches = await getSuggestedMatches(supabase, user.id, isPro)

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
            {isPro
              ? 'People whose taste in comics lines up with yours'
              : 'Your top 3 matches this week'}
          </p>
        </div>
      </div>

      {/* Free-tier upsell — matches item #17's Pro value prop (top 10/daily + filters) */}
      {!isPro && (
        <div className="flex items-center gap-3 p-3 rounded-xl border border-amber-500/20 bg-amber-500/5">
          <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
            <Crown size={13} className="text-amber-500" />
          </div>
          <p className="text-xs text-amber-700 dark:text-amber-400 flex-1">
            See your top 10 matches updated daily, plus genre and content filters, with <strong>Pro</strong>.
          </p>
          <Link href="/pricing">
            <span className="shrink-0 text-xs font-bold text-amber-600 hover:underline">Upgrade</span>
          </Link>
        </div>
      )}

      {/* Matches list */}
      {matches.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-2xl border border-dashed border-border space-y-3 text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Users size={24} className="text-primary opacity-60" />
          </div>
          <p className="font-black text-sm">No matches yet</p>
          <p className="text-xs text-muted-foreground max-w-xs">
            Add comics to your reading lists, vote, or review a few titles so we can find readers with similar taste. {isPro ? 'Matches update daily.' : 'Matches update weekly.'}
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
                {match.confidenceTier === 'medium' ? (
                  <p className="text-xs text-amber-500/80 mt-1">Still learning their taste</p>
                ) : match.sharedGenres.length > 0 ? (
                  <p className="text-xs text-muted-foreground/80 mt-1 truncate">
                    Both like {match.sharedGenres.join(', ')}
                  </p>
                ) : null}
              </div>
              <div className="shrink-0 text-right">
                <span className={
                  match.confidenceTier === 'high'
                    ? 'text-sm font-black text-emerald-500'
                    : 'text-sm font-black text-amber-500'
                }>
                  {match.confidenceTier === 'high' ? `${match.similarityPct}%` : `~${match.similarityPct}%`}
                </span>
                <p className="text-[10px] text-muted-foreground">match</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}