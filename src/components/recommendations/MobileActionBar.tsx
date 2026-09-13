'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  Bookmark, MoreHorizontal, ChevronDown, X, Croissant,
  BookOpen,
  Layers,
} from 'lucide-react'
import { VoteButtons } from '@/components/recommendations/VoteButtons'
import { SaveButton } from '@/components/recommendations/SaveButton'
import { ReadingProgressButton } from '@/components/recommendations/ReadingProgressButton'
import { BakeButton } from '@/components/recommendations/BakeButton'
import { AddToListButton } from '@/components/recommendations/AddToListButton'
import { AddToCollectionButton } from '@/components/collections/AddToCollectionButton'
import { ShareButton } from '@/components/recommendations/ShareButton'
import { ReportButton } from '@/components/recommendations/ReportButton'

interface MobileActionBarProps {
  recommendationId: string
  comicTitle: string
  shareUrl: string
  initialUpvotes: number
  initialDownvotes: number
  initialVote: 'up' | 'down' | null
  initialSaved: boolean
  isLoggedIn: boolean
  userId?: string
  chapterCount?: number | null
  isPro: boolean
}

// Accordion row inside the "more" sheet. Renders the existing action
// component in place when expanded, so nothing inside that component
// needs to change to support this — this is NOT a real drill-in (that
// would need those components to expose a headless trigger/panel split,
// which I haven't seen), just an expand-in-place that gets the same
// "tap a row to see its options" feel without touching their internals.
function SheetRow({
  icon,
  label,
  children,
  isOpen,
  onToggle,
}: {
  icon: React.ReactNode
  label: string
  children: React.ReactNode
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

export function MobileActionBar({
  recommendationId,
  comicTitle,
  shareUrl,
  initialUpvotes,
  initialDownvotes,
  initialVote,
  initialSaved,
  isLoggedIn,
  userId,
  chapterCount,
  isPro,
}: MobileActionBarProps) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [openRow, setOpenRow] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const normalizedChapterCount = chapterCount ?? null

  // Portals need a browser document — guard for SSR.
  useEffect(() => setMounted(true), [])

  const toggleRow = (key: string) =>
    setOpenRow((current) => (current === key ? null : key))

  const bar = (
    <>
      {/* Sticky bar — mobile only. Desktop keeps the existing sidebar
          actionDeck untouched. Portaled to <body> below so that no
          ancestor with transform/filter/will-change (e.g. a page-transition
          wrapper) can hijack this `fixed` positioning — that was the cause
          of the bar not sitting flush. */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-dossier/95 backdrop-blur-md border-t border-dossier-foreground/10 px-4 py-2.5 flex items-center gap-2">
        <div className="flex-1">
          <VoteButtons
            recommendationId={recommendationId}
            initialUpvotes={initialUpvotes}
            initialDownvotes={initialDownvotes}
            initialVote={initialVote}
            isLoggedIn={isLoggedIn}
            comicTitle={comicTitle}
          />
        </div>
        <div className="flex-1">
          <SaveButton
            recommendationId={recommendationId}
            initialSaved={initialSaved}
            isLoggedIn={isLoggedIn}
            comicTitle={comicTitle}
          />
        </div>
        <button
          type="button"
          aria-label="More actions"
          onClick={() => setSheetOpen(true)}
          className="w-11 h-11 shrink-0 rounded-[10px] border border-dossier-foreground/10 flex items-center justify-center"
        >
          <MoreHorizontal size={18} className="text-dossier-foreground/70" />
        </button>
      </div>

      {sheetOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex items-end">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setSheetOpen(false)}
          />
          <div className="relative w-full bg-dossier-panel rounded-t-2xl border-t border-dossier-foreground/10 px-4 pt-2 pb-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between py-2">
              <div className="w-9 h-1 rounded-full bg-dossier-foreground/20 mx-auto" />
              <button
                type="button"
                aria-label="Close"
                onClick={() => setSheetOpen(false)}
                className="absolute right-2 top-2 p-2 text-dossier-foreground/50"
              >
                <X size={16} />
              </button>
            </div>

            {/* Downvote row removed — VoteButtons in the sticky bar above
                already renders both vote directions, so this was a
                duplicate. */}

            <SheetRow
              icon={<BookOpen size={16} className="text-dossier-foreground/50" />}
              label="Reading progress"
              isOpen={openRow === 'progress'}
              onToggle={() => toggleRow('progress')}
            >
              <ReadingProgressButton
                comicId={recommendationId}
                chapterCount={normalizedChapterCount}
                isLoggedIn={isLoggedIn}
              />
            </SheetRow>

            <SheetRow
              icon={<Croissant size={16} className="text-dossier-foreground/50" />}
              label="Let it bake"
              isOpen={openRow === 'bake'}
              onToggle={() => toggleRow('bake')}
            >
              <BakeButton
                comicId={recommendationId}
                chapterCount={normalizedChapterCount}
                isLoggedIn={isLoggedIn}
                isPro={isPro}
              />
            </SheetRow>

            {isLoggedIn && userId && (
              <SheetRow
                icon={<Bookmark size={16} className="text-dossier-foreground/50" />}
                label="Add to list"
                isOpen={openRow === 'list'}
                onToggle={() => toggleRow('list')}
              >
                <AddToListButton recommendationId={recommendationId} userId={userId} />
              </SheetRow>
            )}

            <SheetRow
              icon={<Layers size={16} className="text-dossier-foreground/50" />}
              label="Add to collection"
              isOpen={openRow === 'collection'}
              onToggle={() => toggleRow('collection')}
            >
              <AddToCollectionButton recommendationId={recommendationId} isLoggedIn={isLoggedIn} />
            </SheetRow>

            <div className="grid grid-cols-2 gap-2 pt-3 mt-1 border-t border-dossier-foreground/10">
              <ShareButton title={comicTitle} url={shareUrl} fullWidth />
              <ReportButton
                entityType="recommendation"
                entityId={recommendationId}
                isLoggedIn={isLoggedIn}
                asButton
              />
            </div>
          </div>
        </div>
      )}
    </>
  )

  return mounted ? createPortal(bar, document.body) : null
}