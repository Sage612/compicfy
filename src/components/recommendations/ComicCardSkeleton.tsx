const S = 'animate-pulse rounded-md bg-muted'

export function ComicCardSkeleton() {
  return (
    <div className="flex flex-col rounded-xl overflow-hidden border border-border bg-card">
      <div className={`${S} aspect-[3/4] w-full rounded-none`} />
      <div className="p-2.5 space-y-2">
        <div className={`${S} h-3.5 w-3/4`} />
        <div className={`${S} h-3 w-1/2`} />
        <div className="flex gap-1">
          <div className={`${S} h-4 w-12 rounded-full`} />
          <div className={`${S} h-4 w-12 rounded-full`} />
        </div>
      </div>
    </div>
  )
}

export function ComicGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <ComicCardSkeleton key={i} />
      ))}
    </div>
  )
}