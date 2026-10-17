// src/components/comic-detail/ComicHero.tsx
//
// The top of the comic page, laid out like Letterboxd's film page:
//   backdrop banner (the comic's banner art, or a blurred cover if it has none)
//   title and credits on the left, a big poster overlapping the banner on the right
//   a read button + chapter count where the trailer button would be
//   a status line, then the synopsis cut off with "···"
//
// Server component. The read button and the "⋮" are small client pieces that
// read the shared tracking state.

import Link from 'next/link'
import { ArrowLeft, BookOpen, Star } from 'lucide-react'
import { BannerMenuButton, BannerShareButton } from './QuickActionButtons'
import { ReadNextButton } from './ReadNextButton'
import { Synopsis } from './Synopsis'

interface Props {
  title:             string
  author:            string | null
  artist:            string | null
  year:              number | null
  typeLabel:         string
  typeBadgeClass:    string
  gradientClass:     string
  statusLabel:       string
  contentRating:     string | null
  coverUrl:          string | null
  bannerUrl:         string | null
  isFeatured:        boolean
  chapterCount:      number | null
  lastChapterAgo:    string | null
  description:       string | null
  officialPlatforms: { name: string; link: string | null }[]
  shareUrl:          string
}

// Long titles get a smaller size so they wrap into a few tidy lines instead of
// a tall, ragged stack next to the poster.
function titleSize(t: string): string {
  const n = t.length
  if (n > 60) return 'text-xl sm:text-2xl md:text-3xl leading-snug'
  if (n > 36) return 'text-2xl sm:text-3xl md:text-4xl leading-tight'
  return 'text-3xl sm:text-4xl md:text-5xl leading-[1.08]'
}

const proxy = (url: string) => `/api/image-proxy?url=${encodeURIComponent(url)}`

export function ComicHero({
  title, author, artist, year, typeLabel, typeBadgeClass, gradientClass, statusLabel,
  contentRating, coverUrl, bannerUrl, isFeatured, chapterCount, lastChapterAgo,
  description, officialPlatforms, shareUrl,
}: Props) {
  const heartbeat = [statusLabel, lastChapterAgo ? `latest chapter ${lastChapterAgo}` : null]
    .filter(Boolean)
    .join(' · ')

  return (
    <header>
      {/* ── Banner ── */}
      <div className="relative h-48 sm:h-60 md:h-72 overflow-hidden">
        {/* The banner image is shown sharp, like a film backdrop. With no banner
            of its own we crop the cover (face area first) instead of blurring it. */}
        {bannerUrl ? (
          <img src={proxy(bannerUrl)} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover" />
        ) : coverUrl ? (
          <img src={proxy(coverUrl)} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover object-[50%_18%]" />
        ) : (
          <div className={`absolute inset-0 bg-gradient-to-br ${gradientClass} opacity-20`} />
        )}
        {/* Dark only where it is needed: a little at the top for the buttons,
            and a fade into the page at the bottom. The middle stays clear. */}
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/50 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-dossier via-dossier/60 to-transparent" />

        <div className="absolute inset-x-0 top-0 flex items-center justify-between px-4 md:px-6 pt-4 z-10">
          <Link
            href="/browse"
            aria-label="Back to browse"
            className="w-9 h-9 rounded-full bg-black/45 backdrop-blur-md text-white/90 flex items-center justify-center hover:bg-black/60 transition-colors"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="flex items-center gap-2">
            <BannerShareButton title={title} url={shareUrl} />
            <BannerMenuButton />
          </div>
        </div>
      </div>

      {/* ── Title + poster ── */}
      <div className="relative max-w-3xl mx-auto px-4 md:px-6">
        <div className="flex items-start gap-4 md:gap-8">
          <div className="flex-1 min-w-0 pt-5 md:pt-8 space-y-3">
            <h1
              className={`font-[family-name:var(--font-dossier-display)] font-bold italic tracking-tight text-dossier-foreground [text-wrap:balance] [overflow-wrap:anywhere] hyphens-auto ${titleSize(title)}`}
              lang="en"
            >
              {title}
            </h1>

            <div className="space-y-0.5 font-[family-name:var(--font-mono)] font-medium text-[11px] md:text-xs uppercase tracking-[0.12em] text-dossier-foreground/72">
              <p>
                {[year, typeLabel].filter(Boolean).join(' · ')}
                {contentRating && contentRating !== 'all_ages'
                  ? <span className="ml-2 px-1.5 py-0.5 rounded border border-dossier-foreground/15 text-[11px] normal-case tracking-normal">{contentRating.replace('_', ' ')}</span>
                  : null}
              </p>
              {author && (
                <p>
                  By <span className="font-bold text-dossier-foreground/80 normal-case tracking-normal text-sm">{author}</span>
                  {artist && artist !== author ? <> · Art <span className="font-bold text-dossier-foreground/80 normal-case tracking-normal text-sm">{artist}</span></> : null}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1">
              <ReadNextButton officialPlatforms={officialPlatforms} />
              {chapterCount ? (
                <span className="text-sm text-dossier-foreground/72 tabular-nums">{chapterCount} chapters</span>
              ) : null}
            </div>
          </div>

          <div className="w-[40%] sm:w-[34%] md:w-56 shrink-0 -mt-20 sm:-mt-24 md:-mt-32 relative">
            <div className="relative aspect-[2/3] rounded-lg overflow-hidden border border-dossier-foreground/15 bg-dossier-panel shadow-[0_20px_50px_-12px_rgba(0,0,0,0.6)]">
              {coverUrl ? (
                <img src={proxy(coverUrl)} alt={`${title} cover`} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <BookOpen size={36} className="text-dossier-foreground/60" />
                </div>
              )}
              <span className={`absolute top-2 left-2 inline-flex px-2 py-0.5 rounded text-[11px] font-bold border capitalize backdrop-blur-sm ${typeBadgeClass}`}>
                {typeLabel}
              </span>
              {isFeatured && (
                <span className="absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 backdrop-blur-sm">
                  <Star size={8} className="fill-amber-400" />
                  Featured
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Status line + synopsis ── */}
        <div className="mt-5 md:mt-6 space-y-3">
          {heartbeat && (
            <p className="font-[family-name:var(--font-mono)] font-medium text-[11px] md:text-xs uppercase tracking-[0.14em] text-dossier-foreground/72">
              {heartbeat}
            </p>
          )}
          {description && <Synopsis text={description} />}
        </div>
      </div>
    </header>
  )
}