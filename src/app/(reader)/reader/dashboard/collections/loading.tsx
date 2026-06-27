import { Skeleton } from '@/components/ui/skeleton'

export default function ReaderCollectionsLoading() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <Skeleton className="h-7 w-36" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-8 w-32 rounded-lg" />
      </div>

      {/* Mobile Pinterest */}
      <div className="sm:hidden grid grid-cols-2 gap-3 items-start">
        {[0, 1].map(col => (
          <div key={col} className="flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className={`w-full rounded-2xl ${['h-36','h-44','h-52'][(i + col) % 3]}`} />
            ))}
          </div>
        ))}
      </div>

      {/* Desktop grid */}
      <div className="hidden sm:grid sm:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border overflow-hidden">
            <Skeleton className="h-24 w-full" />
            <div className="p-4 space-y-3">
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-3 w-full" />
              <div className="flex gap-1.5">
                <Skeleton className="h-7 flex-1 rounded-md" />
                <Skeleton className="h-7 w-7 rounded-md" />
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