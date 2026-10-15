export function ListsSkeleton() {
  return (
    <div className="grid grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border bg-card overflow-hidden animate-pulse">
          <div className="aspect-[5/2] bg-muted" />
          <div className="p-4 space-y-2">
            <div className="h-4 w-3/4 rounded bg-muted" />
            <div className="h-3 w-full rounded bg-muted/60" />
            <div className="h-3 w-1/3 rounded bg-muted/60" />
          </div>
          <div className="border-t border-border/60 px-4 py-2.5 flex items-center justify-between">
            <div className="h-3 w-16 rounded bg-muted/60" />
            <div className="h-7 w-24 rounded-md bg-muted" />
          </div>
        </div>
      ))}
    </div>
  )
}