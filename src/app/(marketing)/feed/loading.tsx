import { Skeleton } from '@/components/ui/skeleton'

export default function FeedLoading() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex gap-8">

        {/* ── Main feed ── */}
        <div className="flex-1 min-w-0 space-y-6">

          {/* Header */}
          <div className="flex items-center gap-3">
            <Skeleton className="w-9 h-9 rounded-xl shrink-0" />
            <div className="space-y-1.5">
              <Skeleton className="h-7 w-16" />
              <Skeleton className="h-4 w-56" />
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2">
            <Skeleton className="h-9 w-28 rounded-xl" />
            <Skeleton className="h-9 w-28 rounded-xl" />
          </div>

          {/* Feed cards */}
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="flex gap-4 p-4 rounded-2xl border border-border bg-card"
              >
                {/* Cover */}
                <Skeleton className="w-16 h-24 rounded-xl shrink-0" />

                {/* Content */}
                <div className="flex-1 min-w-0 space-y-2.5 py-0.5">
                  {/* User + time */}
                  <div className="flex items-center gap-2">
                    <Skeleton className="w-6 h-6 rounded-full shrink-0" />
                    <Skeleton className="h-3.5 w-24" />
                    <Skeleton className="h-3.5 w-16" />
                  </div>

                  {/* Title */}
                  <Skeleton className="h-5 w-3/4" />

                  {/* Badges */}
                  <div className="flex gap-2">
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </div>

                  {/* Description */}
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />

                  {/* Actions */}
                  <div className="flex gap-3 pt-1">
                    <Skeleton className="h-7 w-16 rounded-lg" />
                    <Skeleton className="h-7 w-16 rounded-lg" />
                    <Skeleton className="h-7 w-16 rounded-lg" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Trending sidebar — desktop only ── */}
        <div className="hidden lg:block w-72 shrink-0 space-y-4">
          <Skeleton className="h-6 w-32" />
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex gap-3 items-center">
              <Skeleton className="w-10 h-14 rounded-lg shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}