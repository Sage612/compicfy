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
  /** When true, renders as a compact divider bar only (no label, no legend) */
  dividerMode?: boolean
}

const GENRE_COLORS: Record<string, string> = {
  Action:          '#ef4444',
  Adventure:       '#f97316',
  Comedy:          '#eab308',
  Drama:           '#ea580c',
  Fantasy:         '#3b82f6',
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

const DEFAULT_COLOR = '#1dc9a0'

function computeGenreDistribution(genres: string[]): { name: string; pct: number; color: string }[] {
  if (!genres.length) return []
  const pct       = Math.floor(100 / genres.length)
  const remainder = 100 - pct * genres.length
  return genres.slice(0, 6).map((name, i) => ({
    name,
    pct:   i === 0 ? pct + remainder : pct,
    color: GENRE_COLORS[name] ?? DEFAULT_COLOR,
  }))
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://compicfy.com'

export function MangaDNACard({ username, displayName, avatarUrl, genres, isPro, isOwner, dividerMode = false }: Props) {
  const [copied, setCopied] = useState(false)
  const distribution = computeGenreDistribution(genres)
  if (distribution.length === 0) return null

  const genresParam = distribution.map(g => `${encodeURIComponent(g.name)}:${g.pct}`).join(',')
  const ogParams    = new URLSearchParams({
    username,
    name:   displayName,
    genres: genresParam,
    ...(avatarUrl ? { avatar: avatarUrl } : {}),
  })
  const shareUrl   = `${SITE_URL}/profile/${username}`
  const ogImageUrl = `${SITE_URL}/api/og/dna?${ogParams.toString()}`

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${displayName}'s Manhwa DNA`,
          text:  `Check out my Manhwa DNA on ComPicfy! I'm ${distribution[0]?.pct}% ${distribution[0]?.name}.`,
          url:   shareUrl,
        })
      } else {
        await navigator.clipboard.writeText(shareUrl)
        setCopied(true)
        toast.success('Profile link copied!')
        setTimeout(() => setCopied(false), 2000)
      }
    } catch { /* user cancelled */ }
  }

  /* ── Divider mode: bar + inline legend, used inside profile card ── */
  if (dividerMode) {
    return (
      <div className="space-y-1">
        <div className="h-1.5 rounded-full overflow-hidden flex gap-px">
          {distribution.map((g, i) => (
            <div
              key={i}
              title={`${g.name}: ${g.pct}%`}
              style={{ flex: g.pct, backgroundColor: g.color }}
              className="transition-opacity duration-300 hover:opacity-70"
            />
          ))}
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-wrap">
            {distribution.slice(0, 3).map((g, i) => (
              <span key={i} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: g.color }} />
                {g.name} <span className="font-bold" style={{ color: g.color }}>{g.pct}%</span>
              </span>
            ))}
            {distribution.length > 3 && (
              <span className="text-[10px] text-muted-foreground/50">+{distribution.length - 3} more</span>
            )}
          </div>
          {isOwner && (
            <button
              onClick={handleShare}
              className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              {copied
                ? <><Check size={9} className="text-emerald-500" /> Copied</>
                : <><Share2 size={9} /> Share</>
              }
            </button>
          )}
        </div>
      </div>
    )
  }

  /* ── Full mode: original standalone usage ── */
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
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        {distribution.map((g, i) => (
          <div key={i} className="flex items-center gap-2 min-w-0">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: g.color }} />
            <span className="text-[11px] text-muted-foreground truncate">{g.name}</span>
            <span className="text-[11px] font-black ml-auto shrink-0" style={{ color: g.color }}>{g.pct}%</span>
          </div>
        ))}
      </div>
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
