import { Skeleton } from '@/components/ui/skeleton'

export default function CollectionsLoading() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="w-9 h-9 rounded-xl" />
          <div className="space-y-1.5">
            <Skeleton className="h-7 w-36" />
            <Skeleton className="h-4 w-56" />
          </div>
        </div>
        <Skeleton className="h-8 w-32 rounded-lg hidden sm:block" />
      </div>

      {/* Mobile Pinterest grid */}
      <div className="sm:hidden grid grid-cols-2 gap-3 items-start">
        {[0, 1].map(col => (
          <div key={col} className="flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton
                key={i}
                className={`w-full rounded-2xl ${['h-36', 'h-44', 'h-52'][i % 3]}`}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Desktop grid */}
      <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border overflow-hidden">
            <Skeleton className="h-24 w-full" />
            <div className="p-4 space-y-3">
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-3/4" />
              </div>
              <div className="flex gap-1.5">
                <Skeleton className="h-7 flex-1 rounded-md" />
                <Skeleton className="h-7 w-7 rounded-md" />
                <Skeleton className="h-7 w-7 rounded-md" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}