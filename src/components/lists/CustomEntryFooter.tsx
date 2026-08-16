'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Sparkles, ArrowRight, Loader2, PenLine } from 'lucide-react'

interface Props {
  customEntryId: string
  title: string
  coverUrl: string | null
  isPro: boolean
  onConverted: (recommendationId: string) => void
}

interface MatchInfo {
  recommendation_id: string
  title: string
}

export function CustomEntryFooter({ customEntryId, title, coverUrl, isPro, onConverted }: Props) {
  const [match, setMatch]         = useState<MatchInfo | null | undefined>(undefined) // undefined = still checking
  const [converting, setConverting] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/custom-entries/${customEntryId}/check-match`)
      .then(r => r.json())
      .then(data => { if (!cancelled) setMatch(data.match ?? null) })
      .catch(() => { if (!cancelled) setMatch(null) })
    return () => { cancelled = true }
  }, [customEntryId])

  const handleConvert = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!match || converting) return
    setConverting(true)
    try {
      const res = await fetch(`/api/custom-entries/${customEntryId}/check-match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recommendation_id: match.recommendation_id }),
      })
      if (res.ok) onConverted(match.recommendation_id)
    } finally {
      setConverting(false)
    }
  }

  const submitUrl = (() => {
    const base = isPro
      ? '/pro/reader/dashboard/recommendations/new'
      : '/reader/dashboard/recommendations/new'
    const params = new URLSearchParams({ title })
    if (coverUrl) params.set('cover_url', coverUrl)
    return `${base}?${params.toString()}`
  })()

  // Still checking — render nothing rather than a loading flicker on
  // every row; the match check is fast and this is a low-priority detail.
  if (match === undefined) return null

  if (match) {
    return (
      <div className="flex items-center gap-1.5 text-[11px]" onClick={e => e.stopPropagation()}>
        <Sparkles size={10} className="text-primary shrink-0" />
        <span className="text-muted-foreground">Now in ComPicfy as "{match.title}"</span>
        <button
          type="button"
          onClick={handleConvert}
          disabled={converting}
          className="inline-flex items-center gap-1 text-primary font-medium hover:opacity-70 transition-opacity"
        >
          {converting ? <Loader2 size={10} className="animate-spin" /> : <ArrowRight size={10} />}
          Switch to it
        </button>
      </div>
    )
  }

  return (
    <Link
      href={submitUrl}
      onClick={e => e.stopPropagation()}
      className="inline-flex items-center gap-1 text-[11px] text-muted-foreground/50 hover:text-muted-foreground transition-colors"
    >
      <PenLine size={10} />
      Not in ComPicfy yet — recommend it?
    </Link>
  )
}