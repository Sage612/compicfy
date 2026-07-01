'use client'

import Link from 'next/link'
import { useRef } from 'react'

interface TickerItem {
  title:    string
  type:     string
  username: string
}

interface Props {
  items: TickerItem[]
}

// Shown when no real activity exists yet — makes the platform feel alive
const FALLBACK_ITEMS: TickerItem[] = [
  { title: 'Solo Leveling',         type: 'manhwa',  username: 'ComPicfy' },
  { title: 'Tower of God',          type: 'manhwa',  username: 'ComPicfy' },
  { title: 'Berserk',               type: 'manga',   username: 'ComPicfy' },
  { title: 'Omniscient Reader',     type: 'manhwa',  username: 'ComPicfy' },
  { title: 'One Punch Man',         type: 'manga',   username: 'ComPicfy' },
  { title: 'Lore Olympus',          type: 'webtoon', username: 'ComPicfy' },
  { title: 'The Beginning After the End', type: 'webtoon', username: 'ComPicfy' },
  { title: 'Vinland Saga',          type: 'manga',   username: 'ComPicfy' },
]

export function LiveTicker({ items }: Props) {
  const trackRef   = useRef<HTMLDivElement>(null)
  const display    = items.length > 0 ? items : FALLBACK_ITEMS
  // Duplicate so scroll loops seamlessly
  const doubled    = [...display, ...display]
  const speed      = display.length * 4  // seconds — more items = longer cycle

  return (
    <div className="border-y border-border bg-muted/30 overflow-hidden py-3 select-none">
      <div className="flex items-center gap-4">

        {/* Static live badge */}
        <div className="flex items-center gap-2 pl-4 shrink-0 z-10 bg-muted/30">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
          </span>
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground whitespace-nowrap">
            {items.length > 0 ? 'Live' : 'Featured'}
          </span>
        </div>

        {/* Scrolling track */}
        <div className="flex-1 overflow-hidden">
          <div
            ref={trackRef}
            className="flex items-center gap-8 whitespace-nowrap"
            style={{ animation: `ticker ${speed}s linear infinite` }}
          >
            {doubled.map((rec, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground shrink-0"
              >
                <span className="text-primary font-bold">@{rec.username}</span>
                <span>recommended</span>
                <span className="font-semibold text-foreground">{rec.title}</span>
                <span className="capitalize text-muted-foreground/40 text-[10px]">
                  · {rec.type}
                </span>
                <span className="text-border mx-2">·</span>
              </span>
            ))}
          </div>
        </div>

        {/* Static See all */}
        <div className="shrink-0 pr-4 z-10 bg-muted/30">
          <Link
            href="/browse"
            className="text-xs text-primary font-bold hover:underline whitespace-nowrap"
          >
            See all →
          </Link>
        </div>
      </div>

      <style jsx>{`
        @keyframes ticker {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  )
}