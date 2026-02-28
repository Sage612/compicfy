'use client'

import Link from 'next/link'
import { useRef } from 'react'
import { ComicCard } from './ComicCard'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { Recommendation } from '@/types/database.types'

interface Props {
  title: string
  emoji?: string
  recommendations: Recommendation[]
  viewAllHref?: string
  className?: string
}

export function HorizontalSection({
  title,
  emoji,
  recommendations,
  viewAllHref,
  className,
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
    <div className={cn('space-y-3', className)}>
      {/* Section header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold flex items-center gap-2">
          {emoji && <span>{emoji}</span>}
          {title}
        </h2>
        <div className="flex items-center gap-2">
          {/* Scroll arrows */}
          <div className="flex gap-1">
            <button
              onClick={() => scroll('left')}
              className="w-7 h-7 rounded-full border border-border bg-card hover:bg-accent flex items-center justify-center transition-colors"
              aria-label="Scroll left"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => scroll('right')}
              className="w-7 h-7 rounded-full border border-border bg-card hover:bg-accent flex items-center justify-center transition-colors"
              aria-label="Scroll right"
            >
              <ChevronRight size={14} />
            </button>
          </div>

          {viewAllHref && (
            <Link href={viewAllHref}>
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground h-7">
                View all →
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Horizontal scroll container */}
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto no-scrollbar pb-2"
      >
        {recommendations.map((rec) => (
          <div key={rec.id} className="flex-none w-36 sm:w-40">
            <ComicCard recommendation={rec} />
          </div>
        ))}
      </div>
    </div>
  )
}