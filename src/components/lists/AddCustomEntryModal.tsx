// src/components/lists/AddCustomEntryModal.tsx
'use client'

import { useState } from 'react'
import { X, Plus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface CreatedItem {
  id: string
  custom_entry_id: string
  status: string
  notes: string | null
  added_at: string
}

interface CreatedEntry {
  id: string
  title: string
  cover_url: string | null
  notes: string | null
}

interface Props {
  listId: string
  onClose: () => void
  onCreated: (entry: CreatedEntry, item: CreatedItem) => void
}

export function AddCustomEntryModal({ listId, onClose, onCreated }: Props) {
  const [title, setTitle]       = useState('')
  const [coverUrl, setCoverUrl] = useState('')
  const [notes, setNotes]       = useState('')
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState<string | null>(null)

  const handleCreate = async () => {
    if (!title.trim()) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/custom-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          list_id: listId,
          title: title.trim(),
          cover_url: coverUrl.trim() || null,
          notes: notes.trim() || null,
          source: 'manual',
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to create entry')
        return
      }
      onCreated(data.entry, data.item)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={() => !saving && onClose()}
    >
      <div onClick={e => e.stopPropagation()} className="w-full max-w-md bg-card rounded-2xl border border-border shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-primary/5">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-primary">Track something new</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              For anything not on ComPicfy yet — private to you, no need to recommend it
            </p>
          </div>
          <button onClick={onClose} disabled={saving} className="text-muted-foreground hover:text-foreground transition-colors shrink-0 ml-2">
            <X size={14} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Title <span className="text-destructive">*</span></label>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="What are you reading?"
              className="h-9 text-sm"
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
            />
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
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">
              Notes <span className="text-muted-foreground/60">(optional, private)</span>
            </label>
            <Input value={notes} onChange={e => setNotes(e.target.value)} className="h-9 text-sm" />
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <div className="flex gap-2 pt-1">
            <Button size="sm" onClick={handleCreate} disabled={!title.trim() || saving} className="gap-2">
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
              Add to list
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>Cancel</Button>
          </div>
        </div>
      </div>
    </div>
  )
}