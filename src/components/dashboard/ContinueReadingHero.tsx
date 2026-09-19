import Link from 'next/link'

type ReadingItem = {
  id:               string
  progress_chapter: number | null
  source_url?:      string | null // from user_comic_sources — where THEY actually read this comic
  recommendations: {
    id:            string
    title:         string
    cover_url:     string | null
    type:          string | null
    author:        string | null
    description:   string | null
    chapter_count: number | null
  } | null
}

interface Props {
  items:     ReadingItem[]
  listsHref: string // "See more" / "Library" link when there's more than one item in progress
}

function proxyCover(url: string | null) {
  if (!url) return ''
  return `/api/image-proxy?url=${encodeURIComponent(url)}`
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  const cut = text.slice(0, max)
  const lastSpace = cut.lastIndexOf(' ')
  return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut) + '…'
}

export function ContinueReadingHero({ items, listsHref }: Props) {
  const withRecs = items.filter(i => i.recommendations)
  if (withRecs.length === 0) return null

  const [hero, ...rest] = withRecs
  const heroRec = hero.recommendations!
  const heroProgress = hero.progress_chapter ?? 0
  const heroTotal    = heroRec.chapter_count ?? null
  const heroPct      = heroTotal ? Math.min(100, Math.round((heroProgress / heroTotal) * 100)) : null

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground/60">Continue</p>
        <Link href={listsHref} className="text-[11px] uppercase tracking-widest text-muted-foreground/60 hover:text-foreground transition-colors">
          Library
        </Link>
      </div>

      <h2 className="font-dashboard-serif text-2xl mb-3">Where you left off</h2>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <Link href={`/comic/${heroRec.id}`} className="block aspect-[16/10] relative bg-muted">
          {heroRec.cover_url ? (
            <img src={proxyCover(heroRec.cover_url)} alt={heroRec.title} className="absolute inset-0 w-full h-full object-cover" />
          ) : null}
        </Link>

        <div className="p-5 space-y-3">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground/60">
            {[heroRec.type, heroRec.author].filter(Boolean).join(' · ')}
          </p>

          <Link href={`/comic/${heroRec.id}`}>
            <h3 className="font-dashboard-serif text-2xl leading-tight hover:underline">{heroRec.title}</h3>
          </Link>

          {heroRec.description && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {truncate(heroRec.description, 140)}
            </p>
          )}

          <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
            <span>{heroTotal ? `Ch. ${heroProgress} / ${heroTotal}` : `Ch. ${heroProgress}`}</span>
            {heroPct !== null && <span>{heroPct}%</span>}
          </div>

          {heroPct !== null && (
            <div className="h-1 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-foreground/70" style={{ width: `${heroPct}%` }} />
            </div>
          )}

          <div className="flex items-center gap-2 pt-2">
            {hero.source_url ? (
              <a
                href={hero.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 h-9 rounded-full bg-foreground text-background text-sm font-medium flex items-center justify-center hover:opacity-90 transition-opacity"
              >
                Continue reading
              </a>
            ) : (
              <Link
                href={`/comic/${heroRec.id}#reading-sources`}
                className="flex-1 h-9 rounded-full border border-dashed border-border text-sm font-medium flex items-center justify-center hover:border-foreground/40 transition-colors"
              >
                Add reading link
              </Link>
            )}
            <Link
              href={`/comic/${heroRec.id}`}
              className="h-9 px-4 rounded-full border border-border text-sm font-medium flex items-center justify-center hover:border-foreground/30 transition-colors"
            >
              Series
            </Link>
          </div>

          {!hero.source_url && (
            <p className="text-[11px] text-muted-foreground/70 -mt-1">
              No reading link saved for this one yet — add it once for one-tap access next time.
            </p>
          )}
        </div>
      </div>

      {/* Everything else still in progress — compact horizontal strip */}
      {rest.length > 0 && (
        <div className="flex gap-3 overflow-x-auto no-scrollbar mt-3 -mx-1 px-1 snap-x snap-mandatory">
          {rest.map(entry => {
            const rec = entry.recommendations!
            const progress = entry.progress_chapter ?? 0
            const total    = rec.chapter_count ?? null
            const pct      = total ? Math.min(100, Math.round((progress / total) * 100)) : null
            const href     = entry.source_url ? undefined : `/comic/${rec.id}#reading-sources`

            const inner = (
              <>
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-muted shrink-0">
                  {rec.cover_url && <img src={proxyCover(rec.cover_url)} alt={rec.title} className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1 min-w-0 space-y-1.5">
                  {rec.type && (
                    <span className="inline-block text-[10px] uppercase tracking-wider text-muted-foreground/60">{rec.type}</span>
                  )}
                  <p className="text-sm font-medium truncate leading-tight">{rec.title}</p>
                  <p className="text-xs text-muted-foreground">{total ? `Ch. ${progress} / ${total}` : `Ch. ${progress}`}</p>
                  {pct !== null && (
                    <div className="h-1 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-foreground/70" style={{ width: `${pct}%` }} />
                    </div>
                  )}
                  <span className="text-xs font-medium">{entry.source_url ? 'Continue' : 'Add reading link'}</span>
                </div>
              </>
            )

            const className = 'shrink-0 w-64 flex gap-3 p-3 rounded-2xl border border-border bg-card hover:border-foreground/20 transition-colors snap-start'

            return entry.source_url ? (
              <a key={entry.id} href={entry.source_url} target="_blank" rel="noopener noreferrer" className={className}>
                {inner}
              </a>
            ) : (
              <Link key={entry.id} href={href!} className={className}>
                {inner}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}