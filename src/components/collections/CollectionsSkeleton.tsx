export function CollectionsSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="aspect-[5/7] rounded-xl border border-border bg-muted animate-pulse" />
      ))}
    </div>
  )
}