// ── Base pulse class (no imports needed) ────────────────────────────
const S = 'animate-pulse rounded-md bg-muted'

// ── Comic Card Skeleton ──────────────────────────────────────────────
export function ComicCardSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className={`${S} w-full aspect-[2/3] rounded-xl`} />
      <div className={`${S} h-3.5 w-3/4`} />
      <div className={`${S} h-3 w-1/2`} />
      <div className="flex gap-1.5 mt-1">
        <div className={`${S} h-5 w-12 rounded-full`} />
        <div className={`${S} h-5 w-12 rounded-full`} />
      </div>
    </div>
  )
}

// ── Horizontal Section Skeleton ──────────────────────────────────────
export function HorizontalSectionSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className={`${S} h-5 w-40`} />
        <div className={`${S} h-4 w-14`} />
      </div>
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="shrink-0 w-[140px] sm:w-[160px]">
            <ComicCardSkeleton />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Featured Carousel Skeleton ───────────────────────────────────────
export function FeaturedCarouselSkeleton() {
  return (
    <div className={`${S} w-full h-[280px] sm:h-[360px] rounded-2xl`} />
  )
}

// ── Filter Bar Skeleton ──────────────────────────────────────────────
export function FilterBarSkeleton() {
  return (
    <div className="flex flex-wrap gap-2">
      <div className={`${S} h-9 w-full sm:w-64 rounded-xl`} />
      <div className={`${S} h-9 w-28 rounded-xl`} />
      <div className={`${S} h-9 w-28 rounded-xl`} />
      <div className={`${S} h-9 w-28 rounded-xl`} />
      <div className={`${S} h-9 w-28 rounded-xl`} />
    </div>
  )
}

// ── Comic Grid Skeleton ──────────────────────────────────────────────
export function ComicGridSkeleton({ count = 24 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <ComicCardSkeleton key={i} />
      ))}
    </div>
  )
}

// ── Page Header Skeleton ─────────────────────────────────────────────
export function PageHeaderSkeleton() {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className={`${S} w-9 h-9 rounded-xl shrink-0`} />
        <div className="space-y-1.5">
          <div className={`${S} h-6 w-48`} />
          <div className={`${S} h-3.5 w-64 hidden sm:block`} />
        </div>
      </div>
      <div className={`${S} h-8 w-24 rounded-xl shrink-0`} />
    </div>
  )
}

// ── Feed Card Skeleton ───────────────────────────────────────────────
export function FeedCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2.5">
        <div className={`${S} w-8 h-8 rounded-full shrink-0`} />
        <div className="space-y-1.5 flex-1">
          <div className={`${S} h-3.5 w-28`} />
          <div className={`${S} h-3 w-20`} />
        </div>
        <div className={`${S} h-5 w-16 rounded-full`} />
      </div>
      <div className="flex gap-3">
        <div className={`${S} w-16 h-24 rounded-lg shrink-0`} />
        <div className="flex-1 space-y-2 pt-1">
          <div className={`${S} h-4 w-3/4`} />
          <div className={`${S} h-3.5 w-1/2`} />
          <div className={`${S} h-3 w-full`} />
          <div className={`${S} h-3 w-5/6`} />
          <div className="flex gap-1.5 pt-1">
            <div className={`${S} h-5 w-12 rounded-full`} />
            <div className={`${S} h-5 w-12 rounded-full`} />
          </div>
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <div className={`${S} h-8 w-20 rounded-xl`} />
        <div className={`${S} h-8 w-20 rounded-xl`} />
        <div className={`${S} h-8 w-20 rounded-xl`} />
      </div>
    </div>
  )
}

// ── Trending Sidebar Skeleton ────────────────────────────────────────
export function TrendingSidebarSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <div className={`${S} h-5 w-32`} />
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2.5">
          <div className={`${S} w-10 h-14 rounded-lg shrink-0`} />
          <div className="flex-1 space-y-1.5">
            <div className={`${S} h-3.5 w-full`} />
            <div className={`${S} h-3 w-2/3`} />
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Feed Tabs Skeleton ───────────────────────────────────────────────
export function FeedTabsSkeleton() {
  return (
    <div className="flex gap-2">
      <div className={`${S} h-9 w-28 rounded-xl`} />
      <div className={`${S} h-9 w-28 rounded-xl`} />
    </div>
  )
}

// ── Detail Page Skeleton ─────────────────────────────────────────────
export function DetailPageSkeleton() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      <div className="flex flex-col sm:flex-row gap-6">
        <div className={`${S} w-full sm:w-48 aspect-[2/3] rounded-2xl shrink-0`} />
        <div className="flex-1 space-y-3 pt-1">
          <div className={`${S} h-8 w-3/4`} />
          <div className={`${S} h-4 w-1/2`} />
          <div className="flex gap-2 flex-wrap">
            <div className={`${S} h-6 w-16 rounded-full`} />
            <div className={`${S} h-6 w-16 rounded-full`} />
            <div className={`${S} h-6 w-16 rounded-full`} />
          </div>
          <div className={`${S} h-3.5 w-full`} />
          <div className={`${S} h-3.5 w-full`} />
          <div className={`${S} h-3.5 w-5/6`} />
          <div className="flex gap-2 pt-2">
            <div className={`${S} h-9 w-24 rounded-xl`} />
            <div className={`${S} h-9 w-24 rounded-xl`} />
          </div>
        </div>
      </div>
      <div className="space-y-3">
        <div className={`${S} h-5 w-32`} />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border bg-card p-4 space-y-2">
            <div className="flex items-center gap-2">
              <div className={`${S} w-8 h-8 rounded-full`} />
              <div className={`${S} h-3.5 w-28`} />
            </div>
            <div className={`${S} h-3 w-full`} />
            <div className={`${S} h-3 w-4/5`} />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Dashboard Skeleton ───────────────────────────────────────────────
export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border bg-card p-4 space-y-2">
            <div className={`${S} h-4 w-20`} />
            <div className={`${S} h-8 w-16`} />
          </div>
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border bg-card p-4 flex gap-3">
            <div className={`${S} w-12 h-16 rounded-lg shrink-0`} />
            <div className="flex-1 space-y-2 pt-1">
              <div className={`${S} h-4 w-3/4`} />
              <div className={`${S} h-3 w-1/2`} />
              <div className={`${S} h-3 w-1/3`} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Admin Page Skeleton ──────────────────────────────────────────────
export function AdminPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border bg-card p-4 space-y-2">
            <div className={`${S} h-4 w-24`} />
            <div className={`${S} h-8 w-16`} />
            <div className={`${S} h-3 w-20`} />
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="p-4 border-b border-border">
          <div className={`${S} h-5 w-40`} />
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-border last:border-0">
            <div className={`${S} w-10 h-14 rounded-lg shrink-0`} />
            <div className="flex-1 space-y-1.5">
              <div className={`${S} h-3.5 w-1/2`} />
              <div className={`${S} h-3 w-1/3`} />
            </div>
            <div className={`${S} h-6 w-16 rounded-full`} />
            <div className={`${S} h-8 w-20 rounded-xl`} />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── News Page Skeleton ───────────────────────────────────────────────
export function NewsPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className={`${S} w-full h-[240px] sm:h-[320px] rounded-2xl`} />
      <div className="flex gap-2 flex-wrap">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className={`${S} h-8 w-24 rounded-full`} />
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className={`${S} w-full h-40 rounded-none`} />
            <div className="p-4 space-y-2">
              <div className={`${S} h-4 w-3/4`} />
              <div className={`${S} h-3.5 w-full`} />
              <div className={`${S} h-3.5 w-5/6`} />
              <div className={`${S} h-3 w-1/3 mt-2`} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Profile Page Skeleton ────────────────────────────────────────────
export function ProfilePageSkeleton() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row gap-5 items-start">
        <div className={`${S} w-20 h-20 rounded-full shrink-0`} />
        <div className="flex-1 space-y-2.5">
          <div className={`${S} h-6 w-40`} />
          <div className={`${S} h-4 w-28`} />
          <div className={`${S} h-3.5 w-full`} />
          <div className={`${S} h-3.5 w-3/4`} />
          <div className="flex gap-3 pt-1">
            <div className={`${S} h-4 w-20`} />
            <div className={`${S} h-4 w-20`} />
          </div>
        </div>
        <div className={`${S} h-9 w-28 rounded-xl shrink-0`} />
      </div>
      <ComicGridSkeleton count={12} />
    </div>
  )
}

// ── Notifications Skeleton ───────────────────────────────────────────
export function NotificationsSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-border bg-card p-4 flex gap-3">
          <div className={`${S} w-9 h-9 rounded-full shrink-0`} />
          <div className="flex-1 space-y-1.5">
            <div className={`${S} h-3.5 w-3/4`} />
            <div className={`${S} h-3 w-1/2`} />
          </div>
          <div className={`${S} h-3 w-16 shrink-0`} />
        </div>
      ))}
    </div>
  )
}