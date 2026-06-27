import { Skeleton } from '@/components/ui/skeleton'

export default function LeaderboardLoading() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="w-9 h-9 rounded-xl" />
        <div className="space-y-1.5">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-3 w-36" />
        </div>
      </div>

      {/* Podium */}
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-2 p-3 rounded-2xl border border-border bg-card">
            <Skeleton className="w-10 h-10 rounded-full" />
            <div className="space-y-1 w-full text-center">
              <Skeleton className="h-3 w-3/4 mx-auto" />
              <Skeleton className="h-5 w-8 mx-auto" />
            </div>
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>

      {/* Full list */}
      <div className="space-y-2">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-2xl border border-border bg-card">
            <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
            <Skeleton className="w-8 h-8 rounded-full shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-32" />
            </div>
            <div className="flex gap-3 shrink-0">
              <Skeleton className="h-3 w-10" />
              <Skeleton className="h-3 w-10" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}