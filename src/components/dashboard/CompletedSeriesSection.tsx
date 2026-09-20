import Link from 'next/link'

type CompletedItem = {
  id: string
  recommendations: {
    id:        string
    title:     string
    cover_url: string | null
    type:      string | null
  } | null
}

interface Props {
  items: CompletedItem[]
}

function proxyCover(url: string | null) {
  if (!url) return ''
  return `/api/image-proxy?url=${encodeURIComponent(url)}`
}

export function CompletedSeriesSection({ items }: Props) {
  const withRecs = items.filter(i => i.recommendations)
  if (withRecs.length === 0) return null

  return (
    <div>
      <p className="text-[11px] uppercase tracking-widest text-muted-foreground/60 mb-1">Closed</p>
      <h2 className="font-dashboard-serif text-xl mb-3">Completed series</h2>

      <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-1 px-1 snap-x snap-mandatory">
        {withRecs.map(item => {
          const rec = item.recommendations!
          return (
            <Link key={item.id} href={`/comic/${rec.id}`} className="shrink-0 w-28 snap-start">
              <div className="aspect-[2/3] rounded-xl overflow-hidden bg-muted mb-1.5">
                {rec.cover_url && <img src={proxyCover(rec.cover_url)} alt={rec.title} className="w-full h-full object-cover" />}
              </div>
              <p className="text-sm font-medium truncate">{rec.title}</p>
              {rec.type && <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60">{rec.type}</p>}
            </Link>
          )
        })}
      </div>
    </div>
  )
}