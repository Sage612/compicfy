import { cn } from '@/lib/utils'

function Shimmer({ className }: { className?: string }) {
  return <div className={cn('animate-pulse bg-muted rounded', className)} />
}

// ── Matches ComicCard: 3:4 cover + two-line caption ──
export function ComicCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={className}>
      <Shimmer className="aspect-[3/4] rounded-lg" />
      <div className="pt-2 space-y-1.5">
        <Shimmer className="h-3 w-5/6" />
        <Shimmer className="h-2.5 w-1/2 bg-muted/60" />
      </div>
    </div>
  )
}

// ── Matches HorizontalSection: title row + a strip of cards ──
export function HorizontalSectionSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-1.5">
          <Shimmer className="h-2.5 w-14 bg-muted/60" />
          <Shimmer className="h-6 w-40" />
        </div>
        <Shimmer className="h-3 w-12" />
      </div>
      <div className="flex gap-3 overflow-hidden -mx-4 px-4">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex-none w-32 sm:w-40">
            <ComicCardSkeleton />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Matches FeaturedCarousel: phone = peeking cards, desktop = stack + text ──
export function FeaturedCarouselSkeleton() {
  return (
    <div className="w-full max-w-5xl mx-auto py-2 md:py-8">
      {/* Phone */}
      <div className="md:hidden flex gap-3 overflow-hidden -mx-4 px-[calc((100vw_-_min(68vw,300px))/2)]">
        <Shimmer className="shrink-0 w-[min(68vw,300px)] aspect-[3/4] rounded-xl" />
        <Shimmer className="shrink-0 w-[min(68vw,300px)] aspect-[3/4] rounded-xl" />
      </div>
      {/* Desktop */}
      <div className="hidden md:grid gap-10 md:grid-cols-2 md:items-center px-4">
        <Shimmer className="w-full h-96 rounded-2xl" />
        <div className="space-y-3">
          <Shimmer className="h-3 w-32" />
          <Shimmer className="h-9 w-3/4" />
          <Shimmer className="h-3 w-1/2 bg-muted/60" />
          <div className="space-y-1.5 pt-2">
            <Shimmer className="h-3 w-full bg-muted/60" />
            <Shimmer className="h-3 w-5/6 bg-muted/60" />
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center gap-1.5 mt-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <Shimmer key={i} className="w-1 h-1 rounded-full" />
        ))}
      </div>
    </div>
  )
}

// ── Matches the genre grid ──
export function GenreGridSkeleton({ count = 9 }: { count?: number }) {
  return (
    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-3 gap-y-5">
      {Array.from({ length: count }).map((_, i) => (
        <ComicCardSkeleton key={i} className={i >= 9 ? 'hidden md:block' : undefined} />
      ))}
    </div>
  )
}

// ── Matches the genre section wrapper ──
export function GenreSectionsSkeleton({ sections = 2 }: { sections?: number }) {
  return (
    <div className="space-y-10 pt-2">
      {Array.from({ length: sections }).map((_, i) => (
        <div key={i} className="space-y-4">
          <div className="space-y-1.5">
            <Shimmer className="h-2.5 w-14 bg-muted/60" />
            <Shimmer className="h-6 w-56" />
          </div>
          <GenreGridSkeleton />
        </div>
      ))}
    </div>
  )
}