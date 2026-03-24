import {
  PageHeaderSkeleton,
  FeaturedCarouselSkeleton,
  HorizontalSectionSkeleton,
  FilterBarSkeleton,
  ComicGridSkeleton,
} from '@/components/ui/skeleton'

export default function BrowseLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <PageHeaderSkeleton />
      <FeaturedCarouselSkeleton />
      <div className="space-y-10">
        <HorizontalSectionSkeleton />
        <HorizontalSectionSkeleton />
        <HorizontalSectionSkeleton />
      </div>
      <FilterBarSkeleton />
      <ComicGridSkeleton />
    </div>
  )
}