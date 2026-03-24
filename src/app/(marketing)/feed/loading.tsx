import {
  PageHeaderSkeleton,
  FeedTabsSkeleton,
  FeedCardSkeleton,
  TrendingSidebarSkeleton,
} from '@/components/ui/skeleton'

export default function FeedLoading() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex gap-8">
        <div className="flex-1 min-w-0 space-y-6">
          <PageHeaderSkeleton />
          <FeedTabsSkeleton />
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <FeedCardSkeleton key={i} />
            ))}
          </div>
        </div>
        <div className="hidden lg:block w-72 shrink-0">
          <TrendingSidebarSkeleton />
        </div>
      </div>
    </div>
  )
}