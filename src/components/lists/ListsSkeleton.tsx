export function ListsSkeleton() {
  const desktopCards = Array.from({ length: 6 })
  const leftCards    = Array.from({ length: 4 })
  const rightCards   = Array.from({ length: 4 })

  const leftHeights  = ['h-36', 'h-44', 'h-52', 'h-36']
  const rightHeights = ['h-44', 'h-52', 'h-36', 'h-44']

  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-muted animate-pulse" />
          <div className="space-y-1.5">
            <div className="h-7 w-40 rounded-lg bg-muted animate-pulse" />
            <div className="h-4 w-56 rounded bg-muted/60 animate-pulse" />
          </div>
        </div>
        <div className="h-8 w-28 rounded-full bg-muted animate-pulse hidden sm:block" />
      </div>

      {/* MOBILE: Pinterest two-column skeleton */}
      <div className="sm:hidden grid grid-cols-2 gap-3 items-start">
        <div className="flex flex-col gap-3">
          {leftCards.map((_, i) => (
            <div key={i} className={`rounded-2xl bg-muted animate-pulse ${leftHeights[i % 4]}`} />
          ))}
        </div>
        <div className="flex flex-col gap-3">
          {rightCards.map((_, i) => (
            <div key={i} className={`rounded-2xl bg-muted animate-pulse ${rightHeights[i % 4]}`} />
          ))}
        </div>
      </div>

      {/* DESKTOP: grid skeleton */}
      <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {desktopCards.map((_, i) => (
          <div key={i} className="rounded-2xl border border-border bg-card overflow-hidden animate-pulse">
            <div className="h-24 bg-muted" />
            <div className="p-4 space-y-3">
              <div className="space-y-1.5">
                <div className="h-4 w-3/4 rounded bg-muted" />
                <div className="h-3 w-full rounded bg-muted/60" />
                <div className="h-3 w-1/2 rounded bg-muted/60" />
              </div>
              <div className="flex items-center justify-between">
                <div className="h-3 w-14 rounded bg-muted/60" />
                <div className="h-3 w-16 rounded bg-muted/60" />
              </div>
              <div className="flex gap-1.5">
                <div className="h-7 flex-1 rounded-md bg-muted" />
                <div className="h-7 w-16 rounded-md bg-muted" />
                <div className="h-7 w-7 rounded-md bg-muted" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}