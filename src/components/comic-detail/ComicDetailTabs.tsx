'use client'

import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import { Globe, ExternalLink, ThumbsUp, ThumbsDown } from 'lucide-react'
import { resolvePlatformIcon } from '@/lib/utils/platformIcons'

type TabKey = 'overview' | 'sources' | 'community'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'sources', label: 'Sources' },
  { key: 'community', label: 'Community' },
]

interface OfficialPlatform {
  name: string
  link: string | null
}

interface ComicDetailTabsProps {
  /** Plain description text (rec.description) */
  description: string | null
  /** Optional curator-style pull quote (rec.why_recommend) */
  whyRecommend: string | null
  /** rec.official_platforms zipped with rec.official_links */
  officialPlatforms: OfficialPlatform[]
  /** Vote counts, for the Community tab's vote-split bar */
  upvotes: number
  downvotes: number
  /** Metadata pill row, e.g. ["Manhwa", "Ongoing", "Teen 13+", "98 ch. · 2 days ago"] */
  metaBadges: string[]
  /** rec.genres — rendered as solid pills above the (dashed) trope/mood tags */
  genres: string[]

  /** Slots — pre-rendered by the server component (page.tsx) so this
   *  client component never needs the data-fetching logic behind them. */
  tagList: ReactNode
  moreInfo: ReactNode
  personalSources: ReactNode /** MyReadingSources */
  reviewSection: ReactNode /** ReviewSection */
  nextReads: ReactNode /** SimilarComics */
  contextualOffers?: ReactNode
  submitOwnButton?: ReactNode
  recommenderCard?: ReactNode /** optional — desktop sidebar equivalent content, if you want it inside Overview on mobile */
}

export function ComicDetailTabs({
  description,
  whyRecommend,
  officialPlatforms,
  upvotes,
  downvotes,
  metaBadges,
  genres,
  tagList,
  moreInfo,
  personalSources,
  reviewSection,
  nextReads,
  contextualOffers,
  submitOwnButton,
  recommenderCard,
}: ComicDetailTabsProps) {
  const [active, setActive] = useState<TabKey>('overview')

  const totalVotes = upvotes + downvotes
  const upPct = totalVotes > 0 ? Math.round((upvotes / totalVotes) * 100) : null

  return (
    <div className="space-y-5">
      {/* Tab bar */}
      <div className="flex items-center gap-6 border-b border-dossier-foreground/10">
        {TABS.map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActive(tab.key)}
            className={`relative pb-3 font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.2em] transition-colors ${
              active === tab.key
                ? 'text-dossier-foreground'
                : 'text-dossier-foreground/40 hover:text-dossier-foreground/70'
            }`}
          >
            {tab.label}
            {active === tab.key && (
              <span className="absolute left-0 right-0 -bottom-px h-px bg-dossier-foreground" />
            )}
          </button>
        ))}
      </div>

      {/* Overview */}
      {active === 'overview' && (
        <div className="space-y-6">
          {whyRecommend && (
            <div className="rounded-2xl border border-dossier-foreground/10 bg-dossier-panel/40 p-5 md:p-6">
              <p className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.2em] text-dossier-foreground/40 mb-3">
                Curator&rsquo;s Note
              </p>
              <p className="font-[family-name:var(--font-dossier-display)] italic text-lg leading-snug text-dossier-foreground/85">
                &ldquo;{whyRecommend}&rdquo;
              </p>
            </div>
          )}

          {description && (
            <div className="rounded-2xl border border-dossier-foreground/10 bg-dossier-panel/30 p-5 md:p-6">
              <p className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.2em] text-dossier-foreground/40 mb-3">
                Synopsis
              </p>
              <p className="text-[15px] leading-relaxed text-dossier-foreground/75 max-w-prose">
                {description}
              </p>
            </div>
          )}

          {metaBadges.length > 0 && (
            <div className="space-y-2">
              <p className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.2em] text-dossier-foreground/40">
                Metadata
              </p>
              <div className="flex flex-wrap gap-1.5">
                {metaBadges.map(badge => (
                  <span
                    key={badge}
                    className="px-2.5 py-1 rounded-full text-[11px] font-medium border border-dossier-foreground/10 text-dossier-foreground/60"
                  >
                    {badge}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <p className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.2em] text-dossier-foreground/40">
              Genres &amp; Tags
            </p>
            {genres.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {genres.map(genre => (
                  <span
                    key={genre}
                    className="px-2.5 py-1 rounded-full text-[11px] font-medium border border-dossier-foreground/10 text-dossier-foreground/60"
                  >
                    {genre}
                  </span>
                ))}
              </div>
            )}
            {tagList}
          </div>

          {moreInfo}

          {recommenderCard}

          {submitOwnButton && (
            <div className="rounded-2xl border border-dashed border-dossier-foreground/15 bg-dossier-panel/20 p-5 md:p-6">
              {submitOwnButton}
            </div>
          )}

          {contextualOffers}

          <section className="pt-2 border-t border-dossier-foreground/10 space-y-4">
            <h2 className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.2em] text-dossier-foreground/40">
              Next Reads
            </h2>
            {nextReads}
          </section>
        </div>
      )}

      {/* Sources */}
      {active === 'sources' && (
        <div className="space-y-6">
          {officialPlatforms.length > 0 && (
            <div className="space-y-2">
              <p className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.2em] text-dossier-foreground/40">
                Official Platforms
              </p>
              <div className="space-y-2">
                {officialPlatforms.map(platform => {
                  const icon = resolvePlatformIcon(platform.name)
                  return (
                    <div
                      key={platform.name}
                      className="flex items-center justify-between gap-3 rounded-xl border border-dossier-foreground/10 bg-dossier-panel/30 px-4 py-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-dossier-panel border border-dossier-foreground/10">
                          {icon.kind === 'svg' ? (
                            <svg viewBox="0 0 24 24" width={14} height={14} aria-hidden="true">
                              <path d={icon.path} fill={icon.hex} />
                            </svg>
                          ) : icon.kind === 'monogram' ? (
                            <span
                              className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold"
                              style={{ background: icon.bg, color: icon.fg }}
                              aria-hidden="true"
                            >
                              {icon.letter}
                            </span>
                          ) : (
                            <Globe size={14} className="text-dossier-foreground/40" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-dossier-foreground truncate">
                            {platform.name}
                          </p>
                          <p className="text-[11px] text-dossier-foreground/40">Official</p>
                        </div>
                      </div>
                      {platform.link && (
                        <a
                          href={platform.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-dossier-foreground text-dossier text-xs font-semibold hover:opacity-90 transition-opacity"
                        >
                          Read
                          <ExternalLink size={11} />
                        </a>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <p className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.2em] text-dossier-foreground/40">
              Your Reading Sources
            </p>
            <p className="text-[11px] text-dossier-foreground/40 -mt-1">
              Personal links you&rsquo;ve saved. Prefer official platforms above when you can.
            </p>
            {personalSources}
          </div>
        </div>
      )}

      {/* Community */}
      {active === 'community' && (
        <div className="space-y-6">
          {totalVotes > 0 && (
            <div className="rounded-2xl border border-dossier-foreground/10 bg-dossier-panel/40 p-5 md:p-6 space-y-3">
              <p className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.2em] text-dossier-foreground/40">
                Vote Split
              </p>
              <div className="flex items-end justify-between">
                <p className="font-[family-name:var(--font-dossier-display)] text-5xl font-black italic text-dossier-foreground">
                  {upPct}%
                </p>
                <p className="font-[family-name:var(--font-mono)] text-xs text-dossier-foreground/40 flex items-center gap-1.5">
                  <ThumbsUp size={11} className="text-dossier-foreground/30" />
                  {upvotes.toLocaleString()} up
                  <span className="mx-0.5">·</span>
                  <ThumbsDown size={11} className="text-dossier-foreground/30" />
                  {downvotes.toLocaleString()} down
                </p>
              </div>
              <div className="h-1.5 rounded-full bg-dossier-foreground/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-dossier-foreground"
                  style={{ width: `${upPct}%` }}
                />
              </div>
            </div>
          )}

          {reviewSection}
        </div>
      )}
    </div>
  )
}