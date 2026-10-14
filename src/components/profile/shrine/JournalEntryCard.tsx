'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  BookOpen, Check, Eye, EyeOff, Flame, Heart, MessageCircle, PenLine, Quote, Trash2,
} from 'lucide-react'
import { deleteJournalEntry, toggleJournalLike } from '@/lib/profile/shrineActions'
import { proxyCover } from './util'

interface Props {
  title:      string
  ago:        string
  content:    string | null
  isSpoiler:  boolean
  moodEmoji:  string | null
  icon:       'book' | 'pen' | 'quote' | 'check' | 'heart' | 'flame'
  comicTitle: string | null
  coverUrl:   string | null
  likeCount:  number
  replyCount: number
  /** Pass the journal entry id (owner only) to show a delete button. */
  deleteId?:  string | null
  /** Journal entry id when the signed-in viewer can like this entry. */
  likeId?:    string | null
  liked?:     boolean
}

const ICONS = {
  book:  BookOpen,
  pen:   PenLine,
  quote: Quote,
  check: Check,
  heart: Heart,
  flame: Flame,
} as const

export function JournalEntryCard({
  title, ago, content, isSpoiler, moodEmoji, icon, comicTitle, coverUrl, likeCount, replyCount, deleteId, likeId, liked: likedProp = false,
}: Props) {
  const [liked, setLiked] = useState(likedProp)
  const [likes, setLikes] = useState(likeCount)
  const [liking, setLiking] = useState(false)
  const [shown, setShown] = useState(false)
  const [pending, start] = useTransition()
  const router = useRouter()
  const locked = isSpoiler && !shown && !!content
  const Icon = ICONS[icon]

  function remove() {
    if (!deleteId || !window.confirm('Delete this entry?')) return
    start(async () => {
      const res = await deleteJournalEntry(deleteId)
      if (res.ok) { toast.success('Entry deleted'); router.refresh() }
      else toast.error(res.error)
    })
  }

  async function like() {
    if (!likeId || liking) return
    const next = !liked
    setLiking(true); setLiked(next); setLikes(n => Math.max(0, n + (next ? 1 : -1)))
    const res = await toggleJournalLike(likeId)
    setLiking(false)
    if (!res.ok) {
      setLiked(!next); setLikes(n => Math.max(0, n + (next ? -1 : 1)))
      toast.error(res.error)
    } else if (res.liked !== next) {
      setLiked(res.liked); setLikes(n => Math.max(0, n + (res.liked ? 1 : -1)))
    }
  }

  return (
    <article className="sh-entry" style={pending ? { opacity: 0.5 } : undefined}>
      <div className="sh-ico"><Icon size={17} /></div>

      <div className="sh-entry-main">
        <div className="sh-entry-head">
          <span className="sh-entry-title">{title}</span>
          <span className="sh-ago">{ago}</span>
          {moodEmoji && <span className="sh-mood">{moodEmoji}</span>}
          {deleteId && (
            <button type="button" className="sh-del" onClick={remove} disabled={pending} aria-label="Delete entry">
              <Trash2 size={14} />
            </button>
          )}
        </div>

        {content && (locked ? (
          <div className="sh-spoiler">
            <p aria-hidden className="sh-spoiler-text">{content}</p>
            <button type="button" className="sh-reveal" onClick={() => setShown(true)}>
              <Eye size={16} /> Reveal spoiler
            </button>
          </div>
        ) : (
          <>
            <p className="sh-entry-body">{content}</p>
            {isSpoiler && (
              <button type="button" className="sh-hide" onClick={() => setShown(false)}>
                <EyeOff size={12} /> Hide spoiler
              </button>
            )}
          </>
        ))}

        <div className="sh-entry-foot">
          {comicTitle && (
            <>
              {coverUrl && (
                <span className="sh-mini"><img src={proxyCover(coverUrl)} alt="" loading="lazy" /></span>
              )}
              <span className="sh-entry-comic">{comicTitle}</span>
            </>
          )}
          {likeId ? (
            <span className="sh-likes">
              <button type="button" className="sh-like-btn" aria-pressed={liked}
                aria-label={liked ? 'Unlike' : 'Like'} onClick={like}>
                <Heart size={15} fill={liked ? 'currentColor' : 'none'} /> {likes}
              </button>
              {replyCount > 0 && <><MessageCircle size={15} style={{ marginLeft: 8 }} /> {replyCount}</>}
            </span>
          ) : (likes > 0 || replyCount > 0) && (
            <span className="sh-likes">
              <Heart size={15} /> {likes}
              {replyCount > 0 && <><MessageCircle size={15} style={{ marginLeft: 8 }} /> {replyCount}</>}
            </span>
          )}
        </div>
      </div>
    </article>
  )
}