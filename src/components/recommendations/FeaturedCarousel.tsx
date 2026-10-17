'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { formatNumber } from '@/lib/utils/format'
import { resolveStatusMeta, CAROUSEL_AUTOPLAY_DELAY } from '@/lib/utils/constants'
import type { Recommendation } from '@/types/app.types'

interface Props {
  recommendations: Recommendation[]
  adminFeaturedIds: Set<string>  // ids of admin-curated picks; the rest are community voted
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

/* ────────────────────────────────────────────────────────────────
   PHONE: native scroll-snap strip. One large cover is centred, the
   neighbours peek in from both sides so it's obvious you can swipe.
   No autoplay (it fights your thumb), no tiny 3D stack.
──────────────────────────────────────────────────────────────── */
function MobileFeatured({ recommendations, adminFeaturedIds }: Props) {
  const stripRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)

  const onScroll = useCallback(() => {
    const el = stripRef.current
    if (!el || !el.children.length) return
    const first = el.children[0] as HTMLElement
    const step  = first.offsetWidth + 12 // card + gap-3
    setActive(Math.max(0, Math.min(recommendations.length - 1, Math.round(el.scrollLeft / step))))
  }, [recommendations.length])

  const goTo = (i: number) => {
    const el = stripRef.current
    if (!el || !el.children.length) return
    const first = el.children[0] as HTMLElement
    el.scrollTo({ left: i * (first.offsetWidth + 12), behavior: 'smooth' })
  }

  const rec    = recommendations[active]
  const status = resolveStatusMeta(rec.status, (rec as any).translation_status)
  const isAdminPick = adminFeaturedIds.has(rec.id)

  return (
    <div className="md:hidden space-y-4 -mx-4">
      <div
        ref={stripRef}
        onScroll={onScroll}
        className="flex gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory px-[calc((100vw_-_min(68vw,300px))/2)]"
      >
        {recommendations.map((r, i) => {
          const src = proxyCover(r.cover_url)
          const isActive = i === active
          return (
            <Link
              key={r.id}
              href={`/comic/${r.id}`}
              className={cn(
                'relative shrink-0 w-[min(68vw,300px)] snap-center aspect-[3/4] rounded-xl overflow-hidden bg-muted ring-1 ring-border/60',
                'transition-all duration-300',
                isActive ? 'scale-100 opacity-100' : 'scale-[0.93] opacity-60'
              )}
            >
              {src ? (
                <img src={src} alt={r.title} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center px-4 text-center">
                  <span className="font-dashboard-serif text-lg text-muted-foreground/60">{r.title}</span>
                </div>
              )}
            </Link>
          )
        })}
      </div>

      {/* Caption for the centred card */}
      <div className="px-4 text-center space-y-1">
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground/70">
          {isAdminPick ? 'Editor’s pick' : 'Community vote'}
        </p>
        <Link href={`/comic/${rec.id}`} className="block">
          <h2 className="font-dashboard-serif text-2xl leading-tight text-foreground line-clamp-2">{rec.title}</h2>
        </Link>
        <p className="text-xs text-muted-foreground capitalize">
          {rec.type} · {status.label}
          {(rec.upvotes ?? 0) > 0 && <> · {formatNumber(rec.upvotes ?? 0)} votes</>}
        </p>
      </div>

      {/* Dots (tappable) */}
      <div className="flex items-center justify-center gap-1.5">
        {recommendations.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            aria-label={`Go to ${i + 1}`}
            className={cn(
              'rounded-full transition-all duration-300 h-1',
              i === active ? 'w-5 bg-foreground' : 'w-1 bg-foreground/25'
            )}
          />
        ))}
      </div>
    </div>
  )
}

/* ────────────────────────────────────────────────────────────────
   DESKTOP: the 3D cover stack, same motion, neutral dressing.
──────────────────────────────────────────────────────────────── */
function DesktopFeatured({ recommendations, adminFeaturedIds }: Props) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [contentVisible, setContentVisible] = useState(true)
  const [containerWidth, setContainerWidth] = useState(800)

  const stageRef = useRef<HTMLDivElement>(null)
  const autoplayRef = useRef<NodeJS.Timeout | null>(null)

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
    return () => { if (autoplayRef.current) clearInterval(autoplayRef.current) }
  }, [restartAutoplay])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') { prev(); restartAutoplay() }
      if (e.key === 'ArrowRight') { next(); restartAutoplay() }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [prev, next, restartAutoplay])

  function getCoverStyle(index: number): React.CSSProperties {
    const gap = calculateGap(containerWidth)
    const lift = gap * 0.5
    const isActive = index === activeIndex
    const isLeft = (activeIndex - 1 + length) % length === index
    const isRight = (activeIndex + 1) % length === index
    const t = 'all 0.7s cubic-bezier(.4,2,.3,1)'

    if (isActive) return { zIndex: 3, opacity: 1, pointerEvents: 'auto', transform: 'translateX(0px) translateY(0px) scale(1) rotateY(0deg)', transition: t }
    if (isLeft)   return { zIndex: 2, opacity: 1, pointerEvents: 'auto', transform: `translateX(-${gap}px) translateY(-${lift}px) scale(0.82) rotateY(18deg)`, transition: t }
    if (isRight)  return { zIndex: 2, opacity: 1, pointerEvents: 'auto', transform: `translateX(${gap}px) translateY(-${lift}px) scale(0.82) rotateY(-18deg)`, transition: t }
    return { zIndex: 1, opacity: 0, pointerEvents: 'none', transform: 'scale(0.7)', transition: t }
  }

  const rec = recommendations[activeIndex]
  const status = resolveStatusMeta(rec.status, (rec as any).translation_status)
  const isAdminPick = adminFeaturedIds.has(rec.id)

  return (
    <div className="hidden md:block relative w-full max-w-5xl mx-auto px-4 py-8">
      <div className="grid gap-10 md:grid-cols-2 md:items-center">
        <div ref={stageRef} className="relative w-full h-96 [perspective:1000px]">
          {recommendations.map((r, i) => {
            const src = proxyCover(r.cover_url)
            return (
              <div key={r.id} className="absolute inset-0" style={getCoverStyle(i)}>
                <Link href={`/comic/${r.id}`} className="block w-full h-full">
                  <div className="relative w-full h-full rounded-2xl overflow-hidden ring-1 ring-border/60 shadow-[0_10px_30px_rgba(0,0,0,0.3)] bg-muted">
                    {src && <img src={src} alt={r.title} className="w-full h-full object-cover" />}
                  </div>
                </Link>
              </div>
            )
          })}
        </div>

        <div
          className={cn(
            'space-y-4 transition-all duration-300',
            contentVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
          )}
        >
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground/70">
            {isAdminPick ? 'Editor’s pick' : 'Community vote'}
            <span className="mx-1.5">·</span>
            <span className="capitalize">{rec.type}</span>
          </p>

          <h2 className="font-dashboard-serif text-4xl leading-tight text-foreground line-clamp-2">
            {rec.title}
          </h2>

          <p className="text-sm text-muted-foreground">
            {status.label}
            {rec.genres?.length ? <> · {rec.genres.slice(0, 3).join(' · ')}</> : null}
            {(rec.upvotes ?? 0) > 0 && <> · {formatNumber(rec.upvotes ?? 0)} votes</>}
          </p>

          {rec.description && (
            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 max-w-md">
              {rec.description}
            </p>
          )}

          <Link
            href={`/comic/${rec.id}`}
            className="inline-flex items-center h-9 px-5 rounded-full bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Open
          </Link>
        </div>
      </div>

      <button
        onClick={() => { prev(); restartAutoplay() }}
        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 w-9 h-9 rounded-full bg-background/80 backdrop-blur border border-border text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Previous"
      >
        ‹
      </button>
      <button
        onClick={() => { next(); restartAutoplay() }}
        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 w-9 h-9 rounded-full bg-background/80 backdrop-blur border border-border text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Next"
      >
        ›
      </button>

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

export function FeaturedCarousel({ recommendations, adminFeaturedIds }: Props) {
  if (!recommendations.length) return null
  return (
    <>
      <MobileFeatured recommendations={recommendations} adminFeaturedIds={adminFeaturedIds} />
      <DesktopFeatured recommendations={recommendations} adminFeaturedIds={adminFeaturedIds} />
    </>
  )
}