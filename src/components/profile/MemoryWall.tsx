'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Heart, MessageCircle, EyeOff, Eye, TriangleAlert } from 'lucide-react'
import type { JournalItem } from '@/lib/profile/getProfileExtras'

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7)  return d === 1 ? 'yesterday' : `${d}d ago`
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function Entry({ item }: { item: JournalItem }) {
  const [revealed, setRevealed] = useState(false)
  const hidden = item.isSpoiler && !revealed
  const context = [item.comicTitle, item.chapterLabel].filter(Boolean).join(' · ')

  return (
    <article className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
          {item.comicId && item.comicTitle ? (
            <Link href={`/comic/${item.comicId}`} className="font-black hover:text-primary transition-colors truncate">
              {item.comicTitle}
            </Link>
          ) : (
            <span className="font-black">Journal</span>
          )}
          {item.chapterLabel && <span className="text-muted-foreground">{item.chapterLabel}</span>}
          <span className="text-muted-foreground/60">•</span>
          <span className="text-muted-foreground">{timeAgo(item.createdAt)}</span>
        </div>
        {item.moodEmoji && <span className="text-xl leading-none shrink-0">{item.moodEmoji}</span>}
      </header>

      {hidden ? (
        <button
          onClick={() => setRevealed(true)}
          className="relative w-full overflow-hidden rounded-xl border border-border bg-muted/40 px-4 py-6 text-center"
          aria-label="Reveal spoiler"
        >
          <p aria-hidden className="text-sm leading-relaxed blur-md select-none opacity-60 line-clamp-3">
            {item.content}
          </p>
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-1.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-500 text-[10px] font-black uppercase tracking-wider">
              <TriangleAlert size={11} /> Spoiler{context ? ` · ${item.chapterLabel ?? ''}` : ''}
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-semibold">
              <Eye size={12} /> Tap to reveal
            </span>
          </span>
        </button>
      ) : (
        <div className="space-y-2">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{item.content}</p>
          {item.isSpoiler && (
            <button
              onClick={() => setRevealed(false)}
              className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground hover:text-foreground"
            >
              <EyeOff size={10} /> Hide spoiler
            </button>
          )}
        </div>
      )}

      <footer className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5"><Heart size={13} /> {item.likeCount}</span>
        <span className="inline-flex items-center gap-1.5"><MessageCircle size={13} /> {item.replyCount} {item.replyCount === 1 ? 'reply' : 'replies'}</span>
      </footer>
    </article>
  )
}

interface Props {
  items:    JournalItem[]
  isOwner:  boolean
  username: string
}

export function MemoryWall({ items, isOwner, username }: Props) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 rounded-2xl border border-dashed border-border text-center space-y-2">
        <MessageCircle size={24} className="text-muted-foreground opacity-40" />
        <p className="font-black text-sm">Nothing on the wall yet</p>
        <p className="text-xs text-muted-foreground px-4">
          {isOwner
            ? 'Journal a chapter and your thoughts will live here.'
            : `@${username} hasn't written any journal entries yet.`}
        </p>
      </div>
    )
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-black">Memory Wall</h2>
        <div className="h-0.5 flex-1 bg-gradient-to-r from-primary/40 to-transparent" />
        <span className="text-xs text-muted-foreground shrink-0">{items.length} entries</span>
      </div>
      {items.map(item => <Entry key={item.id} item={item} />)}
    </section>
  )
}