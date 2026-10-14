'use client'

// Owner-only editor for "The party": add up to six characters, change a bond
// level, or remove someone. Portraits are plain image links; without one the
// card falls back to the series cover.

import { useState, useTransition, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, Trash2 } from 'lucide-react'
import { addCharacter, removeCharacter, updateCharacterBond } from '@/lib/profile/shrineActions'
import type { Candidate } from './util'

export interface PartyEditorMember {
  id:        string
  name:      string
  bondLevel: number
}

const MAX_PARTY = 6

export function PartyEditor({ members, candidates }: { members: PartyEditorMember[]; candidates: Candidate[] }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [open, setOpen] = useState(false)

  const [name, setName] = useState('')
  const [tagline, setTagline] = useState('')
  const [rec, setRec] = useState('')
  const [image, setImage] = useState('')
  const [bond, setBond] = useState(5)

  // Locally edited bond levels, saved with the per-row button.
  const [bonds, setBonds] = useState<Record<string, number>>({})

  function run(task: () => Promise<{ ok: boolean; error?: string }>, okMsg: string, after?: () => void) {
    start(async () => {
      const res = await task()
      if (!res.ok) { toast.error(res.error ?? 'Something went wrong'); return }
      toast.success(okMsg)
      after?.()
      router.refresh()
    })
  }

  function add(e: FormEvent) {
    e.preventDefault()
    run(
      () => addCharacter({
        name, tagline: tagline.trim() || null, recommendationId: rec || null,
        imageUrl: image.trim() || null, bondLevel: bond,
      }),
      'Character added',
      () => { setName(''); setTagline(''); setRec(''); setImage(''); setBond(5); setOpen(false) },
    )
  }

  const full = members.length >= MAX_PARTY

  return (
    <div className="sh-owner-bar">
      {members.length > 0 && (
        <div className="sh-members">
          {members.map(m => {
            const value = bonds[m.id] ?? m.bondLevel
            const changed = value !== m.bondLevel
            return (
              <div key={m.id} className="sh-member">
                <div className="sh-member-head">
                  <span className="sh-entry-title">{m.name}</span>
                  <button type="button" className="sh-del" aria-label={`Remove ${m.name}`} disabled={pending}
                    onClick={() => { if (window.confirm(`Remove ${m.name} from your party?`)) run(() => removeCharacter(m.id), 'Removed') }}>
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="sh-bond"><span>Bond</span><b>Lv. {value}</b></div>
                <input type="range" className="sh-range" min={1} max={20} value={value} disabled={pending}
                  onChange={e => setBonds(b => ({ ...b, [m.id]: Number(e.target.value) }))} />
                {changed && (
                  <button type="button" className="sh-submit" disabled={pending}
                    onClick={() => run(() => updateCharacterBond(m.id, value), 'Bond updated', () => setBonds(b => { const n = { ...b }; delete n[m.id]; return n }))}>
                    Save bond
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {!open && (
        <button type="button" className="sh-ghost-btn sh-compose-toggle" disabled={full} onClick={() => setOpen(true)}>
          <Plus size={15} /> {full ? `Party is full (${MAX_PARTY})` : 'Add a character'}
        </button>
      )}

      {open && (
        <form className="sh-card sh-form" onSubmit={add}>
          <div className="sh-field">
            <label className="sh-label" htmlFor="sh-c-name">Name</label>
            <input id="sh-c-name" className="sh-input" maxLength={80} required value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="sh-field">
            <label className="sh-label" htmlFor="sh-c-tag">One-line tagline (optional)</label>
            <input id="sh-c-tag" className="sh-input" maxLength={160} value={tagline} onChange={e => setTagline(e.target.value)} />
          </div>
          <div className="sh-field">
            <label className="sh-label" htmlFor="sh-c-rec">Series (optional)</label>
            <select id="sh-c-rec" className="sh-select" value={rec} onChange={e => setRec(e.target.value)}>
              <option value="">None</option>
              {candidates.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </div>
          <div className="sh-field">
            <label className="sh-label" htmlFor="sh-c-img">Portrait link (optional)</label>
            <input id="sh-c-img" className="sh-input" type="url" inputMode="url" placeholder="https://…"
              value={image} onChange={e => setImage(e.target.value)} />
            <span className="sh-count" style={{ textAlign: 'left' }}>Left empty, the series cover is used.</span>
          </div>
          <div className="sh-field">
            <div className="sh-bond"><span>Bond level</span><b>Lv. {bond}</b></div>
            <input type="range" className="sh-range" min={1} max={20} value={bond} onChange={e => setBond(Number(e.target.value))} />
          </div>
          <div className="sh-row2">
            <button type="button" className="sh-ghost-btn" onClick={() => setOpen(false)} disabled={pending}>Cancel</button>
            <button type="submit" className="sh-submit" disabled={pending || !name.trim()}>{pending ? 'Saving…' : 'Add'}</button>
          </div>
        </form>
      )}
    </div>
  )
}