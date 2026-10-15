'use client'

// src/components/comic-detail/ReadNextButton.tsx
//
// The "Continue Ch. 48" / "Start reading" pill in the hero (where Letterboxd
// puts its Trailer button). It follows your live chapter, so it updates the
// moment you tap +1. Same safety rules as before: it only ever links to the
// comic's OFFICIAL platforms, and only deep-links to a chapter when the
// platform is on the verified whitelist in chapterParse.ts.

import { Globe, Play } from 'lucide-react'
import { isRewriteWhitelisted, rewriteChapterUrl } from '@/lib/utils/chapterParse'
import { useTracking } from './TrackingProvider'

interface OfficialPlatform {
  name: string
  link: string | null
}

export function ReadNextButton({ officialPlatforms }: { officialPlatforms: OfficialPlatform[] }) {
  const t = useTracking()
  const chapter = t.snapshot.chapter

  const usable = officialPlatforms.filter((p): p is { name: string; link: string } => !!p.link)

  if (usable.length === 0) {
    return (
      <a
        href="#sources"
        className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-dossier-foreground/10 border border-dossier-foreground/10 text-xs font-semibold uppercase tracking-wider text-dossier-foreground/80"
      >
        <Globe size={14} />
        Where to read
      </a>
    )
  }

  const next = (chapter ?? 0) + 1
  const whitelisted = usable.find(p => isRewriteWhitelisted(p.link))

  let href  = usable[0].link
  let label = chapter ? 'Continue' : 'Start reading'

  if (whitelisted) {
    const rewritten = rewriteChapterUrl(whitelisted.link, next)
    if (rewritten) {
      href  = rewritten
      label = `Continue Ch. ${next}`
    }
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-dossier-foreground/10 border border-dossier-foreground/10 text-xs font-semibold uppercase tracking-wider text-dossier-foreground hover:bg-dossier-foreground/15 transition-colors"
    >
      <Play size={13} className="fill-current" />
      {label}
    </a>
  )
}