'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import {
  BookMarked, Plus, Trash2, Globe, Lock,
  Loader2, BookOpen, Pencil
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
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookMarked size={22} />
            Reading Lists
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {lists.length} list{lists.length !== 1 ? 's' : ''}
          </p>
        </div>
        {!showCreate && (
          <Button size="sm" onClick={() => setShowCreate(true)} className="gap-2">
            <Plus size={14} />
            New List
          </Button>
        )}
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-3">
          <p className="text-sm font-semibold">Create New List</p>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="List name (e.g. Currently Reading)"
            autoFocus
          />
          <Input
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Description (optional)"
          />
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm">Make this list public</span>
          </label>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleCreate}
              disabled={!newName.trim() || creating}
              className="gap-2"
            >
              {creating ? <Loader2 size={13} className="animate-spin" /> : null}
              Create List
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Lists grid */}
      {lists.length === 0 && !showCreate ? (
        <div className="text-center py-16 border border-dashed border-border rounded-xl">
          <BookMarked size={40} className="mx-auto mb-3 text-muted-foreground opacity-40" />
          <h3 className="font-semibold mb-1">No lists yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Create lists to organise your reading
          </p>
          <Button size="sm" onClick={() => setShowCreate(true)} className="gap-2">
            <Plus size={14} />
            Create Your First List
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {lists.map((list) => (
            <div
              key={list.id}
              className="p-4 rounded-xl border border-border bg-card space-y-3 hover:border-primary/50 transition-colors"
            >
              {/* List header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  {editingId === list.id ? (
                    <div className="flex gap-2">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="h-7 text-sm"
                        autoFocus
                      />
                      <Button size="sm" className="h-7 text-xs" onClick={() => handleRename(list.id)}>
                        Save
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setEditingId(null)}>
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Link
                      href={`/dashboard/lists/${list.id}`}
                      className="font-semibold text-sm truncate hover:text-primary transition-colors block"
                    >
                      {list.name}
                    </Link>
                  )}
                  {list.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                      {list.description}
                    </p>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => { setEditingId(list.id); setEditName(list.name) }}
                    title="Rename"
                  >
                    <Pencil size={12} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
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
              </div>

              {/* Stats + actions */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <BookOpen size={11} />
                    {itemCount(list)} comic{itemCount(list) !== 1 ? 's' : ''}
                  </span>
                  <button
                    onClick={() => handleTogglePublic(list.id, list.is_public)}
                    className={cn(
                      'flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border transition-colors',
                      list.is_public
                        ? 'border-green-500/30 text-green-600 bg-green-500/5'
                        : 'border-border text-muted-foreground hover:border-primary/50'
                    )}
                  >
                    {list.is_public ? <Globe size={10} /> : <Lock size={10} />}
                    {list.is_public ? 'Public' : 'Private'}
                  </button>
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatDate(list.created_at)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}