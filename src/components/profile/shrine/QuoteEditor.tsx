'use client'

// Owner-only controls for the "Pinned moment": pin a line, change it, or unpin.

import { useState, useTransition, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Pin, PinOff } from 'lucide-react'
import { pinQuote, unpinQuote } from '@/lib/profile/shrineActions'
import type { Candidate } from './util'

interface Props {
  hasQuote:   boolean
  candidates: Candidate[]
}

export function QuoteEditor({ hasQuote, candidates }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()
  const [text, setText] = useState('')
  const [rec, setRec] = useState('')
  const [chapter, setChapter] = useState('')

  function save(e: FormEvent) {
    e.preventDefault()
    start(async () => {
      const res = await pinQuote({ text, recommendationId: rec || null, chapterLabel: chapter.trim() || null })
      if (!res.ok) { toast.error(res.error); return }
      toast.success('Moment pinned')
      setText(''); setRec(''); setChapter(''); setOpen(false)
      router.refresh()
    })
  }

  function unpin() {
    start(async () => {
      const res = await unpinQuote()
      if (!res.ok) { toast.error(res.error); return }
      toast.success('Unpinned')
      router.refresh()
    })
  }

  if (!open) {
    return (
      <div className="sh-owner-bar sh-row2">
        <button type="button" className="sh-ghost-btn" onClick={() => setOpen(true)}>
          <Pin size={14} /> {hasQuote ? 'Change moment' : 'Pin a moment'}
        </button>
        {hasQuote && (
          <button type="button" className="sh-ghost-btn danger" onClick={unpin} disabled={pending}>
            <PinOff size={14} /> Unpin
          </button>
        )}
      </div>
    )
  }

  return (
    <form className="sh-card sh-form sh-owner-bar" onSubmit={save}>
      <div className="sh-field">
        <label className="sh-label" htmlFor="sh-q-text">The line</label>
        <textarea id="sh-q-text" className="sh-textarea" maxLength={280} required
          placeholder="A line that stayed with you" value={text} onChange={e => setText(e.target.value)} />
        <span className="sh-count">{text.length}/280</span>
      </div>
      <div className="sh-row2">
        <div className="sh-field">
          <label className="sh-label" htmlFor="sh-q-rec">Series</label>
          <select id="sh-q-rec" className="sh-select" value={rec} onChange={e => setRec(e.target.value)}>
            <option value="">None</option>
            {candidates.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        </div>
        <div className="sh-field">
          <label className="sh-label" htmlFor="sh-q-ch">Chapter</label>
          <input id="sh-q-ch" className="sh-input" maxLength={40} placeholder="Ch. 61"
            value={chapter} onChange={e => setChapter(e.target.value)} />
        </div>
      </div>
      <div className="sh-row2">
        <button type="button" className="sh-ghost-btn" onClick={() => setOpen(false)} disabled={pending}>Cancel</button>
        <button type="submit" className="sh-submit" disabled={pending || text.trim().length < 3}>
          {pending ? 'Saving…' : 'Pin it'}
        </button>
      </div>
    </form>
  )
}