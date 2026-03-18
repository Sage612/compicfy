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

const typeColors: Record<string, string> = {
  manga:   '#f43f5e',
  manhwa:  '#8b5cf6',
  manhua:  '#f59e0b',
  webtoon: '#14b8a6',
  comic:   '#3b82f6',
  other:   '#6b7280',
}

const statusConfig = {
  ongoing:   { color: 'bg-emerald-500', label: 'Ongoing'   },
  completed: { color: 'bg-sky-500',     label: 'Completed' },
  hiatus:    { color: 'bg-amber-500',   label: 'Hiatus'    },
  cancelled: { color: 'bg-rose-500',    label: 'Cancelled' },
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
  const scrollTo = useCallback((index: number) => emblaApi?.scrollTo(index), [emblaApi])

  if (!recommendations.length) return null

  return (
    <div className="relative rounded-3xl overflow-hidden group shadow-2xl">
      <div ref={emblaRef} className="overflow-hidden">
        <div className="flex">
          {recommendations.map((rec, i) => {
            const accentColor = typeColors[rec.type] || typeColors.other
            const status = statusConfig[rec.status as keyof typeof statusConfig]

            return (
              <div key={rec.id} className="relative flex-none w-full min-w-0">
                <div className="relative h-[300px] sm:h-[380px] md:h-[460px] overflow-hidden bg-zinc-950">

                  {/* Full bleed background cover */}
                  {rec.cover_url && (
                    <img
                      src={rec.cover_url}
                      alt=""
                      aria-hidden
                      className="absolute inset-0 w-full h-full object-cover scale-105 blur-xl opacity-30"
                    />
                  )}

                  {/* Colour tint from type */}
                  <div
                    className="absolute inset-0 opacity-15"
                    style={{ background: `radial-gradient(ellipse at 70% 50%, ${accentColor}55, transparent 70%)` }}
                  />

                  {/* Strong left gradient for text legibility */}
                  <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/98 via-zinc-950/75 to-zinc-950/20" />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/60 via-transparent to-transparent" />

                  {/* Decorative vertical accent line */}
                  <div
                    className="absolute left-0 top-0 bottom-0 w-1 opacity-80"
                    style={{ background: `linear-gradient(to bottom, transparent, ${accentColor}, transparent)` }}
                  />

                  {/* Content */}
                  <div className="relative h-full flex items-center px-6 md:px-12 gap-8">

                    {/* Cover art */}
                    <div className="hidden sm:block shrink-0">
                      <div className="relative">
                        {/* Glow behind cover */}
                        <div
                          className="absolute -inset-3 rounded-2xl blur-xl opacity-40"
                          style={{ background: accentColor }}
                        />
                        <div className="relative w-32 md:w-48 aspect-[3/4] rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
                          {rec.cover_url ? (
                            <img
                              src={rec.cover_url}
                              alt={rec.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-white/5">
                              <BookOpen size={32} className="text-white/30" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Text content */}
                    <div className="flex-1 min-w-0 flex flex-col justify-center gap-3 overflow-hidden">

                      {/* Type + featured badge */}
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-widest text-white"
                          style={{ background: `${accentColor}33`, border: `1px solid ${accentColor}55` }}
                        >
                          <Zap size={10} style={{ color: accentColor }} />
                          <span style={{ color: accentColor }}>{rec.type}</span>
                        </span>
                        <span className="flex items-center gap-1 text-xs font-bold text-amber-400 uppercase tracking-widest">
                          <Star size={10} className="fill-amber-400" />
                          Featured
                        </span>
                      </div>

                      {/* Title */}
                      <h2 className="text-2xl sm:text-3xl md:text-5xl font-black leading-[1.0] text-white tracking-tight line-clamp-2 shrink-0">
                        {rec.title}
                      </h2>

                      {/* Status + genres */}
                      <div className="flex flex-wrap items-center gap-2 shrink-0 overflow-hidden max-h-8">
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
                          <span className={cn('w-1.5 h-1.5 rounded-full', status?.color)} />
                          <span className="text-xs text-white/70 capitalize">{status?.label ?? rec.status}</span>
                        </div>
                        {rec.genres?.slice(0, 3).map((genre) => (
                          <span
                            key={genre}
                            className="px-2 py-0.5 rounded-full text-xs text-white/60 bg-white/5 border border-white/10"
                          >
                            {genre}
                          </span>
                        ))}
                      </div>

                      {/* Description */}
                      <p className="text-sm text-white/50 leading-relaxed hidden sm:block shrink-0 overflow-hidden line-clamp-2 max-w-md">
                        {rec.description}
                      </p>

                      {/* CTA + stats */}
                      <div className="flex items-center gap-4 shrink-0">
                        <Link href={`/comic/${rec.id}`}>
                          <Button
                            size="sm"
                            className="gap-2 font-bold text-zinc-950 border-0 shadow-lg hover:scale-105 transition-transform"
                            style={{ background: accentColor }}
                          >
                            <BookOpen size={13} />
                            Read More
                          </Button>
                        </Link>
                        <div className="flex items-center gap-3 text-sm text-white/40">
                          <span className="flex items-center gap-1">
                            <ThumbsUp size={12} />
                            {formatNumber(rec.upvotes)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Slide number */}
                  <div className="absolute top-4 right-4 text-xs text-white/20 font-mono tabular-nums">
                    {String(i + 1).padStart(2, '0')} / {String(recommendations.length).padStart(2, '0')}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Nav arrows */}
      <button
        onClick={scrollPrev}
        className={cn(
          'absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full',
          'bg-white/5 backdrop-blur-md border border-white/10',
          'flex items-center justify-center text-white',
          'opacity-0 group-hover:opacity-100 transition-all duration-200',
          'hover:bg-white/15 hover:scale-110 hover:border-white/20',
          !canScrollPrev && 'cursor-not-allowed opacity-20'
        )}
        aria-label="Previous"
      >
        <ChevronLeft size={18} />
      </button>

      <button
        onClick={scrollNext}
        className={cn(
          'absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full',
          'bg-white/5 backdrop-blur-md border border-white/10',
          'flex items-center justify-center text-white',
          'opacity-0 group-hover:opacity-100 transition-all duration-200',
          'hover:bg-white/15 hover:scale-110 hover:border-white/20',
          !canScrollNext && 'cursor-not-allowed opacity-20'
        )}
        aria-label="Next"
      >
        <ChevronRight size={18} />
      </button>

      {/* Dot indicators */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
        {recommendations.map((_, index) => (
          <button
            key={index}
            onClick={() => scrollTo(index)}
            className={cn(
              'rounded-full transition-all duration-300',
              selectedIndex === index
                ? 'w-6 h-1.5 bg-white'
                : 'w-1.5 h-1.5 bg-white/20 hover:bg-white/40'
            )}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  )
}