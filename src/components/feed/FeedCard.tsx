'use client'

import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { BookOpen, MessageSquare, FolderOpen, ListChecks, Star, EyeOff } from 'lucide-react'
import { timeAgo } from '@/lib/utils/format'
import { ReactionButton } from './ReactionButton'
import { UserBadges } from '@/components/pro/UserBadges'
import { cn } from '@/lib/utils'
import type { FeedItem } from '@/lib/utils/feedTypes'

const TYPE_COLORS: Record<string, string> = {
  manga:   'bg-rose-500/10   text-rose-500   border-rose-500/20',
  manhwa:  'bg-teal-500/10   text-teal-500   border-teal-500/20',
  manhua:  'bg-amber-500/10  text-amber-500  border-amber-500/20',
  webtoon: 'bg-teal-500/10   text-teal-500   border-teal-500/20',
  comic:   'bg-blue-500/10   text-blue-500   border-blue-500/20',
}

function proxyCover(url: string | null | undefined): string | null {
  if (!url) return null
  if (url.startsWith('data:')) return url
  if (url.startsWith('/')) return url
  if (url.includes('/api/image-proxy')) return url
  return `/api/image-proxy?url=${encodeURIComponent(url)}`
}

interface Props {
  rec:              FeedItem
  isLoggedIn:       boolean
  reactionCount:    number
  userReacted:      boolean
  onReactionToggle: (id: string, reacted: boolean) => void
}

// ── Shared actor header — who did the thing, used by every card shape ──
function ActorHeader({ item, verb }: { item: FeedItem; verb: string }) {
  const initials = (item.display_name || item.username || '?').slice(0, 2).toUpperCase()
  const isPro = item.role === 'admin' ||
    (item.is_pro === true && (!item.pro_expires_at || new Date(item.pro_expires_at) > new Date()))

  return (
    <div className="flex items-center gap-2.5 px-4 pt-4 pb-3 border-b border-border/50">
      <Link href={`/profile/${item.username}`}>
        <Avatar className="h-7 w-7">
          <AvatarImage src={item.avatar_url ?? undefined} />
          <AvatarFallback className="text-[10px] font-black bg-gradient-to-br from-primary to-violet-500 text-white">
            {initials}
          </AvatarFallback>
        </Avatar>
      </Link>
      <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
        <Link href={`/profile/${item.username}`} className="text-xs font-bold hover:text-primary transition-colors">
          @{item.username}
        </Link>
        <UserBadges role={item.role} isPro={isPro} isVerified={item.verified_recommender} size="sm" />
        <span className="text-xs text-muted-foreground">
          {verb} · {timeAgo(item.created_at)}
        </span>
      </div>
    </div>
  )
}

// ── Cover mosaic — used by collection/list cards, up to 4 covers ──
function CoverMosaic({ covers }: { covers: string[] }) {
  if (covers.length === 0) {
    return (
      <div className="w-14 h-20 rounded-xl bg-muted shrink-0 shadow-sm flex items-center justify-center">
        <FolderOpen size={16} className="text-muted-foreground opacity-40" />
      </div>
    )
  }
  if (covers.length === 1) {
    return (
      <div className="w-14 h-20 rounded-xl overflow-hidden bg-muted shrink-0 shadow-sm">
        <img src={proxyCover(covers[0]) ?? ''} alt="" className="w-full h-full object-cover" />
      </div>
    )
  }
  return (
    <div className="w-14 h-20 rounded-xl overflow-hidden bg-muted shrink-0 shadow-sm grid grid-cols-2 grid-rows-2 gap-px">
      {covers.slice(0, 4).map((c, i) => (
        <div key={i} className="overflow-hidden bg-muted">
          <img src={proxyCover(c) ?? ''} alt="" className="w-full h-full object-cover" />
        </div>
      ))}
      {/* pad remaining cells if fewer than 4 covers */}
      {Array.from({ length: Math.max(0, 4 - covers.length) }).map((_, i) => (
        <div key={`pad-${i}`} className="bg-muted" />
      ))}
    </div>
  )
}

export function FeedCard({ rec: item, isLoggedIn, reactionCount, userReacted, onReactionToggle }: Props) {
  // ── Recommendation ──────────────────────────────────────────────
  if (item.item_type === 'recommendation') {
    const typeStyle = TYPE_COLORS[item.type] ?? 'bg-muted text-muted-foreground border-border'
    const coverSrc  = proxyCover(item.cover_url)

    return (
      <div className="rounded-2xl border border-border bg-card overflow-hidden hover:border-primary/20 transition-colors">
        <ActorHeader item={item} verb="recommended" />

        <Link href={`/comic/${item.id}`} className="group flex gap-4 p-4">
          <div className="w-14 h-20 rounded-xl overflow-hidden bg-muted shrink-0 shadow-sm">
            {coverSrc ? (
              <img src={coverSrc} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <BookOpen size={16} className="text-muted-foreground opacity-40" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0 space-y-2 py-0.5">
            <p className="font-black text-sm line-clamp-1 group-hover:text-primary transition-colors">{item.title}</p>
            <div className="flex flex-wrap gap-1.5">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize ${typeStyle}`}>{item.type}</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border border-border bg-muted text-muted-foreground capitalize">{item.status}</span>
            </div>
            {item.genres?.slice(0, 3).map((g) => (
              <span key={g} className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] bg-muted border border-border text-muted-foreground mr-1">{g}</span>
            ))}
            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{item.description}</p>
          </div>
        </Link>

        <div className="flex items-center justify-between px-4 pb-3 pt-1 border-t border-border/50">
          <div className="flex items-center gap-2">
            <ReactionButton
              recommendationId={item.id}
              initialCount={reactionCount}
              initialReacted={userReacted}
              isLoggedIn={isLoggedIn}
              onToggle={onReactionToggle}
            />
            <button disabled className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold border border-border bg-muted/30 text-muted-foreground/40 cursor-not-allowed" title="Coming soon">
              <MessageSquare size={12} />
              <span>Comment</span>
              <span className="text-[9px] bg-muted px-1.5 py-0.5 rounded-full font-bold">Soon</span>
            </button>
          </div>
          <Link href={`/comic/${item.id}`} className="text-[10px] text-muted-foreground hover:text-primary transition-colors font-medium">
            View comic →
          </Link>
        </div>
      </div>
    )
  }

  // ── Collection ───────────────────────────────────────────────────
  if (item.item_type === 'collection') {
    return (
      <div className="rounded-2xl border border-border bg-card overflow-hidden hover:border-primary/20 transition-colors">
        <ActorHeader item={item} verb="created a collection" />
        <Link href={`/collections/${item.id}`} className="group flex gap-4 p-4">
          <CoverMosaic covers={item.cover_urls} />
          <div className="flex-1 min-w-0 space-y-2 py-0.5">
            <div className="flex items-center gap-1.5">
              <FolderOpen size={13} className="text-primary shrink-0" />
              <p className="font-black text-sm line-clamp-1 group-hover:text-primary transition-colors">{item.title}</p>
            </div>
            {item.description && (
              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{item.description}</p>
            )}
            <p className="text-[10px] text-muted-foreground">
              {item.item_count} comic{item.item_count !== 1 ? 's' : ''}
            </p>
          </div>
        </Link>
        <div className="flex items-center justify-end px-4 pb-3 pt-1 border-t border-border/50">
          <Link href={`/collections/${item.id}`} className="text-[10px] text-muted-foreground hover:text-primary transition-colors font-medium">
            View collection →
          </Link>
        </div>
      </div>
    )
  }

  // ── Reading list ─────────────────────────────────────────────────
  if (item.item_type === 'list') {
    return (
      <div className="rounded-2xl border border-border bg-card overflow-hidden hover:border-primary/20 transition-colors">
        <ActorHeader item={item} verb="created a list" />
        <Link href={`/lists/${item.id}`} className="group flex gap-4 p-4">
          <CoverMosaic covers={item.cover_urls} />
          <div className="flex-1 min-w-0 space-y-2 py-0.5">
            <div className="flex items-center gap-1.5">
              <ListChecks size={13} className="text-primary shrink-0" />
              <p className="font-black text-sm line-clamp-1 group-hover:text-primary transition-colors">{item.name}</p>
            </div>
            {item.description && (
              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{item.description}</p>
            )}
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <span>{item.item_count} comic{item.item_count !== 1 ? 's' : ''}</span>
              {item.star_count > 0 && (
                <span className="flex items-center gap-0.5">
                  <Star size={9} className="text-amber-500/70" />
                  {item.star_count}
                </span>
              )}
            </div>
          </div>
        </Link>
        <div className="flex items-center justify-end px-4 pb-3 pt-1 border-t border-border/50">
          <Link href={`/lists/${item.id}`} className="text-[10px] text-muted-foreground hover:text-primary transition-colors font-medium">
            View list →
          </Link>
        </div>
      </div>
    )
  }

  // ── Review ───────────────────────────────────────────────────────
  if (item.item_type === 'review') {
    const coverSrc = proxyCover(item.recommendation_cover)
    return (
      <div className="rounded-2xl border border-border bg-card overflow-hidden hover:border-primary/20 transition-colors">
        <ActorHeader item={item} verb="wrote a review" />
        <div className="flex gap-4 p-4">
          <Link href={`/comic/${item.recommendation_id}`} className="shrink-0">
            <div className="w-14 h-20 rounded-xl overflow-hidden bg-muted shadow-sm">
              {coverSrc ? (
                <img src={coverSrc} alt={item.recommendation_title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <BookOpen size={16} className="text-muted-foreground opacity-40" />
                </div>
              )}
            </div>
          </Link>
          <div className="flex-1 min-w-0 space-y-2 py-0.5">
            <Link href={`/comic/${item.recommendation_id}`} className="font-black text-sm line-clamp-1 hover:text-primary transition-colors block">
              {item.recommendation_title}
            </Link>
            <div className="flex items-center gap-2 flex-wrap">
              {item.rating !== null && (
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold border bg-amber-500/10 text-amber-600 border-amber-500/20">
                  <Star size={9} className="fill-amber-500" />
                  {item.rating}/5
                </span>
              )}
              {item.contains_spoilers && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border bg-red-500/10 text-red-500 border-red-500/20">
                  <EyeOff size={9} />
                  Spoilers
                </span>
              )}
            </div>
            <p className={cn(
              'text-xs text-muted-foreground leading-relaxed line-clamp-3',
              item.contains_spoilers && 'blur-[3px] hover:blur-none transition-[filter] duration-200 cursor-pointer'
            )}>
              {item.content}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-end px-4 pb-3 pt-1 border-t border-border/50">
          <Link href={`/comic/${item.recommendation_id}`} className="text-[10px] text-muted-foreground hover:text-primary transition-colors font-medium">
            View comic →
          </Link>
        </div>
      </div>
    )
  }

  return null
}