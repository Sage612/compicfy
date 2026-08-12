'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Link2, Plus, X, Check, Loader2, Trash2, Pencil, Crown, ExternalLink,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Source {
  id:            string
  url:           string
  label:         string
  chapter_range: string | null
}

interface Props {
  comicId:    string
  isLoggedIn: boolean
  isPro:      boolean
}

const MAX_SOURCES = 5

export function MyReadingSources({ comicId, isLoggedIn, isPro }: Props) {
  const [sources,  setSources]  = useState<Source[]>([])
  const [loading,  setLoading]  = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving,   setSaving]   = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [form, setForm] = useState({ label: '', url: '', chapter_range: '' })

  useEffect(() => {
    if (!isLoggedIn || !isPro) { setLoading(false); return }
    fetch(`/api/comic-sources?recommendation_id=${comicId}`)
      .then(res => res.json())
      .then(data => setSources(data.sources ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [comicId, isLoggedIn, isPro])

  const resetForm = () => {
    setForm({ label: '', url: '', chapter_range: '' })
    setShowForm(false)
    setEditingId(null)
  }

  const startEdit = (s: Source) => {
    setForm({ label: s.label, url: s.url, chapter_range: s.chapter_range ?? '' })
    setEditingId(s.id)
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.label.trim() || !form.url.trim()) return
    setSaving(true)
    try {
      if (editingId) {
        const res = await fetch(`/api/comic-sources/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.message ?? data.error)
        setSources(prev => prev.map(s => s.id === editingId ? data.source : s))
        toast.success('Source updated')
      } else {
        const res = await fetch('/api/comic-sources', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ recommendation_id: comicId, ...form }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.message ?? data.error)
        setSources(prev => [...prev, data.source])
        toast.success('Source added')
      }
      resetForm()
    } catch (e: any) {
      toast.error(e.message || 'Failed to save source')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/comic-sources/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setSources(prev => prev.filter(s => s.id !== id))
      toast.success('Source removed')
    } catch {
      toast.error('Failed to remove source')
    } finally {
      setDeletingId(null)
    }
  }

  if (!isLoggedIn) return null

  if (!isPro) {
    return (
      <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-dashed border-dossier-foreground/15 bg-dossier-panel/20">
        <div className="flex items-center gap-2.5 min-w-0">
          <Link2 size={14} className="text-dossier-foreground/40 shrink-0" />
          <p className="text-xs text-dossier-foreground/60">
            Save your own reading links per comic with chapter ranges — Pro feature.
          </p>
        </div>
        <Link href="/pricing" className="shrink-0">
          <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-500 hover:opacity-80 transition-opacity whitespace-nowrap">
            <Crown size={11} /> Upgrade
          </span>
        </Link>
      </div>
    )
  }

  if (loading) return null

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-black uppercase tracking-widest text-dossier-foreground/40">
          Your Sources
        </p>
        {!showForm && sources.length < MAX_SOURCES && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1 text-[11px] text-dossier-foreground/50 hover:text-dossier-foreground transition-colors"
          >
            <Plus size={11} /> Add
          </button>
        )}
      </div>

      {sources.length === 0 && !showForm && (
        <p className="text-xs text-dossier-foreground/40">No personal reading links saved yet.</p>
      )}

      {sources.length > 0 && (
        <div className="space-y-1.5">
          {sources.map(s => (
            <div
              key={s.id}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-dossier-foreground/10 bg-dossier-panel/30 group"
            >
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 min-w-0 flex-1 text-xs text-dossier-foreground/80 hover:text-dossier-foreground transition-colors"
              >
                <ExternalLink size={11} className="shrink-0 text-dossier-foreground/40" />
                <span className="font-medium truncate">{s.label}</span>
                {s.chapter_range && (
                  <span className="text-dossier-foreground/40 shrink-0">· {s.chapter_range}</span>
                )}
              </a>
              <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => startEdit(s)}
                  className="p-1 text-dossier-foreground/40 hover:text-dossier-foreground transition-colors"
                >
                  <Pencil size={11} />
                </button>
                <button
                  onClick={() => handleDelete(s.id)}
                  disabled={deletingId === s.id}
                  className="p-1 text-dossier-foreground/40 hover:text-destructive transition-colors"
                >
                  {deletingId === s.id ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="p-3 rounded-lg border border-dossier-foreground/15 bg-dossier-panel/40 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Input
              value={form.label}
              onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
              placeholder="Label (e.g. MangaDex)"
              className="h-8 text-xs"
              autoFocus
            />
            <Input
              value={form.chapter_range}
              onChange={e => setForm(f => ({ ...f, chapter_range: e.target.value }))}
              placeholder="Chapter range (optional)"
              className="h-8 text-xs"
            />
          </div>
          <Input
            value={form.url}
            onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
            placeholder="https://..."
            className="h-8 text-xs"
          />
          <div className="flex items-center gap-2 pt-0.5">
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!form.label.trim() || !form.url.trim() || saving}
              className="h-7 text-xs gap-1.5"
            >
              {saving ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
              {editingId ? 'Save Changes' : 'Add Source'}
            </Button>
            <button
              onClick={resetForm}
              className="text-xs text-dossier-foreground/50 hover:text-dossier-foreground transition-colors flex items-center gap-1"
            >
              <X size={11} /> Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}