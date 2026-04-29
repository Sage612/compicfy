import { Skeleton } from '@/components/ui/skeleton'

export default function BrowseLoading() {
  return (
    
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6 pointer-events-none">

      {/* Header row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Skeleton className="w-9 h-9 rounded-xl shrink-0" />
          <div className="space-y-1.5">
            <Skeleton className="h-7 w-44" />
            <Skeleton className="h-4 w-64 hidden sm:block" />
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-8 w-24 rounded-lg" />
        </div>
      </div>

      {/* Featured carousel placeholder */}
      <Skeleton className="h-[280px] sm:h-[360px] w-full rounded-2xl" />

      {/* Horizontal section skeletons */}
      {Array.from({ length: 3 }).map((_, s) => (
        <div key={s} className="space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-5 w-16" />
          </div>
          {/* horizontal scroll row — fixed height, no overflow-hidden so layout stays stable */}
          <div className="flex gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="shrink-0 w-32 space-y-2">
                <Skeleton className="w-32 h-[171px] rounded-xl" /> {/* exact 3:4 ratio */}
                <Skeleton className="h-3.5 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Divider pill */}
      <Skeleton className="h-10 w-40 rounded-full mx-auto" />

      {/* Filter bar */}
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-24 rounded-xl" />
        ))}
      </div>

      {/* Comic grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {Array.from({ length: 24 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="w-full aspect-[3/4] rounded-2xl" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>

    </div>
  )
}