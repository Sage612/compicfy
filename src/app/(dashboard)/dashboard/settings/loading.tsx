import { Skeleton } from '@/components/ui/skeleton'

export default function SettingsLoading() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2.5">
          <Skeleton className="w-9 h-9 rounded-xl shrink-0" />
          <Skeleton className="h-8 w-24" />
        </div>
        <Skeleton className="h-4 w-64 ml-0.5" />
      </div>

      {/* Avatar section */}
      <div className="p-6 rounded-2xl border border-border bg-card space-y-4">
        <Skeleton className="h-5 w-24" />
        <div className="flex items-center gap-4">
          <Skeleton className="w-20 h-20 rounded-full shrink-0" />
          <div className="space-y-2">
            <Skeleton className="h-9 w-32 rounded-xl" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
      </div>

      {/* Form fields */}
      <div className="p-6 rounded-2xl border border-border bg-card space-y-5">
        <Skeleton className="h-5 w-32" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        ))}
      </div>

      {/* Preferences */}
      <div className="p-6 rounded-2xl border border-border bg-card space-y-5">
        <Skeleton className="h-5 w-28" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="space-y-1">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-52" />
            </div>
            <Skeleton className="w-10 h-6 rounded-full shrink-0" />
          </div>
        ))}
      </div>

      {/* Save button */}
      <Skeleton className="h-10 w-full rounded-xl" />
    </div>
  )
}