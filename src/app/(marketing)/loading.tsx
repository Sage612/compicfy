import { Skeleton } from '@/components/ui/skeleton'

export default function HomeLoading() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="min-h-[92vh] flex flex-col items-center justify-center px-4">
        <div className="max-w-7xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6 text-center md:text-left">
            <div className="space-y-2">
              <Skeleton className="h-16 w-3/4 mx-auto md:mx-0" />
              <Skeleton className="h-16 w-full" />
            </div>
            <Skeleton className="h-16 w-full max-w-lg mx-auto md:mx-0" />
            <div className="flex gap-3 justify-center md:justify-start">
              <Skeleton className="h-12 w-40 rounded-full" />
              <Skeleton className="h-12 w-32 rounded-full" />
            </div>
            <div className="flex gap-5 justify-center md:justify-start">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Skeleton className="w-8 h-8 rounded" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="hidden md:flex justify-center">
            <Skeleton className="w-60 aspect-[3/4] rounded-lg" />
          </div>
        </div>
      </section>

      {/* Ticker */}
      <Skeleton className="h-10 w-full" />

      {/* Platform bar */}
      <div className="border-b border-border px-4 py-5">
        <Skeleton className="h-3 w-48 mx-auto mb-4" />
        <div className="flex flex-wrap gap-2 justify-center">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-24 rounded" />
          ))}
        </div>
      </div>

      {/* Trending */}
      <div className="max-w-7xl mx-auto px-4 py-14 w-full space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-7 w-36" />
          <Skeleton className="h-6 w-16" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="w-full aspect-[3/4] rounded-xl" />
              <Skeleton className="h-3 w-4/5" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      </div>

      {/* Contributors */}
      <div className="border-y border-border px-4 py-12">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <Skeleton className="h-7 w-64 mx-auto" />
            <Skeleton className="h-4 w-48 mx-auto" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-2 p-3 rounded-2xl border border-border">
                <Skeleton className="w-12 h-12 rounded-full" />
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-12" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}