'use client'

import Link from 'next/link'
import { Bookmark, Loader2, Share2, Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  href:         string
  /** Raw cover URLs (up to four). Proxied here. */
  images:       string[]
  title:        string
  /** e.g. "6 comics" or "6 comics · Draft" */
  meta:         string
  /** Dashed, slightly faded: used for unpublished collections. */
  muted?:       boolean
  username?:    string | null
  avatarUrl?:   string | null
  isOwner:      boolean
  action: {
    kind:      'star' | 'save'
    active:    boolean
    count:     number
    loading?:  boolean
    onClick:   (e: React.MouseEvent) => void
  }
  onShare:      (e: React.MouseEvent) => void
  /** Owner-only button that replaces the main action (e.g. Manage). */
  manage?:      { label: string; onClick: (e: React.MouseEvent) => void }
}

function proxy(url: string) {
  return `/api/image-proxy?url=${encodeURIComponent(url)}`
}

/**
 * Shared card for public lists and collections. The covers fill the whole
 * card; the bottom is a frosted-glass panel holding the title, the author
 * and one action row, so everything stays inside the card at any width.
 */
export function CommunityCard({
  href, images, title, meta, muted = false,
  username, avatarUrl, isOwner, action, onShare, manage,
}: Props) {
  const Icon = action.kind === 'star' ? Star : Bookmark
  const idle = action.kind === 'star' ? 'Star' : 'Save'
  const done = action.kind === 'star' ? 'Starred' : 'Saved'
  const name = username ?? 'community'

  return (
    <div
      className={cn(
        'group relative isolate aspect-[5/7] rounded-xl border overflow-hidden bg-muted transition-colors',
        muted
          ? 'border-dashed border-border opacity-80 hover:opacity-100'
          : 'border-border hover:border-foreground/30'
      )}
    >
      {/* Covers, full bleed */}
      <div className="absolute inset-0 flex gap-px">
        {images.map((url, i) => (
          <div key={i} className="flex-1 min-w-0 overflow-hidden">
            <img src={proxy(url)} alt="" aria-hidden className="h-full w-full object-cover" />
          </div>
        ))}
      </div>

      {/* Whole card opens the item */}
      <Link href={href} aria-label={title} className="absolute inset-0 z-10" />

      {/* Frosted panel */}
      <div className="absolute inset-x-0 bottom-0 z-20 border-t border-border/40 bg-background/70 backdrop-blur-xl px-3 pt-3 pb-3 space-y-2.5">
        <Link href={href} className="block min-w-0">
          <p className="font-dashboard-serif text-base leading-snug text-foreground line-clamp-1">{title}</p>
          <p className="text-[10px] uppercase tracking-widest text-foreground/60 mt-0.5 truncate">{meta}</p>
        </Link>

        {/* Byline */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="h-5 w-5 rounded-full overflow-hidden bg-muted border border-border shrink-0 flex items-center justify-center text-[9px] font-medium text-muted-foreground uppercase">
            {avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : name.slice(0, 1)}
          </span>
          {username ? (
            <Link
              href={`/profile/${username}`}
              className="text-xs text-foreground/80 hover:text-foreground truncate min-w-0"
            >
              @{username}{isOwner && <span className="text-foreground/50"> · you</span>}
            </Link>
          ) : (
            <span className="text-xs text-foreground/60 truncate min-w-0">Community member</span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 min-w-0">
          {isOwner && manage ? (
            <button
              type="button"
              onClick={manage.onClick}
              className="flex-1 min-w-0 h-8 rounded-full border border-border bg-background/80 text-xs font-medium text-foreground hover:border-foreground/50 transition-colors truncate px-3"
            >
              {manage.label}
            </button>
          ) : isOwner ? (
            <div className="flex-1 min-w-0 h-8 rounded-full border border-dashed border-border flex items-center justify-center gap-1.5 text-xs text-foreground/70 tabular-nums">
              <Icon size={12} />
              {action.count}
            </div>
          ) : (
            <button
              type="button"
              onClick={action.onClick}
              disabled={action.loading}
              aria-pressed={action.active}
              className={cn(
                'flex-1 min-w-0 h-8 rounded-full border text-xs font-medium transition-colors inline-flex items-center justify-between gap-1.5 pl-3 pr-1',
                action.active
                  ? 'bg-foreground text-background border-foreground'
                  : 'bg-background/80 text-foreground border-border hover:border-foreground/50'
              )}
            >
              <span className="inline-flex items-center gap-1.5 min-w-0">
                {action.loading
                  ? <Loader2 size={12} className="animate-spin shrink-0" />
                  : <Icon size={12} className={cn('shrink-0', action.active && 'fill-current')} />}
                <span className="truncate">{action.active ? done : idle}</span>
              </span>
              <span
                className={cn(
                  'h-6 min-w-[1.5rem] px-1.5 rounded-full inline-flex items-center justify-center text-[11px] tabular-nums shrink-0',
                  action.active ? 'bg-background/20' : 'bg-muted text-muted-foreground'
                )}
              >
                {action.count}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={onShare}
            aria-label="Copy link"
            title="Copy link"
            className="h-8 w-8 shrink-0 rounded-full border border-border bg-background/80 text-muted-foreground hover:text-foreground hover:border-foreground/50 transition-colors inline-flex items-center justify-center"
          >
            <Share2 size={13} />
          </button>
        </div>
      </div>
    </div>
  )
}