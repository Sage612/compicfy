import { Skeleton } from '@/components/ui/skeleton'

export default function ProCreatorDashboardLoading() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Pro studio header */}
      <div className="rounded-2xl border border-teal-500/30 bg-card p-5 md:p-7">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <Skeleton className="w-14 h-14 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="flex gap-2 items-center">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <Skeleton className="h-3 w-44" />
          </div>
          <div className="flex gap-2 shrink-0 w-full sm:w-auto">
            <Skeleton className="h-8 flex-1 sm:w-24 rounded-lg" />
            <Skeleton className="h-8 flex-1 sm:w-24 rounded-lg" />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-4 rounded-2xl border border-border bg-card space-y-3">
            <Skeleton className="w-8 h-8 rounded-lg" />
            <Skeleton className="h-6 w-12" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>

      {/* 30-day pulse */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-3 w-24" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-3 rounded-xl border border-border bg-card space-y-2">
              <Skeleton className="w-7 h-7 rounded-lg" />
              <Skeleton className="h-6 w-12" />
              <Skeleton className="h-3 w-12" />
            </div>
          ))}
        </div>
      </div>

      {/* Audience snapshot */}
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="p-4 rounded-2xl border border-border bg-card space-y-2">
            <div className="flex items-center gap-1.5 mb-2">
              <Skeleton className="w-4 h-4 rounded" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-28" />
          </div>
        ))}
      </div>

      {/* Engagement rate */}
      <div className="p-4 rounded-2xl border border-border bg-card space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-36" />
          <Skeleton className="h-6 w-12" />
        </div>
        <Skeleton className="h-1.5 w-full rounded-full" />
        <Skeleton className="h-3 w-64" />
      </div>

      {/* Milestones */}
      <div className="space-y-3">
        <Skeleton className="h-3 w-24" />
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="p-3 rounded-xl border border-border bg-card space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-1.5 w-full rounded-full" />
            <Skeleton className="h-3 w-48" />
          </div>
        ))}
      </div>

      {/* Work health */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-3 w-16" />
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-3 rounded-xl border border-border bg-card">
            <div className="flex items-center gap-3">
              <Skeleton className="w-8 h-11 rounded-md shrink-0" />
              <div className="flex-1 space-y-1.5">
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

      {/* Recent reviews */}
      <div className="space-y-3">
        <Skeleton className="h-3 w-32" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="p-3 rounded-xl border border-border bg-card space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Skeleton className="w-5 h-5 rounded-full shrink-0" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-3 w-16 shrink-0" />
            </div>
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-32" />
          </div>
        ))}
      </div>
    </div>
  )
}