import { Skeleton } from '@/components/ui/skeleton'

export default function ProfileLoading() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">
      {/* Profile card */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {/* Banner */}
        <Skeleton className="h-28 md:h-36 w-full" />
        <div className="px-5 pb-5 -mt-12 relative">
          <div className="flex items-end justify-between gap-3 mb-3">
            <Skeleton className="w-20 h-20 rounded-full shrink-0" />
            <div className="flex gap-2 pb-1">
              <Skeleton className="h-8 w-24 rounded-lg" />
            </div>
          </div>
          <div className="space-y-2 mb-3">
            <div className="flex gap-2 items-center">
              <Skeleton className="h-6 w-36" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-4 w-full max-w-lg mb-3" />
          <Skeleton className="h-4 w-3/4 max-w-lg mb-4" />
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 mb-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-3 w-20" />
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-16 rounded-full" />
            ))}
          </div>
        </div>
      </div>

      {/* Recommendations grid */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-44" />
          <div className="h-0.5 flex-1 bg-muted rounded-full" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="w-full aspect-[3/4] rounded-xl" />
              <Skeleton className="h-3 w-4/5" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      </div>

      {/* Reading lists */}
      <div className="space-y-4">
        <Skeleton className="h-5 w-32" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  )
}