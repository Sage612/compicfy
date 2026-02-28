'use client'

import useEmblaCarousel from 'embla-carousel-react'
import Autoplay from 'embla-carousel-autoplay'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight, BookOpen, ThumbsUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatNumber } from '@/lib/utils/format'
import type { Recommendation } from '@/types/database.types'

interface Props {
  recommendations: Recommendation[]
}

const statusColors = {
  ongoing: 'bg-green-500',
  completed: 'bg-blue-500',
  hiatus: 'bg-yellow-500',
  cancelled: 'bg-red-500',
}

export function FeaturedCarousel({ recommendations }: Props) {
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, align: 'start' },
    [Autoplay({ delay: 4000, stopOnInteraction: false, stopOnMouseEnter: true })]
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
    <div className="relative rounded-2xl overflow-hidden group">
      {/* Embla viewport */}
      <div ref={emblaRef} className="overflow-hidden">
        <div className="flex">
          {recommendations.map((rec) => (
            <div
              key={rec.id}
              className="relative flex-none w-full min-w-0"
            >
              {/* Background image with overlay */}
              <div className="relative h-[280px] sm:h-[360px] md:h-[420px] overflow-hidden">
                {/* Background blur */}
                {rec.cover_url ? (
  <img
    src={rec.cover_url}
    alt=""
    aria-hidden="true"
    className="absolute inset-0 w-full h-full object-cover scale-110 blur-sm opacity-30"
  />
) : null}

                {/* Dark gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-background/20" />
                <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent" />

                {/* Content */}
                <div className="relative h-full flex items-end md:items-center p-6 md:p-10 gap-6">
                  {/* Cover thumbnail */}
                  <div className="hidden sm:block w-32 md:w-44 shrink-0">
                    <div className="aspect-[3/4] rounded-xl overflow-hidden border-2 border-white/10 shadow-2xl">
                      {rec.cover_url ? (
                        <img
                          src={rec.cover_url}
                          alt={rec.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                          <BookOpen size={32} className="text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Text content */}
                  <div className="flex-1 min-w-0 space-y-3">
                    {/* Featured label */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-widest text-primary">
                        ⭐ Featured
                      </span>
                      <span className="text-xs text-muted-foreground capitalize">
                        {rec.type}
                      </span>
                    </div>

                    {/* Title */}
                    <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold leading-tight line-clamp-2">
                      {rec.title}
                    </h2>

                    {/* Status + genres */}
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className={cn(
                          'w-2 h-2 rounded-full',
                          statusColors[rec.status as keyof typeof statusColors]
                        )} />
                        <span className="text-xs text-muted-foreground capitalize">
                          {rec.status}
                        </span>
                      </div>
                      {rec.genres?.slice(0, 3).map((genre) => (
                        <Badge
                          key={genre}
                          variant="secondary"
                          className="text-xs bg-white/10 hover:bg-white/20 border-white/10"
                        >
                          {genre}
                        </Badge>
                      ))}
                    </div>

                    {/* Description */}
                    <p className="text-sm text-muted-foreground line-clamp-2 max-w-lg">
                      {rec.description}
                    </p>

                    {/* Stats + CTA */}
                    <div className="flex items-center gap-4">
                      <Link href={`/comic/${rec.id}`}>
                        <Button size="sm" className="gap-2">
                          <BookOpen size={14} />
                          View Details
                        </Button>
                      </Link>
                      <span className="flex items-center gap-1 text-sm text-muted-foreground">
                        <ThumbsUp size={13} />
                        {formatNumber(rec.upvotes)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Prev arrow */}
      <button
        onClick={scrollPrev}
        className={cn(
          'absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full',
          'bg-background/80 backdrop-blur-sm border border-border',
          'flex items-center justify-center',
          'opacity-0 group-hover:opacity-100 transition-opacity',
          'hover:bg-background hover:scale-110 transition-all',
          !canScrollPrev && 'cursor-not-allowed opacity-30'
        )}
        aria-label="Previous"
      >
        <ChevronLeft size={18} />
      </button>

      {/* Next arrow */}
      <button
        onClick={scrollNext}
        className={cn(
          'absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full',
          'bg-background/80 backdrop-blur-sm border border-border',
          'flex items-center justify-center',
          'opacity-0 group-hover:opacity-100 transition-opacity',
          'hover:bg-background hover:scale-110 transition-all',
          !canScrollNext && 'cursor-not-allowed opacity-30'
        )}
        aria-label="Next"
      >
        <ChevronRight size={18} />
      </button>

      {/* Dot indicators */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
        {recommendations.map((_, index) => (
          <button
            key={index}
            onClick={() => scrollTo(index)}
            className={cn(
              'rounded-full transition-all duration-300',
              selectedIndex === index
                ? 'w-6 h-2 bg-primary'
                : 'w-2 h-2 bg-white/30 hover:bg-white/60'
            )}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  )
}