import { ComicGridSkeleton } from '@/components/recommendations/ComicCardSkeleton'

export default function BrowseLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-8">
      <div className="h-8 w-48 bg-muted rounded-lg animate-pulse" />
      <div className="h-[280px] sm:h-[360px] rounded-2xl bg-muted animate-pulse" />
      <div className="space-y-3">
        {[1,2,3].map(i => (
          <div key={i} className="h-40 bg-muted rounded-xl animate-pulse" />
        ))}
      </div>
      <ComicGridSkeleton count={12} />
    </div>
  )
}