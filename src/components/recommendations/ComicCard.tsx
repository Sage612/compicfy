'use client'

import Link from 'next/link'
import { ThumbsUp, MessageSquare, Bookmark, TrendingUp, Bot } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatNumber } from '@/lib/utils/format'
import type { Recommendation } from '@/types/database.types'

interface ComicCardProps {
  recommendation: Recommendation
  className?: string
}

// ── Type accent system ────────────────────────────────────────────
const TYPE_ACCENTS: Record<string, { bar: string; badge: string; glow: string }> = {
  manga: { bar: 'bg-rose-500', badge: 'text-rose-400 bg-rose-500/10 border-rose-500/20', glow: 'hover:shadow-rose-500/10' },
  manhwa: { bar: 'bg-teal-500', badge: 'text-teal-400 bg-teal-500/10 border-teal-500/20', glow: 'hover:shadow-teal-500/10' },
  manhua: { bar: 'bg-amber-500', badge: 'text-amber-400 bg-amber-500/10 border-amber-500/20', glow: 'hover:shadow-amber-500/10' },
  webtoon: { bar: 'bg-teal-500', badge: 'text-teal-400 bg-teal-500/10 border-teal-500/20', glow: 'hover:shadow-teal-500/10' },
  comic: { bar: 'bg-blue-500', badge: 'text-blue-400 bg-blue-500/10 border-blue-500/20', glow: 'hover:shadow-blue-500/10' },
  other: { bar: 'bg-zinc-500', badge: 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20', glow: 'hover:shadow-zinc-500/10' },
}

const STATUS_META: Record<string, { label: string; color: string }> = {
  ongoing: { label: 'Ongoing', color: 'text-emerald-400' },
  completed: { label: 'Complete', color: 'text-sky-400' },
  hiatus: { label: 'Hiatus', color: 'text-amber-400' },
  cancelled: { label: 'Dropped', color: 'text-rose-400' },
}

function isNewThisWeek(createdAt: string): boolean {
  return Date.now() - new Date(createdAt).getTime() < 7 * 24 * 60 * 60 * 1000
}

export function ComicCard({ recommendation: rec, className }: ComicCardProps) {
  const accent = TYPE_ACCENTS[rec.type]?? TYPE_ACCENTS.other
  const status = STATUS_META[rec.status]?? { label: rec.status, color: 'text-muted-foreground' }
  const score = rec.score?? (rec.upvotes - rec.downvotes)
  const isNew = isNewThisWeek(rec.created_at)
  const isSystemSubmitted = rec.is_ai_generated && rec.ai_model === 'auto-submitter'

  return (
    <Link
      href={`/comic/${rec.id}`}
      className={cn(
        'group relative flex flex-col rounded-xl overflow-hidden',
        'border border-border bg-card',
        'hover:border-transparent hover:shadow-xl',
        accent.glow,
        'transition-all duration-300',
        className
      )}
    >
      {/* Accent bar */}
      <div className={cn('absolute left-0 top-0 bottom-0 w- z-10 transition-all duration-300 group-hover:w-1', accent.bar)} />

      {/* Cover */}
      <div className="relative aspect-[3/4] overflow-hidden bg-muted">
        {rec.cover_url? (
          <img
            src={rec.cover_url}
            alt={`Cover art for ${rec.title}`}
            title={rec.title}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted">
            <span className="text-3xl opacity-20">📖</span>
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent" />

        {/* Top-left: type badge */}
        <div className="absolute top-2 left-3.5 z-10">
          <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded text- font-black uppercase tracking-wider border backdrop-blur-sm', accent.badge)}>
            {rec.type}
          </span>
        </div>

        {/* Top-right: NEW or score */}
        <div className="absolute top-2 right-2 z-10">
          {isNew? (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text- font-black bg-emerald-500 text-white shadow-sm">
              NEW
            </span>
          ) : score > 0? (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text- font-black bg-black/70 backdrop-blur-md text-white/90 border-white/10">
              <TrendingUp size={7} />
              {formatNumber(score)}
            </span>
          ) : null}
        </div>

        {/* SYS badge - moved up to avoid title clash */}
        {isSystemSubmitted && (
          <div className="absolute top-7 right-2 z-10">
            <span title="Submitted by Compicfy system" className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text- font-black bg-black/60 backdrop-blur-md text-white/70 border border-white/10">
              <Bot size={6} />
              SYS
            </span>
          </div>
        )}

        {/* Bottom title */}
        <div className="absolute inset-x-0 bottom-0 px-3 pt-4 pb-2.5 z-10">
          <h3 className="text-white font-black text- leading-snug line-clamp-2 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
            {rec.title}
          </h3>
        </div>
      </div>

      {/* Meta strip */}
      <div className="px-3 pt-2 pb-2.5 space-y-1.5 pl-4">
        {/* FIXED: Status + genre - no more squashing */}
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={cn('text- font-bold shrink-0', status.color)}>
            {status.label}
          </span>
          <span className="w-0.5 h-0.5 rounded-full bg-muted-foreground/30 shrink-0" />
          <span className="text- text-muted-foreground/70 truncate flex-1 min-w-0">
            {rec.genres?.[0] || '—'}
          </span>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-2.5 text- text-muted-foreground">
          <span className="flex items-center gap-0.5 min-w-0">
            <ThumbsUp size={8} className="text-emerald-500/70 shrink-0" />
            <span className="truncate">{formatNumber(rec.upvotes)}</span>
          </span>
          <span className="flex items-center gap-0.5 min-w-0">
            <MessageSquare size={8} className="text-amber-500/70 shrink-0" />
            <span className="truncate">{formatNumber(rec.review_count)}</span>
          </span>
          <span className="flex items-center gap-0.5 min-w-0">
            <Bookmark size={8} className="text-blue-500/70 shrink-0" />
            <span className="truncate">{formatNumber(rec.save_count)}</span>
          </span>
        </div>

        {rec.cover_url && (
          <p className="text- text-muted-foreground/40 truncate">
            © {rec.author?? 'respective rights holder'}
          </p>
        )}
      </div>

      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none bg-gradient-to-br from-white/[0.03] to-transparent" />
    </Link>
  )
}