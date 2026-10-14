'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import {
  Globe, Lock, Loader2, Trash2, Share2,
  X, Bookmark, Pencil, MoreVertical,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { AuthPromptModal } from '@/components/ui/auth-prompt-modal'
import { CollectionsSkeleton } from '@/components/collections/CollectionsSkeleton'
import { ActionSheet, type ActionSheetAction } from '@/components/ui/ActionSheet'
import { PageHeader } from '@/components/dashboard/PageHeader'

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

function itemCount(c: Collection): number {
  return c.collection_items?.length ?? 0
}

function getCoverPreviews(c: Collection): string[] {
  return (c.collection_items ?? [])
    .map((item) => item.recommendations?.cover_url ?? null)
    .filter(Boolean)
    .slice(0, 4) as string[]
}

function getSaveLabel(saveCount: number, isSaved: boolean): string {
  if (isSaved) return saveCount > 0 ? `${saveCount} saved` : 'Saved'
  return saveCount > 0 ? `${saveCount}` : 'Save'
}

function proxy(url: string) {
  return `/api/image-proxy?url=${encodeURIComponent(url)}`
}

// Neutral cover strip. theme_color is intentionally not rendered.
function CoverMosaic({ covers, coverUrl }: { covers: string[]; coverUrl: string | null }) {
  if (covers.length > 0) {
    return (
      <div className="h-28 flex gap-px bg-border">
        {covers.map((url, i) => (
          <div key={i} className="flex-1 min-w-0 bg-muted">
            <img src={proxy(url)} alt="" aria-hidden className="w-full h-full object-cover" />
          </div>
        ))}
      </div>
    )
  }
  if (coverUrl) {
    return (
      <div className="h-28 bg-muted">
        <img src={proxy(coverUrl)} alt="" aria-hidden className="w-full h-full object-cover" />
      </div>
    )
  }
  return <div className="h-28 bg-muted" />
}

interface Props {
  userId: string | null
  isProUser: boolean
  ownOnly?: boolean
  basePath?: string
  savedCollectionIds?: string[]
  showMobileCreate?: boolean
  /** Dashboard plumbing: back link for the header (omit on public pages). */
  backHref?: string
  backLabel?: string
  /** Pro-tree pages pass this so PageHeader shows the gold Pro mark. */
  isPro?: boolean
}

export function CollectionsClient({ userId, isProUser, ownOnly = false,
  basePath = '/collections', savedCollectionIds = [],
  showMobileCreate = false,
  backHref, backLabel = 'Back', isPro = false,
}: Props) {
  const [collections, setCollections] = useState<Collection[]>([])
  const [loading,     setLoading]     = useState(true)
  const searchParams = useSearchParams()
  const [showCreate,  setShowCreate]  = useState(false)
  const [creating,    setCreating]    = useState(false)
  const [deletingId,  setDeletingId]  = useState<string | null>(null)
  const [savingId,    setSavingId]    = useState<string | null>(null)
  const [savedIds,    setSavedIds]    = useState<Set<string>>(() => new Set(savedCollectionIds))
  const [authPrompt, setAuthPrompt] = useState(false)
  const [openMenuId,  setOpenMenuId]  = useState<string | null>(null)

  const [form, setForm] = useState({
    title:        '',
    description:  '',
    cover_url:    '',
    theme_color:  'primary',
    is_published: true,
  })

  // ── Edit modal state (per-card, not just detail page) ──
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null)
  const [editForm, setEditForm] = useState({
    title:        '',
    description:  '',
    cover_url:    '',
    theme_color:  'primary',
    is_published: true,
  })
  const [savingEdit, setSavingEdit] = useState(false)

  const atLimit = !isProUser && collections.filter(c => c.user_id === userId).length >= FREE_LIMIT

  useEffect(() => { fetchCollections() }, [])

  useEffect(() => {
    if (searchParams.get('create') === '1' && userId && !atLimit) {
      setShowCreate(true)
    }
  }, [searchParams, userId])

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

  const openEditModal = (e: React.MouseEvent, col: Collection) => {
    e.preventDefault(); e.stopPropagation()
    setEditingCollection(col)
    setEditForm({
      title:        col.title,
      description:  col.description ?? '',
      cover_url:    col.cover_url ?? '',
      theme_color:  col.theme_color,
      is_published: col.is_published,
    })
    setOpenMenuId(null)
  }

  const handleEditSave = async () => {
    if (!editingCollection || !editForm.title.trim()) return
    setSavingEdit(true)
    try {
      const res  = await fetch(`/api/collections/${editingCollection.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(editForm),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setCollections(prev => prev.map(c =>
        c.id === editingCollection.id
          ? { ...c, ...editForm, description: editForm.description || null }
          : c
      ))
      setEditingCollection(null)
      toast.success('Collection updated!')
    } catch {
      toast.error('Failed to update collection')
    } finally {
      setSavingEdit(false)
    }
  }

  const handleTogglePublish = async (id: string, current: boolean, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation()
    setOpenMenuId(null)
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
    setOpenMenuId(null)
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
    if (!userId) { setAuthPrompt(true); return }
    const isSaved = savedIds.has(id)
    setSavingId(id)
    try {
      const res  = await fetch(`/api/collections/${id}/save`, { method: isSaved ? 'DELETE' : 'POST' })
      const data = await res.json()
      if (!res.ok && res.status !== 409) {
        toast.error('Failed to update'); return
      }
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
    setOpenMenuId(null)
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/collections/${id}`)
      toast.success('Link copied!')
    } catch {
      toast.error('Failed to copy link')
    }
  }

  // Single source of truth for the owner action list — used by both the
  // mobile masonry cards and the desktop grid cards, and by the shared sheet.
  const getOwnerActions = (col: Collection): ActionSheetAction[] => [
    { label: 'Edit', icon: <Pencil size={14} />, onClick: (e) => openEditModal(e, col) },
    { label: col.is_published ? 'Unpublish' : 'Publish', icon: col.is_published ? <Lock size={14} /> : <Globe size={14} />, onClick: (e) => handleTogglePublish(col.id, col.is_published, e) },
    { label: 'Share', icon: <Share2 size={14} />, onClick: (e) => handleShare(col.id, e) },
    { label: 'Delete', icon: deletingId === col.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />, onClick: (e) => handleDelete(col.id, col.title, e), destructive: true },
  ]

  const menuTarget = collections.find(c => c.id === openMenuId) ?? null

  const ownCount = collections.filter(c => c.user_id === userId).length

  const newButton = userId && !showCreate ? (
    <Button
      size="sm"
      variant={atLimit ? 'outline' : 'default'}
      onClick={() => atLimit ? toast.error('Upgrade to Pro for unlimited collections') : setShowCreate(true)}
      className={showMobileCreate ? undefined : 'hidden sm:inline-flex'}
    >
      {atLimit ? 'Upgrade for more' : 'New collection'}
    </Button>
  ) : null

  const subtitle =
    'Reading collections from the community' +
    (!isProUser && userId
      ? ` · ${Math.max(0, FREE_LIMIT - ownCount)} free slot${FREE_LIMIT - ownCount !== 1 ? 's' : ''} left`
      : '')

  const resetCreate = () => {
    setShowCreate(false)
    setForm({ title: '', description: '', cover_url: '', theme_color: 'primary', is_published: true })
  }

  return (
    <div className="space-y-8">

      {/* Edit modal */}
      {editingCollection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-card rounded-xl border border-border shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Edit collection</p>
              <button onClick={() => setEditingCollection(null)} aria-label="Close" className="text-muted-foreground hover:text-foreground transition-colors">
                <X size={14} />
              </button>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Title <span className="text-destructive">*</span></label>
                <Input value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} className="h-9 text-sm" autoFocus />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Description</label>
                <Textarea value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} placeholder="What makes this collection special…" rows={2} className="resize-none text-sm" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Cover URL</label>
                <Input value={editForm.cover_url} onChange={e => setEditForm(f => ({ ...f, cover_url: e.target.value }))} placeholder="https://…" className="h-9 text-sm" />
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={editForm.is_published} onChange={e => setEditForm(f => ({ ...f, is_published: e.target.checked }))} className="w-4 h-4 accent-foreground" />
                <span>
                  <span className="text-sm text-foreground">Published</span>
                  <span className="block text-xs text-muted-foreground">Others can discover and save this collection</span>
                </span>
              </label>
              <div className="flex gap-2 pt-1">
                <Button size="sm" onClick={handleEditSave} disabled={!editForm.title.trim() || savingEdit}>
                  {savingEdit ? 'Saving…' : 'Save changes'}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setEditingCollection(null)}>Cancel</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <PageHeader
        eyebrow="Library"
        title="Collections"
        subtitle={subtitle}
        backHref={backHref}
        backLabel={backLabel}
        isPro={isPro}
        actions={newButton || undefined}
      />

      {/* Create form */}
      {showCreate && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border">
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">New collection</p>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Title <span className="text-destructive">*</span></label>
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
                <label className="text-xs text-muted-foreground">Cover URL <span className="text-muted-foreground/60">(optional)</span></label>
                <Input
                  value={form.cover_url}
                  onChange={e => setForm(f => ({ ...f, cover_url: e.target.value }))}
                  placeholder="https://…"
                  className="h-9 text-sm"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Description <span className="text-muted-foreground/60">(optional)</span></label>
              <Textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="What makes this collection special…"
                rows={2}
                className="resize-none text-sm"
              />
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={form.is_published} onChange={e => setForm(f => ({ ...f, is_published: e.target.checked }))} className="w-4 h-4 accent-foreground" />
              <span>
                <span className="text-sm text-foreground">Publish immediately</span>
                <span className="block text-xs text-muted-foreground">Others can discover and save this collection</span>
              </span>
            </label>
            <div className="flex gap-2 pt-1">
              <Button size="sm" onClick={handleCreate} disabled={!form.title.trim() || creating}>
                {creating ? 'Creating…' : 'Create collection'}
              </Button>
              <Button variant="ghost" size="sm" onClick={resetCreate}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {loading && <CollectionsSkeleton />}

      {!loading && collections.length === 0 && (
        <div className="text-center py-20 rounded-xl border border-dashed border-border space-y-3">
          <div>
            <p className="font-dashboard-serif text-lg text-foreground">No collections yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              {userId ? 'Create your first curated collection of comics.' : 'No public collections yet.'}
            </p>
          </div>
          {userId && (
            <button onClick={() => setShowCreate(true)} className="text-xs text-foreground underline underline-offset-4">
              Create your first collection
            </button>
          )}
        </div>
      )}

      {!loading && collections.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {collections.map((col) => {
            const isOwner  = col.user_id === userId
            const count    = itemCount(col)
            const covers   = getCoverPreviews(col)
            const isSaved  = savedIds.has(col.id)
            const saveLabel = getSaveLabel(col.save_count, isSaved)

            return (
              <div
                key={col.id}
                className={cn(
                  'group relative rounded-xl border bg-card overflow-hidden transition-colors flex flex-col',
                  col.is_published ? 'border-border hover:border-foreground/30' : 'border-dashed border-border opacity-70 hover:opacity-90'
                )}
              >
                <Link href={`${basePath}/${col.id}`} className="block flex-1">
                  <CoverMosaic covers={covers} coverUrl={col.cover_url} />
                  <div className="p-3 space-y-1">
                    <p className="font-dashboard-serif text-base text-foreground line-clamp-1">{col.title}</p>
                    {col.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{col.description}</p>
                    )}
                    <p className="text-[11px] text-muted-foreground tabular-nums">
                      {count} comic{count !== 1 ? 's' : ''} · {col.is_published ? 'Public' : 'Draft'}
                      {col.save_count > 0 && ` · ${col.save_count} saved`}
                    </p>
                  </div>
                </Link>

                {isOwner ? (
                  <button
                    onClick={(e) => { e.stopPropagation(); setOpenMenuId(col.id) }}
                    aria-label="Collection options"
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-background/90 backdrop-blur border border-border text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
                  >
                    <MoreVertical size={13} />
                  </button>
                ) : (
                  <div className="flex items-center justify-between gap-2 px-3 pb-3 text-xs" onClick={e => e.stopPropagation()}>
                    {col.profiles ? (
                      <Link href={`/profile/${col.profiles.username}`} className="text-muted-foreground hover:text-foreground transition-colors truncate">
                        @{col.profiles.username}
                      </Link>
                    ) : <span />}
                    <div className="flex items-center gap-3 shrink-0">
                      <button
                        onClick={(e) => handleSave(col.id, e)}
                        disabled={savingId === col.id}
                        className={cn('transition-colors tabular-nums', isSaved ? 'text-foreground' : 'text-muted-foreground hover:text-foreground')}
                      >
                        {savingId === col.id ? 'Saving…' : saveLabel}
                      </button>
                      <button
                        onClick={(e) => handleShare(col.id, e)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Share
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {!isProUser && userId && ownCount > 0 && (
        <div className="text-center">
          <Link href="/pricing" className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline transition-colors">
            Upgrade to Pro for unlimited collections
          </Link>
        </div>
      )}

      {/* Shared action sheet, one instance for all cards */}
      <ActionSheet
        open={!!menuTarget}
        onClose={() => setOpenMenuId(null)}
        title={menuTarget?.title}
        actions={menuTarget ? getOwnerActions(menuTarget) : []}
      />

      <AuthPromptModal
        open={authPrompt}
        onClose={() => setAuthPrompt(false)}
        config={{
          action: 'save collections',
          icon:   <Bookmark size={24} className="text-primary" />,
        }}
      />

    </div>
  )
}
