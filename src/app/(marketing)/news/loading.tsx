import { NewsGridSkeleton } from '@/components/news/NewsCardSkeleton'

export default function NewsLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-8">
      <div className="h-8 w-32 bg-muted rounded-lg animate-pulse" />
      <div className="aspect-[16/9] max-h-96 rounded-2xl bg-muted animate-pulse" />
      <div className="h-20 bg-muted/30 rounded-lg animate-pulse" />
      <NewsGridSkeleton count={6} />
    </div>
  )
}