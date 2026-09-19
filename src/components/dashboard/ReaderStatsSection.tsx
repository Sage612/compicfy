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
  savedHref:   string
  listsHref:   string
  reviewsHref: string
}

function Stat({ icon: Icon, label, value, sub, href }: {
  icon: React.ElementType
  label: string
  value: string
  sub?: string
  href?: string
}) {
  const content = (
    <div className="flex items-center gap-3 py-3">
      <Icon size={15} className="text-muted-foreground/50 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground/60">{label}</p>
        <p className="text-lg font-medium tabular-nums leading-tight">{value}</p>
      </div>
      {sub && <p className="text-xs text-muted-foreground shrink-0">{sub}</p>}
    </div>
  )
  return href ? <Link href={href} className="hover:opacity-70 transition-opacity">{content}</Link> : content
}

export function ReaderStatsSection({
  savedCount, listsCount, reviewCount, allTimeChapters, monthlyChapters,
  lastMonthChapters, completedCount, savedHref, listsHref, reviewsHref,
}: Props) {
  const delta = monthlyChapters - lastMonthChapters
  const deltaPct = lastMonthChapters > 0 ? Math.round((delta / lastMonthChapters) * 100) : null
  const monthlySub = deltaPct === null ? undefined : `${deltaPct >= 0 ? '+' : ''}${deltaPct}% vs last month`

  return (
    <div>
      <h2 className="font-dashboard-serif text-xl mb-1">Reader stats</h2>
      <div className="divide-y divide-border">
        <Stat icon={BookOpen}      label="All-time reads"  value={`${allTimeChapters.toLocaleString()} ch.`} />
        <Stat icon={Flame}         label="This month"      value={`${monthlyChapters} ch.`} sub={monthlySub} />
        <Stat icon={CheckCircle2}  label="Completed"       value={`${completedCount} series`} />
        <Stat icon={Bookmark}      label="Saved comics"    value={String(savedCount)}  href={savedHref} />
        <Stat icon={BookMarked}    label="Reading lists"   value={String(listsCount)}  href={listsHref} />
        <Stat icon={Star}          label="Reviews written" value={String(reviewCount)} href={reviewsHref} />
      </div>
    </div>
  )
}