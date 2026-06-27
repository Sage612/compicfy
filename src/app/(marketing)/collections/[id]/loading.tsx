import { Skeleton } from '@/components/ui/skeleton'

export default function CollectionDetailLoading() {
  return (
    <div className="max-w-4xl mx-auto space-y-0">
      {/* Mobile */}
      <div className="sm:hidden">
        <Skeleton className="h-72 w-full" />
        <div className="px-4 -mt-8 relative z-10 space-y-3 pb-8">
          <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-full" />
            <div className="flex gap-2 pt-0.5">
              <Skeleton className="flex-1 h-9 rounded-xl" />
              <Skeleton className="flex-1 h-9 rounded-xl" />
            </div>
          </div>
          <Skeleton className="h-12 w-full rounded-2xl" />
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="w-full aspect-[3/4] rounded-xl" />
            ))}
          </div>
        </div>
      </div>

      {/* Desktop */}
      <div className="hidden sm:block max-w-4xl mx-auto px-4 py-8 space-y-8">
        <Skeleton className="h-4 w-36" />
        <div className="rounded-2xl border border-border overflow-hidden">
          <Skeleton className="h-36 md:h-48 w-full" />
          <div className="px-5 pb-5 pt-4 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-7 w-3/4" />
                <Skeleton className="h-4 w-48" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-8 w-20 rounded-lg" />
                <Skeleton className="h-8 w-20 rounded-lg" />
              </div>
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-12 w-full rounded-2xl" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="w-full aspect-[3/4] rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  )
}