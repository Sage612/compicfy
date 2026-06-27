import { Skeleton } from '@/components/ui/skeleton'

export default function ProCreatorSettingsLoading() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div className="space-y-1.5">
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-3 w-56" />
      </div>

      {/* Avatar */}
      <div className="rounded-2xl border border-teal-500/20 bg-card p-5 space-y-4">
        <Skeleton className="h-4 w-28" />
        <div className="flex items-center gap-4">
          <Skeleton className="w-16 h-16 rounded-full shrink-0" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-28 rounded-lg" />
            <Skeleton className="h-3 w-40" />
          </div>
        </div>
      </div>

      {/* Profile fields */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <Skeleton className="h-4 w-32" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        ))}
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      </div>

      {/* Creator links section */}
      <div className="rounded-2xl border border-teal-500/20 bg-card p-5 space-y-4">
        <Skeleton className="h-4 w-32" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        ))}
      </div>

      {/* Danger zone */}
      <div className="rounded-2xl border border-destructive/20 bg-card p-5 space-y-3">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>

      <Skeleton className="h-10 w-32 rounded-xl" />
    </div>
  )
}