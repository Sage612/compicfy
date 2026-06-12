'use client'

import useEmblaCarousel from 'embla-carousel-react'
import Autoplay from 'embla-carousel-autoplay'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, BookOpen, ThumbsUp, Star, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatNumber } from '@/lib/utils/format'
import type { Recommendation } from '@/types/database.types'

interface Props {
  recommendations: Recommendation[]
}

const TYPE_COLORS: Record<string, string> = {
  manga:   '#f43f5e',
  manhwa:  '#0ea5b0',
  manhua:  '#f59e0b',
  webtoon: '#0ea5b0',
  comic:   '#3b82f6',
  other:   '#6b7280',
}

const STATUS_CONFIG = {
  ongoing:   { color: 'bg-emerald-500', label: 'Ongoing'   },
  completed: { color: 'bg-sky-500',     label: 'Completed' },
  hiatus:    { color: 'bg-amber-500',   label: 'Hiatus'    },
  cancelled: { color: 'bg-rose-500',    label: 'Cancelled' },
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

export function FeaturedCarousel({ recommendations }: Props) {
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, align: 'start' },
    [Autoplay({ delay: 5000, stopOnInteraction: false, stopOnMouseEnter: true })]
  )

  const [selectedIndex, setSelectedIndex] = useState(0)
  const [canScrollPrev, setCanScrollPrev] = useState(false)
  const [canScrollNext, setCanScrollNext] = useState(false)

  const onSelect = useCallback(() => {
    if (!emblaApi) return
    setSelectedIndex(emblaApi.selectedScrollSnap())
    setCanScrollPrev(emblaApi.canScrollPrev())
    setCanScrollNext(emblaApi.canScrollNext())
  }, [emblaApi])

  useEffect(() => {
    if (!emblaApi) return
    onSelect()
    emblaApi.on('select', onSelect)
    emblaApi.on('reInit', onSelect)
    return () => {
      emblaApi.off('select', onSelect)
      emblaApi.off('reInit', onSelect)
    }
  }, [emblaApi, onSelect])

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi])
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi])
  const scrollTo   = useCallback((i: number) => emblaApi?.scrollTo(i), [emblaApi])

  if (!recommendations.length) return null

  return (
    <div className="relative rounded-lg overflow-hidden group">
      <div ref={emblaRef} className="overflow-hidden">
        <div className="flex">
          {recommendations.map((rec, i) => {
            const accentColor = TYPE_COLORS[rec.type] ?? TYPE_COLORS.other
            const status      = STATUS_CONFIG[rec.status as keyof typeof STATUS_CONFIG]
            const coverSrc    = proxyCover(rec.cover_url)

            return (
              <div key={rec.id} className="relative flex-none w-full min-w-0">

                {/* ── MOBILE ── */}
                <div className="sm:hidden relative overflow-hidden bg-zinc-950" style={{ height: '460px' }}>
                  {coverSrc ? (
                    <img
                      src={coverSrc}
                      alt={rec.title}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
                      <BookOpen size={48} className="text-white/20" />
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/50 to-transparent" />
                  <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: accentColor }} />

                  <div className="absolute top-4 right-4 text-[10px] text-white/30 font-mono tabular-nums">
                    {String(i + 1).padStart(2, '0')} / {String(recommendations.length).padStart(2, '0')}
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 px-5 pb-10 pt-8 space-y-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider"
                        style={{ background: `${accentColor}25`, border: `1px solid ${accentColor}40`, color: accentColor }}
                      >
                        <Zap size={9} />
                        {rec.type}
                      </span>
                      <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                        <Star size={9} className="fill-amber-400" />
                        Featured
                      </span>
                    </div>

                    <h2 className="text-2xl font-black leading-tight text-white tracking-tight line-clamp-2">
                      {rec.title}
                    </h2>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {status && (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-white/10 border border-white/10">
                          <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', status.color)} />
                          <span className="text-[10px] text-white/70 capitalize">{status.label}</span>
                        </div>
                      )}
                      {rec.genres?.slice(0, 2).map(g => (
                        <span key={g} className="px-2 py-0.5 rounded text-[10px] text-white/60 bg-white/10 border border-white/10">
                          {g}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-3 pt-1">
                      <Link href={`/comic/${rec.id}`} className="flex-1">
                        <Button
                          size="sm"
                          className="w-full gap-2 font-bold border-0 h-10 text-sm rounded"
                          style={{ background: accentColor, color: '#fff' }}
                        >
                          <BookOpen size={13} />
                          Read More
                        </Button>
                      </Link>
                      <div className="flex items-center gap-1 text-sm text-white/40 shrink-0">
                        <ThumbsUp size={12} />
                        {formatNumber(rec.upvotes)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── DESKTOP ── */}
                <div className="hidden sm:block relative h-[360px] md:h-[440px] overflow-hidden bg-zinc-950">

                  {coverSrc && (
                    <img
                      src={coverSrc}
                      alt=""
                      aria-hidden
                      className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-20"
                    />
                  )}

                  <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/98 via-zinc-950/80 to-zinc-950/30" />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/40 via-transparent to-transparent" />
                  <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: accentColor }} />

                  <div className="relative h-full flex items-center px-8 md:px-12 gap-8 py-8">

                    <div className="shrink-0">
                      <div className="w-32 md:w-40 aspect-[3/4] rounded-lg overflow-hidden border border-white/10 shadow-2xl">
                        {coverSrc ? (
                          <img src={coverSrc} alt={rec.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-white/5">
                            <BookOpen size={32} className="text-white/30" />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col justify-center gap-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider"
                          style={{ background: `${accentColor}25`, border: `1px solid ${accentColor}40`, color: accentColor }}
                        >
                          <Zap size={9} />
                          {rec.type}
                        </span>
                        <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                          <Star size={9} className="fill-amber-400" />
                          Featured
                        </span>
                      </div>

                      <h2 className="text-3xl md:text-4xl font-black leading-tight text-white tracking-tight line-clamp-2">
                        {rec.title}
                      </h2>

                      <div className="flex flex-wrap items-center gap-1.5">
                        {status && (
                          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-white/5 border border-white/10">
                            <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', status.color)} />
                            <span className="text-[10px] text-white/60 capitalize">{status.label}</span>
                          </div>
                        )}
                        {rec.genres?.slice(0, 3).map(g => (
                          <span key={g} className="px-2 py-0.5 rounded text-[10px] text-white/50 bg-white/5 border border-white/10">
                            {g}
                          </span>
                        ))}
                      </div>

                      {rec.description && (
                        <p className="text-sm text-white/40 leading-relaxed line-clamp-2 max-w-md">
                          {rec.description}
                        </p>
                      )}

                      <div className="flex items-center gap-4 pt-1">
                        <Link href={`/comic/${rec.id}`}>
                          <Button
                            size="sm"
                            className="gap-2 font-bold border-0 rounded"
                            style={{ background: accentColor, color: '#fff' }}
                          >
                            <BookOpen size={13} />
                            Read More
                          </Button>
                        </Link>
                        <div className="flex items-center gap-1.5 text-sm text-white/30">
                          <ThumbsUp size={12} />
                          {formatNumber(rec.upvotes)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="absolute top-4 right-4 text-[10px] text-white/20 font-mono tabular-nums">
                    {String(i + 1).padStart(2, '0')} / {String(recommendations.length).padStart(2, '0')}
                  </div>
                </div>

              </div>
            )
          })}
        </div>
      </div>

      <button
        onClick={scrollPrev}
        className={cn(
          'hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded',
          'bg-black/40 border border-white/10 items-center justify-center text-white',
          'opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-black/60',
          !canScrollPrev && 'cursor-not-allowed opacity-20'
        )}
        aria-label="Previous"
      >
        <ChevronLeft size={16} />
      </button>

      <button
        onClick={scrollNext}
        className={cn(
          'hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded',
          'bg-black/40 border border-white/10 items-center justify-center text-white',
          'opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-black/60',
          !canScrollNext && 'cursor-not-allowed opacity-20'
        )}
        aria-label="Next"
      >
        <ChevronRight size={16} />
      </button>

      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
        {recommendations.map((_, index) => (
          <button
            key={index}
            onClick={() => scrollTo(index)}
            className={cn(
              'rounded-full transition-all duration-300',
              selectedIndex === index ? 'w-5 h-1 bg-white' : 'w-1 h-1 bg-white/25 hover:bg-white/40'
            )}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  )
}