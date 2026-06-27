import { Skeleton } from '@/components/ui/skeleton'

export default function AdminLogsLoading() {
  return (
    <div className="space-y-4">
      {/* Search + refresh */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 flex-1 rounded-xl" />
        <Skeleton className="h-9 w-24 rounded-xl shrink-0" />
      </div>

      {/* Count */}
      <Skeleton className="h-4 w-20" />

      {/* Filter chips */}
      <div className="flex gap-1.5 overflow-hidden pb-1">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-20 rounded-full shrink-0" />
        ))}
      </div>

      {/* Log list */}
      <div className="rounded-lg border border-border bg-card overflow-hidden divide-y divide-border">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="px-3 py-3 flex items-start gap-2.5">
            <Skeleton className="w-7 h-7 rounded-full shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1.5">
              <div className="flex items-center gap-1.5 flex-wrap">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-4 w-16 rounded" />
                <Skeleton className="h-3 w-16 ml-auto" />
              </div>
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          </div>
        ))}
      </div>

      <Skeleton className="h-8 w-24 rounded-lg mx-auto" />
    </div>
  )
}