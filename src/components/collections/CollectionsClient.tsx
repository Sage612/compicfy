'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import {
  Plus, Globe, Lock, Loader2,
  Trash2, Crown, Share2,
  X, Layers, BookOpen,
  Bookmark, BookmarkCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Collection {
  id:           string
  user_id:      string
  title:        string
  description:  string | null
  cover_url:    string | null
  theme_color:  string
  is_published: boolean
  save_count:   number
  view_count:   number
  created_at:   string
  profiles: {
    username:     string
    display_name: string | null
    avatar_url:   string | null
  } | null
  collection_items: { recommendations?: { cover_url: string | null } | null }[]
}

const FREE_LIMIT = 3

const THEME_OPTIONS = [
  { value: 'primary', label: 'Teal',   color: 'bg-primary'     },
  { value: 'violet',  label: 'Violet', color: 'bg-violet-500'  },
  { value: 'rose',    label: 'Rose',   color: 'bg-rose-500'    },
  { value: 'amber',   label: 'Amber',  color: 'bg-amber-500'   },
  { value: 'emerald', label: 'Green',  color: 'bg-emerald-500' },
  { value: 'indigo',  label: 'Indigo', color: 'bg-indigo-500'  },
]

const THEME_GRAD: Record<string, string> = {
  primary: 'from-primary/60 via-primary/20 to-primary/5',
  violet:  'from-violet-500/60 via-violet-500/20 to-violet-500/5',
  rose:    'from-rose-500/60 via-rose-500/20 to-rose-500/5',
  amber:   'from-amber-500/60 via-amber-500/20 to-amber-500/5',
  emerald: 'from-emerald-500/60 via-emerald-500/20 to-emerald-500/5',
  indigo:  'from-indigo-500/60 via-indigo-500/20 to-indigo-500/5',
}

const THEME_BORDER: Record<string, string> = {
  primary: 'border-primary/30',
  violet:  'border-violet-500/30',
  rose:    'border-rose-500/30',
  amber:   'border-amber-500/30',
  emerald: 'border-emerald-500/30',
  indigo:  'border-indigo-500/30',
}

const THEME_ACCENT: Record<string, string> = {
  primary: 'text-primary',
  violet:  'text-violet-400',
  rose:    'text-rose-400',
  amber:   'text-amber-400',
  emerald: 'text-emerald-400',
  indigo:  'text-indigo-400',
}

function itemCount(c: Collection): number {
  return c.collection_items?.length ?? 0
}

function getCoverPreviews(c: Collection): string[] {
  return (c.collection_items ?? [])
    .map((item) => item.recommendations?.cover_url ?? null)
    .filter(Boolean)
    .slice(0, 4) as string[]
}

// ── Pinterest column height ───────────────────────────────────────────────
// Heights cycle by position within each column (0→h-36, 1→h-44, 2→h-52).
// Using explicit two-column arrays (not CSS columns) so React controls
// placement and the pattern never shifts on create/delete.
const CARD_HEIGHTS = ['h-36', 'h-44', 'h-52'] as const
function colHeightClass(positionInColumn: number): string {
  return CARD_HEIGHTS[positionInColumn % 3]
}

// ── Save button label helper ───────────────────────────────────────────────
// Show the real save_count from DB (now always accurate via trigger).
// When saved: always show "N saved". When not saved: show count if > 0, else "Save".
function getSaveLabel(saveCount: number, isSaved: boolean): string {
  if (isSaved) return saveCount > 0 ? `${saveCount} saved` : 'Saved'
  return saveCount > 0 ? `${saveCount}` : 'Save'
}

// ── Stacked cover for mobile card ───────────────────────────────────────────
function StackedCover({
  covers,
  themeGrad,
  coverUrl,
}: {
  covers:    string[]
  themeGrad: string
  coverUrl:  string | null
}) {
  if (covers.length === 0) {
    return (
      <div className="absolute inset-0">
        {coverUrl ? (
          <img src={coverUrl} alt="" className="absolute inset-0 w-full h-full object-cover" aria-hidden />
        ) : (
          <div className={cn('absolute inset-0 bg-gradient-to-br', themeGrad)} />
        )}
      </div>
    )
  }

  const dominant = covers[0]
  const stack    = covers.slice(1, 4)

  return (
    <div className="absolute inset-0">
      {/* Dominant — full bleed */}
      <img src={dominant} alt="" className="absolute inset-0 w-full h-full object-cover" aria-hidden />

      {/* Stacked thumbnails bottom-right */}
      {stack.length > 0 && (
        <div className="absolute bottom-14 right-2 flex items-end">
          {stack.map((url, i) => (
            <div
              key={i}
              className="relative rounded-lg overflow-hidden border-2 border-black/40 shadow-xl"
              style={{
                width:      32 - i * 4,
                height:     44 - i * 5,
                marginLeft: i === 0 ? 0 : -10,
                zIndex:     stack.length - i,
                opacity:    1 - i * 0.12,
                transform:  `rotate(${i % 2 === 0 ? 5 : -4}deg) translateY(${i * 2}px)`,
              }}
            >
              <img src={url} alt="" className="w-full h-full object-cover" aria-hidden />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

interface Props {
  userId:               string | null
  isProUser:            boolean
  ownOnly?:             boolean
  basePath?:            string
  savedCollectionIds?:  string[]
}

export function CollectionsClient({ userId, isProUser, ownOnly = false, basePath = '/collections', savedCollectionIds = [] }: Props) {
  const [collections, setCollections] = useState<Collection[]>([])
  const [loading,     setLoading]     = useState(true)
  const [showCreate,  setShowCreate]  = useState(false)
  const [creating,    setCreating]    = useState(false)
  const [deletingId,  setDeletingId]  = useState<string | null>(null)
  const [savingId,    setSavingId]    = useState<string | null>(null)
  const [savedIds,    setSavedIds]    = useState<Set<string>>(() => new Set(savedCollectionIds))

  const [form, setForm] = useState({
    title:        '',
    description:  '',
    cover_url:    '',
    theme_color:  'primary',
    is_published: true,
  })

  const atLimit = !isProUser && collections.filter(c => c.user_id === userId).length >= FREE_LIMIT

  useEffect(() => { fetchCollections() }, [])

  const fetchCollections = async () => {
    setLoading(true)
    try {
      const url = ownOnly && userId
        ? `/api/collections?user_id=${userId}&limit=50`
        : '/api/collections?limit=24'
      const res  = await fetch(url)
      const data = await res.json()
      setCollections(data.collections ?? [])
    } catch {
      toast.error('Failed to load collections')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!form.title.trim()) return
    if (atLimit) { toast.error('Upgrade to Pro for unlimited collections'); return }
    setCreating(true)
    try {
      const res  = await fetch('/api/collections', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 403) { toast.error(data.message ?? 'Collection limit reached'); return }
        throw new Error(data.error)
      }
      setCollections(prev => [{ ...data.collection, collection_items: [] }, ...prev])
      setForm({ title: '', description: '', cover_url: '', theme_color: 'primary', is_published: true })
      setShowCreate(false)
      toast.success('Collection created!')
    } catch {
      toast.error('Failed to create collection')
    } finally {
      setCreating(false)
    }
  }

  const handleTogglePublish = async (id: string, current: boolean, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation()
    try {
      await fetch(`/api/collections/${id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ is_published: !current }),
      })
      setCollections(prev => prev.map(c => c.id === id ? { ...c, is_published: !current } : c))
      toast.success(current ? 'Collection unpublished' : 'Collection published!')
    } catch {
      toast.error('Failed to update')
    }
  }

  const handleDelete = async (id: string, title: string, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation()
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return
    setDeletingId(id)
    try {
      await fetch(`/api/collections/${id}`, { method: 'DELETE' })
      setCollections(prev => prev.filter(c => c.id !== id))
      toast.success('Collection deleted')
    } catch {
      toast.error('Failed to delete')
    } finally {
      setDeletingId(null)
    }
  }

  const handleSave = async (id: string, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation()
    if (!userId) { toast.error('Log in to save collections'); return }
    const isSaved = savedIds.has(id)
    setSavingId(id)
    try {
      const res  = await fetch(`/api/collections/${id}/save`, { method: isSaved ? 'DELETE' : 'POST' })
      const data = await res.json()
      if (!res.ok && res.status !== 409) {
        toast.error('Failed to update'); return
      }
      // Use server count as source of truth — DB trigger keeps it accurate
      const serverCount = data.save_count ?? null
      setSavedIds(prev => {
        const next = new Set(prev)
        isSaved ? next.delete(id) : next.add(id)
        return next
      })
      setCollections(prev => prev.map(c => {
        if (c.id !== id) return c
        return { ...c, save_count: serverCount !== null ? serverCount : c.save_count + (isSaved ? -1 : 1) }
      }))
      toast.success(isSaved ? 'Removed from saved' : 'Collection saved!')
    } catch {
      toast.error('Failed to update')
    } finally {
      setSavingId(null)
    }
  }

  const handleShare = async (id: string, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation()
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/collections/${id}`)
      toast.success('Link copied!')
    } catch {
      toast.error('Failed to copy link')
    }
  }

  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <Layers size={16} className="text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">Collections</h1>
            <p className="text-muted-foreground text-sm">
              Curated comic picks, themed and shareable
              {!isProUser && userId && (
                <span className="text-muted-foreground/60 ml-1">
                  · {Math.max(0, FREE_LIMIT - collections.filter(c => c.user_id === userId).length)} free slot{FREE_LIMIT - collections.filter(c => c.user_id === userId).length !== 1 ? 's' : ''} remaining
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Desktop-only create button */}
        {userId && !showCreate && (
          <Button
            size="sm"
            onClick={() => atLimit ? toast.error('Upgrade to Pro for unlimited collections') : setShowCreate(true)}
            className={cn('gap-1.5 shrink-0 hidden sm:inline-flex', atLimit && 'bg-gradient-to-r from-amber-400 to-orange-500 border-0 hover:opacity-90')}
          >
            {atLimit ? <Crown size={14} /> : <Plus size={14} />}
            <span>{atLimit ? 'Upgrade for More' : 'New Collection'}</span>
          </Button>
        )}
      </div>

      {/* ── Create form ─────────────────────────────────────────────────────── */}
      {showCreate && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-primary/5">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
                <Plus size={13} className="text-primary-foreground" />
              </div>
              <p className="text-xs font-black uppercase tracking-widest text-primary">New Collection</p>
            </div>
            <button onClick={() => setShowCreate(false)} className="text-muted-foreground hover:text-foreground">
              <X size={14} />
            </button>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Title <span className="text-destructive">*</span></label>
                <Input
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder='"Best Isekai of 2024"'
                  className="h-9 text-sm"
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && handleCreate()}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Cover URL <span className="text-muted-foreground/60">(optional)</span></label>
                <Input
                  value={form.cover_url}
                  onChange={e => setForm(f => ({ ...f, cover_url: e.target.value }))}
                  placeholder="https://..."
                  className="h-9 text-sm"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Description <span className="text-muted-foreground/60">(optional)</span></label>
              <Textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="What makes this collection special..."
                rows={2}
                className="resize-none text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Theme Colour</label>
              <div className="flex gap-2">
                {THEME_OPTIONS.map(t => (
                  <button
                    key={t.value}
                    onClick={() => setForm(f => ({ ...f, theme_color: t.value }))}
                    className={cn('w-7 h-7 rounded-full border-2 transition-all', t.color,
                      form.theme_color === t.value ? 'border-foreground scale-110' : 'border-transparent hover:scale-105')}
                    title={t.label}
                  />
                ))}
              </div>
            </div>
            <label className="flex items-center gap-3 cursor-pointer group">
              <div
                className={cn('w-4 h-4 rounded border-2 flex items-center justify-center transition-colors shrink-0',
                  form.is_published ? 'bg-primary border-primary' : 'border-border group-hover:border-primary/60')}
                onClick={() => setForm(f => ({ ...f, is_published: !f.is_published }))}
              >
                {form.is_published && <span className="text-primary-foreground text-[10px] font-black">✓</span>}
              </div>
              <div>
                <span className="text-sm font-medium">Publish immediately</span>
                <p className="text-xs text-muted-foreground">Others can discover and save this collection</p>
              </div>
            </label>
            <div className="flex gap-2 pt-1">
              <Button size="sm" onClick={handleCreate} disabled={!form.title.trim() || creating} className="gap-2">
                {creating ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                Create Collection
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { setShowCreate(false); setForm({ title: '', description: '', cover_url: '', theme_color: 'primary', is_published: true }) }}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Loading ─────────────────────────────────────────────────────────── */}
      {loading && (
        <div className="flex justify-center py-16">
          <Loader2 size={24} className="animate-spin text-muted-foreground" />
        </div>
      )}

      {/* ── Empty state ─────────────────────────────────────────────────────── */}
      {!loading && collections.length === 0 && (
        <div className="text-center py-16 rounded-2xl border border-dashed border-border space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <Layers size={20} className="text-primary opacity-60" />
          </div>
          <div>
            <p className="font-black text-sm">No collections yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              {userId ? 'Create your first curated collection of comics.' : 'No public collections yet.'}
            </p>
          </div>
          {userId && (
            <Button size="sm" onClick={() => setShowCreate(true)} className="gap-2">
              <Plus size={14} /> Create First Collection
            </Button>
          )}
        </div>
      )}

      {/* ── MOBILE: Pinterest staggered full-cover cards ─────────────────── */}
      {!loading && collections.length > 0 && (
        <>
          {/* Split into two explicit columns so React controls placement.
              Heights cycle by position within each column — never shifts. */}
          <div className="sm:hidden grid grid-cols-2 gap-3 items-start">
            {/* Left column: even indices */}
            <div className="flex flex-col gap-3">
              {collections.filter((_, i) => i % 2 === 0).map((col, posInCol) => {
              const isOwner     = col.user_id === userId
              const count       = itemCount(col)
              const themeGrad   = THEME_GRAD[col.theme_color]   ?? THEME_GRAD.primary
              const themeBorder = THEME_BORDER[col.theme_color] ?? THEME_BORDER.primary
              const themeAccent = THEME_ACCENT[col.theme_color] ?? THEME_ACCENT.primary
              const covers      = getCoverPreviews(col)
              const isSaved     = savedIds.has(col.id)
              const avatar      = col.profiles?.avatar_url
              const username    = col.profiles?.username
              const saveLabel   = getSaveLabel(col.save_count, isSaved)
              const cardH       = colHeightClass(posInCol)

              return (
                <div
                  key={col.id}
                  className={cn(
                    'rounded-2xl border overflow-hidden relative cursor-pointer',
                    cardH,
                    col.is_published ? themeBorder : 'border-dashed border-border/60 opacity-75'
                  )}
                >
                  {/* ── Cover fills entire card ── */}
                  <StackedCover covers={covers} themeGrad={themeGrad} coverUrl={col.cover_url} />

                  {/* ── Full dark scrim from bottom ── */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10" />

                  {/* ── Top row: status badge + comic count ── */}
                  <div className="absolute top-2 left-2 right-2 z-20 flex items-center justify-between">
                    {col.is_published
                      ? <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-black/40 text-emerald-400 border border-emerald-500/30 backdrop-blur-sm"><Globe size={7} /> Public</span>
                      : <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-black/40 text-white/60 border border-white/10 backdrop-blur-sm"><Lock size={7} /> Draft</span>
                    }
                    {count > 0 && (
                      <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-black/40 backdrop-blur-sm border border-white/10', themeAccent)}>
                        <BookOpen size={7} /> {count}
                      </span>
                    )}
                  </div>

                  {/* ── Clickable overlay ── */}
                  <Link href={`${basePath}/${col.id}`} className="absolute inset-0 z-10" aria-label={col.title} />

                  <div className="absolute bottom-0 left-0 right-0 z-20 p-2.5 space-y-2">
                    {/* Title */}
                    <p className="text-white font-black text-xs leading-snug line-clamp-2 drop-shadow-md">
                      {col.title}
                    </p>

                    {/* Avatar + username (non-owner only) */}
                    {!isOwner && username && (
                      <div className="flex items-center gap-1.5">
                        {avatar ? (
                          <img src={avatar} alt={username} className="w-4 h-4 rounded-full object-cover border border-white/30" />
                        ) : (
                          <div className="w-4 h-4 rounded-full bg-white/20 border border-white/30 flex items-center justify-center">
                            <span className="text-[7px] text-white font-bold">{username[0].toUpperCase()}</span>
                          </div>
                        )}
                        <span className="text-[9px] text-white/70 truncate">@{username}</span>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex items-center gap-1.5 relative z-30">
                      {isOwner ? (
                        <>
                          <button
                            onClick={(e) => handleShare(col.id, e)}
                            className="flex items-center gap-1 px-2 h-6 rounded-lg bg-white/15 hover:bg-white/25 backdrop-blur-sm text-white text-[9px] font-semibold transition-colors border border-white/10"
                          >
                            <Share2 size={9} />
                            Share
                          </button>
                          <button
                            onClick={(e) => handleTogglePublish(col.id, col.is_published, e)}
                            className="w-6 h-6 rounded-lg bg-white/15 hover:bg-white/25 backdrop-blur-sm text-white flex items-center justify-center transition-colors border border-white/10"
                            title={col.is_published ? 'Unpublish' : 'Publish'}
                          >
                            {col.is_published ? <Lock size={10} /> : <Globe size={10} />}
                          </button>
                          <button
                            onClick={(e) => handleDelete(col.id, col.title, e)}
                            disabled={deletingId === col.id}
                            className="w-6 h-6 rounded-lg bg-white/15 hover:bg-red-500/60 backdrop-blur-sm text-white flex items-center justify-center transition-colors border border-white/10"
                          >
                            {deletingId === col.id ? <Loader2 size={9} className="animate-spin" /> : <Trash2 size={9} />}
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={(e) => handleSave(col.id, e)}
                            disabled={savingId === col.id}
                            className={cn(
                              'flex items-center gap-1 px-2 h-6 rounded-lg backdrop-blur-sm text-[9px] font-semibold transition-colors border',
                              isSaved
                                ? 'bg-primary/70 text-white border-primary/40'
                                : 'bg-white/15 hover:bg-white/25 text-white border-white/10'
                            )}
                          >
                            {savingId === col.id
                              ? <Loader2 size={9} className="animate-spin" />
                              : <Bookmark size={9} className={isSaved ? 'fill-white' : ''} />
                            }
                            {saveLabel}
                          </button>
                          <button
                            onClick={(e) => handleShare(col.id, e)}
                            className="w-6 h-6 rounded-lg bg-white/15 hover:bg-white/25 backdrop-blur-sm text-white flex items-center justify-center transition-colors border border-white/10"
                          >
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
            {/* Right column: odd indices */}
            <div className="flex flex-col gap-3">
              {collections.filter((_, i) => i % 2 === 1).map((col, posInCol) => {
              const isOwner     = col.user_id === userId
              const count       = itemCount(col)
              const themeGrad   = THEME_GRAD[col.theme_color]   ?? THEME_GRAD.primary
              const themeBorder = THEME_BORDER[col.theme_color] ?? THEME_BORDER.primary
              const themeAccent = THEME_ACCENT[col.theme_color] ?? THEME_ACCENT.primary
              const covers      = getCoverPreviews(col)
              const isSaved     = savedIds.has(col.id)
              const avatar      = col.profiles?.avatar_url
              const username    = col.profiles?.username
              const saveLabel   = getSaveLabel(col.save_count, isSaved)
              // Right column starts at h-44 so it's offset from left column
              const cardH       = colHeightClass(posInCol + 1)

              return (
                <div
                  key={col.id}
                  className={cn(
                    'rounded-2xl border overflow-hidden relative cursor-pointer',
                    cardH,
                    col.is_published ? themeBorder : 'border-dashed border-border/60 opacity-75'
                  )}
                >
                  <StackedCover covers={covers} themeGrad={themeGrad} coverUrl={col.cover_url} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10" />
                  <div className="absolute top-2 left-2 right-2 z-20 flex items-center justify-between">
                    {col.is_published
                      ? <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-black/40 text-emerald-400 border border-emerald-500/30 backdrop-blur-sm"><Globe size={7} /> Public</span>
                      : <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-black/40 text-white/60 border border-white/10 backdrop-blur-sm"><Lock size={7} /> Draft</span>
                    }
                    {count > 0 && (
                      <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-black/40 backdrop-blur-sm border border-white/10', themeAccent)}>
                        <BookOpen size={7} /> {count}
                      </span>
                    )}
                  </div>
                  <Link href={`${basePath}/${col.id}`} className="absolute inset-0 z-10" aria-label={col.title} />
                  <div className="absolute bottom-0 left-0 right-0 z-20 p-2.5 space-y-2">
                    <p className="text-white font-black text-xs leading-snug line-clamp-2 drop-shadow-md">{col.title}</p>
                    {!isOwner && username && (
                      <div className="flex items-center gap-1.5">
                        {avatar ? (
                          <img src={avatar} alt={username} className="w-4 h-4 rounded-full object-cover border border-white/30" />
                        ) : (
                          <div className="w-4 h-4 rounded-full bg-white/20 border border-white/30 flex items-center justify-center">
                            <span className="text-[7px] text-white font-bold">{username[0].toUpperCase()}</span>
                          </div>
                        )}
                        <span className="text-[9px] text-white/70 truncate">@{username}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 relative z-30">
                      {isOwner ? (
                        <>
                          <button onClick={(e) => handleShare(col.id, e)} className="flex items-center gap-1 px-2 h-6 rounded-lg bg-white/15 hover:bg-white/25 backdrop-blur-sm text-white text-[9px] font-semibold transition-colors border border-white/10">
                            <Share2 size={9} /> Share
                          </button>
                          <button onClick={(e) => handleTogglePublish(col.id, col.is_published, e)} className="w-6 h-6 rounded-lg bg-white/15 hover:bg-white/25 backdrop-blur-sm text-white flex items-center justify-center transition-colors border border-white/10" title={col.is_published ? 'Unpublish' : 'Publish'}>
                            {col.is_published ? <Lock size={10} /> : <Globe size={10} />}
                          </button>
                          <button onClick={(e) => handleDelete(col.id, col.title, e)} disabled={deletingId === col.id} className="w-6 h-6 rounded-lg bg-white/15 hover:bg-red-500/60 backdrop-blur-sm text-white flex items-center justify-center transition-colors border border-white/10">
                            {deletingId === col.id ? <Loader2 size={9} className="animate-spin" /> : <Trash2 size={9} />}
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={(e) => handleSave(col.id, e)} disabled={savingId === col.id} className={cn('flex items-center gap-1 px-2 h-6 rounded-lg backdrop-blur-sm text-[9px] font-semibold transition-colors border', isSaved ? 'bg-primary/70 text-white border-primary/40' : 'bg-white/15 hover:bg-white/25 text-white border-white/10')}>
                            {savingId === col.id ? <Loader2 size={9} className="animate-spin" /> : <Bookmark size={9} className={isSaved ? 'fill-white' : ''} />}
                            {saveLabel}
                          </button>
                          <button onClick={(e) => handleShare(col.id, e)} className="w-6 h-6 rounded-lg bg-white/15 hover:bg-white/25 backdrop-blur-sm text-white flex items-center justify-center transition-colors border border-white/10">
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

          {/* ── DESKTOP: original grid ──────────────────────────────────────── */}
          <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {collections.map((col) => {
              const isOwner     = col.user_id === userId
              const count       = itemCount(col)
              const themeGrad   = THEME_GRAD[col.theme_color]   ?? THEME_GRAD.primary
              const themeBorder = THEME_BORDER[col.theme_color] ?? THEME_BORDER.primary
              const themeAccent = THEME_ACCENT[col.theme_color] ?? THEME_ACCENT.primary
              const covers      = getCoverPreviews(col)
              const isSaved     = savedIds.has(col.id)
              const saveLabel   = getSaveLabel(col.save_count, isSaved)

              return (
                <div
                  key={col.id}
                  className={cn(
                    'group relative rounded-2xl border bg-card overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5',
                    col.is_published ? themeBorder : 'border-dashed border-border opacity-70 hover:opacity-90'
                  )}
                >
                  <div className={cn('h-24 relative overflow-hidden bg-gradient-to-br to-transparent', themeGrad)}>
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
                    ) : col.cover_url ? (
                      <img src={col.cover_url} alt={col.title} className="absolute inset-0 w-full h-full object-cover opacity-30" />
                    ) : null}
                    <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-card to-transparent" />
                    <div className="absolute top-2 right-2">
                      {col.is_published
                        ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-600 border border-emerald-500/20 backdrop-blur-sm"><Globe size={8} /> Public</span>
                        : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-muted/80 text-muted-foreground border border-border backdrop-blur-sm"><Lock size={8} /> Draft</span>
                      }
                    </div>
                    {count > 0 && (
                      <div className="absolute bottom-2 left-2">
                        <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-background/80 backdrop-blur-sm border border-border', themeAccent)}>
                          <BookOpen size={8} /> {count} comic{count !== 1 ? 's' : ''}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="p-4 space-y-3">
                    <div>
                      <Link href={`${basePath}/${col.id}`} className="font-black text-sm hover:text-primary transition-colors line-clamp-1 block">
                        {col.title}
                      </Link>
                      {col.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5 leading-relaxed">{col.description}</p>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        {col.save_count > 0 && (
                          <span className="flex items-center gap-1 text-[10px]">
                            <Bookmark size={9} className="text-primary/60" />
                            {col.save_count} saved
                          </span>
                        )}
                      </div>
                      {!isOwner && col.profiles && (
                        <Link href={`/profile/${col.profiles.username}`} className="text-[10px] hover:text-primary transition-colors truncate max-w-[80px]">
                          @{col.profiles.username}
                        </Link>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Link href={`${basePath}/${col.id}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full h-7 text-xs gap-1.5 hover:border-primary/40 hover:text-primary">
                          View
                        </Button>
                      </Link>
                      {isOwner ? (
                        <>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={(e) => handleShare(col.id, e)} title="Share">
                            <Share2 size={12} />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={(e) => handleTogglePublish(col.id, col.is_published, e)}
                            title={col.is_published ? 'Unpublish' : 'Publish'}>
                            {col.is_published ? <Lock size={12} /> : <Globe size={12} />}
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={(e) => handleDelete(col.id, col.title, e)} disabled={deletingId === col.id}>
                            {deletingId === col.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            variant="ghost" size="sm"
                            className={cn('h-7 gap-1 text-xs px-2', isSaved ? 'text-primary' : 'text-muted-foreground hover:text-foreground')}
                            onClick={(e) => handleSave(col.id, e)}
                            disabled={savingId === col.id}
                          >
                            {savingId === col.id
                              ? <Loader2 size={11} className="animate-spin" />
                              : <Bookmark size={11} className={isSaved ? 'fill-primary' : ''} />
                            }
                            {saveLabel}
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={(e) => handleShare(col.id, e)} title="Share">
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
        </>
      )}

      {/* ── Pro upsell ──────────────────────────────────────────────────────── */}
      {!isProUser && userId && collections.filter(c => c.user_id === userId).length > 0 && (
        <div className="flex items-center justify-center pt-2">
          <Link href="/pricing" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-amber-500 transition-colors">
            <Crown size={11} /> Upgrade to Pro for unlimited collections
          </Link>
        </div>
      )}

      {/* ── Mobile FAB ──────────────────────────────────────────────────────── */}
      {userId && (
        <button
          onClick={() => atLimit ? toast.error('Upgrade to Pro for unlimited collections') : setShowCreate(true)}
          className={cn(
            'sm:hidden fixed bottom-36 right-4 z-40 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-200 active:scale-95',
            atLimit
              ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white'
              : 'bg-primary text-primary-foreground hover:bg-primary/90'
          )}
          aria-label="Create new collection"
        >
          {atLimit ? <Crown size={22} /> : <Plus size={24} />}
        </button>
      )}
    </div>
  )
}