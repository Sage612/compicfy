'use client'

import { useState, useRef, useEffect, cloneElement, isValidElement, type ReactNode } from 'react'
import { Star, Share2, MoreHorizontal, X, Globe, ExternalLink, ThumbsUp, ThumbsDown, ChevronDown } from 'lucide-react'
import { VoteButtons } from '@/components/recommendations/VoteButtons'
import { SaveButton } from '@/components/recommendations/SaveButton'
import { QuickRatingCard } from '@/components/comic-detail/QuickRatingCard'
import { resolvePlatformIcon } from '@/lib/utils/platformIcons'

type TabKey = 'overview' | 'sources' | 'community'

// Click-to-expand row for the "More" sheet — matches the original
// MobileActionBar's SheetRow: tapping a row reveals that item's actual
// component in place, instead of every item's full UI rendering open
// simultaneously.
function SheetRow({
  icon,
  label,
  children,
  isOpen,
  onToggle,
}: {
  icon: ReactNode
  label: string
  children: ReactNode
  isOpen: boolean
  onToggle: () => void
}) {
  return (
    <div className="border-b border-dossier-foreground/10 last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-3 px-1 py-3 text-left"
      >
        <span className="flex items-center gap-3 text-sm text-dossier-foreground">
          {icon}
          {label}
        </span>
        <ChevronDown
          size={16}
          className={`text-dossier-foreground/40 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      {isOpen && <div className="pb-3 pl-1">{children}</div>}
    </div>
  )
}

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
  recommendationId: string
  title:            string
  coverUrl:         string | null
  isFeatured?:      boolean
  typeLabel:        string
  statusLabel:      string
  yearReleased:     number | null
  ratingValue:      number
  upvotePct:        number | null
  initialUpvotes:   number
  initialDownvotes: number
  initialVote:      'up' | 'down' | null
  initialSaved:     boolean
  isLoggedIn:       boolean
  shareUrl:         string

  continueSlot: ReactNode | null
  hasOfficialSource: boolean
  existingRating:    number | null

  downvoteSlot:     ReactNode
  moreSheetRows:    { key: string; icon: ReactNode; label: string; content: ReactNode }[]
  reportButton:     ReactNode

  description:       string | null
  whyRecommend:      string | null
  officialPlatforms: OfficialPlatform[]
  upvotes:           number
  downvotes:         number
  metaBadges:        string[]

  tagList:          ReactNode
  moreInfo:         ReactNode
  personalSources:  ReactNode
  reviewSection:    ReactNode
  nextReads:        ReactNode
  contextualOffers?: ReactNode
  submitOwnButton?:  ReactNode
  recommenderCard?:  ReactNode
}

export function ComicDetailTabs({
  recommendationId,
  title,
  coverUrl,
  isFeatured = false,
  typeLabel,
  statusLabel,
  yearReleased,
  ratingValue,
  upvotePct,
  initialUpvotes,
  initialDownvotes,
  initialVote,
  initialSaved,
  isLoggedIn,
  shareUrl,
  continueSlot,
  hasOfficialSource,
  existingRating,
  downvoteSlot,
  moreSheetRows,
  reportButton,
  description,
  whyRecommend,
  officialPlatforms,
  upvotes,
  downvotes,
  metaBadges,
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
  const [sheetOpen, setSheetOpen] = useState(false)
  const [openRow, setOpenRow] = useState<string | null>(null)
  const [reviewsRefreshKey, setReviewsRefreshKey] = useState(0)
  const [reviewsExpanded, setReviewsExpanded] = useState(false)
  const tabBarRef = useRef<HTMLDivElement>(null)

  const totalVotes = upvotes + downvotes
  const upPct = totalVotes > 0 ? Math.round((upvotes / totalVotes) * 100) : null

  const readAheadPlatform = officialPlatforms.find(
    p => p.link && p.name.toLowerCase().includes('webtoon')
  )

  const jumpToSources = () => {
    setActive('sources')
    tabBarRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handleShare = async () => {
    if (typeof navigator !== 'undefined' && (navigator as any).share) {
      try {
        await (navigator as any).share({ title, url: shareUrl })
      } catch {
        /* user cancelled */
      }
    } else if (typeof navigator !== 'undefined') {
      await navigator.clipboard.writeText(shareUrl)
    }
  }

  return (
    <div className="md:hidden">
      {/* Hero — scrolls away normally */}
      <div className="-mx-4 px-4">
        <div className="flex items-start gap-4">
          <div className="relative w-[34%] shrink-0 aspect-[3/4] rounded-xl overflow-hidden bg-dossier-panel shadow-[0_16px_40px_-12px_rgba(0,0,0,0.5)]">
            {coverUrl ? (
              <img
                src={`/api/image-proxy?url=${encodeURIComponent(coverUrl)}`}
                alt={title}
                className="w-full h-full object-cover"
              />
            ) : null}
            {isFeatured && (
              <span className="absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-dossier/80 text-dossier-foreground backdrop-blur-sm">
                <Star size={9} className="fill-dossier-foreground" />
                Featured
              </span>
            )}
          </div>

          <div className="flex-1 min-w-0 pt-1 space-y-2">
            <h1 className="font-[family-name:var(--font-dossier-display)] text-3xl font-black italic leading-[1.1] tracking-tight text-dossier-foreground">
              {title}
            </h1>
            <p className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.08em] text-dossier-foreground/70 truncate">
              {typeLabel} · {statusLabel}{yearReleased ? ` · ${yearReleased}` : ''}
            </p>

            {upvotePct !== null && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-dossier-foreground/10 bg-dossier-panel/40 text-sm text-dossier-foreground/80">
                <Star size={13} className="fill-dossier-foreground/70 text-dossier-foreground/70" />
                <span className="font-semibold">{ratingValue.toFixed(1)}</span>
                <span className="text-dossier-foreground/40">·</span>
                <span>{upvotePct}% upvoted</span>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4">
          {hasOfficialSource && continueSlot ? (
            continueSlot
          ) : (
            <button
              type="button"
              onClick={jumpToSources}
              className="w-full h-11 rounded-xl border border-dossier-foreground/15 text-sm font-semibold text-dossier-foreground/80 flex items-center justify-center gap-2"
            >
              <Globe size={14} />
              Find where to read
            </button>
          )}
        </div>

      </div>

      {/* Icon row + tab bar — plain in-flow, no pinning/sticky. */}
      <div
        ref={tabBarRef}
        className="-mx-4 px-4 mt-4 bg-dossier/95 border-b border-dossier-foreground/10"
      >
        <div className="flex items-center justify-around py-3">
          <SaveButton
            recommendationId={recommendationId}
            initialSaved={initialSaved}
            isLoggedIn={isLoggedIn}
            comicTitle={title}
            variant="icon"
          />
          <VoteButtons
            recommendationId={recommendationId}
            initialUpvotes={initialUpvotes}
            initialDownvotes={initialDownvotes}
            initialVote={initialVote}
            isLoggedIn={isLoggedIn}
            comicTitle={title}
            variant="icon"
            mode="up"
          />
          <button type="button" onClick={handleShare} className="flex flex-col items-center gap-1.5 shrink-0">
            <span className="w-11 h-11 rounded-full border border-dossier-foreground/10 text-dossier-foreground/60 flex items-center justify-center">
              <Share2 size={16} />
            </span>
            <span className="text-[11px] text-dossier-foreground/60">Share</span>
          </button>
          <button type="button" onClick={() => setSheetOpen(true)} className="flex flex-col items-center gap-1.5 shrink-0">
            <span className="w-11 h-11 rounded-full border border-dossier-foreground/10 text-dossier-foreground/60 flex items-center justify-center">
              <MoreHorizontal size={16} />
            </span>
            <span className="text-[11px] text-dossier-foreground/60">More</span>
          </button>
        </div>

        <div className="flex items-center justify-center gap-6">
          {TABS.map(tab => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActive(tab.key)}
              className={`relative pb-3 font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.2em] transition-colors ${
                active === tab.key
                  ? 'text-dossier-foreground'
                  : 'text-dossier-foreground/40'
              }`}
            >
              {tab.label}
              {active === tab.key && (
                <span className="absolute left-0 right-0 -bottom-px h-px bg-dossier-foreground" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="pt-5 space-y-6">
        {active === 'overview' && (
          <div className="space-y-6">
            {whyRecommend && (
              <div className="rounded-2xl border border-dossier-foreground/10 bg-dossier-panel/40 p-5">
                <p className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.2em] text-dossier-foreground/40 mb-3">
                  Curator&rsquo;s Note
                </p>
                <p className="font-[family-name:var(--font-dossier-display)] italic text-lg leading-snug text-dossier-foreground/85">
                  &ldquo;{whyRecommend}&rdquo;
                </p>
              </div>
            )}

            {description && (
              <div className="rounded-2xl border border-dossier-foreground/10 bg-dossier-panel/30 p-5">
                <p className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.2em] text-dossier-foreground/40 mb-3">
                  Synopsis
                </p>
                <p className="text-[15px] leading-relaxed text-dossier-foreground/75">
                  {description}
                </p>
              </div>
            )}

            {metaBadges.length > 0 && (
              <div className="space-y-2">
                <p className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.2em] text-dossier-foreground/40">
                  Metadata
                </p>
                <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-4 px-4">
                  {metaBadges.map(badge => (
                    <span
                      key={badge}
                      className="shrink-0 whitespace-nowrap px-2.5 py-1 rounded-full text-[11px] font-medium border border-dossier-foreground/10 text-dossier-foreground/60"
                    >
                      {badge}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {tagList}

            {moreInfo}

            {recommenderCard}

            {readAheadPlatform && (
              <div className="rounded-2xl border border-dashed border-dossier-foreground/15 bg-dossier-panel/20 p-5 space-y-2">
                <p className="font-[family-name:var(--font-dossier-display)] italic text-lg font-semibold text-dossier-foreground">
                  Read ahead on {readAheadPlatform.name}
                </p>
                <p className="text-sm text-dossier-foreground/60">
                  Get early access to upcoming chapters with {readAheadPlatform.name}&rsquo;s fast-pass system.
                </p>
                <a
                  href={readAheadPlatform.link ?? undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center px-4 h-9 rounded-xl border border-dossier-foreground/15 text-sm font-semibold text-dossier-foreground/80"
                >
                  Open {readAheadPlatform.name}
                </a>
              </div>
            )}

            {submitOwnButton && (
              <div className="rounded-2xl border border-dashed border-dossier-foreground/15 bg-dossier-panel/20 p-5">
                {submitOwnButton}
              </div>
            )}

            {contextualOffers}
          </div>
        )}

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

        {active === 'community' && (
          <div className="space-y-6">
            {totalVotes > 0 && (
              <div className="rounded-2xl border border-dossier-foreground/10 bg-dossier-panel/40 p-5 space-y-3">
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
                  <div className="h-full rounded-full bg-dossier-foreground" style={{ width: `${upPct}%` }} />
                </div>
              </div>
            )}

            <QuickRatingCard
              recommendationId={recommendationId}
              isLoggedIn={isLoggedIn}
              initialRating={existingRating}
              onSubmitted={() => setReviewsRefreshKey(k => k + 1)}
            />

            <div className="relative">
              <div className={reviewsExpanded ? '' : 'max-h-[420px] overflow-hidden'}>
                {isValidElement(reviewSection)
                  ? cloneElement(reviewSection as React.ReactElement<any>, { key: reviewsRefreshKey })
                  : reviewSection}
              </div>
              {!reviewsExpanded && (
                <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-dossier to-transparent pointer-events-none" />
              )}
            </div>

            {!reviewsExpanded && (
              <button
                type="button"
                onClick={() => setReviewsExpanded(true)}
                className="w-full h-10 rounded-xl border border-dossier-foreground/15 text-sm font-semibold text-dossier-foreground/80"
              >
                Load more reviews
              </button>
            )}

            <section className="pt-2 border-t border-dossier-foreground/10 space-y-4">
              <h2 className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.2em] text-dossier-foreground/40">
                Next Reads
              </h2>
              {nextReads}
            </section>
          </div>
        )}
      </div>

      {/* More sheet */}
      {sheetOpen && (
        <div className="fixed inset-0 z-[60] flex items-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSheetOpen(false)} />
          <div className="relative w-full bg-dossier-panel rounded-t-2xl border-t border-dossier-foreground/10 px-5 pt-3 pb-6 max-h-[85vh] overflow-y-auto">
            <div className="w-9 h-1 rounded-full bg-dossier-foreground/20 mx-auto mb-4" />
            <button
              type="button"
              aria-label="Close"
              onClick={() => setSheetOpen(false)}
              className="absolute right-4 top-4 p-1 text-dossier-foreground/50"
            >
              <X size={16} />
            </button>

            <p className="font-[family-name:var(--font-dossier-display)] italic text-xl font-black text-dossier-foreground">
              More for this title
            </p>
            <p className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.2em] text-dossier-foreground/40 mt-1 mb-5">
              {title}
            </p>

            <div className="space-y-1">
              {downvoteSlot}
              {moreSheetRows.map(row => (
                <SheetRow
                  key={row.key}
                  icon={row.icon}
                  label={row.label}
                  isOpen={openRow === row.key}
                  onToggle={() => setOpenRow(current => (current === row.key ? null : row.key))}
                >
                  {row.content}
                </SheetRow>
              ))}
            </div>

            <div className="mt-5 pt-4 border-t border-dossier-foreground/10 text-destructive text-sm">
              {reportButton}
            </div>

            <button
              type="button"
              onClick={() => setSheetOpen(false)}
              className="w-full mt-5 text-center text-sm text-dossier-foreground/50 py-2"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}