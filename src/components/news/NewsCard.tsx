import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Calendar, Eye } from 'lucide-react'
import { formatDate, formatNumber } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'
import type { News } from '@/types/database.types'

interface Props {
  news: News
  variant?: 'default' | 'featured' | 'compact'
}

const categoryColors: Record<string, string> = {
  industry: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  release: 'bg-green-500/10 text-green-600 border-green-500/20',
  adaptation: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  event: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  creator: 'bg-pink-500/10 text-pink-600 border-pink-500/20',
  announcement: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
}

const categoryLabels: Record<string, string> = {
  industry: 'Industry',
  release: 'New Release',
  adaptation: 'Adaptation',
  event: 'Event',
  creator: 'Creator',
  announcement: 'Announcement',
}

export function NewsCard({ news, variant = 'default' }: Props) {
  if (variant === 'compact') {
    return (
      <Link
        href={`/news/${news.slug}`}
        className="flex gap-3 p-3 rounded-xl border border-border bg-card hover:border-primary/50 transition-colors"
      >
        {news.cover_url && (
          <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted shrink-0">
            <img
              src={news.cover_url}
              alt={news.cover_alt ?? news.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold line-clamp-2 leading-tight">{news.title}</p>
          <p className="text-xs text-muted-foreground mt-1">{formatDate(news.published_at)}</p>
        </div>
      </Link>
    )
  }

  if (variant === 'featured') {
    return (
      <Link
        href={`/news/${news.slug}`}
        className="group relative block rounded-2xl overflow-hidden border border-border"
      >
        <div className="aspect-[16/9] bg-muted">
          {news.cover_url ? (
            <img
              src={news.cover_url}
              alt={news.cover_alt ?? news.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20" />
          )}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-5 space-y-2">
          <div className="flex items-center gap-2">
            <span className={cn(
              'text-xs px-2 py-0.5 rounded-full border font-medium',
              categoryColors[news.category]
            )}>
              {categoryLabels[news.category]}
            </span>
            {news.is_affiliate && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 border border-yellow-500/30 text-yellow-600 font-medium">
                💰 Affiliate
              </span>
            )}
          </div>
          <h3 className="text-lg font-bold line-clamp-2 leading-tight">{news.title}</h3>
          <p className="text-sm text-muted-foreground line-clamp-2">{news.excerpt}</p>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar size={11} />
              {formatDate(news.published_at)}
            </span>
            <span className="flex items-center gap-1">
              <Eye size={11} />
              {formatNumber(news.view_count)}
            </span>
          </div>
        </div>
      </Link>
    )
  }

  return (
    <Link
      href={`/news/${news.slug}`}
      className="group flex flex-col rounded-xl overflow-hidden border border-border bg-card hover:border-primary/50 transition-colors"
    >
      {/* Cover */}
      <div className="aspect-[16/9] bg-muted overflow-hidden">
        {news.cover_url ? (
          <img
            src={news.cover_url}
            alt={news.cover_alt ?? news.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center">
            <span className="text-4xl">📰</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-2.5 flex-1 flex flex-col">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn(
            'text-xs px-2 py-0.5 rounded-full border font-medium',
            categoryColors[news.category]
          )}>
            {categoryLabels[news.category]}
          </span>
          {news.is_affiliate && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-600">
              💰 Affiliate
            </span>
          )}
          {news.is_ai_generated && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-muted border border-border text-muted-foreground">
              🤖 AI
            </span>
          )}
        </div>

        <h3 className="font-semibold text-sm leading-snug line-clamp-2 group-hover:text-primary transition-colors flex-1">
          {news.title}
        </h3>

        <p className="text-xs text-muted-foreground line-clamp-2">{news.excerpt}</p>

        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
          <span className="flex items-center gap-1">
            <Calendar size={11} />
            {formatDate(news.published_at)}
          </span>
          <span className="flex items-center gap-1">
            <Eye size={11} />
            {formatNumber(news.view_count)}
          </span>
        </div>
      </div>
    </Link>
  )
}