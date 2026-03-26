import { Skeleton } from '@/components/ui/skeleton'

export default function BillingLoading() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div className="space-y-1">
        <div className="flex items-center gap-2.5">
          <Skeleton className="w-9 h-9 rounded-xl shrink-0" />
          <Skeleton className="h-8 w-24" />
        </div>
        <Skeleton className="h-4 w-56 ml-0.5" />
      </div>
      <div className="p-5 rounded-2xl border border-border space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-8 w-16" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
        </div>
        <Skeleton className="h-9 w-36 rounded-xl" />
      </div>
      <Skeleton className="h-20 rounded-2xl" />
    </div>
  )
}