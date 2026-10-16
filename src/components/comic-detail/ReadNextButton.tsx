'use client'

// src/components/comic-detail/ReadNextButton.tsx
//
// The "Ch. 48 on Webtoon" / "Read on Webtoon" pill in the hero (where Letterboxd
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

  // The label always names the site, so this button ("read it over there")
  // can never be mistaken for the track bar below ("log it here").
  let platform = usable[0]
  let href     = platform.link
  let label    = chapter ? `Continue on ${platform.name}` : `Read on ${platform.name}`

  if (whitelisted) {
    const rewritten = rewriteChapterUrl(whitelisted.link, next)
    if (rewritten) {
      platform = whitelisted
      href     = rewritten
      label    = `Ch. ${next} on ${platform.name}`
    }
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex max-w-full items-center gap-2 h-10 px-4 rounded-full bg-dossier-foreground/10 border border-dossier-foreground/15 text-xs font-semibold uppercase tracking-wider text-dossier-foreground hover:bg-dossier-foreground/15 transition-colors"
    >
      <Play size={13} className="fill-current shrink-0" />
      <span className="truncate">{label}</span>
    </a>
  )
}