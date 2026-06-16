'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import {
  Globe, Lock, Bookmark, BookmarkCheck,
  ArrowLeft, Loader2, Trash2, Share2, BookOpen, Layers,
  Pencil, X, Check, Sparkles,
} from 'lucide-react'
import { ComicCard } from '@/components/recommendations/ComicCard'
import { AddToCollectionSearch } from '@/components/collections/AddToCollectionSearch'
import { cn } from '@/lib/utils'
import type { Recommendation } from '@/types/database.types'

interface CollectionItem {
  id:              string
  position:        number
  note:            string | null
  recommendations: Recommendation
}

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
    username:             string
    display_name:         string | null
    avatar_url:           string | null
    verified_recommender: boolean
  } | null
  collection_items: CollectionItem[]
}

const THEME_STYLES: Record<string, { gradient: string; border: string; text: string; bg: string }> = {
  primary: { gradient: 'from-primary/50 via-primary/20',         border: 'border-primary/30',     text: 'text-primary',     bg: 'bg-primary/10'     },
  violet:  { gradient: 'from-violet-500/50 via-violet-500/20',   border: 'border-violet-500/30',  text: 'text-violet-400',  bg: 'bg-violet-500/10'  },
  rose:    { gradient: 'from-rose-500/50 via-rose-500/20',       border: 'border-rose-500/30',    text: 'text-rose-400',    bg: 'bg-rose-500/10'    },
  amber:   { gradient: 'from-amber-500/50 via-amber-500/20',     border: 'border-amber-500/30',   text: 'text-amber-400',   bg: 'bg-amber-500/10'   },
  emerald: { gradient: 'from-emerald-500/50 via-emerald-500/20', border: 'border-emerald-500/30', text: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  indigo:  { gradient: 'from-indigo-500/50 via-indigo-500/20',   border: 'border-indigo-500/30',  text: 'text-indigo-400',  bg: 'bg-indigo-500/10'  },
}

const THEME_OPTIONS = [
  { value: 'primary', label: 'Teal',   color: 'bg-primary'     },
  { value: 'violet',  label: 'Violet', color: 'bg-violet-500'  },
  { value: 'rose',    label: 'Rose',   color: 'bg-rose-500'    },
  { value: 'amber',   label: 'Amber',  color: 'bg-amber-500'   },
  { value: 'emerald', label: 'Green',  color: 'bg-emerald-500' },
  { value: 'indigo',  label: 'Indigo', color: 'bg-indigo-500'  },
]

interface Props {
  collection: Collection
  isSaved:    boolean
  isOwner:    boolean
  isLoggedIn: boolean
}

export function CollectionDetailClient({ collection, isSaved: initialSaved, isOwner, isLoggedIn }: Props) {
  const [saved,       setSaved]       = useState(initialSaved)
  const [savingState, setSavingState] = useState(false)
  const [saveCount,   setSaveCount]   = useState(collection.save_count)
  const [removingId,  setRemovingId]  = useState<string | null>(null)
  const [items,       setItems]       = useState<CollectionItem[]>(collection.collection_items ?? [])

  const [showEdit, setShowEdit] = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [editForm, setEditForm] = useState({
    title:        collection.title,
    description:  collection.description ?? '',
    cover_url:    collection.cover_url ?? '',
    theme_color:  collection.theme_color,
    is_published: collection.is_published,
  })

  const [currentTheme,     setCurrentTheme]     = useState(collection.theme_color)
  const [currentTitle,     setCurrentTitle]     = useState(collection.title)
  const [currentDesc,      setCurrentDesc]      = useState(collection.description)
  const [currentPublished, setCurrentPublished] = useState(collection.is_published)

  const theme       = THEME_STYLES[currentTheme] ?? THEME_STYLES.primary
  const covers      = items.map(i => i.recommendations?.cover_url).filter(Boolean).slice(0, 6) as string[]
  const dominant    = covers[0] ?? null
  const stackCovers = covers.slice(1, 4)

  // ── Save button label — always show real count from DB (trigger keeps it accurate) ──
  const saveLabel = saved
    ? saveCount > 0 ? `${saveCount} saved` : 'Saved'
    : saveCount > 0 ? `${saveCount}` : 'Save'

  const handleSave = async () => {
    if (!isLoggedIn) { toast.error('Log in to save collections'); return }
    setSavingState(true)
    try {
      const res  = await fetch(`/api/collections/${collection.id}/save`, { method: saved ? 'DELETE' : 'POST' })
      const data = await res.json()
      if (!res.ok && res.status !== 409) {
        toast.error('Failed to update'); return
      }
      setSaved(!saved)
      // Use server count as source of truth — DB trigger keeps it accurate
      if (data.save_count !== undefined) setSaveCount(data.save_count)
      toast.success(saved ? 'Removed from saved' : 'Collection saved!')
    } catch { toast.error('Failed to update') }
    finally { setSavingState(false) }
  }

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/collections/${collection.id}`)
      toast.success('Link copied!')
    } catch { toast.error('Failed to copy link') }
  }

  const handleEditSave = async () => {
    if (!editForm.title.trim()) return
    setSaving(true)
    try {
      const res  = await fetch(`/api/collections/${collection.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(editForm),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setCurrentTitle(editForm.title)
      setCurrentDesc(editForm.description || null)
      setCurrentTheme(editForm.theme_color)
      setCurrentPublished(editForm.is_published)
      setShowEdit(false)
      toast.success('Collection updated!')
    } catch { toast.error('Failed to update collection') }
    finally { setSaving(false) }
  }

  const handleAdded = (comicId: string, title: string) => {
    // Reload the page to get full recommendation data for the new item
    window.location.reload()
  }

  const handleRemoveItem = async (itemId: string, recId: string) => {
    if (!confirm('Remove this comic from the collection?')) return
    setRemovingId(itemId)
    try {
      await fetch(`/api/collections/${collection.id}/items`, {
        method:  'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ recommendation_id: recId }),
      })
      setItems(prev => prev.filter(i => i.id !== itemId))
      toast.success('Removed from collection')
    } catch { toast.error('Failed to remove') }
    finally { setRemovingId(null) }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-0">

      {/* ── Edit modal ─────────────────────────────────────────────────────── */}
      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-card rounded-2xl border border-border shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-primary/5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-primary flex items-center justify-center">
                  <Pencil size={11} className="text-primary-foreground" />
                </div>
                <p className="text-xs font-black uppercase tracking-widest text-primary">Edit Collection</p>
              </div>
              <button onClick={() => setShowEdit(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X size={14} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Title <span className="text-destructive">*</span></label>
                <Input value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} className="h-9 text-sm" autoFocus />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Description</label>
                <Textarea value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} placeholder="What makes this collection special..." rows={2} className="resize-none text-sm" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Cover URL</label>
                <Input value={editForm.cover_url} onChange={e => setEditForm(f => ({ ...f, cover_url: e.target.value }))} placeholder="https://..." className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Theme Colour</label>
                <div className="flex gap-2">
                  {THEME_OPTIONS.map(t => (
                    <button key={t.value} onClick={() => setEditForm(f => ({ ...f, theme_color: t.value }))}
                      className={cn('w-7 h-7 rounded-full border-2 transition-all', t.color,
                        editForm.theme_color === t.value ? 'border-foreground scale-110' : 'border-transparent hover:scale-105')}
                      title={t.label}
                    />
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className={cn('w-4 h-4 rounded border-2 flex items-center justify-center transition-colors shrink-0',
                  editForm.is_published ? 'bg-primary border-primary' : 'border-border group-hover:border-primary/60')}
                  onClick={() => setEditForm(f => ({ ...f, is_published: !f.is_published }))}>
                  {editForm.is_published && <span className="text-primary-foreground text-[10px] font-black">✓</span>}
                </div>
                <div>
                  <span className="text-sm font-medium">Published</span>
                  <p className="text-xs text-muted-foreground">Others can discover and save this collection</p>
                </div>
              </label>
              <div className="flex gap-2 pt-1">
                <Button size="sm" onClick={handleEditSave} disabled={!editForm.title.trim() || saving} className="gap-2">
                  {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                  Save Changes
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowEdit(false)}>Cancel</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MOBILE (hidden sm+)
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="sm:hidden">

        {/* Full-bleed hero */}
        <div className="relative h-72 overflow-hidden">
          {dominant ? (
            <>
              <img src={`/api/image-proxy?url=${encodeURIComponent(dominant)}`} alt="" className="absolute inset-0 w-full h-full object-cover" aria-hidden />
              <div className={cn('absolute inset-0 bg-gradient-to-br opacity-40 to-transparent', theme.gradient)} />
            </>
          ) : collection.cover_url ? (
            <>
              <img src={`/api/image-proxy?url=${encodeURIComponent(collection.cover_url)}`} alt={currentTitle} className="absolute inset-0 w-full h-full object-cover" />
              <div className={cn('absolute inset-0 bg-gradient-to-br opacity-40 to-transparent', theme.gradient)} />
            </>
          ) : (
            <div className={cn('absolute inset-0 bg-gradient-to-br to-transparent', theme.gradient)} />
          )}

          {/* Bottom fade */}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />

          {/* Stacked thumbnails */}
          {stackCovers.length > 0 && (
            <div className="absolute bottom-6 right-4 flex items-end">
              {stackCovers.map((url, i) => (
                <div
                  key={i}
                  className="relative rounded-xl overflow-hidden border-2 border-background shadow-2xl"
                  style={{
                    width:      56 - i * 6,
                    height:     76 - i * 8,
                    marginLeft: i === 0 ? 0 : -16,
                    zIndex:     stackCovers.length - i,
                    transform:  `rotate(${i % 2 === 0 ? 5 : -4}deg) translateY(${i * 3}px)`,
                    opacity:    1 - i * 0.1,
                  }}
                >
                  <img src={`/api/image-proxy?url=${encodeURIComponent(url)}`} alt="" className="w-full h-full object-cover" aria-hidden />
                </div>
              ))}
            </div>
          )}

          {/* Back */}
          <div className="absolute top-4 left-4 z-20">
            <Link href="/collections" className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 text-white">
              <ArrowLeft size={16} />
            </Link>
          </div>

          {/* Status */}
          <div className="absolute top-4 right-4 z-20">
            {currentPublished
              ? <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-black/40 text-emerald-400 border border-emerald-500/30 backdrop-blur-sm"><Globe size={9} /> Public</span>
              : <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-black/40 text-white/60 border border-white/10 backdrop-blur-sm"><Lock size={9} /> Draft</span>
            }
          </div>
        </div>

        {/* Info card overlapping hero */}
        <div className="px-4 -mt-8 relative z-10 space-y-3 pb-8">
          <div className={cn('rounded-2xl border bg-card/95 backdrop-blur-sm p-4 shadow-2xl space-y-3', theme.border)}>

            {/* Title + meta */}
            <div className="space-y-1.5">
              <h1 className="text-xl font-black tracking-tight leading-tight">{currentTitle}</h1>
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap">
                <span className={cn('flex items-center gap-1 font-semibold', theme.text)}>
                  <BookOpen size={10} />
                  {items.length} comic{items.length !== 1 ? 's' : ''}
                </span>
                {saveCount > 0 && (
                  <>
                    <span className="text-muted-foreground/30">·</span>
                    <span className="flex items-center gap-1">
                      <Bookmark size={9} className="text-primary/60" />
                      {saveCount} {saveCount === 1 ? 'save' : 'saves'}
                    </span>
                  </>
                )}
              </div>
            </div>

            {currentDesc && (
              <p className="text-xs text-muted-foreground leading-relaxed">{currentDesc}</p>
            )}

            {/* Curator */}
            {collection.profiles && (
              <div className="flex items-center gap-2">
                {collection.profiles.avatar_url ? (
                  <img src={`/api/image-proxy?url=${encodeURIComponent(collection.profiles.avatar_url)}`} alt={collection.profiles.username}
                    className="w-5 h-5 rounded-full object-cover border border-border" />
                ) : (
                  <div className={cn('w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold border border-border', theme.bg, theme.text)}>
                    {collection.profiles.username[0].toUpperCase()}
                  </div>
                )}
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <span>by</span>
                  <Link href={`/profile/${collection.profiles.username}`} className={cn('font-semibold hover:underline', theme.text)}>
                    @{collection.profiles.username}
                  </Link>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2 pt-0.5">
              {isOwner ? (
                <>
                  <button
                    onClick={handleShare}
                    className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors text-xs font-semibold"
                  >
                    <Share2 size={13} />
                    Share
                  </button>
                  <button
                    onClick={() => setShowEdit(true)}
                    className={cn('flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl border transition-colors text-xs font-semibold', theme.border, theme.text, theme.bg)}
                  >
                    <Pencil size={13} />
                    Edit
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleSave}
                    disabled={savingState}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl transition-colors text-xs font-semibold',
                      saved
                        ? cn('border', theme.border, theme.text, theme.bg)
                        : 'bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {savingState
                      ? <Loader2 size={13} className="animate-spin" />
                      : saved ? <BookmarkCheck size={13} /> : <Bookmark size={13} />
                    }
                    {saveLabel}
                  </button>

                  <button
                    onClick={handleShare}
                    className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors text-xs font-semibold"
                  >
                    <Share2 size={13} />
                    Share
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Add comic search — owner only */}
          {isOwner && (
            <AddToCollectionSearch
              collectionId={collection.id}
              onAdded={handleAdded}
            />
          )}

          {/* Comics grid */}
          {items.length === 0 ? (
            <div className="text-center py-12 rounded-2xl border border-dashed border-border space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-muted/40 flex items-center justify-center mx-auto">
                <BookOpen size={18} className="text-muted-foreground opacity-40" />
              </div>
              <p className="font-black text-sm">No comics yet</p>
              {isOwner && <p className="text-xs text-muted-foreground px-6">Add comics from any comic detail page.</p>}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground pt-1">
                Comics in this collection
              </p>
              <div className="grid grid-cols-2 gap-3">
                {items.map((item) => (
                  <div key={item.id} className="relative group/item">
                    <ComicCard recommendation={item.recommendations} />
                    {isOwner && (
                      <button
                        onClick={() => handleRemoveItem(item.id, item.recommendations.id)}
                        disabled={removingId === item.id}
                        className="absolute top-2 right-2 z-20 w-6 h-6 rounded-full bg-destructive/80 text-white flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-opacity hover:bg-destructive"
                      >
                        {removingId === item.id ? <Loader2 size={10} className="animate-spin" /> : <Trash2 size={10} />}
                      </button>
                    )}
                    {item.note && <p className="text-[10px] text-muted-foreground mt-1 px-1 line-clamp-2 italic">"{item.note}"</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          DESKTOP (hidden on mobile)
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="hidden sm:block max-w-4xl mx-auto px-4 py-8 space-y-8">

        <Link href="/collections" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={13} /> All Collections
        </Link>

        <div className={cn('rounded-2xl border overflow-hidden', theme.border)}>
          <div className="h-36 md:h-48 relative overflow-hidden bg-muted">
            {covers.length > 0 ? (
              <div className="absolute inset-0 flex gap-0.5">
                {covers.map((url, i) => (
                  <div key={i} className={cn('relative overflow-hidden shrink-0',
                    covers.length === 1 ? 'flex-1' :
                    covers.length === 2 ? 'flex-1' :
                    covers.length >= 3 && i === 0 ? 'w-2/5' : 'flex-1')}>
                    <img src={`/api/image-proxy?url=${encodeURIComponent(url)}`} alt="" className="w-full h-full object-cover" aria-hidden />
                  </div>
                ))}
              </div>
            ) : collection.cover_url ? (
              <img src={`/api/image-proxy?url=${encodeURIComponent(collection.cover_url)}`} alt={currentTitle} className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <div className={cn('absolute inset-0 bg-gradient-to-br to-transparent', theme.gradient)} />
            )}
            <div className={cn('absolute inset-0 bg-gradient-to-br opacity-60 to-transparent', theme.gradient)} />
            <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />
            <div className="absolute top-3 right-3">
              {currentPublished
                ? <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-600 border border-emerald-500/30 backdrop-blur-sm"><Globe size={9} /> Public</span>
                : <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-muted/80 text-muted-foreground border border-border backdrop-blur-sm"><Lock size={9} /> Draft</span>
              }
            </div>
            <div className="absolute top-3 left-3">
              <div className="w-8 h-8 rounded-lg bg-background/60 backdrop-blur-sm border border-border flex items-center justify-center">
                <Layers size={14} className={theme.text} />
              </div>
            </div>
          </div>

          <div className="px-5 pb-5 pt-4 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1 min-w-0">
                <h1 className="text-xl md:text-2xl font-black tracking-tight leading-tight">{currentTitle}</h1>
                <div className="flex items-center gap-2 flex-wrap text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1"><BookOpen size={10} />{items.length} comic{items.length !== 1 ? 's' : ''}</span>
                  {saveCount > 0 && (
                    <><span>·</span><span className="flex items-center gap-1"><Bookmark size={9} className="text-primary/60" />{saveCount} {saveCount === 1 ? 'save' : 'saves'}</span></>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button size="sm" variant="outline" onClick={handleShare} className="h-8 text-xs gap-1.5">
                  <Share2 size={12} />
                  <span className="hidden sm:inline">Share</span>
                </Button>
                {!isOwner && (
                  <Button size="sm" variant={saved ? 'default' : 'outline'} onClick={handleSave} disabled={savingState}
                    className={cn('gap-1.5 h-8 text-xs', saved && 'bg-primary')}>
                    {savingState ? <Loader2 size={12} className="animate-spin" /> : saved ? <BookmarkCheck size={12} /> : <Bookmark size={12} />}
                    <span className="hidden sm:inline">{saveLabel}</span>
                  </Button>
                )}
                {isOwner && (
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => setShowEdit(true)}>
                    <Pencil size={12} /><span className="hidden sm:inline">Edit</span>
                  </Button>
                )}
              </div>
            </div>
            {currentDesc && <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">{currentDesc}</p>}
            {collection.profiles && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {collection.profiles.avatar_url && (
                  <img src={`/api/image-proxy?url=${encodeURIComponent(collection.profiles.avatar_url)}`} alt="" className="w-5 h-5 rounded-full object-cover border border-border" />
                )}
                <span>Curated by</span>
                <Link href={`/profile/${collection.profiles.username}`} className={cn('font-semibold hover:underline', theme.text)}>
                  @{collection.profiles.username}
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Add comic search — owner only */}
        {isOwner && (
          <AddToCollectionSearch
            collectionId={collection.id}
            onAdded={handleAdded}
          />
        )}

        {items.length === 0 ? (
          <div className="text-center py-16 rounded-2xl border border-dashed border-border space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-muted/40 flex items-center justify-center mx-auto">
              <BookOpen size={20} className="text-muted-foreground opacity-40" />
            </div>
            <p className="font-black text-sm">No comics in this collection yet</p>
            {isOwner && <p className="text-xs text-muted-foreground">Use the search above to add comics to this collection.</p>}
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Comics in this collection</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {items.map((item) => (
                <div key={item.id} className="relative group/item">
                  <ComicCard recommendation={item.recommendations} />
                  {isOwner && (
                    <button onClick={() => handleRemoveItem(item.id, item.recommendations.id)} disabled={removingId === item.id}
                      className="absolute top-2 right-2 z-20 w-6 h-6 rounded-full bg-destructive/80 text-white flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-opacity hover:bg-destructive">
                      {removingId === item.id ? <Loader2 size={10} className="animate-spin" /> : <Trash2 size={10} />}
                    </button>
                  )}
                  {item.note && <p className="text-[10px] text-muted-foreground mt-1 px-1 line-clamp-2 italic">"{item.note}"</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

    </div>
  )
}

