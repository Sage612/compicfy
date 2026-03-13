'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import {
  BookMarked, Plus, Trash2, Globe, Lock,
  Loader2, BookOpen, Pencil, ArrowRight,
} from 'lucide-react'
import { formatDate } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'

interface ReadingList {
  id: string
  name: string
  description: string | null
  is_public: boolean
  created_at: string
  reading_list_items: { count: number }[]
}

export function ReadingListsClient({ initialLists }: { initialLists: ReadingList[] }) {
  const [lists, setLists] = useState(initialLists)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [creating, setCreating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const handleCreate = async () => {
    if (!newName.trim()) return
    setCreating(true)
    try {
      const res = await fetch('/api/lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, description: newDesc, is_public: isPublic }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setLists(prev => [{ ...data.list, reading_list_items: [] }, ...prev])
      setNewName(''); setNewDesc(''); setIsPublic(false); setShowCreate(false)
      toast.success('List created!')
    } catch {
      toast.error('Failed to create list')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this list and all its items?')) return
    setDeletingId(id)
    try {
      await fetch(`/api/lists/${id}`, { method: 'DELETE' })
      setLists(prev => prev.filter(l => l.id !== id))
      toast.success('List deleted')
    } catch {
      toast.error('Failed to delete')
    } finally {
      setDeletingId(null)
    }
  }

  const handleRename = async (id: string) => {
    if (!editName.trim()) return
    try {
      const res = await fetch(`/api/lists/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error()
      setLists(prev => prev.map(l => l.id === id ? { ...l, name: data.list.name } : l))
      setEditingId(null)
      toast.success('List renamed')
    } catch {
      toast.error('Failed to rename')
    }
  }

  const handleTogglePublic = async (id: string, current: boolean) => {
    try {
      await fetch(`/api/lists/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_public: !current }),
      })
      setLists(prev => prev.map(l => l.id === id ? { ...l, is_public: !current } : l))
      toast.success(current ? 'List is now private' : 'List is now public')
    } catch {
      toast.error('Failed to update')
    }
  }

  const itemCount = (list: ReadingList) =>
    list.reading_list_items?.[0]?.count ?? 0

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
            <BookMarked size={16} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">Reading Lists</h1>
            <p className="text-muted-foreground text-sm">
              {lists.length} list{lists.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        {!showCreate && (
          <Button
            size="sm"
            onClick={() => setShowCreate(true)}
            className="gap-1.5 bg-gradient-to-r from-primary to-violet-500 hover:opacity-90 border-0 shadow-lg shadow-primary/20"
          >
            <Plus size={14} />
            New List
          </Button>
        )}
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-gradient-to-r from-teal-500/10 to-cyan-500/5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shrink-0">
              <Plus size={13} className="text-white" />
            </div>
            <p className="text-xs font-black uppercase tracking-widest text-teal-600">Create New List</p>
          </div>
          <div className="p-5 space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">
                List Name <span className="text-red-500">*</span>
              </label>
              <Input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder='e.g. "Currently Reading", "Plan to Read"'
                autoFocus
                className="h-9 text-sm"
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">
                Description <span className="text-muted-foreground/60">(optional)</span>
              </label>
              <Input
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                placeholder="What's this list for?"
                className="h-9 text-sm"
              />
            </div>
            <label className="flex items-center gap-3 cursor-pointer group">
              <div
                className={cn(
                  'w-4 h-4 rounded border-2 flex items-center justify-center transition-colors shrink-0',
                  isPublic ? 'bg-primary border-primary' : 'border-border group-hover:border-primary/60'
                )}
                onClick={() => setIsPublic(p => !p)}
              >
                {isPublic && <span className="text-white text-[10px] font-black leading-none">✓</span>}
              </div>
              <div>
                <span className="text-sm font-medium">Make this list public</span>
                <p className="text-xs text-muted-foreground">Others can see and browse this list on your profile</p>
              </div>
            </label>
            <div className="flex gap-2 pt-1">
              <Button
                size="sm"
                onClick={handleCreate}
                disabled={!newName.trim() || creating}
                className="gap-2 bg-gradient-to-r from-primary to-violet-500 hover:opacity-90 border-0 shadow-lg shadow-primary/20"
              >
                {creating ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                Create List
              </Button>
              <Button
                variant="ghost" size="sm"
                onClick={() => { setShowCreate(false); setNewName(''); setNewDesc('') }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {lists.length === 0 && !showCreate ? (
        <div className="text-center py-16 rounded-2xl border border-dashed border-border space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto">
            <BookMarked size={22} className="text-muted-foreground opacity-40" />
          </div>
          <div>
            <h3 className="font-black text-sm">No lists yet</h3>
            <p className="text-xs text-muted-foreground mt-1">Create lists to organise your reading journey</p>
          </div>
          <Button
            size="sm"
            onClick={() => setShowCreate(true)}
            className="gap-1.5 bg-gradient-to-r from-primary to-violet-500 hover:opacity-90 border-0 shadow-lg shadow-primary/20"
          >
            <Plus size={14} />
            Create Your First List
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {lists.map((list) => {
            const count = itemCount(list)
            const isEditing = editingId === list.id

            return (
              <div
                key={list.id}
                className="group relative p-5 rounded-2xl border border-border bg-card space-y-4 hover:border-primary/40 hover:shadow-md transition-all duration-200"
              >
                {/* Name + actions */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0 space-y-0.5">
                    {isEditing ? (
                      <div className="flex gap-2">
                        <Input
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          className="h-8 text-sm"
                          autoFocus
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleRename(list.id)
                            if (e.key === 'Escape') setEditingId(null)
                          }}
                        />
                        <Button size="sm" className="h-8 text-xs px-3 shrink-0" onClick={() => handleRename(list.id)}>
                          Save
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 text-xs px-2 shrink-0" onClick={() => setEditingId(null)}>
                          ✕
                        </Button>
                      </div>
                    ) : (
                      <Link
                        href={`/dashboard/lists/${list.id}`}
                        className="font-black text-sm truncate hover:text-primary transition-colors block"
                      >
                        {list.name}
                      </Link>
                    )}
                    {list.description && !isEditing && (
                      <p className="text-xs text-muted-foreground line-clamp-1">{list.description}</p>
                    )}
                  </div>

                  {!isEditing && (
                    <div className="flex gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7"
                        onClick={() => { setEditingId(list.id); setEditName(list.name) }}
                        title="Rename"
                      >
                        <Pencil size={12} />
                      </Button>
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(list.id)}
                        disabled={deletingId === list.id}
                        title="Delete"
                      >
                        {deletingId === list.id
                          ? <Loader2 size={12} className="animate-spin" />
                          : <Trash2 size={12} />
                        }
                      </Button>
                    </div>
                  )}
                </div>

                {/* Stats + visibility + date */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <BookOpen size={11} className="text-primary/60" />
                      <span>
                        <strong className="text-foreground font-black">{count}</strong> comic{count !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <button
                      onClick={() => handleTogglePublic(list.id, list.is_public)}
                      className={cn(
                        'flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border transition-colors',
                        list.is_public
                          ? 'border-emerald-500/30 text-emerald-600 bg-emerald-500/10 hover:bg-emerald-500/20'
                          : 'border-border text-muted-foreground hover:border-primary/50'
                      )}
                    >
                      {list.is_public ? <Globe size={9} /> : <Lock size={9} />}
                      {list.is_public ? 'Public' : 'Private'}
                    </button>
                  </div>
                  <span className="text-xs text-muted-foreground">{formatDate(list.created_at)}</span>
                </div>

                {/* Hover arrow to open list */}
                <Link
                  href={`/dashboard/lists/${list.id}`}
                  className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity"
                  tabIndex={-1}
                >
                  <ArrowRight size={14} className="text-muted-foreground" />
                </Link>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}