'use client'

// src/components/comic-detail/MomentStrip.tsx
//
// Appears for a few seconds after a chapter is logged:
//   ✓ Ch. 48 logged                                   Undo
//   😭 😍 🤯 🧐 😴 🔥   ✎
// Ignore it and it fades away: the chapter was already saved. Tap a mood and
// that is saved too. Tap the pencil to leave a one-liner. Nothing here is
// required, which is the whole point.

import { useEffect, useState } from 'react'
import { Check, Pencil, Undo2 } from 'lucide-react'
import { MOODS, MOMENT_STRIP_MS, NOTE_MAX_LENGTH } from '@/lib/tracking/constants'
import { useTracking } from './TrackingProvider'

export function MomentStrip() {
  const t = useTracking()
  const { moment } = t

  const [editing, setEditing] = useState(false)
  const [text, setText]       = useState('')
  const [spoiler, setSpoiler] = useState(false)
  const [saving, setSaving]   = useState(false)

  // A new log resets the little form.
  useEffect(() => {
    setEditing(false)
    setText('')
    setSpoiler(false)
  }, [moment?.nonce])

  // Fade away on its own unless you are in the middle of writing.
  useEffect(() => {
    if (!moment || editing) return
    const timer = setTimeout(() => t.dismissMoment(), MOMENT_STRIP_MS)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moment?.nonce, moment?.mood, editing])

  if (!moment) return null

  const submit = async () => {
    if (!text.trim() || saving) return
    setSaving(true)
    const ok = await t.saveNote({ note: text, spoiler, mood: moment.mood, onEvent: true })
    setSaving(false)
    if (ok) { setEditing(false); setText('') }
  }

  return (
    <div
      role="status"
      className="rounded-xl border border-dossier-foreground/10 bg-dossier-panel/70 px-3 py-2.5 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-dossier-foreground">
          <Check size={15} className="text-emerald-500" />
          {moment.chapter !== null ? `Ch. ${moment.chapter} logged` : 'Logged'}
          {moment.noteSaved && <span className="font-normal text-dossier-foreground/72">· line saved</span>}
        </p>
        {moment.eventId && (
          <button
            type="button"
            onClick={t.undo}
            className="inline-flex items-center gap-1 text-xs font-medium text-dossier-foreground/72 hover:text-dossier-foreground"
          >
            <Undo2 size={12} /> Undo
          </button>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <div className="flex items-center gap-1 flex-1 min-w-0 overflow-x-auto no-scrollbar" role="group" aria-label="How did it feel?">
          {MOODS.map(m => (
            <button
              key={m.emoji}
              type="button"
              title={m.label}
              aria-label={m.label}
              aria-pressed={moment.mood === m.emoji}
              onClick={() => t.saveMood(m.emoji)}
              className={`w-9 h-9 shrink-0 rounded-full text-lg leading-none flex items-center justify-center transition ${
                moment.mood === m.emoji
                  ? 'bg-dossier-foreground/15 ring-1 ring-dossier-foreground/40 scale-110'
                  : 'hover:bg-dossier-foreground/10'
              }`}
            >
              {m.emoji}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setEditing(e => !e)}
          aria-label="Add a line"
          aria-pressed={editing}
          className={`h-9 px-3 shrink-0 rounded-full border text-xs font-semibold flex items-center gap-1.5 ${
            editing
              ? 'border-dossier-foreground/40 text-dossier-foreground'
              : 'border-dossier-foreground/15 text-dossier-foreground/80'
          }`}
        >
          <Pencil size={12} /> Line
        </button>
      </div>

      {editing && (
        <div className="space-y-2">
          <input
            autoFocus
            value={text}
            maxLength={NOTE_MAX_LENGTH}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submit() }}
            placeholder="What just happened, in your words?"
            className="w-full h-10 rounded-lg bg-dossier border border-dossier-foreground/15 px-3 text-sm text-dossier-foreground placeholder:text-dossier-foreground/60 outline-none focus:border-dossier-foreground/40"
          />
          <div className="flex items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-xs text-dossier-foreground/80">
              <input type="checkbox" checked={spoiler} onChange={e => setSpoiler(e.target.checked)} />
              Spoiler
            </label>
            <button
              type="button"
              onClick={submit}
              disabled={!text.trim() || saving}
              className="h-8 px-4 rounded-lg bg-dossier-foreground text-dossier text-xs font-bold disabled:opacity-40"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}