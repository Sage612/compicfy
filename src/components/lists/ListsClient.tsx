'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import {Layers, Globe, BookOpen, Star, Share2,
  Loader2, BookMarked, Plus, Crown, X, Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { AuthPromptModal } from '@/components/ui/auth-prompt-modal'
import { ListsSkeleton } from '@/components/lists/ListsSkeleton'

const FREE_LIST_LIMIT = 5

interface PublicList {
  id:          string
  user_id:     string
  name:        string
  description: string | null
  is_public:   boolean
  star_count:  number
  created_at:  string
  profiles: {
    username:     string
    display_name: string | null
    avatar_url:   string | null
  } | null
  reading_list_items: {
    count?:           number
    recommendations?: { cover_url: string | null } | null
  }[]
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
  0: 'text-primary',     1: 'text-violet-400',
  2: 'text-rose-400',    3: 'text-amber-400',
  4: 'text-emerald-400', 5: 'text-indigo-400',
}

function themeIndex(id: string): number {
  return id.slice(-6).split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 6
}

function getCoverPreviews(list: PublicList): string[] {
  if (Array.isArray((list as any)._cover_urls)) return (list as any)._cover_urls.slice(0, 4)
  return (list.reading_list_items ?? [])
    .map(item => item.recommendations?.cover_url ?? null)
    .filter(Boolean)
    .slice(0, 4) as string[]
}

function itemCount(list: PublicList): number {
  if (typeof (list as any)._item_count === 'number') return (list as any)._item_count
  if (!list.reading_list_items?.length) return 0
  const first = list.reading_list_items[0]
  if (typeof first?.count === 'number') return first.count
  return list.reading_list_items.length
}

function getStarLabel(starCount: number, isStarred: boolean): string {
  if (isStarred) return starCount > 0 ? `${starCount} starred` : 'Starred'
  return starCount > 0 ? `${starCount}` : 'Star'
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

interface Props {
  userId:          string | null
  starredListIds?: string[]
  myListsHref?:    string
  isProUser?:      boolean
  userListCount?:  number
}

export function ListsClient({
  userId,
  starredListIds  = [],
  myListsHref     = '/reader/dashboard/lists',
  isProUser       = false,
  userListCount   = 0,
}: Props) {
  const [lists,      setLists]      = useState<PublicList[]>([])
  const [loading,    setLoading]    = useState(true)
  const [starringId, setStarringId] = useState<string | null>(null)
  const [starredSet, setStarredSet] = useState<Set<string>>(() => new Set(starredListIds))
  const [authPrompt, setAuthPrompt] = useState(false)

  // Create form state
  const searchParams = useSearchParams()
  const [showCreate, setShowCreate] = useState(false)
  const [newName,    setNewName]    = useState('')
  const [newDesc,    setNewDesc]    = useState('')
  const [creating,   setCreating]   = useState(false)

  // Auto-open create form when navigated here from SpeedDialFAB (?create=1)
  useEffect(() => {
    if (searchParams.get('create') === '1' && userId && !atLimit) {
      setShowCreate(true)
    }
  }, [searchParams, userId])

  // atLimit: free users can only have FREE_LIST_LIMIT lists total
  const atLimit = !isProUser && userListCount >= FREE_LIST_LIMIT

  useEffect(() => { fetchLists() }, [])

  const fetchLists = async () => {
    setLoading(true)
    try {
      const res  = await fetch('/api/lists/public?limit=24')
      const data = await res.json()
      setLists(data.lists ?? [])
    } catch {
      toast.error('Failed to load lists')
    } finally {
      setLoading(false)
    }
  }

  const handleNewListClick = () => {
    if (!userId) { setAuthPrompt(true); return }
    if (atLimit) {
      toast.error(`Free users can create up to ${FREE_LIST_LIMIT} lists — upgrade to Pro for unlimited`)
      return
    }
    setShowCreate(true)
  }

  const handleCreate = async () => {
    if (!newName.trim()) return
    setCreating(true)
    try {
      const res  = await fetch('/api/lists', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name: newName, description: newDesc, is_public: true }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 403) { toast.error('List limit reached — upgrade to Pro'); return }
        throw new Error(data.error)
      }
      // New list is public so it may appear in this feed — reload to show it
      setNewName(''); setNewDesc(''); setShowCreate(false)
      toast.success('List created! Reloading...')
      await fetchLists()
    } catch { toast.error('Failed to create list') }
    finally  { setCreating(false) }
  }

  const handleStar = async (id: string, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation()
    if (!userId) { setAuthPrompt(true); return }
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

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <Globe size={16} className="text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">Reading Lists</h1>
            <p className="text-muted-foreground text-sm">Curated reading journeys from the community</p>
          </div>
        </div>

        {/* Desktop create button — only for logged-in users */}
        {userId && !showCreate && (
          <Button
            size="sm"
            onClick={handleNewListClick}
            className={cn(
              'gap-1.5 shrink-0 hidden sm:inline-flex',
              atLimit && 'bg-gradient-to-r from-amber-400 to-orange-500 border-0 hover:opacity-90'
            )}
          >
            {atLimit ? <Crown size={14} /> : <Plus size={14} />}
            {atLimit ? 'Upgrade for More' : 'New List'}
          </Button>
        )}
      </div>

      {/* ── Inline create form (slides in below header) ── */}
      {showCreate && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-primary/5">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
                <Plus size={13} className="text-primary-foreground" />
              </div>
              <p className="text-xs font-black uppercase tracking-widest text-primary">New Reading List</p>
            </div>
            <button onClick={() => { setShowCreate(false); setNewName(''); setNewDesc('') }}
              className="text-muted-foreground hover:text-foreground transition-colors">
              <X size={14} />
            </button>
          </div>
          <div className="p-5 space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">List Name <span className="text-red-500">*</span></label>
              <Input value={newName} onChange={e => setNewName(e.target.value)}
                placeholder='"Best Romance Manhwa", "My Completed Series"'
                autoFocus className="h-9 text-sm"
                onKeyDown={e => e.key === 'Enter' && handleCreate()} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Description <span className="text-muted-foreground/60">(optional)</span></label>
              <Input value={newDesc} onChange={e => setNewDesc(e.target.value)}
                placeholder="What's this list about?" className="h-9 text-sm" />
            </div>
            <p className="text-xs text-muted-foreground">
              This list will be created as <strong>public</strong> so the community can discover it.
            </p>
            <div className="flex gap-2 pt-1">
              <Button size="sm" onClick={handleCreate} disabled={!newName.trim() || creating} className="gap-2">
                {creating ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                Create List
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { setShowCreate(false); setNewName(''); setNewDesc('') }}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Loading skeleton — matches card shapes */}
      {loading && <ListsSkeleton />}

      {/* Empty */}
      {!loading && lists.length === 0 && (
        <div className="text-center py-16 rounded-2xl border border-dashed border-border space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <BookMarked size={20} className="text-primary opacity-60" />
          </div>
          <div>
            <p className="font-black text-sm">No public lists yet</p>
            <p className="text-xs text-muted-foreground mt-1">Be the first to share a reading list with the community.</p>
          </div>
          {userId && (
            <Button size="sm" onClick={handleNewListClick} className="gap-1.5">
              <Plus size={14} /> Create First List
            </Button>
          )}
        </div>
      )}

      {!loading && lists.length > 0 && (
        <>
          {/* MOBILE: Pinterest two-column */}
          <div className="sm:hidden grid grid-cols-2 gap-3 items-start">

            {/* Left column */}
            <div className="flex flex-col gap-3">
              {lists.filter((_, i) => i % 2 === 0).map((list, posInCol) => {
                const ti        = themeIndex(list.id)
                const covers    = getCoverPreviews(list)
                const count     = itemCount(list)
                const isStarred = starredSet.has(list.id)
                const isOwner   = list.user_id === userId
                const cardH     = ['h-36', 'h-44', 'h-52'][posInCol % 3]
                const username  = list.profiles?.username
                const avatar    = list.profiles?.avatar_url

                return (
                  <div key={list.id} className={cn(
                    'rounded-2xl border overflow-hidden relative cursor-pointer',
                    cardH, THEME_BORDER[ti]
                  )}>
                    <StackedCover covers={covers} themeGrad={THEME_GRAD[ti]} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10" />
                    <div className="absolute top-2 left-2 right-2 z-20 flex items-center justify-between">
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-black/40 text-emerald-400 border border-emerald-500/30 backdrop-blur-sm">
                        <Globe size={7} /> Public
                      </span>
                      {count > 0 && (
                        <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-black/40 backdrop-blur-sm border border-white/10', THEME_ACCENT[ti])}>
                          <BookOpen size={7} /> {count}
                        </span>
                      )}
                    </div>
                    <Link href={`/lists/${list.id}`} className="absolute inset-0 z-10" aria-label={list.name} />
                    <div className="absolute bottom-0 left-0 right-0 z-20 p-2.5 space-y-1.5">
                      <p className="text-white font-black text-xs leading-snug line-clamp-2 drop-shadow-md">{list.name}</p>
                      {!isOwner && username && (
                        <div className="flex items-center gap-1.5">
                          {avatar
                            ? <img src={avatar} alt={username} className="w-4 h-4 rounded-full object-cover border border-white/30" />
                            : <div className="w-4 h-4 rounded-full bg-white/20 border border-white/30 flex items-center justify-center"><span className="text-[7px] text-white font-bold">{username[0].toUpperCase()}</span></div>
                          }
                          <span className="text-[9px] text-white/70 truncate">@{username}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 relative z-30">
                        <button onClick={e => handleStar(list.id, e)} disabled={starringId === list.id}
                          className={cn('flex items-center gap-1 px-2 h-6 rounded-lg backdrop-blur-sm text-[9px] font-semibold transition-colors border',
                            isStarred ? 'bg-amber-500/70 text-white border-amber-400/40' : 'bg-white/15 hover:bg-white/25 text-white border-white/10')}>
                          {starringId === list.id ? <Loader2 size={9} className="animate-spin" /> : <Star size={9} className={isStarred ? 'fill-white' : ''} />}
                          {getStarLabel(list.star_count, isStarred)}
                        </button>
                        <button onClick={e => handleShare(list.id, e)} className="w-6 h-6 rounded-lg bg-white/15 hover:bg-white/25 backdrop-blur-sm text-white flex items-center justify-center transition-colors border border-white/10">
                          <Share2 size={9} />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Right column */}
            <div className="flex flex-col gap-3">
              {lists.filter((_, i) => i % 2 === 1).map((list, posInCol) => {
                const ti        = themeIndex(list.id)
                const covers    = getCoverPreviews(list)
                const count     = itemCount(list)
                const isStarred = starredSet.has(list.id)
                const isOwner   = list.user_id === userId
                const cardH     = ['h-44', 'h-52', 'h-36'][posInCol % 3]
                const username  = list.profiles?.username
                const avatar    = list.profiles?.avatar_url

                return (
                  <div key={list.id} className={cn(
                    'rounded-2xl border overflow-hidden relative cursor-pointer',
                    cardH, THEME_BORDER[ti]
                  )}>
                    <StackedCover covers={covers} themeGrad={THEME_GRAD[ti]} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10" />
                    <div className="absolute top-2 left-2 right-2 z-20 flex items-center justify-between">
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-black/40 text-emerald-400 border border-emerald-500/30 backdrop-blur-sm">
                        <Globe size={7} /> Public
                      </span>
                      {count > 0 && (
                        <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-black/40 backdrop-blur-sm border border-white/10', THEME_ACCENT[ti])}>
                          <BookOpen size={7} /> {count}
                        </span>
                      )}
                    </div>
                    <Link href={`/lists/${list.id}`} className="absolute inset-0 z-10" aria-label={list.name} />
                    <div className="absolute bottom-0 left-0 right-0 z-20 p-2.5 space-y-1.5">
                      <p className="text-white font-black text-xs leading-snug line-clamp-2 drop-shadow-md">{list.name}</p>
                      {!isOwner && username && (
                        <div className="flex items-center gap-1.5">
                          {avatar
                            ? <img src={avatar} alt={username} className="w-4 h-4 rounded-full object-cover border border-white/30" />
                            : <div className="w-4 h-4 rounded-full bg-white/20 border border-white/30 flex items-center justify-center"><span className="text-[7px] text-white font-bold">{username[0].toUpperCase()}</span></div>
                          }
                          <span className="text-[9px] text-white/70 truncate">@{username}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 relative z-30">
                        <button onClick={e => handleStar(list.id, e)} disabled={starringId === list.id}
                          className={cn('flex items-center gap-1 px-2 h-6 rounded-lg backdrop-blur-sm text-[9px] font-semibold transition-colors border',
                            isStarred ? 'bg-amber-500/70 text-white border-amber-400/40' : 'bg-white/15 hover:bg-white/25 text-white border-white/10')}>
                          {starringId === list.id ? <Loader2 size={9} className="animate-spin" /> : <Star size={9} className={isStarred ? 'fill-white' : ''} />}
                          {getStarLabel(list.star_count, isStarred)}
                        </button>
                        <button onClick={e => handleShare(list.id, e)} className="w-6 h-6 rounded-lg bg-white/15 hover:bg-white/25 backdrop-blur-sm text-white flex items-center justify-center transition-colors border border-white/10">
                          <Share2 size={9} />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* DESKTOP: grid */}
          <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {lists.map((list) => {
              const ti        = themeIndex(list.id)
              const covers    = getCoverPreviews(list)
              const count     = itemCount(list)
              const isStarred = starredSet.has(list.id)
              const label     = getStarLabel(list.star_count, isStarred)

              return (
                <div key={list.id} className={cn(
                  'group relative rounded-2xl border bg-card overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5',
                  THEME_BORDER[ti]
                )}>
                  <div className={cn('h-24 relative overflow-hidden bg-gradient-to-br to-transparent', THEME_GRAD[ti])}>
                    {covers.length > 0 ? (
                      <div className="absolute inset-0 flex gap-0.5">
                        {covers.map((url, i) => (
                          <div key={i} className={cn('relative overflow-hidden',
                            covers.length === 1 ? 'flex-1' :
                            covers.length === 2 ? 'flex-1' :
                            covers.length === 3 && i === 0 ? 'w-1/2' : 'flex-1')}>
                            <img src={`/api/image-proxy?url=${encodeURIComponent(url)}`} alt="" className="w-full h-full object-cover opacity-70 group-hover:opacity-90 transition-opacity duration-300" />
                            <div className="absolute inset-0 bg-gradient-to-t from-card/80 via-transparent to-transparent" />
                          </div>
                        ))}
                      </div>
                    ) : null}
                    <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-card to-transparent" />
                    <div className="absolute top-2 right-2">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-600 border border-emerald-500/20 backdrop-blur-sm">
                        <Globe size={8} /> Public
                      </span>
                    </div>
                    {count > 0 && (
                      <div className="absolute bottom-2 left-2">
                        <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-background/80 backdrop-blur-sm border border-border', THEME_ACCENT[ti])}>
                          <BookOpen size={8} /> {count} comic{count !== 1 ? 's' : ''}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="p-4 space-y-3">
                    <div>
                      <Link href={`/lists/${list.id}`} className="font-black text-sm hover:text-primary transition-colors line-clamp-1 block">
                        {list.name}
                      </Link>
                      {list.description && (
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
                      {list.profiles && list.user_id !== userId && (
                        <Link href={`/profile/${list.profiles.username}`} className="text-[10px] hover:text-primary transition-colors truncate max-w-[80px] ml-auto">
                          @{list.profiles.username}
                        </Link>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Link href={`/lists/${list.id}`} className="flex-1">
                        <button className="w-full h-7 text-xs rounded-md border border-border hover:border-primary/40 hover:text-primary transition-colors font-medium">
                          View
                        </button>
                      </Link>
                      <button
                        className={cn('h-7 gap-1 text-xs px-2 rounded-md flex items-center transition-colors',
                          isStarred ? 'text-amber-500' : 'text-muted-foreground hover:text-foreground')}
                        onClick={e => handleStar(list.id, e)} disabled={starringId === list.id}>
                        {starringId === list.id ? <Loader2 size={11} className="animate-spin" /> : <Star size={11} className={isStarred ? 'fill-amber-500' : ''} />}
                        {label}
                      </button>
                      <button className="h-7 w-7 flex items-center justify-center text-muted-foreground hover:text-foreground rounded-md transition-colors"
                        onClick={e => handleShare(list.id, e)}>
                        <Share2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
            <AuthPromptModal
              open={authPrompt}
              onClose={() => setAuthPrompt(false)}
              config={{
                action: 'star and save lists',
                icon:   <Star size={24} className="text-amber-500" />,
              }}
            />
          </div>
        </>
      )}

      {/* Manage link */}
      {userId && (
        <div className="flex items-center justify-center pt-2">
          <Link href={myListsHref} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors">
            <BookMarked size={11} /> Manage my reading lists
          </Link>
        </div>
      )}

      
    </div>
  )
}

