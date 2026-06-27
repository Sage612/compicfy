import { Skeleton } from '@/components/ui/skeleton'

export default function ProCreatorWorksLoading() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-8 w-28 rounded-lg" />
      </div>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="p-3 rounded-2xl border border-border bg-card">
          <div className="flex items-center gap-3">
            <Skeleton className="w-8 h-11 rounded-md shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-1 w-full rounded-full" />
              <div className="flex gap-3">
                {Array.from({ length: 4 }).map((_, j) => (
                  <Skeleton key={j} className="h-3 w-8" />
                ))}
              </div>
            </div>
            <Skeleton className="w-6 h-6 rounded-lg shrink-0" />
          </div>
        </div>
      ))}
    </div>
  )
}