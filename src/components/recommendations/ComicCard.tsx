'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { BookOpen, ThumbsUp, MessageSquare, Bookmark } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatNumber } from '@/lib/utils/format'
import type { Recommendation } from '@/types/database.types'

interface ComicCardProps {
  recommendation: Recommendation  // ← remove the & { profiles?: ... } part
  className?: string
}

const statusColors = {
  ongoing: 'bg-green-500',
  completed: 'bg-blue-500',
  hiatus: 'bg-yellow-500',
  cancelled: 'bg-red-500',
}

const typeLabels: Record<string, string> = {
  manga: 'Manga',
  manhwa: 'Manhwa',
  manhua: 'Manhua',
  webtoon: 'Webtoon',
  comic: 'Comic',
  other: 'Other',
}

export function ComicCard({ recommendation: rec, className }: ComicCardProps) {
  return (
    <Link
      href={`/comic/${rec.id}`}
      className={cn(
        'group flex flex-col rounded-xl overflow-hidden border border-border bg-card',
        'hover:border-primary/60 hover:shadow-lg hover:shadow-primary/5',
        'transition-all duration-200',
        className
      )}
    >
      {/* Cover image */}
      <div className="relative aspect-[3/4] bg-muted overflow-hidden">
        {rec.cover_url ? (
          <img
            src={rec.cover_url}
            alt={rec.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-muted to-muted/50">
            <BookOpen size={32} className="text-muted-foreground opacity-40" />
            <span className="text-xs text-muted-foreground opacity-60 text-center px-2">
              {rec.title}
            </span>
          </div>
        )}

        {/* Top badges overlay */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {/* Type badge */}
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-black/70 text-white backdrop-blur-sm">
            {typeLabels[rec.type] || rec.type}
          </span>
        </div>

        {/* Status dot */}
        <div className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-sm">
          <span className={cn('w-1.5 h-1.5 rounded-full', statusColors[rec.status])} />
          <span className="text-[10px] text-white capitalize">{rec.status}</span>
        </div>

        {/* Score overlay at bottom */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-2 pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-xs text-white/90">
                <ThumbsUp size={11} />
                {formatNumber(rec.upvotes)}
              </span>
              <span className="flex items-center gap-1 text-xs text-white/90">
                <MessageSquare size={11} />
                {formatNumber(rec.review_count)}
              </span>
            </div>
            <span className="flex items-center gap-1 text-xs text-white/90">
              <Bookmark size={11} />
              {formatNumber(rec.save_count)}
            </span>
          </div>
        </div>
      </div>

      {/* Card info below image */}
      <div className="p-2.5 flex flex-col gap-1.5 flex-1">
        <h3 className="text-sm font-semibold leading-tight line-clamp-2 group-hover:text-primary transition-colors">
          {rec.title}
        </h3>

        {/* Genres */}
        {rec.genres?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {rec.genres.slice(0, 2).map((genre) => (
              <Badge
                key={genre}
                variant="secondary"
                className="text-[10px] px-1.5 py-0 h-4"
              >
                {genre}
              </Badge>
            ))}
            {rec.genres.length > 2 && (
              <span className="text-[10px] text-muted-foreground">
                +{rec.genres.length - 2}
              </span>
            )}
          </div>
        )}

        {/* Submitter */}
        
      </div>
    </Link>
  )
}