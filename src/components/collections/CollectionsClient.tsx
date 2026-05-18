'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import {
  Plus, BookOpen, Globe, Lock, Loader2,
  Trash2, Pencil, Crown, Sparkles, Eye,
  BookMarked, ArrowRight, X,
} from 'lucide-react'
import { formatDate } from '@/lib/utils/format'
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
  profiles:     { username: string; display_name: string | null } | null
  collection_items: { count: number }[]
}

const FREE_LIMIT = 3

const THEME_OPTIONS = [
  { value: 'primary', label: 'Teal',   color: 'bg-primary'       },
  { value: 'violet',  label: 'Violet', color: 'bg-violet-500'    },
  { value: 'rose',    label: 'Rose',   color: 'bg-rose-500'      },
  { value: 'amber',   label: 'Amber',  color: 'bg-amber-500'     },
  { value: 'emerald', label: 'Green',  color: 'bg-emerald-500'   },
  { value: 'indigo',  label: 'Indigo', color: 'bg-indigo-500'    },
]

const THEME_STYLES: Record<string, string> = {
  primary: 'from-primary/20 via-primary/5',
  violet:  'from-violet-500/20 via-violet-500/5',
  rose:    'from-rose-500/20 via-rose-500/5',
  amber:   'from-amber-500/20 via-amber-500/5',
  emerald: 'from-emerald-500/20 via-emerald-500/5',
  indigo:  'from-indigo-500/20 via-indigo-500/5',
}

const THEME_BORDER: Record<string, string> = {
  primary: 'border-primary/30 hover:border-primary/50',
  violet:  'border-violet-500/30 hover:border-violet-500/50',
  rose:    'border-rose-500/30 hover:border-rose-500/50',
  amber:   'border-amber-500/30 hover:border-amber-500/50',
  emerald: 'border-emerald-500/30 hover:border-emerald-500/50',
  indigo:  'border-indigo-500/30 hover:border-indigo-500/50',
}

function itemCount(c: Collection): number {
  return c.collection_items?.[0]?.count ?? 0
}

interface Props {
  userId:      string | null
  isProUser:   boolean
  ownOnly?:    boolean   // true = show only user's own collections (dashboard view)
  basePath?:   string
}

export function CollectionsClient({ userId, isProUser, ownOnly = false, basePath = '/collections' }: Props) {
  const [collections, setCollections] = useState<Collection[]>([])
  const [loading,     setLoading]     = useState(true)
  const [showCreate,  setShowCreate]  = useState(false)
  const [creating,    setCreating]    = useState(false)
  const [deletingId,  setDeletingId]  = useState<string | null>(null)
  const [editingId,   setEditingId]   = useState<string | null>(null)

  const [form, setForm] = useState({
    title:        '',
    description:  '',
    cover_url:    '',
    theme_color:  'primary',
    is_published: true,
  })

  const atLimit = !isProUser && collections.filter(c => c.user_id === userId).length >= FREE_LIMIT

  useEffect(() => {
    fetchCollections()
  }, [])

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
    if (atLimit) {
      toast.error('Upgrade to Pro for unlimited collections')
      return
    }
    setCreating(true)
    try {
      const res  = await fetch('/api/collections', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 403) {
          toast.error(data.message ?? 'Collection limit reached')
          return
        }
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

  const handleTogglePublish = async (id: string, current: boolean) => {
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

  const handleDelete = async (id: string, title: string) => {
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

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <BookMarked size={16} className="text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">Collections</h1>
            <p className="text-muted-foreground text-sm">
              Curated comic picks, themed and shareable
              {!isProUser && (
                <span className="text-muted-foreground/60 ml-1">
                  · {Math.max(0, FREE_LIMIT - collections.filter(c => c.user_id === userId).length)} free slot{FREE_LIMIT - collections.filter(c => c.user_id === userId).length !== 1 ? 's' : ''} remaining
                </span>
              )}
            </p>
          </div>
        </div>

        {userId && !showCreate && (
          <Button
            size="sm"
            onClick={() => atLimit ? toast.error('Upgrade to Pro for unlimited collections') : setShowCreate(true)}
            className={cn('gap-1.5', atLimit && 'bg-gradient-to-r from-amber-400 to-orange-500 border-0 hover:opacity-90')}
          >
            {atLimit ? <Crown size={14} /> : <Plus size={14} />}
            {atLimit ? 'Upgrade for More' : 'New Collection'}
          </Button>
        )}
      </div>

      {/* Create form */}
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

            {/* Theme picker */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Theme Colour</label>
              <div className="flex gap-2">
                {THEME_OPTIONS.map(t => (
                  <button
                    key={t.value}
                    onClick={() => setForm(f => ({ ...f, theme_color: t.value }))}
                    className={cn(
                      'w-7 h-7 rounded-full border-2 transition-all',
                      t.color,
                      form.theme_color === t.value ? 'border-foreground scale-110' : 'border-transparent hover:scale-105'
                    )}
                    title={t.label}
                  />
                ))}
              </div>
            </div>

            {/* Publish toggle */}
            <label className="flex items-center gap-3 cursor-pointer group">
              <div
                className={cn('w-4 h-4 rounded border-2 flex items-center justify-center transition-colors shrink-0', form.is_published ? 'bg-primary border-primary' : 'border-border group-hover:border-primary/60')}
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

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-16">
          <Loader2 size={24} className="animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty state */}
      {!loading && collections.length === 0 && (
        <div className="text-center py-16 rounded-2xl border border-dashed border-border space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <BookMarked size={20} className="text-primary opacity-60" />
          </div>
          <div>
            <p className="font-black text-sm">No collections yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              {userId ? 'Create your first curated collection of comics.' : 'No public collections yet.'}
            </p>
          </div>
          {userId && (
            <Button size="sm" onClick={() => setShowCreate(true)} className="gap-2">
              <Plus size={14} />
              Create First Collection
            </Button>
          )}
        </div>
      )}

      {/* Grid */}
      {!loading && collections.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {collections.map((col) => {
            const isOwner    = col.user_id === userId
            const count      = itemCount(col)
            const themeGrad  = THEME_STYLES[col.theme_color]  ?? THEME_STYLES.primary
            const themeBorder = THEME_BORDER[col.theme_color] ?? THEME_BORDER.primary

            return (
              <div
                key={col.id}
                className={cn(
                  'group relative rounded-2xl border bg-card overflow-hidden transition-all duration-200 hover:shadow-lg',
                  col.is_published ? themeBorder : 'border-dashed border-border opacity-70 hover:opacity-90'
                )}
              >
                {/* Gradient banner */}
                <div className={cn('h-16 bg-gradient-to-br to-transparent', themeGrad, 'relative overflow-hidden')}>
                  {col.cover_url && (
                    <img src={col.cover_url} alt={col.title} className="absolute inset-0 w-full h-full object-cover opacity-30" />
                  )}
                  {/* Publish status */}
                  <div className="absolute top-2 right-2">
                    {col.is_published
                      ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-600 border border-emerald-500/20"><Globe size={8} /> Public</span>
                      : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-muted text-muted-foreground border border-border"><Lock size={8} /> Draft</span>
                    }
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  {/* Title */}
                  <div>
                    <Link href={`${basePath}/${col.id}`} className="font-black text-sm hover:text-primary transition-colors line-clamp-1 block">
                      {col.title}
                    </Link>
                    {col.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5 leading-relaxed">{col.description}</p>
                    )}
                  </div>

                  {/* Meta */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1">
                        <BookOpen size={10} className="text-primary/60" />
                        <strong className="text-foreground font-black">{count}</strong> comic{count !== 1 ? 's' : ''}
                      </span>
                      {col.save_count > 0 && (
                        <span className="flex items-center gap-1">
                          <Sparkles size={9} className="text-amber-500/60" />
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

                  {/* Actions */}
                  <div className="flex items-center gap-1.5">
                    <Link href={`${basePath}/${col.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full h-7 text-xs gap-1.5 hover:border-primary/40 hover:text-primary">
                        View <ArrowRight size={10} />
                      </Button>
                    </Link>

                    {isOwner && (
                      <>
                        <Button
                          variant="ghost" size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          onClick={() => handleTogglePublish(col.id, col.is_published)}
                          title={col.is_published ? 'Unpublish' : 'Publish'}
                        >
                          {col.is_published ? <Lock size={12} /> : <Globe size={12} />}
                        </Button>
                        <Button
                          variant="ghost" size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDelete(col.id, col.title)}
                          disabled={deletingId === col.id}
                        >
                          {deletingId === col.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Pro upsell */}
      {!isProUser && userId && collections.filter(c => c.user_id === userId).length > 0 && (
        <div className="flex items-center justify-center pt-2">
          <Link href="/pricing" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-amber-500 transition-colors">
            <Crown size={11} />
            Upgrade to Pro for unlimited collections
          </Link>
        </div>
      )}
    </div>
  )
}