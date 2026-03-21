export default function FeedLoading() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex gap-8">

        {/* ── Main feed skeleton ── */}
        <div className="flex-1 min-w-0 space-y-6">

          {/* Header skeleton */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-muted animate-pulse" />
            <div className="space-y-1.5">
              <div className="h-6 w-24 bg-muted rounded-lg animate-pulse" />
              <div className="h-3.5 w-48 bg-muted rounded animate-pulse" />
            </div>
          </div>

          {/* Tabs skeleton */}
          <div className="h-10 w-48 bg-muted rounded-xl animate-pulse" />

          {/* Feed cards skeleton */}
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl border border-border bg-card overflow-hidden"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                {/* Who posted */}
                <div className="flex items-center gap-2.5 px-4 pt-4 pb-3 border-b border-border/50">
                  <div className="w-7 h-7 rounded-full bg-muted animate-pulse shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <div className="h-3 w-24 bg-muted rounded animate-pulse" />
                  </div>
                </div>

                {/* Comic */}
                <div className="flex gap-4 p-4">
                  <div className="w-14 h-20 rounded-xl bg-muted animate-pulse shrink-0" />
                  <div className="flex-1 space-y-2 py-0.5">
                    <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
                    <div className="flex gap-1.5">
                      <div className="h-5 w-16 bg-muted rounded-full animate-pulse" />
                      <div className="h-5 w-16 bg-muted rounded-full animate-pulse" />
                    </div>
                    <div className="flex gap-1">
                      <div className="h-4 w-12 bg-muted rounded-full animate-pulse" />
                      <div className="h-4 w-12 bg-muted rounded-full animate-pulse" />
                      <div className="h-4 w-12 bg-muted rounded-full animate-pulse" />
                    </div>
                    <div className="space-y-1">
                      <div className="h-3 w-full bg-muted rounded animate-pulse" />
                      <div className="h-3 w-2/3 bg-muted rounded animate-pulse" />
                    </div>
                  </div>
                </div>

                {/* Actions row */}
                <div className="flex items-center justify-between px-4 pb-3 pt-1 border-t border-border/50">
                  <div className="flex gap-2">
                    <div className="h-7 w-16 bg-muted rounded-full animate-pulse" />
                    <div className="h-7 w-24 bg-muted rounded-full animate-pulse" />
                  </div>
                  <div className="h-3 w-16 bg-muted rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Sidebar skeleton — desktop only ── */}
        <div className="hidden lg:block w-72 shrink-0">
          <div className="sticky top-20 space-y-4">

            {/* Trending skeleton */}
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/30">
                <div className="w-4 h-4 bg-muted rounded animate-pulse" />
                <div className="h-3 w-32 bg-muted rounded animate-pulse" />
              </div>
              <div className="p-3 space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-2">
                    <div className="w-4 h-3 bg-muted rounded animate-pulse shrink-0" />
                    <div className="w-8 h-10 rounded-lg bg-muted animate-pulse shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-full bg-muted rounded animate-pulse" />
                      <div className="h-3 w-12 bg-muted rounded animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Coming soon skeletons */}
            {[1, 2].map((i) => (
              <div key={i} className="rounded-2xl border border-border bg-card overflow-hidden opacity-60">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/30">
                  <div className="w-4 h-4 bg-muted rounded animate-pulse" />
                  <div className="h-3 w-28 bg-muted rounded animate-pulse" />
                </div>
                <div className="p-4 space-y-3">
                  {[1, 2, 3].map((j) => (
                    <div key={j} className="h-3 bg-muted rounded animate-pulse" style={{ width: `${70 + j * 10}%` }} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}