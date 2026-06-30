import { Skeleton } from '@/components/ui/skeleton'

export default function ComicDetailLoading() {
  return (
    <div className="min-h-screen bg-dossier text-dossier-foreground">

      {/* ── Hero skeleton ── */}
      <div className="relative h-[22vh] md:h-[30vh] min-h-[160px] max-h-[280px] overflow-hidden">
        <Skeleton className="absolute inset-0 rounded-none" />
      </div>

      {/* ── Dossier strip skeleton ── */}
      <div className="relative max-w-6xl mx-auto px-4 md:px-6 -mt-10 md:-mt-14 z-20">
        <div className="flex flex-col md:flex-row gap-6 md:gap-10">

          {/* Left column: cover + action deck */}
          <div className="md:w-48 shrink-0">
            <div className="mx-auto md:mx-0 w-40 md:w-48 space-y-4">
              <Skeleton className="w-40 md:w-48 aspect-[3/4] rounded-lg" />

              {/* Mobile-only title placeholder under the cover */}
              <div className="md:hidden space-y-2">
                <div className="flex justify-center gap-2">
                  <Skeleton className="h-5 w-16 rounded" />
                  <Skeleton className="h-5 w-12 rounded" />
                </div>
                <Skeleton className="h-7 w-full rounded" />
              </div>

              {/* Action deck skeleton — mirrors the real grid rows */}
              <div className="hidden md:block space-y-2">
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
          <div className="flex-1 min-w-0 pt-1 md:pt-2 space-y-4">

            <div className="hidden md:block space-y-2">
              <div className="flex gap-2">
                <Skeleton className="h-5 w-16 rounded" />
                <Skeleton className="h-5 w-12 rounded" />
              </div>
              <Skeleton className="h-10 md:h-12 w-3/4 rounded" />
            </div>

            <Skeleton className="h-8 w-40 rounded-full" />

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

            {/* Mobile action deck skeleton */}
            <div className="md:hidden space-y-2">
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
      </div>

      {/* ── Main content skeleton ── */}
      <div className="max-w-6xl mx-auto px-4 md:px-6 mt-8 md:mt-10 pb-24 space-y-10">

        {/* About + Why Read This */}
        <div className="grid grid-cols-1 md:grid-cols-[1.6fr_1fr] gap-5 md:gap-6">
          <div className="rounded-2xl border border-dossier-foreground/10 bg-dossier-panel/30 p-6 md:p-8 space-y-3">
            <Skeleton className="h-3 w-16 rounded" />
            <Skeleton className="h-4 w-full rounded" />
            <Skeleton className="h-4 w-full rounded" />
            <Skeleton className="h-4 w-2/3 rounded" />
          </div>
          <div className="rounded-2xl border border-dossier-foreground/10 bg-dossier-panel/40 p-6 md:p-7 space-y-3">
            <Skeleton className="h-3 w-24 rounded" />
            <Skeleton className="h-4 w-full rounded" />
            <Skeleton className="h-4 w-3/4 rounded" />
          </div>
        </div>

        {/* Submit Your Own banner */}
        <Skeleton className="h-14 w-full rounded-2xl" />

        {/* Byline row */}
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

        {/* Reviews */}
        <div className="pt-2 border-t border-dossier-foreground/10 space-y-4">
          <Skeleton className="h-3 w-16 rounded" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>

        {/* Affiliate / merch section */}
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

        {/* Next Reads */}
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
  )
}