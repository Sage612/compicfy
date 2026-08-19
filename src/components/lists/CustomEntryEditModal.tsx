// src/components/lists/CustomEntryEditModal.tsx
'use client'

import { useState } from 'react'
import { X, Check, Loader2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface CustomEntry {
  id: string
  title: string
  cover_url: string | null
  notes: string | null
}

interface Props {
  entry: CustomEntry
  onClose: () => void
  onSaved: (updated: CustomEntry) => void
  onDeleted: () => void
}

export function CustomEntryEditModal({ entry, onClose, onSaved, onDeleted }: Props) {
  const [title, setTitle]         = useState(entry.title)
  const [coverUrl, setCoverUrl]   = useState(entry.cover_url ?? '')
  const [notes, setNotes]         = useState(entry.notes ?? '')
  const [saving, setSaving]       = useState(false)
  const [deleting, setDeleting]   = useState(false)
  const [error, setError]         = useState<string | null>(null)

  const handleSave = async () => {
    if (!title.trim()) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/custom-entries/${entry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          cover_url: coverUrl.trim() || null,
          notes: notes.trim() || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to save changes')
        return
      }
      onSaved(data.entry)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Remove "${entry.title}" from your tracking? This can't be undone.`)) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/custom-entries/${entry.id}`, { method: 'DELETE' })
      if (res.ok) onDeleted()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={() => !saving && !deleting && onClose()}
    >
      <div onClick={e => e.stopPropagation()} className="w-full max-w-md bg-card rounded-2xl border border-border shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-primary/5">
          <p className="text-xs font-black uppercase tracking-widest text-primary">Edit Custom Entry</p>
          <button onClick={onClose} disabled={saving || deleting} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={14} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Title <span className="text-destructive">*</span></label>
            <Input value={title} onChange={e => setTitle(e.target.value)} className="h-9 text-sm" autoFocus />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">
              Cover image URL <span className="text-muted-foreground/60">(optional)</span>
            </label>
            <Input
              value={coverUrl}
              onChange={e => setCoverUrl(e.target.value)}
              placeholder="https://…"
              className="h-9 text-sm"
            />
            {coverUrl.trim() && (
              <div className="w-16 h-[88px] rounded-lg overflow-hidden bg-muted mt-1.5 border border-border">
                <img
                  src={coverUrl.trim()}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">
              Notes <span className="text-muted-foreground/60">(optional, private)</span>
            </label>
            <Input value={notes} onChange={e => setNotes(e.target.value)} className="h-9 text-sm" />
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <div className="flex items-center justify-between pt-1">
            <button
              onClick={handleDelete}
              disabled={saving || deleting}
              className="inline-flex items-center gap-1.5 text-xs text-destructive hover:opacity-70 transition-opacity"
            >
              {deleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
              Delete entry
            </button>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={onClose} disabled={saving || deleting}>Cancel</Button>
              <Button size="sm" onClick={handleSave} disabled={!title.trim() || saving || deleting} className="gap-2">
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                Save
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}