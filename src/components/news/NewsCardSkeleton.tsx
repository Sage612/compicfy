const S = 'animate-pulse rounded-md bg-muted'

export function NewsCardSkeleton() {
  return (
    <div className="flex flex-col rounded-xl overflow-hidden border border-border bg-card">
      <div className={`${S} aspect-[16/9] w-full rounded-none`} />
      <div className="p-4 space-y-2.5">
        <div className={`${S} h-4 w-16 rounded-full`} />
        <div className={`${S} h-4 w-full`} />
        <div className={`${S} h-4 w-3/4`} />
        <div className={`${S} h-3 w-1/2`} />
      </div>
    </div>
  )
}

export function NewsGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <NewsCardSkeleton key={i} />
      ))}
    </div>
  )
}