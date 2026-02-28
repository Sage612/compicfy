'use client'

import useEmblaCarousel from 'embla-carousel-react'
import Autoplay from 'embla-carousel-autoplay'
import { useCallback, useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { NewsCard } from './NewsCard'
import { cn } from '@/lib/utils'
import type { News } from '@/types/database.types'

interface Props {
  news: News[]
}

export function NewsCarousel({ news }: Props) {
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, align: 'start' },
    [Autoplay({ delay: 4000, stopOnInteraction: false, stopOnMouseEnter: true })]
  )

  const [selectedIndex, setSelectedIndex] = useState(0)

  const onSelect = useCallback(() => {
    if (!emblaApi) return
    setSelectedIndex(emblaApi.selectedScrollSnap())
  }, [emblaApi])

  useEffect(() => {
    if (!emblaApi) return
    onSelect()
    emblaApi.on('select', onSelect)
    return () => { emblaApi.off('select', onSelect) }
  }, [emblaApi, onSelect])

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi])
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi])
  const scrollTo = useCallback((i: number) => emblaApi?.scrollTo(i), [emblaApi])

  if (!news.length) return null

  return (
    <div className="relative group">
      <div ref={emblaRef} className="overflow-hidden rounded-2xl">
        <div className="flex">
          {news.map((item) => (
            <div key={item.id} className="flex-none w-full min-w-0">
              <NewsCard news={item} variant="featured" />
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={scrollPrev}
        className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-background/80 backdrop-blur-sm border border-border flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110"
        aria-label="Previous"
      >
        <ChevronLeft size={18} />
      </button>

      <button
        onClick={scrollNext}
        className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-background/80 backdrop-blur-sm border border-border flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110"
        aria-label="Next"
      >
        <ChevronRight size={18} />
      </button>

      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
        {news.map((_, i) => (
          <button
            key={i}
            onClick={() => scrollTo(i)}
            title="scrollTo"
  aria-label="scrollTo"

            className={cn(
              'rounded-full transition-all duration-300',
              selectedIndex === i
                ? 'w-6 h-2 bg-primary'
                : 'w-2 h-2 bg-white/30 hover:bg-white/60'
            )}
          />
        ))}
      </div>
    </div>
  )
}