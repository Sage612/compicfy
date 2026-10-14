'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  BookOpen, Check, Eye, EyeOff, Heart, MessageCircle, PenLine, Quote, Trash2,
} from 'lucide-react'
import { deleteJournalEntry } from '@/lib/profile/shrineActions'
import { proxyCover } from './util'

interface Props {
  title:      string
  ago:        string
  content:    string | null
  isSpoiler:  boolean
  moodEmoji:  string | null
  icon:       'book' | 'pen' | 'quote' | 'check' | 'heart'
  comicTitle: string | null
  coverUrl:   string | null
  likeCount:  number
  replyCount: number
  /** Pass the journal entry id (owner only) to show a delete button. */
  deleteId?:  string | null
}

const ICONS = {
  book:  BookOpen,
  pen:   PenLine,
  quote: Quote,
  check: Check,
  heart: Heart,
} as const

export function JournalEntryCard({
  title, ago, content, isSpoiler, moodEmoji, icon, comicTitle, coverUrl, likeCount, replyCount, deleteId,
}: Props) {
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
          {(likeCount > 0 || replyCount > 0) && (
            <span className="sh-likes">
              <Heart size={15} /> {likeCount}
              {replyCount > 0 && <><MessageCircle size={15} style={{ marginLeft: 8 }} /> {replyCount}</>}
            </span>
          )}
        </div>
      </div>
    </article>
  )
}