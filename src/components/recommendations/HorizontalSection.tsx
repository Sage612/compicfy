'use client'

import Link from 'next/link'
import { useRef } from 'react'
import { ComicCard } from './ComicCard'
import { cn } from '@/lib/utils'
import type { Recommendation } from '@/types/app.types'

interface Props {
  title: string
  /** Small label above the title, e.g. "This week". Optional. */
  eyebrow?: string
  /** Kept for compatibility with older callers; no longer rendered. */
  emoji?: string
  recommendations: Recommendation[]
  /** Points at the dedicated "all" page for this section. */
  viewAllHref?: string
  className?: string
  showGenres?: boolean
}

export function HorizontalSection({
  title,
  eyebrow,
  recommendations,
  viewAllHref,
  className,
  showGenres = false,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return
    const amount = scrollRef.current.clientWidth * 0.8
    scrollRef.current.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' })
  }

  if (!recommendations.length) return null

  return (
    <section className={cn('space-y-4', className)}>
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          {eyebrow && (
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground/70">{eyebrow}</p>
          )}
          <h2 className="font-dashboard-serif text-xl sm:text-2xl leading-tight text-foreground truncate">{title}</h2>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          {/* Arrows are a mouse affordance; phones swipe. */}
          <div className="hidden md:flex items-center gap-1.5">
            <button
              onClick={() => scroll('left')}
              className="h-8 w-8 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors"
              aria-label="Scroll left"
            >
              ‹
            </button>
            <button
              onClick={() => scroll('right')}
              className="h-8 w-8 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors"
              aria-label="Scroll right"
            >
              ›
            </button>
          </div>
          {viewAllHref && (
            <Link
              href={viewAllHref}
              className="text-xs text-foreground underline underline-offset-4 decoration-border hover:decoration-foreground transition-colors whitespace-nowrap"
            >
              See all
            </Link>
          )}
        </div>
      </div>

      {/* Bleeds to the screen edge on phones so the next card always peeks. */}
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto no-scrollbar snap-x snap-proximity scroll-pl-4 -mx-4 px-4 pb-1"
      >
        {recommendations.map(rec => (
          <div key={rec.id} className="flex-none w-32 sm:w-40 snap-start">
            <ComicCard recommendation={rec} showGenres={showGenres} />
          </div>
        ))}
        {viewAllHref && (
          <Link
            href={viewAllHref}
            className="flex-none w-32 sm:w-40 snap-start self-start aspect-[3/4] rounded-lg border border-dashed border-border flex items-center justify-center text-xs text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors"
          >
            See all →
          </Link>
        )}
      </div>
    </section>
  )
}