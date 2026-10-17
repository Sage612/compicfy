// Matches the real ComicCard: 3:4 cover with a two-line caption underneath.

export function ComicCardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="aspect-[3/4] rounded-lg bg-muted" />
      <div className="pt-2 space-y-1.5">
        <div className="h-3 w-5/6 rounded bg-muted" />
        <div className="h-2.5 w-1/2 rounded bg-muted/60" />
      </div>
    </div>
  )
}

export function ComicGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-x-3 gap-y-5">
      {Array.from({ length: count }).map((_, i) => (
        <ComicCardSkeleton key={i} />
      ))}
    </div>
  )
}