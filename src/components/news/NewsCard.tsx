import Link from 'next/link'
import { Calendar, Eye, ArrowRight, ExternalLink } from 'lucide-react'
import { formatDate, formatNumber } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'
import type { News } from '@/types/database.types'

interface Props {
  news:     News
  variant?: 'default' | 'featured' | 'compact'
}

const CATEGORY_STYLES: Record<string, { badge: string; dot: string; bg: string }> = {
  industry:     { badge: 'bg-blue-500/10   text-blue-500   border-blue-500/20',    dot: 'bg-blue-500',    bg: 'from-blue-500/20   to-blue-500/5'    },
  release:      { badge: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', dot: 'bg-emerald-500', bg: 'from-emerald-500/20 to-emerald-500/5' },
  adaptation:   { badge: 'bg-violet-500/10 text-violet-500 border-violet-500/20',   dot: 'bg-violet-500',  bg: 'from-violet-500/20 to-violet-500/5'   },
  event:        { badge: 'bg-orange-500/10 text-orange-500 border-orange-500/20',   dot: 'bg-orange-500',  bg: 'from-orange-500/20 to-orange-500/5'   },
  creator:      { badge: 'bg-rose-500/10   text-rose-500   border-rose-500/20',     dot: 'bg-rose-500',    bg: 'from-rose-500/20   to-rose-500/5'     },
  announcement: { badge: 'bg-amber-500/10  text-amber-500  border-amber-500/20',    dot: 'bg-amber-500',   bg: 'from-amber-500/20  to-amber-500/5'    },
}

const CATEGORY_LABELS: Record<string, string> = {
  industry:     'Industry',
  release:      'New Release',
  adaptation:   'Adaptation',
  event:        'Event',
  creator:      'Creator',
  announcement: 'Announcement',
}

function CategoryBadge({ category }: { category: string }) {
  const style = CATEGORY_STYLES[category] ?? {
    badge: 'bg-muted text-muted-foreground border-border',
    dot:   'bg-muted-foreground',
    bg:    'from-muted to-muted/5',
  }
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-full border font-semibold', style.badge)}>
      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', style.dot)} />
      {CATEGORY_LABELS[category] ?? category}
    </span>
  )
}

export function NewsCard({ news, variant = 'default' }: Props) {

  /* ────────────────────────────────────────────
     COMPACT
  ──────────────────────────────────────────── */
  if (variant === 'compact') {
    return (
      <Link
        href={`/news/${news.slug}`}
        className="group flex gap-3 p-3 rounded-xl border border-border bg-card hover:border-primary/50 hover:shadow-md transition-all duration-200"
      >
        {news.cover_url && (
          <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted shrink-0">
            <img
              src={news.cover_url}
              alt={news.cover_alt ?? news.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold line-clamp-2 leading-tight group-hover:text-primary transition-colors">
            {news.title}
          </p>
          <p className="text-xs text-muted-foreground mt-1">{formatDate(news.published_at)}</p>
        </div>
      </Link>
    )
  }

  if (variant === 'featured') {
    const catStyle = CATEGORY_STYLES[news.category] ?? {
      badge: 'bg-muted text-muted-foreground border-border',
      dot:   'bg-muted-foreground',
      bg:    'from-primary/20 to-violet-500/5',
    }

    /* ── No cover: text-only featured card ── */
    if (!news.cover_url) {
      return (
        <Link
          href={`/news/${news.slug}`}
          className={cn(
            'group relative flex flex-col justify-between rounded-2xl overflow-hidden border border-border',
            'min-h-[200px] sm:min-h-[260px]',
            `bg-gradient-to-br ${catStyle.bg} p-6`
          )}
        >
          {/* Decorative blobs */}
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5 blur-2xl pointer-events-none" />
          <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-white/5 blur-xl pointer-events-none" />

          {/* Top row */}
          <div className="relative flex items-center gap-2 flex-wrap">
            <CategoryBadge category={news.category} />
            {news.is_affiliate && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-semibold">
                💰 Affiliate
              </span>
            )}
            <span className="ml-auto text-xs text-muted-foreground flex items-center gap-1">
              <Calendar size={11} />{formatDate(news.published_at)}
            </span>
          </div>

          {/* Title + excerpt */}
          <div className="relative space-y-2 my-4 flex-1">
            <h3 className="text-xl sm:text-2xl font-black leading-tight line-clamp-3 group-hover:text-primary transition-colors">
              {news.title}
            </h3>
            <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
              {news.excerpt}
            </p>
          </div>

          {/* Bottom row */}
          <div className="relative flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Eye size={11} />{formatNumber(news.view_count)} views
            </span>
            <span className="flex items-center gap-1 group-hover:text-primary transition-colors font-semibold">
              Read more <ArrowRight size={11} className="group-hover:translate-x-0.5 transition-transform" />
            </span>
          </div>
        </Link>
      )
    }

    /* ── Has cover: original image card ── */
    return (
      <Link href={`/news/${news.slug}`} className="group relative block rounded-2xl overflow-hidden border border-border">
        <div className="aspect-[16/9] bg-muted">
          <img
            src={news.cover_url}
            alt={news.cover_alt ?? news.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </div>
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
        {/* Content */}
        <div className="absolute bottom-0 left-0 right-0 p-5 space-y-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <CategoryBadge category={news.category} />
            {news.is_affiliate && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 font-semibold">
                💰 Affiliate
              </span>
            )}
          </div>
          <h3 className="text-lg font-black line-clamp-2 leading-tight text-white">{news.title}</h3>
          <p className="text-sm text-white/60 line-clamp-2">{news.excerpt}</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-xs text-white/50">
              <span className="flex items-center gap-1"><Calendar size={11} />{formatDate(news.published_at)}</span>
              <span className="flex items-center gap-1"><Eye size={11} />{formatNumber(news.view_count)}</span>
            </div>
            <span className="flex items-center gap-1 text-xs text-white/50 group-hover:text-white transition-colors">
              Read <ArrowRight size={11} className="group-hover:translate-x-0.5 transition-transform" />
            </span>
          </div>
        </div>
      </Link>
    )
  }

  const catStyle = CATEGORY_STYLES[news.category] ?? {
    badge: 'bg-muted text-muted-foreground border-border',
    dot:   'bg-muted-foreground',
    bg:    'from-primary/10 to-violet-500/5',
  }

  /* ── No cover: text-only default card ── */
  if (!news.cover_url) {
    return (
      <Link
        href={`/news/${news.slug}`}
        className={cn(
          'group flex flex-col rounded-2xl overflow-hidden border border-border bg-card',
          'hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200'
        )}
      >
        {/* Coloured header band instead of image */}
        <div className={cn('px-4 pt-4 pb-3 bg-gradient-to-br', catStyle.bg)}>
          <div className="flex items-center gap-2 flex-wrap">
            <CategoryBadge category={news.category} />
            {news.is_affiliate && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 font-semibold">
                💰 Affiliate
              </span>
            )}
            {news.is_ai_generated && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-muted border border-border text-muted-foreground">
                🤖 AI
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3 flex-1 flex flex-col">
          <h3 className="font-black text-sm leading-snug line-clamp-3 group-hover:text-primary transition-colors flex-1">
            {news.title}
          </h3>
          <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
            {news.excerpt}
          </p>
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/50">
            <span className="flex items-center gap-1"><Calendar size={11} />{formatDate(news.published_at)}</span>
            <span className="flex items-center gap-1">
              <Eye size={11} />{formatNumber(news.view_count)}
            </span>
          </div>
        </div>
      </Link>
    )
  }

  /* ── Has cover: original default card ── */
  return (
    <Link
      href={`/news/${news.slug}`}
      className="group flex flex-col rounded-2xl overflow-hidden border border-border bg-card hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200"
    >
      {/* Cover */}
      <div className="aspect-[16/9] bg-muted overflow-hidden relative">
        <img
          src={news.cover_url}
          alt={news.cover_alt ?? news.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute top-2.5 left-2.5">
          <CategoryBadge category={news.category} />
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3 flex-1 flex flex-col">
        <div className="flex items-center gap-2 flex-wrap">
          {news.is_affiliate && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 font-semibold">
              💰 Affiliate
            </span>
          )}
          {news.is_ai_generated && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-muted border border-border text-muted-foreground">
              🤖 AI
            </span>
          )}
        </div>

        <h3 className="font-black text-sm leading-snug line-clamp-2 group-hover:text-primary transition-colors flex-1">
          {news.title}
        </h3>

        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{news.excerpt}</p>

        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/50">
          <span className="flex items-center gap-1"><Calendar size={11} />{formatDate(news.published_at)}</span>
          <span className="flex items-center gap-1"><Eye size={11} />{formatNumber(news.view_count)}</span>
        </div>
      </div>
    </Link>
  )
}