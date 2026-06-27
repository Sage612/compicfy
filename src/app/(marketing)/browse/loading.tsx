import { Skeleton } from '@/components/ui/skeleton'

export default function BrowseLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Skeleton className="w-8 h-8 rounded" />
          <div className="space-y-1.5">
            <Skeleton className="h-7 w-44" />
            <Skeleton className="h-3 w-64 hidden sm:block" />
          </div>
        </div>
      </div>

      {/* Featured carousel */}
      <Skeleton className="h-[280px] sm:h-[360px] w-full rounded-2xl" />

      {/* Horizontal sections */}
      <div className="space-y-10">
        {Array.from({ length: 3 }).map((_, s) => (
          <div key={s} className="space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="flex gap-3 overflow-hidden">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="shrink-0 w-28 space-y-2">
                  <Skeleton className="w-28 h-40 rounded-xl" />
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-12" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Divider */}
      <Skeleton className="h-10 w-40 rounded-lg mx-auto" />

      {/* Filter bar */}
      <Skeleton className="h-24 w-full rounded-xl" />

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {Array.from({ length: 24 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="w-full aspect-[3/4] rounded-xl" />
            <Skeleton className="h-3 w-4/5" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  )
}