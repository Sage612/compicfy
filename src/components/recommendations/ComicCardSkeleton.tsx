// Matches the real ComicCard layout: aspect-[3/4] image, genre pills below, no inner padding card

export function ComicCardSkeleton() {
  return (
    <div className="group relative flex flex-col animate-pulse">
      {/* Cover — same aspect ratio as real card */}
      <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-muted" >
        {/* Type pill placeholder — top left */}
        <div className="absolute top-2.5 left-2.5 h-4 w-14 rounded-md bg-muted-foreground/20" />
        {/* Score/badge placeholder — top right */}
        <div className="absolute top-2.5 right-2.5 h-4 w-8 rounded-md bg-muted-foreground/20" />
        {/* Bottom info placeholder */}
        <div className="absolute bottom-0 left-0 right-0 p-3 space-y-2">
          <div className="h-3 w-3/4 rounded bg-muted-foreground/25" />
          <div className="h-2.5 w-1/2 rounded bg-muted-foreground/20" />
        </div>
      </div>
      {/* Genre pills placeholder */}
      <div className="flex gap-1 mt-2 px-0.5">
        <div className="h-4 w-12 rounded-full bg-muted" />
        <div className="h-4 w-10 rounded-full bg-muted" />
      </div>
    </div>
  )
}

export function ComicGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <ComicCardSkeleton key={i} />
      ))}
    </div>
  )
}