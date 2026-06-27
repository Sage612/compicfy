import { Skeleton } from '@/components/ui/skeleton'

export default function ComicDetailLoading() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <Skeleton className="h-56 md:h-72 w-full" />

      <div className="max-w-5xl mx-auto px-4 -mt-28 md:-mt-40 relative z-10 pb-20">
        <div className="flex flex-col md:flex-row gap-8">

          {/* Left: cover + actions */}
          <div className="flex flex-col gap-3 md:w-52 shrink-0">
            <Skeleton className="w-full aspect-[3/4] rounded-lg" />
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-16" />
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full rounded-xl" />
              ))}
            </div>
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-xl" />
            ))}
          </div>

          {/* Right: details */}
          <div className="flex-1 min-w-0 space-y-6 pt-2 md:pt-20">
            <div className="space-y-3">
              <div className="flex gap-2">
                <Skeleton className="h-5 w-20 rounded" />
                <Skeleton className="h-5 w-16 rounded" />
              </div>
              <Skeleton className="h-10 w-3/4" />
              <div className="flex gap-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-6 w-16 rounded" />
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-lg" />
              ))}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>

            {/* Why recommend */}
            <Skeleton className="h-24 w-full rounded-lg" />

            {/* Recommender row */}
            <Skeleton className="h-10 w-full" />

            {/* Reviews */}
            <div className="space-y-3">
              <Skeleton className="h-3 w-16" />
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-2xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}