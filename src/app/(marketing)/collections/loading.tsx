export default function Loading() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="mb-8 space-y-3">
        <div className="h-8 w-48 rounded-lg bg-white/[0.06] animate-pulse" />
        <div className="h-4 w-96 max-w-full rounded-lg bg-white/[0.04] animate-pulse" />
      </div>

      {/* Filters/tabs skeleton */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-8 w-24 rounded-full bg-white/[0.05] animate-pulse shrink-0" />
        ))}
      </div>

      {/* Collections grid - matches your CollectionsClient */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-xl p-4">
            <div className="flex gap-3">
              {/* Collection cover stack */}
              <div className="relative w-20 h-28 shrink-0">
                <div className="absolute inset-0 rounded-lg bg-white/[0.06] animate-pulse" />
                <div className="absolute -right-1 -bottom-1 w-20 h-28 rounded-lg bg-white/[0.04] -z-10" />
              </div>
              <div className="flex-1 space-y-2.5 py-1">
                <div className="h-4 w-3/4 rounded bg-white/[0.06] animate-pulse" />
                <div className="h-3 w-full rounded bg-white/[0.04] animate-pulse" />
                <div className="h-3 w-2/3 rounded bg-white/[0.04] animate-pulse" />
                <div className="flex items-center gap-3 pt-1">
                  <div className="h-3 w-12 rounded bg-white/[0.05] animate-pulse" />
                  <div className="h-3 w-16 rounded bg-white/[0.05] animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
