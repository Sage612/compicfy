import { Skeleton } from '@/components/ui/skeleton'

export default function ComicDetailLoading() {
  return (
    <div className="min-h-screen">

      {/* Cinematic hero */}
      <Skeleton className="h-56 md:h-72 w-full" />

      <div className="max-w-5xl mx-auto px-4 -mt-28 md:-mt-40 relative z-10 pb-20">
        <div className="flex flex-col md:flex-row gap-8">

          {/* Left — cover + actions */}
          <div className="flex flex-col gap-3 md:w-52 shrink-0">
            <Skeleton className="w-full aspect-[3/4] rounded-2xl" />
            {/* Vote buttons */}
            <Skeleton className="h-10 w-full rounded-xl" />
            {/* Save button */}
            <Skeleton className="h-10 w-full rounded-xl" />
            {/* Add to list */}
            <Skeleton className="h-10 w-full rounded-xl" />
            {/* Share */}
            <Skeleton className="h-10 w-full rounded-xl" />
            {/* Platforms */}
            <div className="space-y-1.5 pt-1">
              <Skeleton className="h-3 w-16" />
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full rounded-xl" />
              ))}
            </div>
          </div>

          {/* Right — details */}
          <div className="flex-1 min-w-0 space-y-6 pt-2 md:pt-20">

            {/* Badges + title */}
            <div className="space-y-3">
              <div className="flex gap-2">
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
              <Skeleton className="h-10 w-3/4" />
              <Skeleton className="h-10 w-1/2" />
              <div className="flex gap-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
              </div>
              <div className="flex gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-7 w-16 rounded-full" />
                ))}
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-2xl" />
              ))}
            </div>

            {/* About */}
            <div className="space-y-2">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>

            {/* Why recommend */}
            <div className="space-y-2">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-20 w-full rounded-2xl" />
            </div>

            {/* Submitted by */}
            <Skeleton className="h-px w-full" />
            <div className="flex justify-between">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-24" />
            </div>

            {/* Reviews */}
            <div className="space-y-3">
              <Skeleton className="h-3 w-16" />
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-2 p-4 rounded-2xl border border-border">
                  <div className="flex items-center gap-2">
                    <Skeleton className="w-8 h-8 rounded-full" />
                    <Skeleton className="h-4 w-28" />
                  </div>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                </div>
              ))}
            </div>

            {/* Similar comics */}
            <div className="space-y-3">
              <Skeleton className="h-3 w-32" />
              <div className="flex gap-3 overflow-hidden">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="shrink-0 w-28 space-y-2">
                    <Skeleton className="w-28 aspect-[3/4] rounded-xl" />
                    <Skeleton className="h-3.5 w-3/4" />
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}