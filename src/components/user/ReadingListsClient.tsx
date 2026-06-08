'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import {
  BookMarked, Plus, Trash2, Globe, Lock,
  Loader2, BookOpen, Pencil, ArrowRight, Crown,
  Sparkles, Radar, Share2, Star,
} from 'lucide-react'
import { formatDate } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'
import { UpgradeBanner } from '@/components/pro/UpgradeBanner'
import { createClient } from '@/lib/supabase/client'

interface ReadingList {
  id:          string
  user_id:     string
  name:        string
  description: string | null
  is_public:   boolean
  created_at:  string
  star_count:  number
  reading_list_items: {
    count?:           number
    recommendations?: { cover_url: string | null } | null
  }[]
  profiles?: {
    username:     string
    display_name: string | null
    avatar_url:   string | null
  } | null
}

const FREE_LIST_LIMIT = 5

// ── Theme system matching collections ────────────────────────────────────────
const THEME_GRAD: Record<number, string> = {
  0: 'from-primary/60 via-primary/20 to-primary/5',
  1: 'from-violet-500/60 via-violet-500/20 to-violet-500/5',
  2: 'from-rose-500/60 via-rose-500/20 to-rose-500/5',
  3: 'from-amber-500/60 via-amber-500/20 to-amber-500/5',
  4: 'from-emerald-500/60 via-emerald-500/20 to-emerald-500/5',
  5: 'from-indigo-500/60 via-indigo-500/20 to-indigo-500/5',
}

const THEME_BORDER: Record<number, string> = {
  0: 'border-primary/30',
  1: 'border-violet-500/30',
  2: 'border-rose-500/30',
  3: 'border-amber-500/30',
  4: 'border-emerald-500/30',
  5: 'border-indigo-500/30',
}

const THEME_ACCENT: Record<number, string> = {
  0: 'text-primary',
  1: 'text-violet-400',
  2: 'text-rose-400',
  3: 'text-amber-400',
  4: 'text-emerald-400',
  5: 'text-indigo-400',
}

// Stable theme index from list id
function themeIndex(id: string): number {
  const seed = id.slice(-6).split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return seed % 6
}

// Stable Pinterest card height from id
function cardHeight(id: string): string {
  const seed = id.slice(-8).split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return ['h-36', 'h-44', 'h-52'][seed % 3]
}

function getCoverPreviews(list: ReadingList): string[] {
  return (list.reading_list_items ?? [])
    .map(item => item.recommendations?.cover_url ?? null)
    .filter(Boolean)
    .slice(0, 4) as string[]
}

function itemCount(list: ReadingList): number {
  // _item_count is pre-computed server-side to avoid Supabase aggregate conflict
  if (typeof (list as any)._item_count === 'number') return (list as any)._item_count
  if (!list.reading_list_items?.length) return 0
  // API returns count as first item's count or array length
  const first = list.reading_list_items[0]
  if (typeof first?.count === 'number') return first.count
  return list.reading_list_items.length
}

function StarLabel(starCount: number, isStarred: boolean): string {
  if (isStarred) return starCount > 0 ? `${starCount} starred` : 'Starred'
  return starCount > 0 ? `${starCount}` : 'Star'
}

// ── Stacked cover ────────────────────────────────────────────────────────────
function StackedCover({ covers, themeGrad }: { covers: string[]; themeGrad: string }) {
  if (covers.length === 0) {
    return <div className={cn('absolute inset-0 bg-gradient-to-br', themeGrad)} />
  }
  const dominant = covers[0]
  const stack    = covers.slice(1, 4)
  return (
    <div className="absolute inset-0">
      <img src={dominant} alt="" className="absolute inset-0 w-full h-full object-cover" aria-hidden />
      {stack.length > 0 && (
        <div className="absolute bottom-14 right-2 flex items-end">
          {stack.map((url, i) => (
            <div key={i} className="relative rounded-lg overflow-hidden border-2 border-black/40 shadow-xl"
              style={{
                width: 32 - i * 4, height: 44 - i * 5,
                marginLeft: i === 0 ? 0 : -10,
                zIndex: stack.length - i,
                opacity: 1 - i * 0.12,
                transform: `rotate(${i % 2 === 0 ? 5 : -4}deg) translateY(${i * 2}px)`,
              }}>
              <img src={url} alt="" className="w-full h-full object-cover" aria-hidden />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function ReadingListsClient({
  initialLists,
  basePath    = '/dashboard/lists',
  hideHeader  = false,
  starredIds  = [],
}: {
  initialLists: ReadingList[]
  basePath?:    string
  hideHeader?:  boolean
  starredIds?:  string[]
}) {
  const [lists,       setLists]       = useState(initialLists)
  const [showCreate,  setShowCreate]  = useState(false)
  const [newName,     setNewName]     = useState('')
  const [newDesc,     setNewDesc]     = useState('')
  const [isPublic,    setIsPublic]    = useState(false)
  const [creating,    setCreating]    = useState(false)
  const [deletingId,  setDeletingId]  = useState<string | null>(null)
  const [editingId,   setEditingId]   = useState<string | null>(null)
  const [editName,    setEditName]    = useState('')
  const [isProUser,   setIsProUser]   = useState<boolean | null>(null)
  const [userId,      setUserId]      = useState<string | null>(null)
  const [starringId,  setStarringId]  = useState<string | null>(null)
  const [starredSet,  setStarredSet]  = useState<Set<string>>(() => new Set(starredIds))

  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setIsProUser(false); return }
      setUserId(user.id)
      const { data: p } = await (supabase as any)
        .from('profiles').select('is_pro, pro_expires_at, role').eq('id', user.id).single()
      if (!p) { setIsProUser(false); return }
      setIsProUser(
        ['admin', 'moderator'].includes(p.role) ||
        (p.is_pro && (!p.pro_expires_at || new Date(p.pro_expires_at) > new Date()))
      )
    }
    load()
  }, [supabase])

  const sorted    = [...lists].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  const freeIds   = new Set(sorted.slice(0, FREE_LIST_LIMIT).map(l => l.id))
  const isLocked  = (id: string) => isProUser === false && !freeIds.has(id)
  const atLimit   = isProUser === false && lists.length >= FREE_LIST_LIMIT
  const nearLimit = isProUser === false && lists.length === FREE_LIST_LIMIT - 1

  const handleCreate = async () => {
    if (!newName.trim()) return
    setCreating(true)
    try {
      const res  = await fetch('/api/lists', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, description: newDesc, is_public: isPublic }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 403) {
          setShowCreate(false)
          toast.error('List limit reached — upgrade to Pro for unlimited lists')
          return
        }
        throw new Error(data.error)
      }
      setLists(prev => [{ ...data.list, reading_list_items: [], star_count: 0 }, ...prev])
      setNewName(''); setNewDesc(''); setIsPublic(false); setShowCreate(false)
      toast.success('List created!')
    } catch { toast.error('Failed to create list') }
    finally  { setCreating(false) }
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation()
    if (!confirm('Delete this list and all its items?')) return
    setDeletingId(id)
    try {
      await fetch(`/api/lists/${id}`, { method: 'DELETE' })
      setLists(prev => prev.filter(l => l.id !== id))
      toast.success('List deleted')
    } catch { toast.error('Failed to delete') }
    finally  { setDeletingId(null) }
  }

  const handleRename = async (id: string) => {
    if (!editName.trim()) return
    try {
      const res  = await fetch(`/api/lists/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error()
      setLists(prev => prev.map(l => l.id === id ? { ...l, name: data.list.name } : l))
      setEditingId(null); toast.success('List renamed')
    } catch { toast.error('Failed to rename') }
  }

  const handleTogglePublic = async (id: string, current: boolean, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation()
    if (isLocked(id)) { toast.error('Upgrade to Pro to edit this list'); return }
    try {
      await fetch(`/api/lists/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_public: !current }),
      })
      setLists(prev => prev.map(l => l.id === id ? { ...l, is_public: !current } : l))
      toast.success(current ? 'List is now private' : 'List is now public')
    } catch { toast.error('Failed to update') }
  }

  const handleStar = async (id: string, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation()
    if (!userId) { toast.error('Log in to star lists'); return }
    const isStarred = starredSet.has(id)
    setStarringId(id)
    try {
      const res  = await fetch(`/api/lists/${id}/star`, { method: isStarred ? 'DELETE' : 'POST' })
      const data = await res.json()
      if (!res.ok) { toast.error('Failed to update'); return }
      setStarredSet(prev => { const n = new Set(prev); isStarred ? n.delete(id) : n.add(id); return n })
      setLists(prev => prev.map(l =>
        l.id === id ? { ...l, star_count: data.star_count ?? l.star_count } : l
      ))
      toast.success(isStarred ? 'Removed star' : 'List starred!')
    } catch { toast.error('Failed to update') }
    finally { setStarringId(null) }
  }

  const handleShare = async (id: string, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation()
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/lists/${id}`)
      toast.success('Link copied!')
    } catch { toast.error('Failed to copy link') }
  }

  const handleNewListClick = () => {
    if (atLimit) { toast.error('Upgrade to Pro for unlimited reading lists'); return }
    setShowCreate(true)
  }

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      {!hideHeader && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <BookMarked size={16} className="text-primary" />
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
            <Button size="sm" onClick={handleNewListClick}
              className={cn('gap-1.5', atLimit && 'bg-gradient-to-r from-amber-400 to-orange-500 border-0 hover:opacity-90')}>
              {atLimit ? <Crown size={14} /> : <Plus size={14} />}
              {atLimit ? 'Upgrade for More' : 'New List'}
            </Button>
          )}
        </div>
      )}

      {hideHeader && !showCreate && (
        <div className="flex justify-end">
          <Button size="sm" onClick={handleNewListClick}
            className={cn('gap-1.5', atLimit && 'bg-gradient-to-r from-amber-400 to-orange-500 border-0 hover:opacity-90')}>
            {atLimit ? <Crown size={14} /> : <Plus size={14} />}
            {atLimit ? 'Upgrade for More' : 'New List'}
          </Button>
        </div>
      )}

      {nearLimit && <UpgradeBanner current={lists.length} limit={FREE_LIST_LIMIT} feature="reading lists" message="You're almost at your reading list limit" dismissible />}
      {atLimit && !showCreate && <UpgradeBanner current={lists.length} limit={FREE_LIST_LIMIT} feature="reading lists" dismissible={false} />}

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
              <Sparkles size={11} />Unlock
            </Button>
          </Link>
        </div>
      )}

      {/* ── Create form ── */}
      {showCreate && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-primary/5">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
              <Plus size={13} className="text-primary-foreground" />
            </div>
            <p className="text-xs font-black uppercase tracking-widest text-primary">Create New List</p>
          </div>
          <div className="p-5 space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">List Name <span className="text-red-500">*</span></label>
              <Input value={newName} onChange={e => setNewName(e.target.value)}
                placeholder='"Currently Reading", "Plan to Read"' autoFocus
                className="h-9 text-sm" onKeyDown={e => e.key === 'Enter' && handleCreate()} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Description <span className="text-muted-foreground/60">(optional)</span></label>
              <Input value={newDesc} onChange={e => setNewDesc(e.target.value)}
                placeholder="What's this list for?" className="h-9 text-sm" />
            </div>
            <label className="flex items-center gap-3 cursor-pointer group">
              <div
                className={cn('w-4 h-4 rounded border-2 flex items-center justify-center transition-colors shrink-0',
                  isPublic ? 'bg-primary border-primary' : 'border-border group-hover:border-primary/60')}
                onClick={() => setIsPublic(p => !p)}>
                {isPublic && <span className="text-primary-foreground text-[10px] font-black leading-none">✓</span>}
              </div>
              <div>
                <span className="text-sm font-medium">Make this list public</span>
                <p className="text-xs text-muted-foreground">Others can discover and star this list</p>
              </div>
            </label>
            <div className="flex gap-2 pt-1">
              <Button size="sm" onClick={handleCreate} disabled={!newName.trim() || creating} className="gap-2">
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

      {/* ── Empty state ── */}
      {lists.length === 0 && !showCreate ? (
        <div className="relative overflow-hidden text-center py-20 rounded-2xl border border-dashed border-border bg-card">
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-primary/5 blur-2xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-primary/5 blur-2xl pointer-events-none" />
          <div className="relative w-28 h-28 mx-auto mb-6">
            <div className="absolute top-0 left-2 w-16 h-22 rounded-xl border-2 border-border bg-muted/60 rotate-[-8deg]" />
            <div className="absolute top-2 left-5 w-16 h-22 rounded-xl border-2 border-border bg-muted/80 rotate-[-3deg]" />
            <div className="absolute top-4 left-8 w-16 h-22 rounded-xl border-2 border-primary/30 bg-card flex items-center justify-center shadow-lg">
              <BookMarked size={20} className="text-primary/50" />
            </div>
          </div>
          <h3 className="font-black text-xl mb-2">No lists yet</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto leading-relaxed">
            Create lists to organise your reading journey — currently reading, plan to read, all-time favourites.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button size="sm" onClick={() => setShowCreate(true)} className="gap-2">
              <Plus size={14} />Create Your First List
            </Button>
            <Link href="/browse">
              <Button variant="outline" size="sm" className="gap-2 hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all duration-200">
                <Radar size={14} />Browse Comics
              </Button>
            </Link>
          </div>
        </div>
      ) : lists.length > 0 && (
        <>
          {/* ── MOBILE: Pinterest staggered ── */}
          <div className="sm:hidden grid grid-cols-2 gap-3 items-start">

            {/* Left column */}
            <div className="flex flex-col gap-3">
              {lists.filter((_, i) => i % 2 === 0).map((list, posInCol) => {
                const ti      = themeIndex(list.id)
                const covers  = getCoverPreviews(list)
                const count   = itemCount(list)
                const locked  = isLocked(list.id)
                const isOwner = list.user_id === userId
                const isStarred = starredSet.has(list.id)
                const cardH   = ['h-36', 'h-44', 'h-52'][posInCol % 3]

                return (
                  <div key={list.id} className={cn(
                    'rounded-2xl border overflow-hidden relative cursor-pointer',
                    cardH,
                    locked ? 'border-dashed border-amber-500/30 opacity-75' : THEME_BORDER[ti]
                  )}>
                    <StackedCover covers={covers} themeGrad={THEME_GRAD[ti]} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10" />

                    {/* Top badges */}
                    <div className="absolute top-2 left-2 right-2 z-20 flex items-center justify-between">
                      {list.is_public
                        ? <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-black/40 text-emerald-400 border border-emerald-500/30 backdrop-blur-sm"><Globe size={7} /> Public</span>
                        : <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-black/40 text-white/60 border border-white/10 backdrop-blur-sm"><Lock size={7} /> Private</span>
                      }
                      {count > 0 && (
                        <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-black/40 backdrop-blur-sm border border-white/10', THEME_ACCENT[ti])}>
                          <BookOpen size={7} /> {count}
                        </span>
                      )}
                    </div>

                    <Link href={`${basePath}/${list.id}`} className="absolute inset-0 z-10" aria-label={list.name} />

                    <div className="absolute bottom-0 left-0 right-0 z-20 p-2.5 space-y-1.5">
                      <p className="text-white font-black text-xs leading-snug line-clamp-2 drop-shadow-md">{list.name}</p>
                      <div className="flex items-center gap-1.5 relative z-30">
                        {isOwner ? (
                          <>
                            <button onClick={e => handleShare(list.id, e)} className="flex items-center gap-1 px-2 h-6 rounded-lg bg-white/15 hover:bg-white/25 backdrop-blur-sm text-white text-[9px] font-semibold transition-colors border border-white/10">
                              <Share2 size={9} /> Share
                            </button>
                            <button onClick={e => handleTogglePublic(list.id, list.is_public, e)} className="w-6 h-6 rounded-lg bg-white/15 hover:bg-white/25 backdrop-blur-sm text-white flex items-center justify-center transition-colors border border-white/10">
                              {list.is_public ? <Lock size={10} /> : <Globe size={10} />}
                            </button>
                            <button onClick={e => handleDelete(list.id, e)} disabled={deletingId === list.id} className="w-6 h-6 rounded-lg bg-white/15 hover:bg-red-500/60 backdrop-blur-sm text-white flex items-center justify-center transition-colors border border-white/10">
                              {deletingId === list.id ? <Loader2 size={9} className="animate-spin" /> : <Trash2 size={9} />}
                            </button>
                          </>
                        ) : (
                          <>
                            <button onClick={e => handleStar(list.id, e)} disabled={starringId === list.id} className={cn('flex items-center gap-1 px-2 h-6 rounded-lg backdrop-blur-sm text-[9px] font-semibold transition-colors border', isStarred ? 'bg-amber-500/70 text-white border-amber-400/40' : 'bg-white/15 hover:bg-white/25 text-white border-white/10')}>
                              {starringId === list.id ? <Loader2 size={9} className="animate-spin" /> : <Star size={9} className={isStarred ? 'fill-white' : ''} />}
                              {StarLabel(list.star_count, isStarred)}
                            </button>
                            <button onClick={e => handleShare(list.id, e)} className="w-6 h-6 rounded-lg bg-white/15 hover:bg-white/25 backdrop-blur-sm text-white flex items-center justify-center transition-colors border border-white/10">
                              <Share2 size={9} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Right column — offset heights */}
            <div className="flex flex-col gap-3">
              {lists.filter((_, i) => i % 2 === 1).map((list, posInCol) => {
                const ti      = themeIndex(list.id)
                const covers  = getCoverPreviews(list)
                const count   = itemCount(list)
                const locked  = isLocked(list.id)
                const isOwner = list.user_id === userId
                const isStarred = starredSet.has(list.id)
                const cardH   = ['h-44', 'h-52', 'h-36'][posInCol % 3]

                return (
                  <div key={list.id} className={cn(
                    'rounded-2xl border overflow-hidden relative cursor-pointer',
                    cardH,
                    locked ? 'border-dashed border-amber-500/30 opacity-75' : THEME_BORDER[ti]
                  )}>
                    <StackedCover covers={covers} themeGrad={THEME_GRAD[ti]} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10" />

                    <div className="absolute top-2 left-2 right-2 z-20 flex items-center justify-between">
                      {list.is_public
                        ? <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-black/40 text-emerald-400 border border-emerald-500/30 backdrop-blur-sm"><Globe size={7} /> Public</span>
                        : <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-black/40 text-white/60 border border-white/10 backdrop-blur-sm"><Lock size={7} /> Private</span>
                      }
                      {count > 0 && (
                        <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-black/40 backdrop-blur-sm border border-white/10', THEME_ACCENT[ti])}>
                          <BookOpen size={7} /> {count}
                        </span>
                      )}
                    </div>

                    <Link href={`${basePath}/${list.id}`} className="absolute inset-0 z-10" aria-label={list.name} />

                    <div className="absolute bottom-0 left-0 right-0 z-20 p-2.5 space-y-1.5">
                      <p className="text-white font-black text-xs leading-snug line-clamp-2 drop-shadow-md">{list.name}</p>
                      <div className="flex items-center gap-1.5 relative z-30">
                        {isOwner ? (
                          <>
                            <button onClick={e => handleShare(list.id, e)} className="flex items-center gap-1 px-2 h-6 rounded-lg bg-white/15 hover:bg-white/25 backdrop-blur-sm text-white text-[9px] font-semibold transition-colors border border-white/10">
                              <Share2 size={9} /> Share
                            </button>
                            <button onClick={e => handleTogglePublic(list.id, list.is_public, e)} className="w-6 h-6 rounded-lg bg-white/15 hover:bg-white/25 backdrop-blur-sm text-white flex items-center justify-center transition-colors border border-white/10">
                              {list.is_public ? <Lock size={10} /> : <Globe size={10} />}
                            </button>
                            <button onClick={e => handleDelete(list.id, e)} disabled={deletingId === list.id} className="w-6 h-6 rounded-lg bg-white/15 hover:bg-red-500/60 backdrop-blur-sm text-white flex items-center justify-center transition-colors border border-white/10">
                              {deletingId === list.id ? <Loader2 size={9} className="animate-spin" /> : <Trash2 size={9} />}
                            </button>
                          </>
                        ) : (
                          <>
                            <button onClick={e => handleStar(list.id, e)} disabled={starringId === list.id} className={cn('flex items-center gap-1 px-2 h-6 rounded-lg backdrop-blur-sm text-[9px] font-semibold transition-colors border', isStarred ? 'bg-amber-500/70 text-white border-amber-400/40' : 'bg-white/15 hover:bg-white/25 text-white border-white/10')}>
                              {starringId === list.id ? <Loader2 size={9} className="animate-spin" /> : <Star size={9} className={isStarred ? 'fill-white' : ''} />}
                              {StarLabel(list.star_count, isStarred)}
                            </button>
                            <button onClick={e => handleShare(list.id, e)} className="w-6 h-6 rounded-lg bg-white/15 hover:bg-white/25 backdrop-blur-sm text-white flex items-center justify-center transition-colors border border-white/10">
                              <Share2 size={9} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── DESKTOP: grid ── */}
          <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {lists.map((list) => {
              const ti        = themeIndex(list.id)
              const covers    = getCoverPreviews(list)
              const count     = itemCount(list)
              const locked    = isLocked(list.id)
              const isOwner   = list.user_id === userId
              const isStarred = starredSet.has(list.id)
              const isEditing = editingId === list.id
              const starLabel = StarLabel(list.star_count, isStarred)

              return (
                <div key={list.id} className={cn(
                  'group relative rounded-2xl border bg-card overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5',
                  locked ? 'border-dashed border-amber-500/20 opacity-80' : THEME_BORDER[ti]
                )}>
                  {/* Cover banner */}
                  <div className={cn('h-24 relative overflow-hidden bg-gradient-to-br to-transparent', THEME_GRAD[ti])}>
                    {covers.length > 0 ? (
                      <div className="absolute inset-0 flex gap-0.5">
                        {covers.map((url, i) => (
                          <div key={i} className={cn('relative overflow-hidden',
                            covers.length === 1 ? 'flex-1' :
                            covers.length === 2 ? 'flex-1' :
                            covers.length === 3 && i === 0 ? 'w-1/2' : 'flex-1')}>
                            <img src={url} alt="" className="w-full h-full object-cover opacity-70 group-hover:opacity-90 transition-opacity duration-300" />
                            <div className="absolute inset-0 bg-gradient-to-t from-card/80 via-transparent to-transparent" />
                          </div>
                        ))}
                      </div>
                    ) : null}
                    <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-card to-transparent" />
                    <div className="absolute top-2 right-2">
                      {list.is_public
                        ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-600 border border-emerald-500/20 backdrop-blur-sm"><Globe size={8} /> Public</span>
                        : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-muted/80 text-muted-foreground border border-border backdrop-blur-sm"><Lock size={8} /> Private</span>
                      }
                    </div>
                    {count > 0 && (
                      <div className="absolute bottom-2 left-2">
                        <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-background/80 backdrop-blur-sm border border-border', THEME_ACCENT[ti])}>
                          <BookOpen size={8} /> {count} comic{count !== 1 ? 's' : ''}
                        </span>
                      </div>
                    )}
                    {locked && (
                      <div className="absolute top-2 left-2">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/20 text-amber-600 border border-amber-500/20">
                          <Crown size={8} className="fill-amber-500" /> Locked
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Body */}
                  <div className="p-4 space-y-3">
                    <div>
                      {isEditing ? (
                        <div className="flex gap-2">
                          <Input value={editName} onChange={e => setEditName(e.target.value)}
                            className="h-8 text-sm" autoFocus
                            onKeyDown={e => { if (e.key === 'Enter') handleRename(list.id); if (e.key === 'Escape') setEditingId(null) }} />
                          <Button size="sm" className="h-8 text-xs px-3 shrink-0" onClick={() => handleRename(list.id)}>Save</Button>
                          <Button variant="ghost" size="sm" className="h-8 text-xs px-2 shrink-0" onClick={() => setEditingId(null)}>✕</Button>
                        </div>
                      ) : (
                        <Link href={`${basePath}/${list.id}`} className={cn('font-black text-sm hover:text-primary transition-colors line-clamp-1 block', locked && 'hover:text-amber-500')}>
                          {list.name}
                        </Link>
                      )}
                      {list.description && !isEditing && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5 leading-relaxed">{list.description}</p>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      {list.star_count > 0 && (
                        <span className="flex items-center gap-1 text-[10px]">
                          <Star size={9} className="text-amber-500/60" />
                          {list.star_count} starred
                        </span>
                      )}
                      <span className="text-[10px] ml-auto">{formatDate(list.created_at)}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Link href={`${basePath}/${list.id}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full h-7 text-xs gap-1.5 hover:border-primary/40 hover:text-primary">
                          View
                        </Button>
                      </Link>
                      {isOwner ? (
                        <>
                          {!locked && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary"
                              onClick={() => { setEditingId(list.id); setEditName(list.name) }} title="Rename">
                              <Pencil size={12} />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={e => handleTogglePublic(list.id, list.is_public, e)} title={list.is_public ? 'Make private' : 'Make public'}>
                            {list.is_public ? <Lock size={12} /> : <Globe size={12} />}
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={e => handleShare(list.id, e)} title="Share">
                            <Share2 size={12} />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={e => handleDelete(list.id, e)} disabled={deletingId === list.id}>
                            {deletingId === list.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button variant="ghost" size="sm"
                            className={cn('h-7 gap-1 text-xs px-2', isStarred ? 'text-amber-500' : 'text-muted-foreground hover:text-foreground')}
                            onClick={e => handleStar(list.id, e)} disabled={starringId === list.id}>
                            {starringId === list.id ? <Loader2 size={11} className="animate-spin" /> : <Star size={11} className={isStarred ? 'fill-amber-500' : ''} />}
                            {starLabel}
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={e => handleShare(list.id, e)}>
                            <Share2 size={12} />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Mobile FAB */}
          {userId && (
            <button
              onClick={() => atLimit ? toast.error('Upgrade to Pro for unlimited lists') : setShowCreate(true)}
              className={cn(
                'sm:hidden fixed bottom-36 right-4 z-40 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-200 active:scale-95',
                atLimit ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white' : 'bg-primary text-primary-foreground hover:bg-primary/90'
              )}
              aria-label="Create new list"
            >
              {atLimit ? <Crown size={22} /> : <Plus size={24} />}
            </button>
          )}
        </>
      )}

      {isProUser === false && lists.length > 0 && lists.length < FREE_LIST_LIMIT && (
        <div className="flex items-center justify-center pt-2">
          <Link href="/pricing" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-amber-500 transition-colors">
            <Sparkles size={11} />Upgrade to Pro for unlimited reading lists
          </Link>
        </div>
      )}
    </div>
  )
}