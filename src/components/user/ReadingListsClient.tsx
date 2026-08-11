'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { BookMarked, Plus, Trash2, Globe, Lock,
  Loader2, BookOpen, Pencil, Crown,
  Sparkles, Radar, Share2, Star, Check, X,
  MoreVertical, Search,
} from 'lucide-react'
import { formatDate } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'
import { UpgradeBanner } from '@/components/pro/UpgradeBanner'
import { createClient } from '@/lib/supabase/client'
import { hasUnlimitedPerks } from '@/lib/access'
import { FREE_LIMITS } from '@/lib/utils/constants'
import { ActionSheet, type ActionSheetAction } from '@/components/ui/ActionSheet'

interface ReadingList {
  id:          string
  user_id:     string
  name:        string
  description: string | null
  is_public:   boolean
  created_at:  string
  star_count:  number
  _item_count?: number
  _cover_urls?: string[]
}

const THEME_GRAD: Record<number, string> = {
  0: 'from-primary/60 via-primary/20 to-primary/5',
  1: 'from-violet-500/60 via-violet-500/20 to-violet-500/5',
  2: 'from-rose-500/60 via-rose-500/20 to-rose-500/5',
  3: 'from-amber-500/60 via-amber-500/20 to-amber-500/5',
  4: 'from-emerald-500/60 via-emerald-500/20 to-emerald-500/5',
  5: 'from-indigo-500/60 via-indigo-500/20 to-indigo-500/5',
}
const THEME_BORDER: Record<number, string> = {
  0: 'border-primary/30',     1: 'border-violet-500/30',
  2: 'border-rose-500/30',    3: 'border-amber-500/30',
  4: 'border-emerald-500/30', 5: 'border-indigo-500/30',
}
const THEME_ACCENT: Record<number, string> = {
  0: 'text-primary',      1: 'text-violet-400',
  2: 'text-rose-400',     3: 'text-amber-400',
  4: 'text-emerald-400',  5: 'text-indigo-400',
}

function themeIndex(id: string): number {
  return id.slice(-6).split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 6
}
function getCoverPreviews(list: ReadingList): string[] {
  if (Array.isArray(list._cover_urls)) return list._cover_urls.slice(0, 4)
  return []
}
function itemCount(list: ReadingList): number {
  if (typeof list._item_count === 'number') return list._item_count
  return 0
}
function StackedCover({ covers, themeGrad }: { covers: string[]; themeGrad: string }) {
  if (covers.length === 0) {
    return <div className={cn('absolute inset-0 bg-gradient-to-br', themeGrad)} />
  }
  const dominant = covers[0]
  const stack    = covers.slice(1, 4)
  return (
    <div className="absolute inset-0">
      <img src={`/api/image-proxy?url=${encodeURIComponent(dominant)}`} alt="" className="absolute inset-0 w-full h-full object-cover" aria-hidden />
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
              <img src={`/api/image-proxy?url=${encodeURIComponent(url)}`} alt="" className="w-full h-full object-cover" aria-hidden />
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
}: {
  initialLists: ReadingList[]
  basePath?:    string
  hideHeader?:  boolean
}) {
  const [lists,       setLists]       = useState(initialLists)
  const [showCreate,  setShowCreate]  = useState(false)
  const [newName,     setNewName]     = useState('')
  const [newDesc,     setNewDesc]     = useState('')
  const [isPublic,    setIsPublic]    = useState(false)
  const [creating,    setCreating]    = useState(false)
  const [deletingId,  setDeletingId]  = useState<string | null>(null)
  const [isProUser,   setIsProUser]   = useState<boolean | null>(null)

  const [editModal, setEditModal] = useState<{
    id: string; name: string; description: string; is_public: boolean
  } | null>(null)
  const [savingEdit, setSavingEdit] = useState(false)

  const [actionSheetList, setActionSheetList] = useState<ReadingList | null>(null)
  const [listSearch, setListSearch] = useState('')

  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setIsProUser(false); return }
      const { data: p } = await (supabase as any)
        .from('profiles').select('is_pro, pro_expires_at, is_patron, patron_expires_at, role').eq('id', user.id).single()
      if (!p) { setIsProUser(false); return }
      setIsProUser(hasUnlimitedPerks(p))
    }
    load()
  }, [supabase])

  const sorted    = [...lists].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  const freeIds   = new Set(sorted.slice(0, FREE_LIMITS.lists).map(l => l.id))
  const isLocked  = (id: string) => isProUser === false && !freeIds.has(id)
  const atLimit   = isProUser === false && lists.length >= FREE_LIMITS.lists
  const nearLimit = isProUser === false && lists.length === FREE_LIMITS.lists - 1

  const filteredLists = useMemo(() => {
    if (!listSearch.trim()) return lists
    const q = listSearch.toLowerCase()
    return lists.filter(l => l.name.toLowerCase().includes(q) || (l.description ?? '').toLowerCase().includes(q))
  }, [lists, listSearch])

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
        if (res.status === 403) { toast.error('List limit reached — upgrade to Pro for unlimited lists'); return }
        throw new Error(data.error)
      }
      setLists(prev => [{ ...data.list, _item_count: 0, _cover_urls: [] }, ...prev])
      setNewName(''); setNewDesc(''); setIsPublic(false); setShowCreate(false)
      toast.success('List created!')
    } catch { toast.error('Failed to create list') }
    finally  { setCreating(false) }
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      await fetch(`/api/lists/${id}`, { method: 'DELETE' })
      setLists(prev => prev.filter(l => l.id !== id))
      setActionSheetList(null)
      toast.success('List deleted')
    } catch { toast.error('Failed to delete') }
    finally  { setDeletingId(null) }
  }

  const handleEditSave = async () => {
    if (!editModal || !editModal.name.trim()) return
    setSavingEdit(true)
    try {
      const res  = await fetch(`/api/lists/${editModal.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: editModal.name, 
          description: editModal.description || null,
          is_public: editModal.is_public
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error()
      setLists(prev => prev.map(l => l.id === editModal.id ? { 
        ...l, 
        name: data.list.name,
        description: data.list.description,
        is_public: data.list.is_public
      } : l))
      setEditModal(null)
      setActionSheetList(null)
      toast.success('List updated')
    } catch { toast.error('Failed to update') }
    finally { setSavingEdit(false) }
  }

  const handleShare = async (id: string) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/lists/${id}`)
      toast.success('Link copied!')
    } catch { toast.error('Failed to copy link') }
  }

  const handleNewListClick = () => {
    if (atLimit) { toast.error('Upgrade to Pro for unlimited reading lists'); return }
    setShowCreate(true)
  }

  const buildOwnerActions = (list: ReadingList): ActionSheetAction[] => {
    return [
      { 
        label: 'Edit List', 
        icon: <Pencil size={15} />, 
        onClick: () => setEditModal({ 
          id: list.id, 
          name: list.name, 
          description: list.description || '',
          is_public: list.is_public
        }) 
      },
      { label: 'Share', icon: <Share2 size={15} />, onClick: () => handleShare(list.id) },
      { label: 'Delete', icon: deletingId === list.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />, onClick: () => { if (confirm('Delete this list and all its items?')) handleDelete(list.id) }, destructive: true },
    ]
  }

  return (
    <div className="space-y-6">

      <ActionSheet
        open={!!actionSheetList}
        onClose={() => setActionSheetList(null)}
        title={actionSheetList?.name}
        actions={actionSheetList ? buildOwnerActions(actionSheetList) : []}
      />

      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-card rounded-2xl border border-border shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-primary/5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-primary flex items-center justify-center">
                  <Pencil size={11} className="text-primary-foreground" />
                </div>
                <p className="text-xs font-black uppercase tracking-widest text-primary">Edit List</p>
              </div>
              <button onClick={() => setEditModal(null)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X size={14} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">List Name <span className="text-red-500">*</span></label>
                <Input value={editModal.name} onChange={e => setEditModal({ ...editModal, name: e.target.value })} className="h-9 text-sm" autoFocus />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Description <span className="text-muted-foreground/60">(optional)</span></label>
                <Textarea value={editModal.description} onChange={e => setEditModal({ ...editModal, description: e.target.value })} placeholder="What's this list for?" className="min-h-[72px] text-sm resize-none" rows={3} />
              </div>
              <label className="flex items-center gap-3 cursor-pointer group p-2.5 rounded-xl border border-border hover:border-primary/30 hover:bg-primary/5 transition-colors">
                <div className={cn('w-5 h-5 rounded border-2 flex items-center justify-center transition-colors shrink-0', editModal.is_public ? 'bg-primary border-primary' : 'border-border group-hover:border-primary/60')} onClick={() => setEditModal(p => p ? ({ ...p, is_public: !p.is_public }) : null)}>
                  {editModal.is_public && <Check size={12} className="text-primary-foreground" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    {editModal.is_public ? <Globe size={12} className="text-emerald-500" /> : <Lock size={12} className="text-muted-foreground" />}
                    <span className="text-sm font-medium">{editModal.is_public ? 'Public list' : 'Private list'}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{editModal.is_public ? 'Others can discover and star this list' : 'Only you can see this list'}</p>
                </div>
              </label>
              <div className="flex gap-2 pt-1">
                <Button size="sm" onClick={handleEditSave} disabled={!editModal.name.trim() || savingEdit} className="gap-2 flex-1">
                  {savingEdit ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}Save Changes
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setEditModal(null)}>Cancel</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {!hideHeader && (
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <BookMarked size={16} className="text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight"> Reading Lists</h1>
              <p className="text-muted-foreground text-sm">
                {lists.length} list{lists.length !== 1 ? 's' : ''}
                {isProUser === false && <span className="text-muted-foreground/60 ml-1">· {Math.max(0, FREE_LIMITS.lists - lists.length)} free slot{FREE_LIMITS.lists - lists.length !== 1 ? 's' : ''} remaining</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {lists.length > 3 && (
              <div className="relative hidden sm:block">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input value={listSearch} onChange={e => setListSearch(e.target.value)} placeholder="Search lists..." className="h-8 w-40 pl-7 text-xs" />
              </div>
            )}
            {!showCreate && (
              <Button size="sm" onClick={handleNewListClick} className={cn('gap-1.5', atLimit && 'bg-gradient-to-r from-amber-400 to-orange-500 border-0 hover:opacity-90')}>
                {atLimit ? <Crown size={14} /> : <Plus size={14} />}
                {atLimit ? 'Upgrade for More' : 'New List'}
              </Button>
            )}
          </div>
        </div>
      )}

      {lists.length > 3 && (
        <div className="sm:hidden relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={listSearch} onChange={e => setListSearch(e.target.value)} placeholder="Search your lists..." className="h-9 w-full pl-8 text-sm" />
        </div>
      )}

      {nearLimit && <UpgradeBanner current={lists.length} limit={FREE_LIMITS.lists} feature="reading lists" message="You're almost at your reading list limit" dismissible />}
      {atLimit && !showCreate && <UpgradeBanner current={lists.length} limit={FREE_LIMITS.lists} feature="reading lists" dismissible={false} />}

      {filteredLists.length === 0 && lists.length === 0 && !showCreate ? (
        <div className="relative overflow-hidden text-center py-20 rounded-2xl border border-dashed border-border bg-card">
          <h3 className="font-black text-xl mb-2">No lists yet</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto">Create lists to organise your reading journey</p>
          <Button size="sm" onClick={() => setShowCreate(true)} className="gap-2"><Plus size={14} />Create Your First List</Button>
        </div>
      ) : filteredLists.length === 0 && listSearch ? (
        <div className="text-center py-16 rounded-2xl border border-dashed border-border space-y-3">
          <Search size={20} className="mx-auto text-muted-foreground/50" />
          <p className="font-bold text-sm">No lists match &quot;{listSearch}&quot;</p>
          <Button variant="ghost" size="sm" onClick={() => setListSearch('')}>Clear search</Button>
        </div>
      ) : filteredLists.length > 0 && (
        <>
          <div className="sm:hidden grid grid-cols-2 gap-3 items-start">
            <div className="flex flex-col gap-3">
              {filteredLists.filter((_, i) => i % 2 === 0).map((list, posInCol) => {
                const ti = themeIndex(list.id); const covers = getCoverPreviews(list); const count = itemCount(list); const locked = isLocked(list.id); const cardH = ['h-36', 'h-44', 'h-52'][posInCol % 3]
                return (
                  <div key={list.id} className={cn('rounded-2xl border overflow-hidden relative cursor-pointer', cardH, locked ? 'border-dashed border-amber-500/30 opacity-75' : THEME_BORDER[ti])}>
                    <StackedCover covers={covers} themeGrad={THEME_GRAD[ti]} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10" />
                    <div className="absolute top-2 left-2 right-2 z-20 flex items-center justify-between">
                      {list.is_public ? <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-black/40 text-emerald-400 border border-emerald-500/30 backdrop-blur-sm"><Globe size={7} /> Public</span> : <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-black/40 text-white/60 border border-white/10 backdrop-blur-sm"><Lock size={7} /> Private</span>}
                      {count > 0 && <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-black/40 backdrop-blur-sm border border-white/10', THEME_ACCENT[ti])}><BookOpen size={7} /> {count}</span>}
                    </div>
                    <Link href={`${basePath}/${list.id}`} className="absolute inset-0 z-10" aria-label={list.name} />
                    <div className="absolute bottom-0 left-0 right-0 z-20 p-2.5 flex items-end justify-between gap-2">
                      <p className="text-white font-black text-xs leading-snug line-clamp-2 drop-shadow-md flex-1 min-w-0">{list.name}</p>
                      <button onClick={e => { e.preventDefault(); e.stopPropagation(); setActionSheetList(list) }} className="shrink-0 ml-auto w-7 h-7 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-md text-white flex items-center justify-center transition-colors border border-white/20"><MoreVertical size={12} /></button>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="flex flex-col gap-3">
              {filteredLists.filter((_, i) => i % 2 === 1).map((list, posInCol) => {
                const ti = themeIndex(list.id); const covers = getCoverPreviews(list); const count = itemCount(list); const locked = isLocked(list.id); const cardH = ['h-44', 'h-52', 'h-36'][posInCol % 3]
                return (
                  <div key={list.id} className={cn('rounded-2xl border overflow-hidden relative cursor-pointer', cardH, locked ? 'border-dashed border-amber-500/30 opacity-75' : THEME_BORDER[ti])}>
                    <StackedCover covers={covers} themeGrad={THEME_GRAD[ti]} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10" />
                    <div className="absolute top-2 left-2 right-2 z-20 flex items-center justify-between">
                      {list.is_public ? <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-black/40 text-emerald-400 border border-emerald-500/30 backdrop-blur-sm"><Globe size={7} /> Public</span> : <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-black/40 text-white/60 border border-white/10 backdrop-blur-sm"><Lock size={7} /> Private</span>}
                      {count > 0 && <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-black/40 backdrop-blur-sm border border-white/10', THEME_ACCENT[ti])}><BookOpen size={7} /> {count}</span>}
                    </div>
                    <Link href={`${basePath}/${list.id}`} className="absolute inset-0 z-10" aria-label={list.name} />
                    <div className="absolute bottom-0 left-0 right-0 z-20 p-2.5 flex items-end justify-between gap-2">
                      <p className="text-white font-black text-xs leading-snug line-clamp-2 drop-shadow-md flex-1 min-w-0">{list.name}</p>
                      <button onClick={e => { e.preventDefault(); e.stopPropagation(); setActionSheetList(list) }} className="shrink-0 ml-auto w-7 h-7 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-md text-white flex items-center justify-center transition-colors border border-white/20"><MoreVertical size={12} /></button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredLists.map((list) => {
              const ti = themeIndex(list.id); const covers = getCoverPreviews(list); const count = itemCount(list); const locked = isLocked(list.id)
              return (
                <div key={list.id} className={cn('group relative rounded-2xl border bg-card overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5', locked ? 'border-dashed border-amber-500/20 opacity-80' : THEME_BORDER[ti])}>
                  <div className={cn('h-24 relative overflow-hidden bg-gradient-to-br to-transparent', THEME_GRAD[ti])}>
                    {covers.length > 0 ? (<div className="absolute inset-0 flex gap-0.5">{covers.map((url, i) => (<div key={i} className={cn('relative overflow-hidden', covers.length === 1 ? 'flex-1' : covers.length === 2 ? 'flex-1' : covers.length === 3 && i === 0 ? 'w-1/2' : 'flex-1')}><img src={`/api/image-proxy?url=${encodeURIComponent(url)}`} alt="" className="w-full h-full object-cover opacity-70 group-hover:opacity-90 transition-opacity duration-300" /><div className="absolute inset-0 bg-gradient-to-t from-card/80 via-transparent to-transparent" /></div>))}</div>) : null}
                    <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-card to-transparent" />
                    <div className="absolute top-2 right-2">{list.is_public ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-600 border border-emerald-500/20 backdrop-blur-sm"><Globe size={8} /> Public</span> : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-muted/80 text-muted-foreground border border-border backdrop-blur-sm"><Lock size={8} /> Private</span>}</div>
                    {count > 0 && <div className="absolute bottom-2 left-2"><span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-background/80 backdrop-blur-sm border border-border', THEME_ACCENT[ti])}><BookOpen size={8} /> {count} comic{count !== 1 ? 's' : ''}</span></div>}
                  </div>
                  <div className="p-4 space-y-3">
                    <div><Link href={`${basePath}/${list.id}`} className={cn('font-black text-sm hover:text-primary transition-colors line-clamp-1 block')}>{list.name}</Link>{list.description && <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{list.description}</p>}</div>
                    <div className="flex items-center gap-1.5"><Link href={`${basePath}/${list.id}`} className="flex-1"><Button variant="outline" size="sm" className="w-full h-7 text-xs gap-1.5">View</Button></Link><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setActionSheetList(list)}><MoreVertical size={14} /></Button></div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
