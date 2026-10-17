'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import { formatNumber } from '@/lib/utils/format'
import { resolveStatusMeta } from '@/lib/utils/constants'
import type { Recommendation } from '@/types/app.types'

interface ComicCardProps {
  recommendation: Recommendation
  className?:     string
  /** Genres appear in a frosted strip when the card is hovered (desktop). */
  showGenres?:    boolean
}

// Uses reviewed_at (approval timestamp) instead of created_at (submission
// timestamp): a comic that sat in the approval queue shouldn't lose its
// "new" window before it's approved. No reviewed_at → no badge.
function isNewThisWeek(reviewedAt: string | null): boolean {
  if (!reviewedAt) return false
  return Date.now() - new Date(reviewedAt).getTime() < 7 * 24 * 60 * 60 * 1000
}

// ── Proxy helper: routes all cover images through our proxy ──────
function proxyCover(url: string | null | undefined): string | null {
  if (!url) return null
  if (url.startsWith('data:')) return url
  if (url.startsWith('/')) return url
  if (url.includes('/api/image-proxy')) return url
  return `/api/image-proxy?url=${encodeURIComponent(url)}`
}

/**
 * Cover-first card. The artwork is the only loud thing: no accent bars,
 * no gradients, no colour coding. Everything else is a quiet caption
 * underneath: serif title, then one line of type · status · votes.
 */
export function ComicCard({ recommendation: rec, className, showGenres = true }: ComicCardProps) {
  const status   = resolveStatusMeta(rec.status, (rec as any).translation_status)
  const isNew    = isNewThisWeek(rec.reviewed_at)
  const coverSrc = proxyCover(rec.cover_url)
  const votes    = rec.upvotes ?? 0

  // System-submitted flag: covers auto-submitter and any future system accounts
  const isSystemSubmitted = rec.is_ai_generated && rec.ai_model === 'auto-submitter'

  return (
    <Link
      href={`/comic/${rec.id}`}
      className={cn('group block min-w-0', className)}
    >
      {/* Cover */}
      <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-muted ring-1 ring-border/60 transition-shadow duration-300 group-hover:ring-foreground/30 group-hover:shadow-lg">
        {coverSrc ? (
          <img
            src={coverSrc}
            alt={`Cover art for ${rec.title}`}
            title={rec.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            loading="lazy"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center px-3 text-center">
            <span className="font-dashboard-serif text-sm text-muted-foreground/60 line-clamp-4">{rec.title}</span>
          </div>
        )}

        {/* One quiet badge, top-left: NEW wins, otherwise nothing */}
        {isNew && (
          <span className="absolute left-1.5 top-1.5 rounded-full bg-background/80 backdrop-blur-md px-1.5 py-0.5 text-[9px] uppercase tracking-widest text-foreground">
            New
          </span>
        )}

        {isSystemSubmitted && (
          <span
            title="Submitted by ComPicfy system"
            className="absolute left-1.5 bottom-1.5 rounded-full bg-background/70 backdrop-blur-md px-1.5 py-0.5 text-[8px] uppercase tracking-widest text-foreground/70"
          >
            Auto
          </span>
        )}

        {/* Hover: frosted genre strip (desktop only, no layout cost) */}
        {showGenres && rec.genres?.length > 0 && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 hidden md:block translate-y-full group-hover:translate-y-0 transition-transform duration-300 bg-background/70 backdrop-blur-xl border-t border-border/40 px-2.5 py-2">
            <p className="text-[10px] uppercase tracking-widest text-foreground/80 truncate">
              {rec.genres.slice(0, 3).join(' · ')}
            </p>
          </div>
        )}
      </div>

      {/* Caption */}
      <div className="pt-2 space-y-0.5">
        <h3 className="font-dashboard-serif text-xs sm:text-[13px] leading-snug text-foreground line-clamp-2 group-hover:opacity-70 transition-opacity">
          {rec.title}
        </h3>
        <p className="text-[10px] sm:text-[11px] text-muted-foreground truncate tabular-nums">
          <span className="capitalize">{rec.type}</span>
          {' · '}{status.label}
          {votes > 0 && <> · {formatNumber(votes)}</>}
        </p>
        {/* Cover credit stays visible: attribution matters on every card */}
        {rec.cover_url && (
          <p className="text-[9px] text-muted-foreground/50 truncate">
            © {rec.author ?? 'respective rights holder'}
          </p>
        )}
      </div>
    </Link>
  )
}