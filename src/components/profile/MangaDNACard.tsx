'use client'

import { useState } from 'react'
import { Share2, Check, Crown } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  username:    string
  displayName: string
  avatarUrl:   string | null
  genres:      string[]
  isPro:       boolean
  isOwner:     boolean
}

// ── Genre colour map ──────────────────────────────────────────────
const GENRE_COLORS: Record<string, string> = {
  Action:          '#ef4444',
  Adventure:       '#f97316',
  Comedy:          '#eab308',
  Drama:           '#ea580c',
  Fantasy:         '#8b5cf6',
  Horror:          '#6b7280',
  Mystery:         '#64748b',
  Romance:         '#ec4899',
  'Sci-Fi':        '#06b6d4',
  'Slice of Life': '#10b981',
  Sports:          '#f59e0b',
  Supernatural:    '#a855f7',
  Thriller:        '#dc2626',
  Isekai:          '#6366f1',
  'Martial Arts':  '#e11d48',
  'School Life':   '#0ea5e9',
  Historical:      '#78716c',
  Psychological:   '#d946ef',
  Shounen:         '#3b82f6',
  Shoujo:          '#f472b6',
  Seinen:          '#71717a',
  Josei:           '#fb7185',
  Yuri:            '#c084fc',
  Yaoi:            '#818cf8',
  Mecha:           '#14b8a6',
}

const DEFAULT_COLOR = '#7c3aed'

function computeGenreDistribution(genres: string[]): { name: string; pct: number; color: string }[] {
  if (!genres.length) return []

  // Equal weight per genre (no rec data here — profile genres only)
  const pct = Math.floor(100 / genres.length)
  const remainder = 100 - pct * genres.length

  return genres.slice(0, 6).map((name, i) => ({
    name,
    pct:   i === 0 ? pct + remainder : pct,
    color: GENRE_COLORS[name] ?? DEFAULT_COLOR,
  }))
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://compicfy.cloud'

export function MangaDNACard({ username, displayName, avatarUrl, genres, isPro, isOwner }: Props) {
  const [copied, setCopied] = useState(false)

  const distribution = computeGenreDistribution(genres)

  if (distribution.length === 0) return null

  // Build OG image URL
  const genresParam = distribution
    .map(g => `${encodeURIComponent(g.name)}:${g.pct}`)
    .join(',')

  const ogParams = new URLSearchParams({
    username,
    name:   displayName,
    genres: genresParam,
    ...(avatarUrl ? { avatar: avatarUrl } : {}),
  })

  const shareUrl    = `${SITE_URL}/profile/${username}`
  const ogImageUrl  = `${SITE_URL}/api/og/dna?${ogParams.toString()}`

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${displayName}'s Manhwa DNA`,
          text:  `Check out my Manhwa DNA on Compicfy! I'm ${distribution[0]?.pct}% ${distribution[0]?.name}.`,
          url:   shareUrl,
        })
      } else {
        await navigator.clipboard.writeText(shareUrl)
        setCopied(true)
        toast.success('Profile link copied!')
        setTimeout(() => setCopied(false), 2000)
      }
    } catch {
      // User cancelled share — ignore
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          Manhwa DNA
        </p>
        {isOwner && (
          <button
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all"
          >
            {copied
              ? <><Check size={9} className="text-emerald-500" /> Copied!</>
              : <><Share2 size={9} /> Share</>
            }
          </button>
        )}
      </div>

      {/* Multicolour bar */}
      <div className="h-2 rounded-full overflow-hidden flex gap-px">
        {distribution.map((g, i) => (
          <div
            key={i}
            title={`${g.name}: ${g.pct}%`}
            style={{ flex: g.pct, backgroundColor: g.color }}
            className="transition-all duration-300 hover:opacity-80"
          />
        ))}
      </div>

      {/* Genre breakdown */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        {distribution.map((g, i) => (
          <div key={i} className="flex items-center gap-2 min-w-0">
            <div
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: g.color }}
            />
            <span className="text-[11px] text-muted-foreground truncate">{g.name}</span>
            <span
              className="text-[11px] font-black ml-auto shrink-0"
              style={{ color: g.color }}
            >
              {g.pct}%
            </span>
          </div>
        ))}
      </div>

      {/* Pro upsell — show to non-pro owners only */}
      {isOwner && !isPro && (
        <a
          href={ogImageUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[10px] text-amber-600 hover:underline"
        >
          <Crown size={9} className="fill-amber-500" />
          View full shareable card image
        </a>
      )}
    </div>
  )
}