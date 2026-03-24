import { Skeleton } from '@/components/ui/skeleton'

export default function MyReviewsLoading() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2.5">
          <Skeleton className="w-9 h-9 rounded-xl shrink-0" />
          <Skeleton className="h-8 w-28" />
        </div>
        <Skeleton className="h-4 w-24 ml-0.5" />
      </div>

      {/* Review cards */}
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex gap-4 p-4 rounded-2xl border border-border bg-card">
            <Skeleton className="w-14 h-20 rounded-xl shrink-0" />
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-3/4" />
                  <div className="flex gap-2">
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                </div>
                <Skeleton className="w-4 h-4 shrink-0" />
              </div>
              {/* Star rating */}
              <div className="flex gap-1">
                {Array.from({ length: 5 }).map((_, s) => (
                  <Skeleton key={s} className="w-3.5 h-3.5 rounded" />
                ))}
              </div>
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-5/6" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}