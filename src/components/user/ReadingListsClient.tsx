'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import {
  BookMarked, Plus, Trash2, Globe, Lock,
  Loader2, BookOpen, Pencil, ArrowRight, Crown,
  Sparkles,
} from 'lucide-react'
import { formatDate } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'
import { UpgradeBanner } from '@/components/pro/UpgradeBanner'
import { createClient } from '@/lib/supabase/client'

interface ReadingList {
  id: string
  name: string
  description: string | null
  is_public: boolean
  created_at: string
  reading_list_items: { count: number }[]
}

const FREE_LIST_LIMIT = 3

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
  const [isProUser, setIsProUser] = useState<boolean | null>(null)

  const supabase = createClient()

  useEffect(() => {
    const fetchProStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setIsProUser(false); return }

      const { data: profile } = await (supabase as any)
        .from('profiles')
        .select('is_pro, pro_expires_at, role')
        .eq('id', user.id)
        .single()

      if (!profile) { setIsProUser(false); return }

      setIsProUser(
        profile.role === 'admin' ||
        ['admin', 'moderator'].includes(profile.role) ||
        (profile.is_pro &&
          (!profile.pro_expires_at || new Date(profile.pro_expires_at) > new Date()))
      )
    }
    fetchProStatus()
  }, [supabase])

  // Sort oldest first to determine free slots consistently
  const sortedLists = [...lists].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )
  const freeListIds = new Set(sortedLists.slice(0, FREE_LIST_LIMIT).map(l => l.id))

  const isListLocked = (listId: string) => isProUser === false && !freeListIds.has(listId)

  const atLimit   = isProUser === false && lists.length >= FREE_LIST_LIMIT
  const nearLimit = isProUser === false && lists.length === FREE_LIST_LIMIT - 1

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

      if (!res.ok) {
        if (res.status === 403) {
          setShowCreate(false)
          toast.error(
            <div className="flex flex-col gap-1.5">
              <p className="font-black text-sm">List limit reached</p>
              <p className="text-xs text-muted-foreground">{data.message}</p>
              <Link href="/pricing" className="text-xs font-bold text-amber-500 hover:underline flex items-center gap-1 mt-0.5">
                <Crown size={11} />Upgrade to Pro for unlimited lists
              </Link>
            </div>,
            { duration: 6000 }
          )
          return
        }
        throw new Error(data.error)
      }

      setLists(prev => [{ ...data.list, reading_list_items: [] }, ...prev])
      setNewName('')
      setNewDesc('')
      setIsPublic(false)
      setShowCreate(false)
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
    if (isListLocked(id)) {
      toast.error('Upgrade to Pro to edit this list')
      return
    }
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

  const handleNewListClick = () => {
    if (atLimit) {
      toast.error(
        <div className="flex flex-col gap-1.5">
          <p className="font-black text-sm">List limit reached</p>
          <p className="text-xs text-muted-foreground">Free users can create up to {FREE_LIST_LIMIT} reading lists.</p>
          <Link href="/pricing" className="text-xs font-bold text-amber-500 hover:underline flex items-center gap-1 mt-0.5">
            <Crown size={11} />Upgrade to Pro for unlimited lists
          </Link>
        </div>,
        { duration: 6000 }
      )
      return
    }
    setShowCreate(true)
  }

  const itemCount = (list: ReadingList) => list.reading_list_items?.[0]?.count ?? 0

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
              {isProUser === false && (
                <span className="text-muted-foreground/60 ml-1">
                  · {Math.max(0, FREE_LIST_LIMIT - lists.length)} free slot{FREE_LIST_LIMIT - lists.length !== 1 ? 's' : ''} remaining
                </span>
              )}
            </p>
          </div>
        </div>
        {!showCreate && (
          <Button
            size="sm"
            onClick={handleNewListClick}
            className={cn(
              'gap-1.5 border-0 shadow-lg',
              atLimit
                ? 'bg-gradient-to-r from-amber-400 to-orange-500 shadow-amber-500/20'
                : 'bg-gradient-to-r from-primary to-violet-500 shadow-primary/20 hover:opacity-90'
            )}
          >
            {atLimit ? <Crown size={14} /> : <Plus size={14} />}
            {atLimit ? 'Upgrade for More' : 'New List'}
          </Button>
        )}
      </div>

      {nearLimit && (
        <UpgradeBanner current={lists.length} limit={FREE_LIST_LIMIT} feature="reading lists" message="You're almost at your reading list limit" dismissible />
      )}
      {atLimit && !showCreate && (
        <UpgradeBanner current={lists.length} limit={FREE_LIST_LIMIT} feature="reading lists" dismissible={false} />
      )}

      {/* Locked lists notice — shown when user has lists beyond free limit */}
      {isProUser === false && lists.length > FREE_LIST_LIMIT && (
        <div className="flex items-start gap-3 p-4 rounded-2xl border border-amber-500/20 bg-amber-500/5">
          <Crown size={14} className="text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-amber-600">
              {lists.length - FREE_LIST_LIMIT} list{lists.length - FREE_LIST_LIMIT !== 1 ? 's are' : ' is'} locked
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Your comics are safe. Resubscribe to Pro to unlock all {lists.length} lists.
            </p>
          </div>
          <Link href="/pricing" className="shrink-0">
            <Button size="sm" className="h-7 text-xs gap-1.5 bg-gradient-to-r from-amber-400 to-orange-500 border-0 text-white hover:opacity-90">
              <Sparkles size={11} />
              Unlock
            </Button>
          </Link>
        </div>
      )}

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
              <label className="text-xs font-semibold text-muted-foreground">List Name <span className="text-red-500">*</span></label>
              <Input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder='"Currently Reading", "Plan to Read"'
                autoFocus
                className="h-9 text-sm"
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Description <span className="text-muted-foreground/60">(optional)</span></label>
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
              <Button variant="ghost" size="sm" onClick={() => { setShowCreate(false); setNewName(''); setNewDesc('') }}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {lists.length === 0 && !showCreate ? (
        <div className="relative overflow-hidden text-center py-20 rounded-2xl border border-dashed border-border bg-card">
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-teal-500/5 blur-2xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-cyan-500/5 blur-2xl pointer-events-none" />

          <div className="relative w-28 h-28 mx-auto mb-6">
            <div className="absolute top-0 left-2 w-16 h-22 rounded-xl border-2 border-border bg-muted/60 rotate-[-8deg]" />
            <div className="absolute top-2 left-5 w-16 h-22 rounded-xl border-2 border-border bg-muted/80 rotate-[-3deg]" />
            <div className="absolute top-4 left-8 w-16 h-22 rounded-xl border-2 border-teal-500/30 bg-card flex items-center justify-center shadow-lg">
              <BookMarked size={20} className="text-teal-500/50" />
            </div>
          </div>

          <h3 className="font-black text-xl mb-2">No lists yet</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto leading-relaxed">
            Create lists to organise your reading journey — currently reading, plan to read, all-time favourites.
          </p>

          <div className="flex flex-wrap justify-center gap-3">
            <Button
              size="sm"
              onClick={() => setShowCreate(true)}
              className="gap-2 bg-gradient-to-r from-primary to-violet-500 hover:opacity-90 border-0 shadow-lg shadow-primary/20"
            >
              <Plus size={14} />
              Create Your First List
            </Button>
            <Link href="/browse">
              <Button variant="outline" size="sm" className="gap-2 border-border hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all duration-200">
                <Sparkles size={14} />
                Browse Comics
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {lists.map((list) => {
            const count = itemCount(list)
            const isEditing = editingId === list.id
            const locked = isListLocked(list.id)

            return (
              <div
                key={list.id}
                className={cn(
                  'group relative p-5 rounded-2xl border bg-card space-y-4 transition-all duration-200',
                  locked
                    ? 'border-amber-500/20 hover:border-amber-500/40 opacity-80'
                    : 'border-border hover:border-primary/40 hover:shadow-md'
                )}
              >
                {/* Locked overlay badge */}
                {locked && (
                  <div className="absolute top-3 right-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 text-[10px] font-black z-10">
                    <Crown size={9} className="fill-amber-500" />
                    Locked
                  </div>
                )}

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
                        <Button size="sm" className="h-8 text-xs px-3 shrink-0" onClick={() => handleRename(list.id)}>Save</Button>
                        <Button variant="ghost" size="sm" className="h-8 text-xs px-2 shrink-0" onClick={() => setEditingId(null)}>✕</Button>
                      </div>
                    ) : (
                      <Link
                        href={`/dashboard/lists/${list.id}`}
                        className={cn(
                          'font-black text-sm truncate transition-colors block',
                          locked ? 'hover:text-amber-500' : 'hover:text-primary'
                        )}
                      >
                        {locked && <Lock size={10} className="inline mr-1.5 text-amber-500/70 mb-0.5" />}
                        {list.name}
                      </Link>
                    )}
                    {list.description && !isEditing && (
                      <p className="text-xs text-muted-foreground line-clamp-1">{list.description}</p>
                    )}
                  </div>

                  {/* Edit/Delete — always visible on mobile, hover-only on md+ */}
                  {!isEditing && !locked && (
                    <div className="flex gap-0.5 shrink-0 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7 hover:text-primary"
                        onClick={() => { setEditingId(list.id); setEditName(list.name) }}
                        title="Rename"
                      >
                        <Pencil size={12} />
                      </Button>
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive"
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

                  {/* Locked: only show delete */}
                  {!isEditing && locked && (
                    <div className="flex gap-0.5 shrink-0 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive"
                        onClick={() => handleDelete(list.id)}
                        disabled={deletingId === list.id}
                        title="Delete list"
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
                      <BookOpen size={11} className={locked ? 'text-amber-500/50' : 'text-primary/60'} />
                      <span><strong className="text-foreground font-black">{count}</strong> comic{count !== 1 ? 's' : ''}</span>
                    </div>
                    {/* Visibility toggle — disabled for locked lists */}
                    <button
                      onClick={() => !locked && handleTogglePublic(list.id, list.is_public)}
                      className={cn(
                        'flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border transition-colors',
                        locked
                          ? 'border-amber-500/20 text-amber-500/50 cursor-not-allowed'
                          : list.is_public
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

                {/* Hover arrow */}
                <Link
                  href={`/dashboard/lists/${list.id}`}
                  className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity"
                  tabIndex={-1}
                >
                  <ArrowRight size={14} className={locked ? 'text-amber-500' : 'text-muted-foreground'} />
                </Link>
              </div>
            )
          })}
        </div>
      )}

      {isProUser === false && lists.length > 0 && lists.length < FREE_LIST_LIMIT && (
        <div className="flex items-center justify-center pt-2">
          <Link href="/pricing" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-amber-500 transition-colors">
            <Sparkles size={11} />
            Upgrade to Pro for unlimited reading lists
          </Link>
        </div>
      )}
    </div>
  )
}