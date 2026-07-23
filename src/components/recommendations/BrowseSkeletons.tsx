import { cn } from '@/lib/utils'

function Shimmer({ className }: { className?: string }) {
  return <div className={cn('animate-pulse bg-muted rounded', className)} />
}

// ── Matches ComicCard's shell: aspect-[3/4] cover + meta block below ──
export function ComicCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-xl overflow-hidden border border-border bg-card', className)}>
      <Shimmer className="aspect-[3/4] rounded-none" />
      <div className="px-3 pt-2 pb-2.5 space-y-1.5">
        <div className="flex items-center justify-between gap-1">
          <Shimmer className="h-2.5 w-12" />
          <Shimmer className="h-2.5 w-16" />
        </div>
        <div className="flex items-center gap-2">
          <Shimmer className="h-2.5 w-8" />
          <Shimmer className="h-2.5 w-8" />
          <Shimmer className="h-2.5 w-8" />
        </div>
      </div>
    </div>
  )
}

// ── Matches HorizontalSection: header row + horizontal card scroll ──
export function HorizontalSectionSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Shimmer className="w-6 h-6 rounded-full shrink-0" />
          <div className="space-y-1.5">
            <Shimmer className="h-4 w-32" />
            <Shimmer className="h-0.5 w-8 rounded-full" />
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Shimmer className="w-8 h-8 rounded-full" />
          <Shimmer className="w-8 h-8 rounded-full" />
        </div>
      </div>
      <div className="flex gap-3 overflow-hidden -mx-1 px-1">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex-none w-36 sm:w-40">
            <ComicCardSkeleton />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Matches FeaturedCarousel: cover stack + content column, mobile-aware ──
export function FeaturedCarouselSkeleton() {
  return (
    <div className="relative w-full max-w-5xl mx-auto px-4 py-6 md:py-10">
      <div className="grid gap-10 md:grid-cols-2 md:items-center">
        <Shimmer className="w-full h-56 sm:h-80 md:h-96 rounded-2xl" />
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Shimmer className="h-4 w-14 rounded" />
            <Shimmer className="h-4 w-20 rounded" />
          </div>
          <Shimmer className="h-8 w-3/4" />
          <div className="flex items-center gap-1.5">
            <Shimmer className="h-4 w-16 rounded" />
            <Shimmer className="h-4 w-16 rounded" />
            <Shimmer className="h-4 w-16 rounded" />
          </div>
          <div className="hidden md:block space-y-1.5">
            <Shimmer className="h-3 w-full" />
            <Shimmer className="h-3 w-5/6" />
            <Shimmer className="h-3 w-2/3" />
          </div>
          <div className="flex items-center gap-4 pt-1">
            <Shimmer className="h-9 w-28 rounded" />
            <Shimmer className="h-4 w-10" />
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center gap-1.5 mt-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Shimmer key={i} className="w-1 h-1 rounded-full" />
        ))}
      </div>
    </div>
  )
}

// ── Matches the genre grid: 3-6 cols depending on breakpoint ──
export function GenreGridSkeleton({ count = 9 }: { count?: number }) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <ComicCardSkeleton key={i} className={i >= 9 ? 'hidden md:block' : undefined} />
      ))}
    </div>
  )
}