import Link from 'next/link'

type ShelfEntry = {
  id:         string
  name:       string
  kind:       'list' | 'collection'
  itemCount:  number
  covers:     (string | null)[] // up to 3, used for the stacked preview
  href:       string
}

interface Props {
  entries: ShelfEntry[]
  allHref: string
}

function proxyCover(url: string | null) {
  if (!url) return ''
  return `/api/image-proxy?url=${encodeURIComponent(url)}`
}

export function ListsCollectionsShelf({ entries, allHref }: Props) {
  if (entries.length === 0) return null

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground/60">Shelf</p>
        <Link href={allHref} className="text-[11px] uppercase tracking-widest text-muted-foreground/60 hover:text-foreground transition-colors">
          All
        </Link>
      </div>
      <h2 className="font-dashboard-serif text-xl mb-3">Lists & collections</h2>

      <div className="space-y-2">
        {entries.map(entry => (
          <Link
            key={entry.id}
            href={entry.href}
            className="flex items-center gap-3 p-3 rounded-2xl border border-border hover:border-foreground/20 transition-colors"
          >
            <div className="flex -space-x-3 shrink-0">
              {(entry.covers.length > 0 ? entry.covers.slice(0, 3) : [null]).map((cover, i) => (
                <div key={i} className="w-11 h-14 rounded-lg overflow-hidden bg-muted border-2 border-background">
                  {cover && <img src={proxyCover(cover)} alt="" className="w-full h-full object-cover" />}
                </div>
              ))}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{entry.name}</p>
              <p className="text-xs text-muted-foreground capitalize">{entry.kind} · {entry.itemCount} title{entry.itemCount === 1 ? '' : 's'}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}