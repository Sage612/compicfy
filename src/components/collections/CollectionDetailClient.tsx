'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Bookmark, X } from 'lucide-react'
import { ComicCard } from '@/components/recommendations/ComicCard'
import { AddToCollectionSearch } from '@/components/collections/AddToCollectionSearch'
import { AuthPromptModal } from '@/components/ui/auth-prompt-modal'
import { PageShell, PageHeader } from '@/components/dashboard/PageHeader'
import type { Recommendation } from '@/types/app.types'

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
  // Still stored and sent unchanged; the UI no longer renders colour themes.
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

interface Props {
  collection: Collection
  isSaved:    boolean
  isOwner:    boolean
  isLoggedIn: boolean
  backHref?:  string
  backLabel?: string
  isPro?:     boolean
}

const proxy = (url: string) => `/api/image-proxy?url=${encodeURIComponent(url)}`

export function CollectionDetailClient({
  collection, isSaved: initialSaved, isOwner, isLoggedIn,
  backHref = '/collections', backLabel = 'All collections', isPro = false,
}: Props) {
  const [saved,       setSaved]       = useState(initialSaved)
  const [savingState, setSavingState] = useState(false)
  const [saveCount,   setSaveCount]   = useState(collection.save_count)
  const [removingId,  setRemovingId]  = useState<string | null>(null)
  const [authPrompt,  setAuthPrompt]  = useState(false)
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

  const [currentTitle,     setCurrentTitle]     = useState(collection.title)
  const [currentDesc,      setCurrentDesc]      = useState(collection.description)
  const [currentPublished, setCurrentPublished] = useState(collection.is_published)

  const covers = items.map(i => i.recommendations?.cover_url).filter(Boolean).slice(0, 6) as string[]

  // Real count from DB (trigger keeps it accurate)
  const saveLabel = saved
    ? saveCount > 0 ? `${saveCount} saved` : 'Saved'
    : saveCount > 0 ? `Save · ${saveCount}` : 'Save'

  const handleSave = async () => {
    if (!isLoggedIn) { setAuthPrompt(true); return }
    setSavingState(true)
    try {
      const res  = await fetch(`/api/collections/${collection.id}/save`, { method: saved ? 'DELETE' : 'POST' })
      const data = await res.json()
      if (!res.ok && res.status !== 409) {
        toast.error('Failed to update'); return
      }
      setSaved(!saved)
      if (typeof data.save_count === 'number') setSaveCount(data.save_count)
      toast.success(saved ? 'Removed from saved' : 'Collection saved')
    } catch { toast.error('Failed to update') }
    finally { setSavingState(false) }
  }

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/collections/${collection.id}`)
      toast.success('Link copied')
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
      setCurrentPublished(editForm.is_published)
      setShowEdit(false)
      toast.success('Collection updated')
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

  const subtitle = [
    `${items.length} comic${items.length !== 1 ? 's' : ''}`,
    saveCount > 0 && `${saveCount} ${saveCount === 1 ? 'save' : 'saves'}`,
    isOwner && (currentPublished ? 'Public' : 'Draft'),
  ].filter(Boolean).join(' · ')

  return (
    <PageShell>

      {/* Edit modal */}
      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => !saving && setShowEdit(false)}>
          <div onClick={e => e.stopPropagation()} className="w-full max-w-md bg-card rounded-xl border border-border shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Edit collection</p>
              <button onClick={() => setShowEdit(false)} className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Close">
                <X size={14} />
              </button>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Title</label>
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
                <input
                  type="checkbox"
                  checked={editForm.is_published}
                  onChange={e => setEditForm(f => ({ ...f, is_published: e.target.checked }))}
                  className="w-4 h-4 accent-foreground"
                />
                <span>
                  <span className="text-sm text-foreground">Published</span>
                  <span className="block text-xs text-muted-foreground">Others can discover and save this collection</span>
                </span>
              </label>
              <div className="flex gap-2 pt-1">
                <Button size="sm" onClick={handleEditSave} disabled={!editForm.title.trim() || saving}>
                  {saving ? 'Saving…' : 'Save changes'}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowEdit(false)}>Cancel</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <PageHeader
        eyebrow="Collection"
        title={currentTitle}
        subtitle={subtitle}
        backHref={backHref}
        backLabel={backLabel}
        isPro={isPro}
        actions={
          <>
            <Button size="sm" variant="outline" onClick={handleShare}>Share</Button>
            {isOwner ? (
              <Button size="sm" variant="outline" onClick={() => setShowEdit(true)}>Edit</Button>
            ) : (
              <Button size="sm" variant={saved ? 'default' : 'outline'} onClick={handleSave} disabled={savingState}>
                {savingState ? 'Saving…' : saveLabel}
              </Button>
            )}
          </>
        }
      />

      {/* Cover strip: neutral mosaic of the first comics, or the collection's own cover */}
      {(covers.length > 0 || collection.cover_url) && (
        <div className="h-32 md:h-44 rounded-xl overflow-hidden border border-border bg-muted flex gap-px">
          {covers.length > 0 ? (
            covers.map((url, i) => (
              <div key={i} className="flex-1 min-w-0">
                <img src={proxy(url)} alt="" aria-hidden className="w-full h-full object-cover" />
              </div>
            ))
          ) : (
            <img src={proxy(collection.cover_url!)} alt={currentTitle} className="w-full h-full object-cover" />
          )}
        </div>
      )}

      {(currentDesc || collection.profiles) && (
        <div className="space-y-2">
          {currentDesc && <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">{currentDesc}</p>}
          {collection.profiles && (
            <p className="text-xs text-muted-foreground">
              Curated by{' '}
              <Link href={`/profile/${collection.profiles.username ?? ''}`} className="text-foreground underline underline-offset-4 hover:text-muted-foreground transition-colors">
                @{collection.profiles.username ?? 'unknown'}
              </Link>
            </p>
          )}
        </div>
      )}

      {isOwner && (
        <AddToCollectionSearch collectionId={collection.id} onAdded={handleAdded} />
      )}

      {items.length === 0 ? (
        <div className="text-center py-16 rounded-xl border border-dashed border-border space-y-1">
          <p className="font-dashboard-serif text-lg text-foreground">No comics yet</p>
          {isOwner && <p className="text-sm text-muted-foreground">Use the search above, or add comics from any comic page.</p>}
        </div>
      ) : (
        <section className="space-y-3">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground/70">Comics in this collection</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4">
            {items.map((item) => (
              <div key={item.id} className="relative group/item">
                <ComicCard recommendation={item.recommendations} />
                {isOwner && (
                  <button
                    onClick={() => handleRemoveItem(item.id, item.recommendations.id)}
                    disabled={removingId === item.id}
                    className="absolute top-2 right-2 z-20 text-[11px] px-2 py-1 rounded-full bg-background/90 backdrop-blur border border-border text-muted-foreground hover:text-destructive disabled:opacity-50 md:opacity-0 md:group-hover/item:opacity-100 focus:opacity-100 transition-opacity"
                  >
                    {removingId === item.id ? 'Removing…' : 'Remove'}
                  </button>
                )}
                {item.note && <p className="text-[11px] text-muted-foreground mt-1 px-1 line-clamp-2 italic">&ldquo;{item.note}&rdquo;</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      <AuthPromptModal
        open={authPrompt}
        onClose={() => setAuthPrompt(false)}
        config={{
          action: 'save this collection',
          icon:   <Bookmark size={24} className="text-primary" />,
        }}
      />
    </PageShell>
  )
}
