'use client'

import Link from 'next/link'
import { BookOpen, ThumbsUp, MessageSquare, Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatNumber } from '@/lib/utils/format'
import type { Recommendation } from '@/types/database.types'
import { ShareButton } from './ShareButton'

interface ComicCardProps {
  recommendation: Recommendation
  className?: string
}

const statusConfig = {
  ongoing:   { color: 'bg-emerald-500', label: 'Ongoing' },
  completed: { color: 'bg-sky-500',     label: 'Done'    },
  hiatus:    { color: 'bg-amber-500',   label: 'Hiatus'  },
  cancelled: { color: 'bg-rose-500',    label: 'Dropped' },
}

const typeColors: Record<string, string> = {
  manga:   'from-rose-500 to-pink-600',
  manhwa:  'from-violet-500 to-purple-600',
  manhua:  'from-amber-500 to-orange-600',
  webtoon: 'from-teal-500 to-cyan-600',
  comic:   'from-blue-500 to-indigo-600',
  other:   'from-slate-500 to-zinc-600',
}

export function ComicCard({ recommendation: rec, className }: ComicCardProps) {
  const status = statusConfig[rec.status as keyof typeof statusConfig]
  const typeGradient = typeColors[rec.type] || typeColors.other
  const comicUrl = `https://compicfy.site/comic/${rec.id}`

  return (
    <div className={cn('group relative flex flex-col', className)}>
      {/* Card */}
      <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-zinc-900 shadow-md group-hover:shadow-2xl group-hover:shadow-black/40 transition-all duration-300 group-hover:-translate-y-1">

        {/* Cover */}
        <Link href={`/comic/${rec.id}`} className="absolute inset-0">
          {rec.cover_url ? (
            <img
              src={rec.cover_url}
              alt={rec.title}
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
          ) : (
            <div className={cn(
              'absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br',
              typeGradient
            )}>
              <BookOpen size={28} className="text-white/60" />
              <span className="text-[10px] text-white/50 text-center px-3 leading-snug">{rec.title}</span>
            </div>
          )}
        </Link>

        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-black/20 pointer-events-none" />

        {/* Type pill — top left */}
        <div className="absolute top-2.5 left-2.5 pointer-events-none">
          <span className={cn(
            'inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider text-white bg-gradient-to-r shadow-lg',
            typeGradient
          )}>
            {rec.type}
          </span>
        </div>

        {/* Share button — top right, visible on hover */}
        <div className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <ShareButton title={rec.title} url={comicUrl} compact />
        </div>

        {/* Age rating — only show if no share button space conflict */}
        {(rec.content_rating === 'adult' || rec.content_rating === 'mature') && (
          <div className="absolute top-2.5 right-2.5 group-hover:opacity-0 transition-opacity pointer-events-none">
            <span className={cn(
              'inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-black text-white',
              rec.content_rating === 'adult' ? 'bg-red-600' : 'bg-orange-500'
            )}>
              {rec.content_rating === 'adult' ? '18+' : '17+'}
            </span>
          </div>
        )}

        {/* Bottom info */}
        <Link href={`/comic/${rec.id}`} className="absolute bottom-0 left-0 right-0 p-3 space-y-1.5">
          <h3 className="text-white font-bold text-xs leading-snug line-clamp-2 drop-shadow-sm">
            {rec.title}
          </h3>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-0.5 text-[10px] text-white/70">
                <ThumbsUp size={9} />
                {formatNumber(rec.upvotes)}
              </span>
              <span className="flex items-center gap-0.5 text-[10px] text-white/70">
                <MessageSquare size={9} />
                {formatNumber(rec.review_count)}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', status?.color ?? 'bg-zinc-500')} />
              <span className="text-[9px] text-white/60 capitalize">{status?.label ?? rec.status}</span>
            </div>
          </div>
        </Link>

        {/* Hover shine */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none" />

        {/* Featured star */}
        {rec.is_featured && (
          <div className="absolute top-2.5 right-2.5 group-hover:opacity-0 transition-opacity pointer-events-none">
            <Star size={14} className="text-amber-400 fill-amber-400 drop-shadow-lg" />
          </div>
        )}
      </div>

      {/* Genre pills below card */}
      {rec.genres?.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2 px-0.5">
          {rec.genres.slice(0, 2).map((genre) => (
            <span
              key={genre}
              className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border font-medium"
            >
              {genre}
            </span>
          ))}
          {rec.genres.length > 2 && (
            <span className="text-[9px] text-muted-foreground/60">+{rec.genres.length - 2}</span>
          )}
        </div>
      )}
    </div>
  )
}