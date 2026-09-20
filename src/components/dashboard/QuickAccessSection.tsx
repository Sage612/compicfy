import Link from 'next/link'
import { LayoutList, BookMarked, Flame, ChevronRight } from 'lucide-react'

interface Props {
  feedHref:   string
  listsHref:  string
  browseHref: string
}

export function QuickAccessSection({ feedHref, listsHref, browseHref }: Props) {
  const items = [
    { href: feedHref,   icon: LayoutList, label: 'Following feed', desc: 'Latest from people you follow'  },
    { href: listsHref,  icon: BookMarked, label: 'Reading lists',  desc: 'Manage your reading collection' },
    { href: browseHref, icon: Flame,      label: 'Browse comics',  desc: 'Discover new recommendations'   },
  ]

  return (
    <div>
      <h2 className="font-dashboard-serif text-xl mb-1">Lists & collections</h2>
      <div className="divide-y divide-border">
        {items.map(({ href, icon: Icon, label, desc }) => (
          <Link key={href} href={href} className="flex items-center gap-3 py-3 hover:opacity-70 transition-opacity">
            <Icon size={15} className="text-muted-foreground/50 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{label}</p>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
            <ChevronRight size={14} className="text-muted-foreground/30 shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  )
}