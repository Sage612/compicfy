import Link from 'next/link'
import { Quote } from 'lucide-react'
import type { QuoteData } from '@/lib/profile/getProfileExtras'

const proxyCover = (url: string | null): string => {
  if (!url) return ''
  if (url.startsWith('/') || url.startsWith('blob:')) return url
  return `/api/image-proxy?url=${encodeURIComponent(url)}`
}

function compact(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, '')}k` : String(n)
}

interface Props {
  quote: QuoteData
}

export function QuoteScrapbook({ quote }: Props) {
  const attribution = [quote.comicTitle, quote.chapterLabel].filter(Boolean).join(' · ')

  return (
    <section className="space-y-2">
      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
        Quote scrapbook
      </p>

      <figure className="relative overflow-hidden rounded-2xl border border-border bg-card">
        {quote.coverUrl && (
          <>
            <img
              src={proxyCover(quote.coverUrl)}
              alt=""
              aria-hidden
              className="absolute inset-0 w-full h-full object-cover opacity-25"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-card via-card/85 to-card/40" />
          </>
        )}

        <div className="relative p-5 sm:p-6 space-y-4">
          <Quote size={26} className="text-primary/70 fill-primary/20" />

          <blockquote className="text-lg sm:text-xl font-bold leading-snug tracking-tight">
            “{quote.text}”
          </blockquote>

          <figcaption className="flex flex-wrap items-center gap-x-3 gap-y-2">
            {attribution && (
              quote.comicId ? (
                <Link href={`/comic/${quote.comicId}`} className="text-xs text-muted-foreground hover:text-primary transition-colors">
                  — {attribution}
                </Link>
              ) : (
                <span className="text-xs text-muted-foreground">— {attribution}</span>
              )
            )}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border bg-background/60 text-[10px] font-semibold">
              Pinned
              {quote.stampCount > 0 && (
                <>
                  <span className="text-muted-foreground">•</span>
                  {compact(quote.stampCount)} stamps
                </>
              )}
            </span>
          </figcaption>
        </div>
      </figure>
    </section>
  )
}