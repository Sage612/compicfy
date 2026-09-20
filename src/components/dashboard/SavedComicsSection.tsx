import Link from 'next/link'
import { Bookmark } from 'lucide-react'

type SavedItem = {
  id: string
  recommendations: {
    id:            string
    title:         string
    cover_url:     string | null
    type:          string | null
    chapter_count: number | null
  } | null
}

interface Props {
  items:   SavedItem[]
  allHref: string
}

function proxyCover(url: string | null) {
  if (!url) return ''
  return `/api/image-proxy?url=${encodeURIComponent(url)}`
}

export function SavedComicsSection({ items, allHref }: Props) {
  const withRecs = items.filter(i => i.recommendations)
  if (withRecs.length === 0) return null

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground/60">On deck</p>
        <Link href={allHref} className="text-[11px] uppercase tracking-widest text-muted-foreground/60 hover:text-foreground transition-colors">
          Saved
        </Link>
      </div>
      <h2 className="font-dashboard-serif text-xl mb-3">Saved comics</h2>

      <div className="grid grid-cols-3 gap-3">
        {withRecs.map(item => {
          const rec = item.recommendations!
          return (
            <Link key={item.id} href={`/comic/${rec.id}`} className="group">
              <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-muted mb-1.5">
                {rec.cover_url ? (
                  <img src={proxyCover(rec.cover_url)} alt={rec.title} className="w-full h-full object-cover" />
                ) : null}
                <div className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center">
                  <Bookmark size={11} className="fill-foreground text-foreground" />
                </div>
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