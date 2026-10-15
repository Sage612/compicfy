'use client'

import Link from 'next/link'
import { Loader2, Share2, Star, Bookmark } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  /** Who made it. Always shown, so a card never looks anonymous. */
  username?:    string | null
  avatarUrl?:   string | null
  isOwner:      boolean
  /** The main action: star a list, save a collection. */
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

/**
 * Shared footer for community cards (public lists, collections):
 * a byline on top (avatar + "Curated by @name"), and one clear action row
 * underneath: a wide pill that carries both the action and its count, plus
 * a round share button.
 */
export function CardFooter({ username, avatarUrl, isOwner, action, onShare, manage }: Props) {
  const name = username ?? 'community'
  const Icon = action.kind === 'star' ? Star : Bookmark
  const idle = action.kind === 'star' ? 'Star' : 'Save'
  const done = action.kind === 'star' ? 'Starred' : 'Saved'

  return (
    <div
      className="border-t border-border/60 bg-muted/30 px-3 pt-3 pb-3 space-y-3"
      onClick={e => e.stopPropagation()}
    >
      {/* Byline */}
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="h-7 w-7 rounded-full overflow-hidden bg-muted border border-border shrink-0 flex items-center justify-center text-[10px] font-medium text-muted-foreground uppercase">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            name.slice(0, 1)
          )}
        </span>
        <div className="min-w-0 leading-tight">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60">
            {isOwner ? 'Curated by you' : 'Curated by'}
          </p>
          {username ? (
            <Link
              href={`/profile/${username}`}
              className="block text-sm text-foreground truncate hover:underline underline-offset-4"
            >
              @{username}
            </Link>
          ) : (
            <p className="text-sm text-muted-foreground truncate">Community member</p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {isOwner && manage ? (
          <button
            type="button"
            onClick={manage.onClick}
            className="flex-1 h-9 rounded-full border border-border bg-background text-xs font-medium text-foreground hover:border-foreground/40 transition-colors"
          >
            {manage.label}
          </button>
        ) : isOwner ? (
          <div className="flex-1 h-9 rounded-full border border-dashed border-border flex items-center justify-center gap-1.5 text-xs text-muted-foreground tabular-nums">
            <Icon size={13} />
            {action.count} {action.kind === 'star' ? (action.count === 1 ? 'star' : 'stars') : 'saves'}
          </div>
        ) : (
          <button
            type="button"
            onClick={action.onClick}
            disabled={action.loading}
            aria-pressed={action.active}
            className={cn(
              'flex-1 h-9 rounded-full border text-xs font-medium transition-colors inline-flex items-center justify-between pl-3.5 pr-1.5 gap-2',
              action.active
                ? 'bg-foreground text-background border-foreground'
                : 'bg-background text-foreground border-border hover:border-foreground/50'
            )}
          >
            <span className="inline-flex items-center gap-1.5">
              {action.loading
                ? <Loader2 size={13} className="animate-spin" />
                : <Icon size={13} className={action.active ? 'fill-current' : ''} />}
              {action.active ? done : idle}
            </span>
            <span
              className={cn(
                'min-w-[1.75rem] h-6 px-2 rounded-full inline-flex items-center justify-center text-[11px] tabular-nums',
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
          className="h-9 w-9 rounded-full border border-border bg-background text-muted-foreground hover:text-foreground hover:border-foreground/50 transition-colors inline-flex items-center justify-center shrink-0"
        >
          <Share2 size={14} />
        </button>
      </div>
    </div>
  )
}