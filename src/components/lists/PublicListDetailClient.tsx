'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import {
  BookOpen, Globe, Lock, ThumbsUp,
  Star, Share2, Pencil, Check, X, Loader2, Settings,
  Radar,
} from 'lucide-react'
import { formatDate } from '@/lib/utils/format'
import { AddToTrackerSearch } from '@/components/recommendations/AddToTrackerSearch'
import { AuthPromptModal } from '@/components/ui/auth-prompt-modal'
import { cn } from '@/lib/utils'
import { TRACKING_STATUS_META, resolveSubStatusLabel, type TrackingStatusValue } from '@/lib/utils/constants'

interface Props {
  list:           any
  owner:          { username: string; display_name: string | null; avatar_url: string | null } | null
  items:          any[]
  statusCounts:   Record<string, number>
  ownerInitials:  string
  isOwner:        boolean
  isLoggedIn:     boolean
  initialStarred: boolean
  typeColors:     Record<string, string>
  statusMeta:     Record<string, { label: string; emoji: string }>
  myListsHref:    string
}

// Dot color now sourced from TRACKING_STATUS_META (constants.ts) instead of
// a local duplicate — this was a 5th copy of the same status→color mapping
// found across the tracker, on top of the 4 already consolidated. Kept as
// a small local helper (rather than inlining TRACKING_STATUS_META[status].dot
// everywhere below) so the `?? 'bg-border'` fallback for unrecognized/legacy
// status values stays in one place.
function statusDot(status: string): string {
  return TRACKING_STATUS_META[status as TrackingStatusValue]?.dot ?? 'bg-border'
}

export function PublicListDetailClient({
  list: initialList,
  owner,
  items,
  statusCounts,
  ownerInitials,
  isOwner,
  isLoggedIn,
  initialStarred,
  typeColors: _typeColors, // no longer used for pill backgrounds — type now renders as plain italic text
  statusMeta,
  myListsHref,
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

  function proxyCover(url: string | null | undefined): string | null {
    if (!url) return null
    // data: URIs are self-contained — pass through untouched
    if (url.startsWith('data:')) return url
    // Already a relative/local URL
    if (url.startsWith('/')) return url
    // Already proxied
    if (url.includes('/api/image-proxy')) return url
    return `/api/image-proxy?url=${encodeURIComponent(url)}`
  }

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

  const starLabel = starred
    ? starCount > 0 ? `${starCount} starred` : 'Starred'
    : starCount > 0 ? `${starCount}` : 'Star'

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      {/* ── Header ── */}
      <div className="space-y-4">
        {/* Actions */}
        <div className="flex items-center justify-end gap-4">
          {isOwner ? (
            editMode ? (
              <>
                <button
                  onClick={handleCancel}
                  className="text-xs text-muted-foreground/60 hover:text-foreground transition-colors flex items-center gap-1"
                >
                  <X size={11} /> Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!editName.trim() || saving}
                  className="text-xs font-medium text-foreground border-b border-foreground/60 hover:opacity-60 transition-opacity flex items-center gap-1 disabled:opacity-40"
                >
                  {saving ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                  Save
                </button>
              </>
            ) : (
              <>
                <button onClick={handleShare} className="text-xs text-muted-foreground/70 hover:text-foreground transition-colors flex items-center gap-1.5">
                  <Share2 size={12} /> Share
                </button>
                <button onClick={() => setEditMode(true)} className="text-xs text-muted-foreground/70 hover:text-foreground transition-colors flex items-center gap-1.5">
                  <Pencil size={12} /> Edit
                </button>
                <Link href={myListsHref} className="text-xs text-muted-foreground/50 hover:text-foreground transition-colors flex items-center gap-1.5">
                  <Settings size={12} /> Manage
                </Link>
              </>
            )
          ) : (
            <>
              <button
                onClick={handleStar}
                disabled={starring}
                className={cn(
                  'text-xs transition-colors flex items-center gap-1.5',
                  starred ? 'text-amber-600 font-medium' : 'text-muted-foreground/70 hover:text-foreground'
                )}
              >
                {starring ? <Loader2 size={12} className="animate-spin" /> : <Star size={12} className={starred ? 'fill-amber-500 text-amber-500' : ''} />}
                {starLabel}
              </button>
              <button onClick={handleShare} className="text-xs text-muted-foreground/70 hover:text-foreground transition-colors flex items-center gap-1.5">
                <Share2 size={12} /> Share
              </button>
            </>
          )}
        </div>

        {/* Name + desc — editable for owner */}
        {editMode ? (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] text-muted-foreground/60">Name <span className="text-destructive">*</span></label>
              <input
                value={editName}
                onChange={e => setEditName(e.target.value)}
                autoFocus
                className="w-full font-serif text-2xl bg-transparent border-0 border-b border-border/50 px-0 py-1 outline-none focus:border-foreground/60 transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] text-muted-foreground/60">Description</label>
              <input
                value={editDesc}
                onChange={e => setEditDesc(e.target.value)}
                placeholder="What's this list about?"
                className="w-full text-sm bg-transparent border-0 border-b border-border/50 px-0 py-1 outline-none focus:border-foreground/60 transition-colors placeholder:text-muted-foreground/40"
              />
            </div>
            <label className="flex items-center gap-3 cursor-pointer group">
              <div
                className={cn('w-4 h-4 rounded-sm border flex items-center justify-center transition-colors shrink-0',
                  editPublic ? 'bg-foreground border-foreground' : 'border-border/60 group-hover:border-foreground/40')}
                onClick={() => setEditPublic((p: boolean) => !p)}>
                {editPublic && <Check size={10} className="text-background" />}
              </div>
              <div>
                <span className="text-sm">Public</span>
                <p className="text-xs text-muted-foreground/60">Others can discover and star this list</p>
              </div>
            </label>
          </div>
        ) : (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="font-serif text-3xl tracking-tight text-foreground">{list.name}</h1>
              <span className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wide text-muted-foreground/50">
                {list.is_public ? <Globe size={10} /> : <Lock size={10} />}
                {list.is_public ? 'Public' : 'Private'}
              </span>
            </div>
            {list.description && (
              <p className="text-sm text-muted-foreground/80 leading-relaxed">{list.description}</p>
            )}
          </div>
        )}

        {/* Owner + stats */}
        <div className="flex items-center justify-between flex-wrap gap-3 pt-1">
          {owner && (
            <Link href={`/profile/${owner.username}`} className="flex items-center gap-2 group">
              <Avatar className="h-6 w-6">
                <AvatarImage src={owner.avatar_url ? owner.avatar_url : undefined} />
                <AvatarFallback className="text-[10px] font-medium bg-muted text-muted-foreground">
                  {ownerInitials}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm text-muted-foreground/70 group-hover:text-foreground transition-colors">
                by <span className="text-foreground">@{owner.username}</span>
              </span>
            </Link>
          )}
          <div className="flex items-center gap-2.5 text-[11px] uppercase tracking-wide text-muted-foreground/50">
            <span>{items.length} comic{items.length !== 1 ? 's' : ''}</span>
            {starCount > 0 && (
              <>
                <span className="text-border">·</span>
                <span className="flex items-center gap-1 normal-case tracking-normal">
                  <Star size={10} className="text-amber-500/70" />
                  {starCount} starred
                </span>
              </>
            )}
            <span className="text-border">·</span>
            <span>Updated {formatDate(list.updated_at ?? list.created_at)}</span>
          </div>
        </div>

        {/* Status breakdown — plain text, dot separated */}
        {Object.keys(statusCounts).length > 0 && (
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground/70 border-t border-border/40 pt-3">
            {Object.entries(statusCounts).map(([status, count]) => {
              const meta = statusMeta[status]
              if (!meta) return null
              return (
                <span key={status} className="inline-flex items-center gap-1.5">
                  <span className={cn('h-1.5 w-1.5 rounded-full', statusDot(status))} />
                  {meta.label} · {count as number}
                </span>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Add comic — owner only ── */}
      {isOwner && (
        <AddToTrackerSearch
          lists={[{ id: list.id, name: list.name }]}
          onAdded={handleAdded}
        />
      )}

      {/* ── Items ── */}
      {items.length === 0 ? (
        <div className="text-center py-20 space-y-3">
          <BookOpen size={22} className="text-muted-foreground/30 mx-auto" />
          <p className="text-sm text-muted-foreground/60">
            {isOwner ? 'Use the search above to add comics to this list.' : 'This list has no comics yet.'}
          </p>
          {isOwner && (
            <Link href="/browse">
              <Button size="sm" variant="outline" className="gap-1.5 mt-1"><Radar size={13} /> Browse comics</Button>
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
            const coverSrc        = proxyCover(rec.cover_url)

            return (
              <Link
                key={item.id}
                href={`/comic/${rec.id}`}
                className="group flex gap-4 py-5"
              >
                <div className="w-16 aspect-[2/3] rounded-lg overflow-hidden bg-muted shrink-0 shadow-sm group-hover:shadow-md transition-shadow">
                  {coverSrc ? (
                    <img
                      src={coverSrc}
                      alt={rec.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen size={16} className="text-muted-foreground opacity-40" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0 space-y-1.5 py-0.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-serif text-base leading-snug line-clamp-1 text-foreground group-hover:opacity-70 transition-opacity">
                      {rec.title}
                    </p>
                    {rec.upvotes > 0 && (
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground/60 shrink-0">
                        <ThumbsUp size={10} /> {rec.upvotes}
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] italic text-muted-foreground/60 lowercase">
                    {rec.type}
                    {rec.status ? ` · ${rec.status}` : ''}
                    {rec.genres?.length ? ` · ${rec.genres.slice(0, 2).join(', ')}` : ''}
                  </p>

                  {smeta && (
                    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground/70">
                      <span className={cn('h-1.5 w-1.5 rounded-full', statusDot(item.status))} />
                      {smeta.label}
                      {subStatusLabel && (
                        <span className="text-muted-foreground/50 italic">· {subStatusLabel}</span>
                      )}
                    </span>
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
          icon:   <Star size={24} className="text-amber-500" />,
        }}
      />
    </div>
  )
}