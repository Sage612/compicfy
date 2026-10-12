'use client'

import { useState } from 'react'
import { BookOpen, EyeOff, Eye, Heart, MessageCircle, PenLine } from 'lucide-react'
import { proxyCover } from './util'

interface Props {
  title:        string
  ago:          string
  content:      string
  isSpoiler:    boolean
  moodEmoji:    string | null
  icon:         'book' | 'pen'
  comicTitle:   string | null
  coverUrl:     string | null
  likeCount:    number
  replyCount:   number
}

export function JournalEntryCard({
  title, ago, content, isSpoiler, moodEmoji, icon, comicTitle, coverUrl, likeCount, replyCount,
}: Props) {
  const [shown, setShown] = useState(false)
  const locked = isSpoiler && !shown

  return (
    <article className="sh-entry">
      <div className="sh-ico">{icon === 'book' ? <BookOpen size={17} /> : <PenLine size={17} />}</div>

      <div className="sh-entry-main">
        <div className="sh-entry-head">
          <span className="sh-entry-title">{title}</span>
          <span className="sh-ago">{ago}</span>
          {moodEmoji && <span className="sh-mood">{moodEmoji}</span>}
        </div>

        {locked ? (
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
        )}

        <div className="sh-entry-foot">
          {comicTitle && (
            <>
              {coverUrl && (
                <span className="sh-mini"><img src={proxyCover(coverUrl)} alt="" loading="lazy" /></span>
              )}
              <span className="sh-entry-comic">{comicTitle}</span>
            </>
          )}
          <span className="sh-likes">
            <Heart size={15} /> {likeCount}
            {replyCount > 0 && <><MessageCircle size={15} style={{ marginLeft: 8 }} /> {replyCount}</>}
          </span>
        </div>
      </div>
    </article>
  )
}