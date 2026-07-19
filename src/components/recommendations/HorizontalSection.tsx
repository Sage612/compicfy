'use client'

import Link from 'next/link'
import { useRef } from 'react'
import { ComicCard } from './ComicCard'
import { ScrollingTitle } from './ScrollingTitle'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Recommendation } from '@/types/database.types'

interface Props {
  title: string
  emoji?: string
  recommendations: Recommendation[]
  viewAllHref?: string
  className?: string
  showGenres?: boolean
}

export function HorizontalSection({
  title,
  emoji,
  recommendations,
  viewAllHref,
  className,
  showGenres = true,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return
    const scrollAmount = scrollRef.current.clientWidth * 0.75
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    })
  }

  if (!recommendations.length) return null

  return (
    <div className={cn('space-y-4', className)}>
      {/* Section header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {emoji && (
            <span className="text-2xl leading-none shrink-0">{emoji}</span>
          )}
          <div className="min-w-0">
            <ScrollingTitle>
              <h2 className="text-lg font-black leading-tight tracking-tight">{title}</h2>
            </ScrollingTitle>
            <div className="h-0.5 w-8 rounded-full bg-primary mt-1 opacity-60" />
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Scroll arrows */}
          <button
            onClick={() => scroll('left')}
            className="w-8 h-8 rounded-full border border-border bg-card hover:bg-accent hover:border-primary/40 flex items-center justify-center transition-all"
            aria-label="Scroll left"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            onClick={() => scroll('right')}
            className="w-8 h-8 rounded-full border border-border bg-card hover:bg-accent hover:border-primary/40 flex items-center justify-center transition-all"
            aria-label="Scroll right"
          >
            <ChevronRight size={14} />
          </button>

          {viewAllHref && (
            <Link href={viewAllHref}>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 text-xs text-muted-foreground hover:text-foreground h-8 px-3"
              >
                All
                <ArrowRight size={11} />
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Horizontal scroll container */}
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto no-scrollbar pb-2 -mx-1 px-1"
      >
        {recommendations.map((rec) => (
          <div key={rec.id} className="flex-none w-36 sm:w-40">
            <ComicCard recommendation={rec} showGenres={showGenres} />
          </div>
        ))}
      </div>
    </div>
  )
}