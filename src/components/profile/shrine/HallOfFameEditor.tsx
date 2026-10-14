'use client'

// Owner-only editor for the three Hall of Fame slots. Every control is always
// visible (nothing depends on hover, so it works on phones): replace a slot,
// remove it, or move it left/right to change its rank. Each change saves the
// full ordered list in one request, which is what the API expects.

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft, ArrowRight, Pin, Search, Trash2, RefreshCw } from 'lucide-react'
import { proxyCover, type Candidate } from './util'

const MAX_PINNED = 3

interface Props {
  initialPinnedIds: string[]
  /** Everything the owner can pick (saves, list comics, own recs). */
  candidates: Candidate[]
  /** The currently pinned comics, so they still render even if no longer in `candidates`. */
  pinned: Candidate[]
}

export function HallOfFameEditor({ initialPinnedIds, candidates, pinned }: Props) {
  const router = useRouter()
  const [ids, setIds] = useState<string[]>(initialPinnedIds.slice(0, MAX_PINNED))
  const [saving, setSaving] = useState(false)
  // Slot being filled/replaced (0-2), or null when the picker is closed.
  const [picking, setPicking] = useState<number | null>(null)
  const [query, setQuery] = useState('')

  const byId = useMemo(() => {
    const m = new Map<string, Candidate>()
    for (const c of candidates) m.set(c.id, c)
    for (const c of pinned) m.set(c.id, c)
    return m
  }, [candidates, pinned])

  // Drop ids we cannot resolve to a comic, so a stale id never silently
  // occupies a slot that looks empty.
  const slots = ids.filter(id => byId.has(id))

  const options = candidates.filter(c =>
    !slots.includes(c.id) && c.title.toLowerCase().includes(query.trim().toLowerCase()),
  )

  async function save(next: string[], okMsg: string) {
    setSaving(true)
    try {
      const res = await fetch('/api/profile/pinned-favorites', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recommendation_ids: next }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        if (res.status === 403 && data?.error === 'pro_feature_required') {
          toast.error(data.message ?? 'Pinning favorites is a Pro feature.', {
            action: { label: 'Upgrade', onClick: () => router.push('/pricing') },
            duration: 6000,
          })
          return
        }
        toast.error(data?.message ?? data?.error ?? 'Could not update your favorites.')
        return
      }
      setIds(next)
      toast.success(okMsg)
      router.refresh()
    } catch {
      toast.error('Could not update your favorites.')
    } finally {
      setSaving(false)
    }
  }

  function choose(id: string) {
    if (picking === null) return
    const next = [...slots]
    if (picking < next.length) next[picking] = id     // replace
    else next.push(id)                                // fill the next empty slot
    setPicking(null); setQuery('')
    save(next.slice(0, MAX_PINNED), 'Hall of fame updated')
  }

  function remove(i: number) {
    save(slots.filter((_, idx) => idx !== i), 'Removed')
  }

  function move(i: number, dir: -1 | 1) {
    const j = i + dir
    if (j < 0 || j >= slots.length) return
    const next = [...slots]
    ;[next[i], next[j]] = [next[j], next[i]]
    save(next, 'Order updated')
  }

  return (
    <div className="sh-form" style={{ padding: 0, border: 0, background: 'none' }}>
      <div className="sh-pin-grid">
        {[0, 1, 2].map(i => {
          const comic = byId.get(slots[i] ?? '')
          return (
            <div key={i} className="sh-pin-slot">
              <div className="sh-pin-cover">
                {comic ? (
                  comic.cover_url
                    ? <img src={proxyCover(comic.cover_url)} alt={comic.title} loading="lazy" />
                    : <span className="sh-pin-fallback">{comic.title}</span>
                ) : (
                  <button type="button" className="sh-pin-empty" disabled={saving || i > slots.length}
                    onClick={() => { setPicking(i); setQuery('') }}>
                    <Pin size={18} />
                    <span>Pin a favorite</span>
                  </button>
                )}
                <span className="sh-pin-rank sh-display">0{i + 1}</span>
              </div>

              {comic ? (
                <>
                  <p className="sh-pin-title">{comic.title}</p>
                  <div className="sh-pin-ctrl">
                    <button type="button" className="sh-ghost-btn" aria-label="Move left"
                      disabled={saving || i === 0} onClick={() => move(i, -1)}><ArrowLeft size={14} /></button>
                    <button type="button" className="sh-ghost-btn" aria-label="Move right"
                      disabled={saving || i === slots.length - 1} onClick={() => move(i, 1)}><ArrowRight size={14} /></button>
                    <button type="button" className="sh-ghost-btn" aria-label="Replace"
                      disabled={saving} onClick={() => { setPicking(i); setQuery('') }}><RefreshCw size={14} /></button>
                    <button type="button" className="sh-ghost-btn danger" aria-label="Remove"
                      disabled={saving} onClick={() => remove(i)}><Trash2 size={14} /></button>
                  </div>
                </>
              ) : (
                <p className="sh-pin-title" style={{ opacity: 0.6 }}>Empty slot</p>
              )}
            </div>
          )
        })}
      </div>

      {picking !== null && (
        <div className="sh-pin-picker">
          <div className="sh-field">
            <label className="sh-label" htmlFor="sh-pin-q">
              {picking < slots.length ? `Replace #${picking + 1}` : `Pick your #${picking + 1}`}
            </label>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', opacity: 0.55 }} />
              <input id="sh-pin-q" className="sh-input" style={{ paddingLeft: 32 }} autoFocus
                placeholder="Search your saved comics and reading lists…"
                value={query} onChange={e => setQuery(e.target.value)} />
            </div>
          </div>

          <div className="sh-pin-list">
            {options.length === 0 ? (
              <p className="sh-caption" style={{ textAlign: 'center', padding: '14px 0' }}>
                {candidates.length === 0 ? 'Save or add some comics to a list first.' : 'No matches.'}
              </p>
            ) : options.map(c => (
              <button key={c.id} type="button" className="sh-pin-opt" disabled={saving} onClick={() => choose(c.id)}>
                <span className="sh-mini">{c.cover_url && <img src={proxyCover(c.cover_url)} alt="" loading="lazy" />}</span>
                <span className="sh-pin-opt-title">{c.title}</span>
              </button>
            ))}
          </div>

          <button type="button" className="sh-ghost-btn" onClick={() => { setPicking(null); setQuery('') }}>Cancel</button>
        </div>
      )}
    </div>
  )
}