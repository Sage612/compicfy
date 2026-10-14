'use client'

// Owner-only "Log a session" form on the Activity tab. One form, up to three
// writes: a private reading session, the live chapter position (Currently
// obsessed) and a public journal entry (memory wall). Fill in whatever you
// want; at least one of chapter, minutes or note is needed.

import { useState, useTransition, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import { logSession } from '@/lib/profile/shrineActions'
import type { Candidate } from './util'

const MOODS = ['😭', '😍', '🤯', '🧐', '😴', '🔥']

export function LogComposer({ candidates }: { candidates: Candidate[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()

  const [rec, setRec] = useState('')
  const [chapter, setChapter] = useState('')
  const [minutes, setMinutes] = useState('')
  const [note, setNote] = useState('')
  const [mood, setMood] = useState<string | null>(null)
  const [spoiler, setSpoiler] = useState(false)

  function submit(e: FormEvent) {
    e.preventDefault()
    start(async () => {
      const res = await logSession({
        recommendationId: rec || null,
        chapter:   chapter.trim() === '' ? null : Number(chapter),
        minutes:   minutes.trim() === '' ? null : Number(minutes),
        note:      note.trim() || null,
        moodEmoji: mood,
        isSpoiler: spoiler,
      })
      if (!res.ok) { toast.error(res.error); return }
      toast.success('Logged')
      setRec(''); setChapter(''); setMinutes(''); setNote(''); setMood(null); setSpoiler(false)
      setOpen(false)
      router.refresh()
    })
  }

  if (!open) {
    return (
      <button type="button" className="sh-ghost-btn sh-compose-toggle" onClick={() => setOpen(true)}>
        <Plus size={15} /> Log a session
      </button>
    )
  }

  return (
    <form className="sh-card sh-form" onSubmit={submit}>
      <div className="sh-field">
        <label className="sh-label" htmlFor="sh-log-rec">Series</label>
        <select id="sh-log-rec" className="sh-select" value={rec} onChange={e => setRec(e.target.value)}>
          <option value="">No series</option>
          {candidates.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
      </div>

      <div className="sh-row2">
        <div className="sh-field">
          <label className="sh-label" htmlFor="sh-log-ch">Chapter reached</label>
          <input id="sh-log-ch" className="sh-input" type="number" inputMode="numeric" min={0} max={20000}
            placeholder="e.g. 84" value={chapter} onChange={e => setChapter(e.target.value)} />
        </div>
        <div className="sh-field">
          <label className="sh-label" htmlFor="sh-log-min">Minutes read</label>
          <input id="sh-log-min" className="sh-input" type="number" inputMode="numeric" min={1} max={720}
            placeholder="e.g. 45" value={minutes} onChange={e => setMinutes(e.target.value)} />
        </div>
      </div>

      <div className="sh-field">
        <label className="sh-label" htmlFor="sh-log-note">Note for your memory wall (optional)</label>
        <textarea id="sh-log-note" className="sh-textarea" maxLength={1500}
          placeholder="What stayed with you?" value={note} onChange={e => setNote(e.target.value)} />
      </div>

      {note.trim() && (
        <>
          <div className="sh-moods" role="group" aria-label="Mood">
            {MOODS.map(m => (
              <button key={m} type="button" className="sh-mood-btn" aria-pressed={mood === m}
                onClick={() => setMood(mood === m ? null : m)}>{m}</button>
            ))}
          </div>
          <label className="sh-check">
            <input type="checkbox" checked={spoiler} onChange={e => setSpoiler(e.target.checked)} />
            Contains spoilers (hidden until revealed)
          </label>
        </>
      )}

      <p className="sh-caption" style={{ marginTop: 0 }}>
        Chapter and minutes update your progress privately. Only the note is shown publicly.
      </p>

      <div className="sh-row2">
        <button type="button" className="sh-ghost-btn" onClick={() => setOpen(false)} disabled={pending}>Cancel</button>
        <button type="submit" className="sh-submit" disabled={pending}>{pending ? 'Saving…' : 'Save'}</button>
      </div>
    </form>
  )
}