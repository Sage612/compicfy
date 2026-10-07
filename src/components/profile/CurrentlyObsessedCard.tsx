import Link from 'next/link'
import { BookOpen, Flame } from 'lucide-react'
import type { ObsessedData } from '@/lib/profile/getProfileExtras'

const proxyCover = (url: string | null): string => {
  if (!url) return ''
  if (url.startsWith('/') || url.startsWith('blob:')) return url
  return `/api/image-proxy?url=${encodeURIComponent(url)}`
}

interface Props {
  data:              ObsessedData
  currentStreak:     number
  longestStreak:     number
  totalChaptersRead: number
  showGold?:         boolean
}

export function CurrentlyObsessedCard({
  data, currentStreak, longestStreak, totalChaptersRead, showGold = false,
}: Props) {
  const { currentChapter, totalChapters } = data
  const pct = totalChapters && totalChapters > 0
    ? Math.min(100, Math.round((currentChapter / totalChapters) * 100))
    : null
  const left = totalChapters ? Math.max(0, totalChapters - currentChapter) : null
  const accent = showGold ? 'from-amber-400 to-orange-500' : 'from-primary to-primary/60'

  return (
    <section className="relative overflow-hidden rounded-2xl border border-border bg-card">
      {/* Cover as blurred atmosphere */}
      {data.coverUrl && (
        <>
          <img
            src={proxyCover(data.coverUrl)}
            alt=""
            aria-hidden
            className="absolute inset-0 w-full h-full object-cover scale-125 blur-2xl opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-card/40 via-card/80 to-card" />
        </>
      )}

      <div className="relative p-4 sm:p-5 space-y-4">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 animate-ping" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Currently obsessed with
          </p>
        </div>

        <div className="flex gap-4">
          <Link
            href={`/comic/${data.comicId}`}
            className="w-20 sm:w-24 aspect-[2/3] shrink-0 rounded-xl overflow-hidden border border-border bg-muted shadow-lg"
          >
            {data.coverUrl ? (
              <img src={proxyCover(data.coverUrl)} alt={data.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <BookOpen size={20} className="text-muted-foreground opacity-40" />
              </div>
            )}
          </Link>

          <div className="flex-1 min-w-0 flex flex-col justify-center gap-2">
            <div>
              <Link
                href={`/comic/${data.comicId}`}
                className="block text-lg sm:text-xl font-black leading-tight tracking-tight line-clamp-2 hover:text-primary transition-colors"
              >
                {data.title}
              </Link>
              {data.author && <p className="text-xs text-muted-foreground mt-0.5 truncate">{data.author}</p>}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between text-xs">
                <span className="font-bold tabular-nums">
                  Ch. {currentChapter}
                  {totalChapters ? <span className="text-muted-foreground font-medium"> / {totalChapters}</span> : null}
                </span>
                {pct !== null && <span className="text-muted-foreground tabular-nums">{pct}%</span>}
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${accent} transition-all`}
                  style={{ width: `${pct ?? 100}%`, opacity: pct === null ? 0.35 : 1 }}
                />
              </div>
              {left !== null && (
                <p className="text-[11px] text-muted-foreground">
                  {left === 0 ? 'Caught up' : `${left} chapter${left === 1 ? '' : 's'} left`}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Stat tiles — all real data */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-border bg-background/60 px-3 py-2.5">
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Total mileage</p>
            <p className="text-lg font-black tabular-nums leading-tight mt-0.5">{totalChaptersRead.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">chapters read</p>
          </div>
          <div className="rounded-xl border border-border bg-background/60 px-3 py-2.5">
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Streak</p>
            <p className="flex items-center gap-1 text-lg font-black tabular-nums leading-tight mt-0.5">
              <Flame size={15} className={currentStreak > 0 ? 'text-orange-500' : 'text-muted-foreground'} />
              {currentStreak}
            </p>
            <p className="text-[10px] text-muted-foreground">{currentStreak === 1 ? 'day' : 'days'}</p>
          </div>
          <div className="rounded-xl border border-primary/30 bg-primary/5 px-3 py-2.5">
            <p className="text-[9px] font-bold uppercase tracking-widest text-primary">Best streak</p>
            <p className="text-lg font-black tabular-nums leading-tight mt-0.5">{longestStreak}</p>
            <p className="text-[10px] text-muted-foreground">{longestStreak === 1 ? 'day' : 'days'}</p>
          </div>
        </div>
      </div>
    </section>
  )
}