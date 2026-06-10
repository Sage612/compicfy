export default function Loading() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="mb-8 space-y-3">
        <div className="h-8 w-44 rounded-lg bg-white/[0.06] animate-pulse" />
        <div className="h-4 w-80 max-w-full rounded-lg bg-white/[0.04] animate-pulse" />
      </div>

      {/* Action bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-2">
          <div className="h-8 w-20 rounded-full bg-white/[0.05] animate-pulse" />
          <div className="h-8 w-24 rounded-full bg-white/[0.05] animate-pulse" />
        </div>
        <div className="h-8 w-28 rounded-lg bg-white/[0.05] animate-pulse" />
      </div>

      {/* Lists grid - matches ListsClient */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-xl p-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/[0.06] animate-pulse shrink-0" />
              <div className="flex-1 space-y-2.5">
                <div className="h-5 w-3/4 rounded bg-white/[0.06] animate-pulse" />
                <div className="h-3.5 w-full rounded bg-white/[0.04] animate-pulse" />
                <div className="h-3.5 w-5/6 rounded bg-white/[0.04] animate-pulse" />
                <div className="flex items-center gap-4 pt-1.5">
                  <div className="h-3 w-14 rounded bg-white/[0.05] animate-pulse" />
                  <div className="h-3 w-20 rounded bg-white/[0.05] animate-pulse" />
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
