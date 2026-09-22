'use client'

import { useState, useEffect } from 'react'
import { Play, Loader2 } from 'lucide-react'
import { isRewriteWhitelisted, rewriteChapterUrl } from '@/lib/utils/chapterParse'

interface OfficialPlatform {
  name: string
  link: string | null
}

interface Props {
  comicId:           string
  isLoggedIn:        boolean
  officialPlatforms: OfficialPlatform[]
}

/**
 * "Continue" button for the mobile hero. Reads the user's current
 * chapter from the same /api/reading-progress/{comicId} endpoint
 * ReadingProgressButton uses (never a personal/reading-source link —
 * those can point at unofficial mirrors). If an official platform's
 * domain is on the verified rewrite whitelist (chapterParse.ts) AND its
 * stored link already contains a chapter-shaped URL segment, the button
 * deep-links straight to the next chapter. Otherwise it falls back to
 * that platform's plain page — never guesses a chapter URL that hasn't
 * been verified.
 */
export function ContinueReadingButton({ comicId, isLoggedIn, officialPlatforms }: Props) {
  const [loading, setLoading] = useState(isLoggedIn)
  const [progressChapter, setProgressChapter] = useState<number | null>(null)

  useEffect(() => {
    if (!isLoggedIn) { setLoading(false); return }
    let cancelled = false

    fetch(`/api/reading-progress/${comicId}`)
      .then(res => res.json())
      .then(data => {
        if (!cancelled) setProgressChapter(data?.progress?.progress_chapter ?? null)
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [comicId, isLoggedIn])

  const usableLinks = officialPlatforms.filter(
    (p): p is { name: string; link: string } => !!p.link
  )

  if (usableLinks.length === 0) return null

  if (loading) {
    return <div className="w-full h-11 rounded-xl bg-dossier-foreground/10 animate-pulse" />
  }

  const nextChapter = (progressChapter ?? 0) + 1
  const whitelistedLink = usableLinks.find(p => isRewriteWhitelisted(p.link))

  let href = usableLinks[0].link
  let label = progressChapter != null ? 'Continue Reading' : 'Start Reading'

  if (whitelistedLink) {
    const rewritten = rewriteChapterUrl(whitelistedLink.link, nextChapter)
    if (rewritten) {
      href = rewritten
      label = `Continue Ch. ${nextChapter}`
    }
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="w-full h-11 rounded-xl bg-dossier-foreground text-dossier flex items-center justify-center gap-2 text-sm font-[family-name:var(--font-dossier-display)] italic font-semibold"
    >
      <Play size={14} className="fill-dossier" />
      {label}
    </a>
  )
}