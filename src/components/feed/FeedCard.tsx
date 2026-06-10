import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { BookOpen, MessageSquare } from 'lucide-react'
import { timeAgo } from '@/lib/utils/format'
import { ReactionButton } from './ReactionButton'
import { UserBadges } from '@/components/pro/UserBadges'
import { cn } from '@/lib/utils'

const TYPE_COLORS: Record<string, string> = {
  manga:   'bg-rose-500/10   text-rose-500   border-rose-500/20',
  manhwa:  'bg-teal-500/10 text-teal-500 border-teal-500/20',
  manhua:  'bg-amber-500/10  text-amber-500  border-amber-500/20',
  webtoon: 'bg-teal-500/10   text-teal-500   border-teal-500/20',
  comic:   'bg-blue-500/10   text-blue-500   border-blue-500/20',
}

interface Props {
  rec:              any
  isLoggedIn:       boolean
  reactionCount:    number
  userReacted:      boolean
  onReactionToggle: (id: string, reacted: boolean) => void
}

export function FeedCard({ rec, isLoggedIn, reactionCount, userReacted, onReactionToggle }: Props) {
  const typeStyle = TYPE_COLORS[rec.type] ?? 'bg-muted text-muted-foreground border-border'
  const initials  = (rec.display_name || rec.username || '?').slice(0, 2).toUpperCase()

  const recommenderIsPro = rec.role === 'admin' ||
    (rec.is_pro === true &&
      (!rec.pro_expires_at || new Date(rec.pro_expires_at) > new Date()))
  const recommenderIsVerified = rec.verified_recommender === true

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden hover:border-primary/20 transition-colors">

      {/* Who posted */}
      <div className="flex items-center gap-2.5 px-4 pt-4 pb-3 border-b border-border/50">
        <Link href={`/profile/${rec.username}`}>
          <Avatar className="h-7 w-7">
            <AvatarImage src={rec.avatar_url ?? undefined} />
            <AvatarFallback className="text-[10px] font-black bg-gradient-to-br from-primary to-violet-500 text-white">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Link>
        <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
          <Link
            href={`/profile/${rec.username}`}
            className="text-xs font-bold hover:text-primary transition-colors"
          >
            @{rec.username}
          </Link>
          <UserBadges
            role={rec.role}
            isPro={recommenderIsPro}
            isVerified={recommenderIsVerified}
            size="sm"
          />
          <span className="text-xs text-muted-foreground">
            recommended · {timeAgo(rec.created_at)}
          </span>
        </div>
      </div>

      {/* Comic */}
      <Link href={`/comic/${rec.id}`} className="group flex gap-4 p-4">
        <div className="w-14 h-20 rounded-xl overflow-hidden bg-muted shrink-0 shadow-sm">
          {rec.cover_url ? (
            <img
              src={rec.cover_url}
              alt={rec.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <BookOpen size={16} className="text-muted-foreground opacity-40" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0 space-y-2 py-0.5">
          <p className="font-black text-sm line-clamp-1 group-hover:text-primary transition-colors">
            {rec.title}
          </p>
          <div className="flex flex-wrap gap-1.5">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize ${typeStyle}`}>
              {rec.type}
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border border-border bg-muted text-muted-foreground capitalize">
              {rec.status}
            </span>
          </div>
          {rec.genres?.slice(0, 3).map((g: string) => (
            <span key={g} className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] bg-muted border border-border text-muted-foreground mr-1">
              {g}
            </span>
          ))}
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {rec.description}
          </p>
        </div>
      </Link>

      {/* Actions row */}
      <div className="flex items-center justify-between px-4 pb-3 pt-1 border-t border-border/50">
        <div className="flex items-center gap-2">
          <ReactionButton
            recommendationId={rec.id}
            initialCount={reactionCount}
            initialReacted={userReacted}
            isLoggedIn={isLoggedIn}
            onToggle={onReactionToggle}
          />
          <button
            disabled
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold border border-border bg-muted/30 text-muted-foreground/40 cursor-not-allowed"
            title="Coming soon"
          >
            <MessageSquare size={12} />
            <span>Comment</span>
            <span className="text-[9px] bg-muted px-1.5 py-0.5 rounded-full font-bold">Soon</span>
          </button>
        </div>
        <Link
          href={`/comic/${rec.id}`}
          className="text-[10px] text-muted-foreground hover:text-primary transition-colors font-medium"
        >
          View comic →
        </Link>
      </div>
    </div>
  )
}