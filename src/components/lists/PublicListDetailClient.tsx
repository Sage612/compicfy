'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { formatDate } from '@/lib/utils/format'
import { AddToTrackerSearch } from '@/components/recommendations/AddToTrackerSearch'
import { AuthPromptModal } from '@/components/ui/auth-prompt-modal'
import { PageShell, PageHeader } from '@/components/dashboard/PageHeader'
import { cn } from '@/lib/utils'
import { resolveSubStatusLabel } from '@/lib/utils/constants'

interface Props {
  list:           any
  owner:          { username: string; display_name: string | null; avatar_url: string | null } | null
  items:          any[]
  statusCounts:   Record<string, number>
  ownerInitials:  string
  isOwner:        boolean
  isLoggedIn:     boolean
  initialStarred: boolean
  typeColors:     Record<string, string>   // kept for page compatibility, no longer rendered
  statusMeta:     Record<string, { label: string; emoji: string }>
  myListsHref:    string
  backHref?:      string
  backLabel?:     string
}

function proxyCover(url: string | null | undefined): string | null {
  if (!url) return null
  if (url.startsWith('data:')) return url
  if (url.startsWith('/')) return url
  if (url.includes('/api/image-proxy')) return url
  return `/api/image-proxy?url=${encodeURIComponent(url)}`
}

const outlineBtn =
  'h-8 px-3 rounded-md border border-border text-xs text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors inline-flex items-center gap-1.5'

export function PublicListDetailClient({
  list: initialList,
  owner,
  items,
  statusCounts,
  ownerInitials,
  isOwner,
  isLoggedIn,
  initialStarred,
  typeColors: _typeColors,
  statusMeta,
  myListsHref,
  backHref,
  backLabel = 'Back',
}: Props) {
  const [list,       setList]       = useState(initialList)
  const [starred,    setStarred]    = useState(initialStarred)
  const [starCount,  setStarCount]  = useState(initialList.star_count ?? 0)
  const [starring,   setStarring]   = useState(false)
  const [editMode,   setEditMode]   = useState(false)
  const [saving,     setSaving]     = useState(false)
  const [editName,   setEditName]   = useState(initialList.name)
  const [editDesc,   setEditDesc]   = useState(initialList.description ?? '')
  const [editPublic, setEditPublic] = useState(initialList.is_public)
  const [authPrompt, setAuthPrompt] = useState(false)

  // Cover: up to four covers from the list's own comics, newest first.
  const bannerCovers: string[] = items
    .map((i: any) => proxyCover(i.recommendations?.cover_url))
    .filter(Boolean)
    .slice(0, 4) as string[]

  const handleStar = async () => {
    if (!isLoggedIn) { setAuthPrompt(true); return }
    setStarring(true)
    try {
      const res  = await fetch(`/api/lists/${list.id}/star`, { method: starred ? 'DELETE' : 'POST' })
      const data = await res.json()
      if (!res.ok) { toast.error('Failed to update'); return }
      setStarred(!starred)
      if (typeof data.star_count === 'number') setStarCount(data.star_count)
      toast.success(starred ? 'Removed star' : 'List starred!')
    } catch { toast.error('Failed to update') }
    finally { setStarring(false) }
  }

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/lists/${list.id}`)
      toast.success('Link copied!')
    } catch { toast.error('Failed to copy link') }
  }

  const handleSave = async () => {
    if (!editName.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`/api/lists/${list.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name: editName, description: editDesc, is_public: editPublic }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setList({ ...list, name: data.list.name, description: data.list.description, is_public: data.list.is_public })
      setEditMode(false)
      toast.success('List updated!')
    } catch { toast.error('Failed to update list') }
    finally { setSaving(false) }
  }

  const handleCancel = () => {
    setEditName(list.name)
    setEditDesc(list.description ?? '')
    setEditPublic(list.is_public)
    setEditMode(false)
  }

  const handleAdded = (_comicId: string, _title: string, _listId: string, _status: string) => {
    // Reload to get full rec data for the new item
    window.location.reload()
  }

  const labelClass = 'text-[11px] uppercase tracking-widest text-muted-foreground/70'
  const subtitle = [
    list.description || null,
  ].filter(Boolean).join('')

  return (
    <PageShell width="narrow">
      <PageHeader
        eyebrow={list.is_public ? 'Public list' : 'Private list'}
        title={editMode ? 'Edit list' : list.name}
        subtitle={editMode ? undefined : subtitle || undefined}
        backHref={backHref}
        backLabel={backLabel}
      />

      {/* Cover */}
      {bannerCovers.length > 0 && (
        <div className="aspect-[3/1] rounded-xl overflow-hidden bg-muted border border-border flex gap-px">
          {bannerCovers.map((src, i) => (
            <div key={i} className="flex-1 min-w-0 overflow-hidden">
              <img src={src} alt="" aria-hidden className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      )}

      {/* Edit form */}
      {editMode && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="space-y-1.5">
            <label className={labelClass}>Name</label>
            <input
              value={editName}
              onChange={e => setEditName(e.target.value)}
              autoFocus
              className="w-full font-dashboard-serif text-xl bg-transparent border-0 border-b border-border/60 px-0 py-1 outline-none focus:border-foreground/60 transition-colors"
            />
          </div>
          <div className="space-y-1.5">
            <label className={labelClass}>Description</label>
            <input
              value={editDesc}
              onChange={e => setEditDesc(e.target.value)}
              placeholder="What's this list about?"
              className="w-full text-sm bg-transparent border-0 border-b border-border/60 px-0 py-1 outline-none focus:border-foreground/60 transition-colors placeholder:text-muted-foreground/40"
            />
          </div>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={editPublic}
              onChange={() => setEditPublic((p: boolean) => !p)}
              className="mt-0.5 h-4 w-4 rounded border-border accent-foreground"
            />
            <span>
              <span className="text-sm text-foreground">Public</span>
              <span className="block text-xs text-muted-foreground">Others can discover and star this list</span>
            </span>
          </label>
          <div className="flex gap-2 pt-1">
            <Button size="sm" onClick={handleSave} disabled={!editName.trim() || saving} className="gap-2">
              {saving && <Loader2 size={13} className="animate-spin" />}
              Save changes
            </Button>
            <Button size="sm" variant="ghost" onClick={handleCancel} disabled={saving}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Actions + byline */}
      {!editMode && (
        <div className="flex items-center justify-between flex-wrap gap-3">
          {owner ? (
            <Link href={`/profile/${owner.username}`} className="flex items-center gap-2 group">
              <Avatar className="h-6 w-6">
                <AvatarImage src={owner.avatar_url ? owner.avatar_url : undefined} />
                <AvatarFallback className="text-[10px] font-medium bg-muted text-muted-foreground">
                  {ownerInitials}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                by <span className="text-foreground">@{owner.username}</span>
              </span>
            </Link>
          ) : <span />}

          <div className="flex items-center gap-2">
            {isOwner ? (
              <>
                <button onClick={handleShare} className={outlineBtn}>Share</button>
                <button onClick={() => setEditMode(true)} className={outlineBtn}>Edit</button>
                <Link href={myListsHref} className={outlineBtn}>Manage</Link>
              </>
            ) : (
              <>
                <button
                  onClick={handleStar}
                  disabled={starring}
                  aria-pressed={starred}
                  className={cn(
                    'h-8 px-3 rounded-md border text-xs transition-colors inline-flex items-center gap-1.5 tabular-nums',
                    starred
                      ? 'bg-foreground text-background border-foreground'
                      : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/40'
                  )}
                >
                  {starring && <Loader2 size={11} className="animate-spin" />}
                  {starred ? 'Starred' : 'Star this list'}
                  {starCount > 0 && <span className="opacity-70">{starCount}</span>}
                </button>
                <button onClick={handleShare} className={outlineBtn}>Share</button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Stats */}
      {!editMode && (
        <div className="space-y-3 border-t border-border/40 pt-4">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground/70">
            {items.length} comic{items.length !== 1 ? 's' : ''}
            {isOwner && starCount > 0 ? ` · ${starCount} starred` : ''}
            {' · Updated '}{formatDate(list.updated_at ?? list.created_at)}
          </p>
          {Object.keys(statusCounts).length > 0 && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {Object.entries(statusCounts).map(([status, count]) => {
                const meta = statusMeta[status]
                if (!meta) return null
                return (
                  <span key={status}>
                    {meta.label} <span className="tabular-nums text-foreground/70">{count as number}</span>
                  </span>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Add comic, owner only */}
      {isOwner && (
        <AddToTrackerSearch
          lists={[{ id: list.id, name: list.name }]}
          onAdded={handleAdded}
        />
      )}

      {/* Items */}
      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card px-6 py-14 text-center">
          <h3 className="font-dashboard-serif text-lg text-foreground">No comics yet</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {isOwner ? 'Use the search above to add comics to this list.' : 'This list has no comics yet.'}
          </p>
          {isOwner && (
            <Link
              href="/browse"
              className="inline-block mt-4 text-sm text-foreground underline underline-offset-4 decoration-border hover:decoration-foreground transition-colors"
            >
              Browse comics
            </Link>
          )}
        </div>
      ) : (
        <div className="divide-y divide-border/40">
          {items.map((item: any) => {
            const rec = item.recommendations
            if (!rec) return null
            const smeta          = statusMeta[item.status]
            const subStatusLabel = resolveSubStatusLabel(item.status, item.sub_status)
            const coverSrc       = proxyCover(rec.cover_url)

            return (
              <Link key={item.id} href={`/comic/${rec.id}`} className="group flex gap-4 py-5">
                <div className="w-16 aspect-[2/3] rounded-lg overflow-hidden bg-muted border border-border shrink-0">
                  {coverSrc && (
                    <img src={coverSrc} alt={rec.title} className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="flex-1 min-w-0 space-y-1.5 py-0.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-dashboard-serif text-base leading-snug line-clamp-1 text-foreground group-hover:opacity-70 transition-opacity">
                      {rec.title}
                    </p>
                    {rec.upvotes > 0 && (
                      <span className="text-[11px] text-muted-foreground/70 shrink-0 tabular-nums">
                        {rec.upvotes} upvotes
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] italic text-muted-foreground/70 lowercase">
                    {rec.type}
                    {rec.status ? ` · ${rec.status}` : ''}
                    {rec.genres?.length ? ` · ${rec.genres.slice(0, 2).join(', ')}` : ''}
                  </p>
                  {smeta && (
                    <p className="text-xs text-muted-foreground">
                      {smeta.label}
                      {subStatusLabel && <span className="text-muted-foreground/60 italic"> · {subStatusLabel}</span>}
                    </p>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}

      <AuthPromptModal
        open={authPrompt}
        onClose={() => setAuthPrompt(false)}
        config={{
          action: 'star this list',
          icon:   <span className="text-lg">★</span>,
        }}
      />
    </PageShell>
  )
}