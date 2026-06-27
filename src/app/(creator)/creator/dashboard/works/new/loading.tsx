import { Skeleton } from '@/components/ui/skeleton'

export default function RecFormLoading() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="space-y-1.5">
        <Skeleton className="h-7 w-52" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* Usage bar */}
      <Skeleton className="h-20 w-full rounded-2xl" />

      {/* Auto-fill banner */}
      <Skeleton className="h-20 w-full rounded-2xl" />

      {/* Guideline banner */}
      <Skeleton className="h-16 w-full rounded-2xl" />

      {/* Basic Info */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <Skeleton className="h-12 w-full" />
        <div className="p-5 space-y-5">
          <div className="flex flex-col sm:flex-row gap-6">
            <Skeleton className="w-full sm:w-36 aspect-[3/4] rounded-xl shrink-0" />
            <div className="flex-1 space-y-4">
              <Skeleton className="h-11 w-full rounded-xl" />
              <div className="grid grid-cols-2 gap-3">
                <Skeleton className="h-10 w-full rounded-xl" />
                <Skeleton className="h-10 w-full rounded-xl" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Skeleton className="h-10 w-full rounded-xl" />
                <Skeleton className="h-10 w-full rounded-xl" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Classification */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <Skeleton className="h-12 w-full" />
        <div className="p-5 space-y-5">
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-xl" />
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="grid grid-cols-2 gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-11 w-full rounded-xl" />
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-11 w-full rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <Skeleton className="h-12 w-full" />
        <div className="p-5 space-y-4">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      </div>

      {/* Submit */}
      <div className="flex items-center justify-between pt-1">
        <Skeleton className="h-9 w-20 rounded-lg" />
        <Skeleton className="h-9 w-44 rounded-lg" />
      </div>
    </div>
  )
}