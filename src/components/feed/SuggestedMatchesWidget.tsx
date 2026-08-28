import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import type { SuggestedMatch } from '@/lib/taste/getSuggestedMatches'

function proxyCover(url: string | null | undefined): string {
  if (!url) return ""
  if (url.startsWith('data:')) return url
  if (url.startsWith('/')) return url
  if (url.includes('/api/image-proxy')) return url
  return `/api/image-proxy?url=${encodeURIComponent(url)}`
}

interface Props {
  matches: SuggestedMatch[]
}

const SIDEBAR_DISPLAY_CAP = 5

export function SuggestedMatchesWidget({ matches }: Props) {
  const visibleMatches = matches.slice(0, SIDEBAR_DISPLAY_CAP)

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/30">
        <Sparkles size={14} className="text-primary" />
        <h3 className="text-xs font-black uppercase tracking-widest">Readers Like You</h3>
      </div>
      <div className="p-3 space-y-2">
        {visibleMatches.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            Add comics to your reading lists to find your taste twins
          </p>
        ) : (
          visibleMatches.map(match => (
            <Link
              key={match.userId}
              href={`/profile/${match.username}`}
              className="group flex items-center gap-3 p-2 rounded-xl hover:bg-muted/50 transition-colors"
            >
              <div className="w-8 h-8 rounded-full overflow-hidden bg-muted shrink-0">
                {match.avatarUrl ? (
                  <img
                    src={proxyCover(match.avatarUrl)}
                    alt={match.displayName ?? match.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[10px] font-black text-muted-foreground/60">
                    {(match.displayName ?? match.username).charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold line-clamp-1 group-hover:text-primary transition-colors">
                  {match.displayName ?? match.username}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={
                    match.confidenceTier === 'high'
                      ? 'text-[9px] font-black text-emerald-500'
                      : 'text-[9px] font-black text-amber-500'
                  }>
                    {match.confidenceTier === 'high' ? `${match.similarityPct}% match` : `~${match.similarityPct}% match`}
                  </span>
                  {match.confidenceTier === 'medium' && (
                    <>
                      <span className="text-[9px] text-muted-foreground">·</span>
                      <span className="text-[9px] text-muted-foreground">still learning</span>
                    </>
                  )}
                  {match.confidenceTier === 'high' && match.sharedGenres.length > 0 && (
                    <>
                      <span className="text-[9px] text-muted-foreground">·</span>
                      <span className="text-[9px] text-muted-foreground truncate">
                        {match.sharedGenres.join(', ')}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
      {visibleMatches.length > 0 && (
        <Link
          href="/matches"
          className="block text-center text-[10px] font-bold text-primary py-2.5 border-t border-border hover:bg-muted/30 transition-colors"
        >
          See all matches
        </Link>
      )}
    </div>
  )
}