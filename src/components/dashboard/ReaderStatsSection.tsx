import Link from 'next/link'
import { Flame, BookOpen, Bookmark, BookMarked, Star, CheckCircle2 } from 'lucide-react'

interface Props {
  savedCount:        number
  listsCount:        number
  reviewCount:       number
  allTimeChapters:   number
  monthlyChapters:   number
  lastMonthChapters: number
  completedCount:    number
  currentStreak:     number
  savedHref:   string
  listsHref:   string
  reviewsHref: string
}

function StatCard({ icon: Icon, label, value, sub }: {
  icon: React.ElementType
  label: string
  value: string
  sub?: string
}) {
  return (
    <div className="rounded-2xl border border-border p-4 space-y-2">
      <div className="flex items-center gap-1.5 text-muted-foreground/60">
        <Icon size={14} />
        <span className="text-xs">{label}</span>
      </div>
      <p className="text-2xl font-medium tabular-nums leading-none">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  )
}

export function ReaderStatsSection({
  savedCount, listsCount, reviewCount, allTimeChapters, monthlyChapters,
  lastMonthChapters, completedCount, currentStreak,
  savedHref, listsHref, reviewsHref,
}: Props) {
  const delta = monthlyChapters - lastMonthChapters
  const deltaPct = lastMonthChapters > 0 ? Math.round((delta / lastMonthChapters) * 100) : null
  const monthlySub = deltaPct === null ? undefined : `${deltaPct >= 0 ? '+' : ''}${deltaPct}% vs last month`

  return (
    <div>
      <h2 className="font-dashboard-serif text-xl mb-3">Reader stats</h2>

      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={Flame}        label="Streak"          value={`${currentStreak}`} sub={currentStreak === 1 ? '1 day in a row' : `${currentStreak} days in a row`} />
        <StatCard icon={BookOpen}     label="This month"      value={String(monthlyChapters)} sub={monthlySub} />
        <StatCard icon={BookOpen}     label="All time"        value={allTimeChapters.toLocaleString()} sub="chapters read" />
        <StatCard icon={CheckCircle2} label="Completed"       value={String(completedCount)} sub="series closed" />

        <Link href={savedHref}>
          <StatCard icon={Bookmark}   label="Saved comics"    value={String(savedCount)} />
        </Link>
        <Link href={listsHref}>
          <StatCard icon={BookMarked} label="Reading lists"   value={String(listsCount)} />
        </Link>
        <Link href={reviewsHref} className="col-span-2">
          <StatCard icon={Star}       label="Reviews written" value={String(reviewCount)} />
        </Link>
      </div>
    </div>
  )
}