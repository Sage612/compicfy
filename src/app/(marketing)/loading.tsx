import { Skeleton } from '@/components/ui/skeleton'

export default function HomeLoading() {
  return (
    <div className="flex flex-col">

      {/* Hero */}
      <section className="relative min-h-[92vh] flex items-center">
        <div className="max-w-7xl mx-auto px-4 py-16 md:py-24 w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            {/* Left */}
            <div className="space-y-6">
              <Skeleton className="h-7 w-52 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-16 w-3/4" />
                <Skeleton className="h-16 w-full" />
              </div>
              <Skeleton className="h-5 w-full max-w-lg" />
              <Skeleton className="h-5 w-2/3 max-w-lg" />
              <div className="flex gap-3">
                <Skeleton className="h-12 w-44 rounded-xl" />
                <Skeleton className="h-12 w-32 rounded-xl" />
              </div>
              <div className="flex gap-5 pt-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Skeleton className="w-8 h-8 rounded-lg" />
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-12" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Right — spotlight card */}
            <div className="hidden md:flex justify-center">
              <Skeleton className="w-64 aspect-[3/4] rounded-3xl" />
            </div>
          </div>
        </div>
      </section>

      {/* Ticker */}
      <Skeleton className="h-10 w-full" />

      {/* Platform trust bar */}
      <div className="border-b border-border py-6">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap gap-3 justify-center">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-24 rounded-full" />
          ))}
        </div>
      </div>

      {/* Genre pills */}
      <div className="border-b border-border py-8">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap gap-2 justify-center">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-28 rounded-full" />
          ))}
        </div>
      </div>

      {/* Trending comics */}
      <section className="max-w-7xl mx-auto px-4 py-16 w-full space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-8 w-20" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="w-full aspect-[3/4] rounded-2xl" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <div className="border-y border-border py-16">
        <div className="max-w-7xl mx-auto px-4 space-y-12">
          <div className="flex flex-col items-center gap-3">
            <Skeleton className="h-7 w-36 rounded-full" />
            <Skeleton className="h-9 w-72" />
            <Skeleton className="h-4 w-56" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-7 rounded-3xl border border-border space-y-4">
                <Skeleton className="w-12 h-12 rounded-2xl" />
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Latest news */}
      <section className="max-w-7xl mx-auto px-4 py-16 w-full space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-8 w-20" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="w-full aspect-[4/3] rounded-2xl" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ))}
        </div>
      </section>

      {/* CTA banner */}
      <div className="max-w-7xl mx-auto px-4 py-16 w-full">
        <Skeleton className="w-full h-64 rounded-3xl" />
      </div>

    </div>
  )
}