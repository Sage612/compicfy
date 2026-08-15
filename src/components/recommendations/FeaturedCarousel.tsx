'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, BookOpen, ThumbsUp, Star, Zap, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatNumber } from '@/lib/utils/format'
import { TYPE_META, DEFAULT_TYPE_META, resolveStatusMeta, CAROUSEL_AUTOPLAY_DELAY } from '@/lib/utils/constants'
import type { Recommendation } from '@/types/app.types'

interface Props {
  recommendations: Recommendation[]
  adminFeaturedIds: Set<string>  // ids of admin-curated picks — rest are community voted
}

function proxyCover(url: string | null | undefined): string | null {
  if (!url) return null
  if (url.startsWith('/')) return url
  if (url.includes('/api/image-proxy')) return url
  return `/api/image-proxy?url=${encodeURIComponent(url)}`
}

function calculateGap(width: number) {
  const minWidth = 640
  const maxWidth = 1100
  const minGap = 40
  const maxGap = 70
  if (width <= minWidth) return minGap
  if (width >= maxWidth) return maxGap
  return minGap + (maxGap - minGap) * ((width - minWidth) / (maxWidth - minWidth))
}

export function FeaturedCarousel({ recommendations, adminFeaturedIds }: Props) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [contentVisible, setContentVisible] = useState(true)
  const [containerWidth, setContainerWidth] = useState(800)

  const stageRef = useRef<HTMLDivElement>(null)
  const autoplayRef = useRef<NodeJS.Timeout | null>(null)
  const touchStartX = useRef<number | null>(null)

  const length = recommendations.length

  useEffect(() => {
    function handleResize() {
      if (stageRef.current) setContainerWidth(stageRef.current.offsetWidth)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const goTo = useCallback((index: number) => {
    setContentVisible(false)
    window.setTimeout(() => {
      setActiveIndex(((index % length) + length) % length)
      setContentVisible(true)
    }, 150)
  }, [length])

  const next = useCallback(() => goTo(activeIndex + 1), [activeIndex, goTo])
  const prev = useCallback(() => goTo(activeIndex - 1), [activeIndex, goTo])

  const restartAutoplay = useCallback(() => {
    if (autoplayRef.current) clearInterval(autoplayRef.current)
    if (length <= 1) return
    autoplayRef.current = setInterval(() => {
      setContentVisible(false)
      window.setTimeout(() => {
        setActiveIndex(prevIdx => (prevIdx + 1) % length)
        setContentVisible(true)
      }, 150)
    }, CAROUSEL_AUTOPLAY_DELAY)
  }, [length])

  useEffect(() => {
    restartAutoplay()
    return () => {
      if (autoplayRef.current) clearInterval(autoplayRef.current)
    }
  }, [restartAutoplay])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') { prev(); restartAutoplay() }
      if (e.key === 'ArrowRight') { next(); restartAutoplay() }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [prev, next, restartAutoplay])

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
  }
  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return
    const delta = e.changedTouches[0].clientX - touchStartX.current
    if (Math.abs(delta) > 40) {
      if (delta < 0) { next(); restartAutoplay() } else { prev(); restartAutoplay() }
    }
    touchStartX.current = null
  }

  function getCoverStyle(index: number): React.CSSProperties {
    const gap = calculateGap(containerWidth)
    const lift = gap * 0.5
    const isActive = index === activeIndex
    const isLeft = (activeIndex - 1 + length) % length === index
    const isRight = (activeIndex + 1) % length === index

    if (isActive) {
      return {
        zIndex: 3,
        opacity: 1,
        pointerEvents: 'auto',
        transform: 'translateX(0px) translateY(0px) scale(1) rotateY(0deg)',
        transition: 'all 0.7s cubic-bezier(.4,2,.3,1)',
      }
    }
    if (isLeft) {
      return {
        zIndex: 2,
        opacity: 1,
        pointerEvents: 'auto',
        transform: `translateX(-${gap}px) translateY(-${lift}px) scale(0.82) rotateY(18deg)`,
        transition: 'all 0.7s cubic-bezier(.4,2,.3,1)',
      }
    }
    if (isRight) {
      return {
        zIndex: 2,
        opacity: 1,
        pointerEvents: 'auto',
        transform: `translateX(${gap}px) translateY(-${lift}px) scale(0.82) rotateY(-18deg)`,
        transition: 'all 0.7s cubic-bezier(.4,2,.3,1)',
      }
    }
    return {
      zIndex: 1,
      opacity: 0,
      pointerEvents: 'none',
      transform: 'scale(0.7)',
      transition: 'all 0.7s cubic-bezier(.4,2,.3,1)',
    }
  }

  if (!length) return null

  const rec = recommendations[activeIndex]
  const accent = TYPE_META[rec.type as keyof typeof TYPE_META] ?? DEFAULT_TYPE_META
  const status = resolveStatusMeta(rec.status, (rec as any).translation_status)
  const isAdminPick = adminFeaturedIds.has(rec.id)
  const badge = isAdminPick
    ? { icon: Star, label: 'Featured', className: 'text-amber-500 dark:text-amber-400', fill: 'fill-amber-500 dark:fill-amber-400' }
    : { icon: Users, label: 'Community Voted', className: 'text-sky-600 dark:text-sky-400', fill: '' }
  const cornerLabel = isAdminPick ? '✨ Top Pick' : '🗳️ Community Vote'

  return (
    <div
      className="relative w-full max-w-5xl mx-auto px-4 py-6 md:py-10"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="grid gap-10 md:grid-cols-2 md:items-center">
        {/* Cover stack */}
        <div
          ref={stageRef}
          className="relative w-full h-56 sm:h-80 md:h-96 [perspective:1000px]"
        >
          {recommendations.map((r, i) => {
            const src = proxyCover(r.cover_url)
            return (
              <div key={r.id} className="absolute inset-0" style={getCoverStyle(i)}>
                <Link href={`/comic/${r.id}`} className="block w-full h-full">
                  <div className="relative w-full h-full rounded-2xl overflow-hidden border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.35)] bg-zinc-900">
                    {src ? (
                      <img src={src} alt={r.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpen size={40} className="text-white/20" />
                      </div>
                    )}
                    {i === activeIndex && (
                      <div className="absolute top-3 right-3 px-2 py-0.5 rounded bg-black/60 text-[10px] font-black text-white border border-white/10">
                        {cornerLabel}
                      </div>
                    )}
                  </div>
                </Link>
              </div>
            )
          })}
        </div>

        {/* Content */}
        <div
          className={cn(
            'space-y-3 transition-all duration-300',
            contentVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
          )}
        >
          <div className="flex items-center gap-2">
            <span className={cn(
              'inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border',
              accent.badge
            )}>
              <Zap size={9} />
              {rec.type}
            </span>
            <span className={cn('flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider', badge.className)}>
              <badge.icon size={9} className={badge.fill} />
              {badge.label}
            </span>
          </div>

          <h2 className="text-2xl md:text-4xl font-black leading-tight tracking-tight line-clamp-2 text-foreground">
            {rec.title}
          </h2>

          <div className="flex flex-wrap items-center gap-1.5">
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-muted border border-border">
              <span className={cn('text-[10px] font-bold', status.color)}>{status.label}</span>
            </div>
            {rec.genres?.slice(0, 3).map((g: string) => (
              <span key={g} className="px-2 py-0.5 rounded text-[10px] text-muted-foreground bg-muted border border-border">
                {g}
              </span>
            ))}
          </div>

          {rec.description && (
            <p className="hidden md:block text-sm text-muted-foreground leading-relaxed line-clamp-3 max-w-md">
              {rec.description}
            </p>
          )}

          <div className="flex items-center gap-4 pt-1">
            <Link href={`/comic/${rec.id}`}>
              <Button
                size="sm"
                className={cn('gap-2 font-bold border-0 rounded text-white', accent.bar, 'hover:opacity-90')}
              >
                <BookOpen size={13} />
                Read More
              </Button>
            </Link>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <ThumbsUp size={12} />
              {formatNumber(rec.upvotes ?? 0)}
            </div>
          </div>
        </div>
      </div>

      {/* Arrows */}
      <button
        onClick={() => { prev(); restartAutoplay() }}
        className="hidden sm:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 w-9 h-9 rounded-full bg-background/80 border border-border items-center justify-center text-foreground transition-colors duration-200 hover:bg-muted shadow-sm"
        aria-label="Previous"
      >
        <ChevronLeft size={16} />
      </button>
      <button
        onClick={() => { next(); restartAutoplay() }}
        className="hidden sm:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 w-9 h-9 rounded-full bg-background/80 border border-border items-center justify-center text-foreground transition-colors duration-200 hover:bg-muted shadow-sm"
        aria-label="Next"
      >
        <ChevronRight size={16} />
      </button>

      {/* Dots */}
      <div className="flex items-center justify-center gap-1.5 mt-6">
        {recommendations.map((_, index) => (
          <button
            key={index}
            onClick={() => { goTo(index); restartAutoplay() }}
            className={cn(
              'rounded-full transition-all duration-300',
              activeIndex === index ? 'w-5 h-1 bg-foreground' : 'w-1 h-1 bg-foreground/25 hover:bg-foreground/40'
            )}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  )
}