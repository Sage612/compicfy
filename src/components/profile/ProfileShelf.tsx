import Link from 'next/link'
import { BookOpen, Crown, ArrowRight } from 'lucide-react'
import type { Recommendation } from '@/types/app.types'

interface Props {
  recommendations: Recommendation[]
  totalRecs:       number
  isPro:           boolean
  isGhost:         boolean
  isOwner:         boolean
  username:        string
  showGold:        boolean
}

const FREE_LIMIT = 9   // 3×3
const PRO_LIMIT  = 18  // 3×6

const TYPE_SPINE: Record<string, string> = {
  manga:   'bg-rose-500',
  manhwa:  'bg-teal-500',
  manhua:  'bg-amber-500',
  webtoon: 'bg-teal-500',
  comic:   'bg-blue-500',
  other:   'bg-zinc-500',
}

function proxyCover(url: string | null | undefined): string | null {
  if (!url) return null
  // data: URIs are self-contained — pass through untouched
  if (url.startsWith('data:')) return url
  // Already a relative/local URL
  if (url.startsWith('/')) return url
  // Already proxied
  if (url.includes('/api/image-proxy')) return url
  return `/api/image-proxy?url=${encodeURIComponent(url)}`
}

export function ProfileShelf({ recommendations, totalRecs, isPro, isGhost, isOwner, username, showGold }: Props) {
  if (isGhost || recommendations.length === 0) return null

  const limit      = isPro ? PRO_LIMIT : FREE_LIMIT
  const visible    = recommendations.slice(0, limit)
  const hasMore    = totalRecs > visible.length
  const showUpsell = isOwner && !isPro

  return (
    <div className="space-y-3">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground">
            Manhwa Shelf
          </h2>
          {showUpsell && (
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9px] font-black border bg-amber-500/10 text-amber-600 border-amber-500/20">
              <Crown size={8} className="fill-amber-500" />
              Pro unlocks full shelf
            </span>
          )}
        </div>
        {hasMore && (
          <Link
            href={`/profile/${username}/recommendations`}
            className="flex items-center gap-1 text-xs font-bold text-primary hover:underline"
          >
            See all {totalRecs}
            <ArrowRight size={11} />
          </Link>
        )}
      </div>

      {/* Cover grid */}
      <div className={`grid gap-1.5 ${isPro ? 'grid-cols-6' : 'grid-cols-3'}`}>
        {visible.map((rec) => {
          const spineColor = TYPE_SPINE[rec.type] ?? TYPE_SPINE.other
          const coverSrc   = proxyCover(rec.cover_url)
          return (
            <Link
              key={rec.id}
              href={`/comic/${rec.id}`}
              className="group relative aspect-[3/4] rounded-lg overflow-hidden bg-muted border border-border hover:border-primary/40 hover:shadow-md transition-all duration-200"
            >
              <div className={`absolute left-0 top-0 bottom-0 w-1 ${spineColor} opacity-60 group-hover:opacity-100 transition-opacity z-10`} />

              {coverSrc ? (
                <img
                  src={coverSrc}
                  alt={rec.title}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-muted">
                  <BookOpen size={16} className="text-muted-foreground opacity-30" />
                </div>
              )}

              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent px-1.5 pb-1.5 pt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <p className="text-white text-[9px] font-black line-clamp-2 leading-tight">
                  {rec.title}
                </p>
              </div>
            </Link>
          )
        })}

        {showUpsell && totalRecs > FREE_LIMIT && (
          <Link
            href="/pricing"
            className="group relative aspect-[3/4] rounded-lg overflow-hidden bg-muted/50 border border-dashed border-amber-500/30 hover:border-amber-500/60 transition-colors flex flex-col items-center justify-center gap-1"
          >
            <Crown size={14} className="text-amber-500/60 group-hover:text-amber-500 transition-colors" />
            <span className="text-[8px] font-black text-amber-600/60 group-hover:text-amber-600 text-center leading-tight px-1 transition-colors">
              +{totalRecs - FREE_LIMIT} more
            </span>
          </Link>
        )}
      </div>

      {showUpsell && totalRecs > FREE_LIMIT && (
        <Link
          href="/pricing"
          className="flex items-center justify-center gap-2 py-2 rounded-xl border border-dashed border-amber-500/20 bg-amber-500/5 text-xs text-amber-600 hover:border-amber-500/40 hover:bg-amber-500/10 transition-all"
        >
          <Crown size={11} className="fill-amber-500" />
          Upgrade to Pro to show your full shelf ({totalRecs} comics)
        </Link>
      )}
    </div>
  )
}