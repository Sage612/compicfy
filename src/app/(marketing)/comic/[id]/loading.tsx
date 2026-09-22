import { Skeleton } from '@/components/ui/skeleton'

export default function ComicDetailLoading() {
  return (
    <div className="min-h-screen bg-dossier text-dossier-foreground">

      {/* ── Hero background skeleton (shared) ── */}
      <div className="relative h-20 md:h-[12vh] md:min-h-[92px] md:max-h-[132px] overflow-hidden">
        <Skeleton className="absolute inset-0 rounded-none" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 md:px-6 -mt-4 md:-mt-7 z-20 pb-6 md:pb-6">

        {/* ══════════════════ MOBILE SKELETON ══════════════════ */}
        <div className="md:hidden">
          {/* Hero: cover left, title/rating right */}
          <div className="-mx-4 px-4">
            <div className="flex items-start gap-4">
              <Skeleton className="w-[34%] shrink-0 aspect-[3/4] rounded-xl" />
              <div className="flex-1 min-w-0 pt-1 space-y-2">
                <Skeleton className="h-3 w-32 rounded" />
                <Skeleton className="h-8 w-full rounded" />
                <Skeleton className="h-8 w-2/3 rounded" />
                <Skeleton className="h-8 w-36 rounded-full" />
              </div>
            </div>

            {/* Continue button */}
            <Skeleton className="mt-4 h-11 w-full rounded-xl" />
          </div>

          {/* Icon row */}
          <div className="mt-4 -mx-4 px-4 flex items-center justify-around">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <Skeleton className="w-11 h-11 rounded-full" />
                <Skeleton className="h-2.5 w-10 rounded" />
              </div>
            ))}
          </div>

          {/* Tab bar */}
          <div className="mt-4 -mx-4 px-4 flex items-center gap-6 border-b border-dossier-foreground/10 pb-3">
            <Skeleton className="h-3 w-16 rounded" />
            <Skeleton className="h-3 w-14 rounded" />
            <Skeleton className="h-3 w-20 rounded" />
          </div>

          {/* Overview tab content */}
          <div className="pt-5 space-y-6">
            <div className="rounded-2xl border border-dossier-foreground/10 bg-dossier-panel/40 p-5 space-y-3">
              <Skeleton className="h-3 w-24 rounded" />
              <Skeleton className="h-4 w-full rounded" />
              <Skeleton className="h-4 w-4/5 rounded" />
            </div>

            <div className="rounded-2xl border border-dossier-foreground/10 bg-dossier-panel/30 p-5 space-y-3">
              <Skeleton className="h-3 w-20 rounded" />
              <Skeleton className="h-4 w-full rounded" />
              <Skeleton className="h-4 w-full rounded" />
              <Skeleton className="h-4 w-2/3 rounded" />
            </div>

            <div className="space-y-2">
              <Skeleton className="h-3 w-20 rounded" />
              <div className="flex gap-1.5 overflow-hidden">
                <Skeleton className="h-6 w-16 rounded-full shrink-0" />
                <Skeleton className="h-6 w-20 rounded-full shrink-0" />
                <Skeleton className="h-6 w-24 rounded-full shrink-0" />
                <Skeleton className="h-6 w-16 rounded-full shrink-0" />
              </div>
            </div>

            <div className="space-y-2">
              <Skeleton className="h-3 w-28 rounded" />
              <div className="flex flex-wrap gap-1.5">
                <Skeleton className="h-6 w-14 rounded-full" />
                <Skeleton className="h-6 w-18 rounded-full" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            </div>

            <div className="rounded-2xl border border-dossier-foreground/10 bg-dossier-panel/40 p-5 space-y-3">
              <Skeleton className="h-3 w-24 rounded" />
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-3.5 w-24 rounded" />
                  <Skeleton className="h-3 w-20 rounded" />
                </div>
              </div>
            </div>

            <Skeleton className="h-14 w-full rounded-2xl" />
          </div>
        </div>

        {/* ══════════════════ DESKTOP SKELETON (unchanged) ══════════════════ */}
        <div className="hidden md:block">
          <div className="flex flex-col md:flex-row md:items-start gap-6 md:gap-8">

            {/* Left column: cover + action deck */}
            <div className="md:w-52 shrink-0">
              <div className="mx-auto md:mx-0 w-44 md:w-52 space-y-4">
                <Skeleton className="w-44 md:w-[180px] aspect-[3/4] rounded-lg" />

                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Skeleton className="h-9 rounded-xl" />
                    <Skeleton className="h-9 rounded-xl" />
                  </div>
                  <Skeleton className="h-9 w-full rounded-xl" />
                  <Skeleton className="h-9 w-full rounded-xl" />
                  <Skeleton className="h-9 w-full rounded-xl" />
                  <div className="grid grid-cols-2 gap-2">
                    <Skeleton className="h-9 rounded-xl" />
                    <Skeleton className="h-9 rounded-xl" />
                  </div>
                </div>
              </div>
            </div>

            {/* Right column: title, meta, genres, stats */}
            <div className="flex-1 min-w-0 pt-1 md:pt-2 space-y-3">
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-16 rounded" />
                  <Skeleton className="h-5 w-12 rounded" />
                </div>
                <Skeleton className="h-10 md:h-12 w-3/4 rounded" />
              </div>

              <div className="flex flex-wrap gap-x-5 gap-y-1.5">
                <Skeleton className="h-4 w-24 rounded" />
                <Skeleton className="h-4 w-16 rounded" />
                <Skeleton className="h-4 w-20 rounded" />
              </div>

              <div className="flex flex-wrap gap-1.5">
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-6 w-14 rounded-full" />
              </div>

              <div className="flex items-stretch rounded-xl border border-dossier-foreground/10 bg-dossier-panel/40 divide-x divide-dossier-foreground/10 overflow-hidden">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex-1 px-3 md:px-5 py-3 text-center space-y-1.5">
                    <Skeleton className="h-5 w-8 mx-auto rounded" />
                    <Skeleton className="h-2.5 w-12 mx-auto rounded" />
                  </div>
                ))}
              </div>

              {/* Main content skeleton */}
              <div className="space-y-6 pt-4 md:pt-8">

                <div className="grid grid-cols-1 md:grid-cols-[1.6fr_1fr] gap-3 md:gap-4">
                  <div className="rounded-2xl border border-dossier-foreground/10 bg-dossier-panel/30 p-5 md:p-6 space-y-3">
                    <Skeleton className="h-3 w-16 rounded" />
                    <Skeleton className="h-4 w-full rounded" />
                    <Skeleton className="h-4 w-full rounded" />
                    <Skeleton className="h-4 w-2/3 rounded" />
                  </div>
                  <div className="rounded-2xl border border-dossier-foreground/10 bg-dossier-panel/40 p-5 md:p-6 space-y-3">
                    <Skeleton className="h-3 w-24 rounded" />
                    <Skeleton className="h-4 w-full rounded" />
                    <Skeleton className="h-4 w-3/4 rounded" />
                  </div>
                </div>

                <Skeleton className="h-14 w-full rounded-2xl" />

                <div className="flex items-center justify-between py-4 border-t border-dossier-foreground/10">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-3 w-24 rounded" />
                    <Skeleton className="h-3 w-20 rounded" />
                  </div>
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-3 w-20 rounded" />
                    <Skeleton className="h-3 w-12 rounded" />
                  </div>
                </div>

                <div className="pt-2 border-t border-dossier-foreground/10 space-y-4">
                  <Skeleton className="h-3 w-16 rounded" />
                  <Skeleton className="h-24 w-full rounded-2xl" />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-7 w-7 rounded-lg shrink-0" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-3 w-32 rounded" />
                      <Skeleton className="h-3 w-48 rounded" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-32 w-full rounded-2xl" />
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-dossier-foreground/10 space-y-4">
                  <Skeleton className="h-3 w-20 rounded" />
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="aspect-[3/4] w-full rounded-xl" />
                    ))}
                  </div>
                </div>

              </div>
            </div>

            {/* Right sidebar (desktop lg+) */}
            <div className="hidden lg:block w-60 shrink-0">
              <div className="rounded-2xl border border-dossier-foreground/10 bg-dossier-panel/40 p-4 space-y-3">
                <Skeleton className="h-3 w-20 rounded" />
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-3.5 w-20 rounded" />
                    <Skeleton className="h-3 w-16 rounded" />
                  </div>
                </div>
                <Skeleton className="h-8 w-full rounded-[10px]" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}