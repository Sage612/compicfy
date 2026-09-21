'use client'

import { useState, type ReactNode } from 'react'
import { Star, Share2, MoreHorizontal, X } from 'lucide-react'
import { VoteButtons } from '@/components/recommendations/VoteButtons'
import { SaveButton } from '@/components/recommendations/SaveButton'

interface ComicMobileHeroProps {
  recommendationId: string
  title:            string
  coverUrl:         string | null
  typeLabel:        string
  statusLabel:      string
  yearReleased:     number | null
  ratingValue:      number /** e.g. 4.9 — see ratioToStars() in page.tsx */
  upvotePct:        number | null /** e.g. 98 */
  initialUpvotes:   number
  initialDownvotes: number
  initialVote:      'up' | 'down' | null
  initialSaved:     boolean
  isLoggedIn:       boolean
  shareUrl:         string

  /** Rendered as-is inside the "Continue" button slot — pass your
   *  existing <ReadingProgressButton /> here. Its own internal markup
   *  drives the actual click behavior; this component only wraps it
   *  in the mockup's pill container. */
  continueSlot: ReactNode

  /** Rendered inside the "More" sheet, in order. Pass your existing
   *  <AddToListButton />, <AddToCollectionButton />, <BakeButton />
   *  etc. here — same components, this just gives them the mockup's
   *  sheet chrome instead of MobileActionBar's fixed-footer chrome. */
  moreSheetContent: ReactNode
  reportButton:     ReactNode
}

export function ComicMobileHero({
  recommendationId,
  title,
  coverUrl,
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
  moreSheetContent,
  reportButton,
}: ComicMobileHeroProps) {
  const [sheetOpen, setSheetOpen] = useState(false)

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, url: shareUrl })
      } catch {
        /* user cancelled — no-op */
      }
    } else {
      await navigator.clipboard.writeText(shareUrl)
    }
  }

  return (
    <div className="md:hidden -mx-4 px-4">
      {/* Cover */}
      <div className="relative w-full aspect-[3/4] max-h-[52vh] rounded-2xl overflow-hidden bg-dossier-panel">
        {coverUrl ? (
          <img
            src={`/api/image-proxy?url=${encodeURIComponent(coverUrl)}`}
            alt={title}
            className="w-full h-full object-cover"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-dossier via-dossier/10 to-transparent" />
      </div>

      {/* Title + meta */}
      <div className="mt-4 space-y-2">
        <p className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.2em] text-dossier-foreground/50">
          {typeLabel} · {statusLabel}{yearReleased ? ` · ${yearReleased}` : ''}
        </p>
        <h1 className="font-[family-name:var(--font-dossier-display)] text-4xl font-black italic leading-[0.95] tracking-tight text-dossier-foreground">
          {title}
        </h1>

        {upvotePct !== null && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-dossier-foreground/10 bg-dossier-panel/40 text-sm text-dossier-foreground/80">
            <Star size={13} className="fill-dossier-foreground/70 text-dossier-foreground/70" />
            <span className="font-semibold">{ratingValue.toFixed(1)}</span>
            <span className="text-dossier-foreground/40">·</span>
            <span>{upvotePct}% upvoted</span>
          </div>
        )}
      </div>

      {/* Continue button */}
      <div className="mt-4">{continueSlot}</div>

      {/* Icon action row */}
      <div className="mt-4 flex items-center justify-around">
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
        <button
          type="button"
          onClick={handleShare}
          className="flex flex-col items-center gap-1.5 shrink-0"
        >
          <span className="w-11 h-11 rounded-full border border-dossier-foreground/10 text-dossier-foreground/60 flex items-center justify-center">
            <Share2 size={16} />
          </span>
          <span className="text-[11px] text-dossier-foreground/60">Share</span>
        </button>
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="flex flex-col items-center gap-1.5 shrink-0"
        >
          <span className="w-11 h-11 rounded-full border border-dossier-foreground/10 text-dossier-foreground/60 flex items-center justify-center">
            <MoreHorizontal size={16} />
          </span>
          <span className="text-[11px] text-dossier-foreground/60">More</span>
        </button>
      </div>

      {/* More sheet */}
      {sheetOpen && (
        <div className="fixed inset-0 z-40 flex items-end">
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

            <div className="space-y-4">{moreSheetContent}</div>

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