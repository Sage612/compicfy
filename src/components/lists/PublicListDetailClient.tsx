'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import {
  BookOpen, Globe, Lock, BookMarked, ThumbsUp,
  Star, Share2, Pencil, Check, X, Loader2, Settings,
  Radar,
} from 'lucide-react'
import { formatDate } from '@/lib/utils/format'
import { AddToTrackerSearch } from '@/components/recommendations/AddToTrackerSearch'
import { cn } from '@/lib/utils'

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

export function PublicListDetailClient({
  list: initialList,
  owner,
  items,
  statusCounts,
  ownerInitials,
  isOwner,
  isLoggedIn,
  initialStarred,
  typeColors,
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
    if (!isLoggedIn) { toast.error('Log in to star lists'); return }
    setStarring(true)
    try {
      const res  = await fetch(`/api/lists/${list.id}/star`, { method: starred ? 'DELETE' : 'POST' })
      const data = await res.json()
      if (!res.ok) { toast.error('Failed to update'); return }
      setStarred(!starred)
      setStarCount(data.star_count ?? starCount)
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
    <>
      {/* ── List header card ── */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="h-16 bg-gradient-to-br from-primary/20 via-primary/5 to-transparent" />
        <div className="px-6 pb-6 -mt-6 space-y-4">
          <div className="flex items-end justify-between gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg ring-2 ring-card shrink-0">
              <BookMarked size={20} className="text-white" />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pb-1">
              {isOwner ? (
                editMode ? (
                  <>
                    <Button size="sm" onClick={handleSave} disabled={!editName.trim() || saving} className="h-8 text-xs gap-1.5">
                      {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                      Save
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleCancel} className="h-8 text-xs">
                      <X size={12} />
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" size="sm" onClick={handleShare} className="h-8 text-xs gap-1.5">
                      <Share2 size={12} /> Share
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setEditMode(true)} className="h-8 text-xs gap-1.5">
                      <Pencil size={12} /> Edit
                    </Button>
                    <Link href={myListsHref}>
                      <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5 text-muted-foreground">
                        <Settings size={12} /> Manage
                      </Button>
                    </Link>
                  </>
                )
              ) : (
                <>
                  <Button
                    size="sm"
                    variant={starred ? 'default' : 'outline'}
                    onClick={handleStar}
                    disabled={starring}
                    className={cn('h-8 text-xs gap-1.5', starred && 'bg-amber-500 hover:bg-amber-600 border-0')}
                  >
                    {starring ? <Loader2 size={12} className="animate-spin" /> : <Star size={12} className={starred ? 'fill-white' : ''} />}
                    {starLabel}
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleShare} className="h-8 text-xs gap-1.5">
                    <Share2 size={12} /> Share
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Name + desc — editable for owner */}
          {editMode ? (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Name <span className="text-destructive">*</span></label>
                <Input value={editName} onChange={e => setEditName(e.target.value)} className="h-9 text-sm" autoFocus />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Description</label>
                <Input value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="What's this list about?" className="h-9 text-sm" />
              </div>
              <label className="flex items-center gap-3 cursor-pointer group">
                <div
                  className={cn('w-4 h-4 rounded border-2 flex items-center justify-center transition-colors shrink-0',
                    editPublic ? 'bg-primary border-primary' : 'border-border group-hover:border-primary/60')}
                  onClick={() => setEditPublic((p: boolean) => !p)}>
                  {editPublic && <span className="text-primary-foreground text-[10px] font-black leading-none">✓</span>}
                </div>
                <div>
                  <span className="text-sm font-medium">Public</span>
                  <p className="text-xs text-muted-foreground">Others can discover and star this list</p>
                </div>
              </label>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-black tracking-tight">{list.name}</h1>
                <span className={cn(
                  'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border',
                  list.is_public
                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                    : 'bg-muted text-muted-foreground border-border'
                )}>
                  {list.is_public ? <Globe size={9} /> : <Lock size={9} />}
                  {list.is_public ? 'Public' : 'Private'}
                </span>
              </div>
              {list.description && (
                <p className="text-sm text-muted-foreground leading-relaxed">{list.description}</p>
              )}
            </div>
          )}

          {/* Owner + stats */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            {owner && (
              <Link href={`/profile/${owner.username}`} className="flex items-center gap-2 group">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={owner.avatar_url ? `/api/image-proxy?url=${encodeURIComponent(owner.avatar_url)}` : undefined} />
                  <AvatarFallback className="text-[10px] font-black bg-gradient-to-br from-primary to-violet-500 text-white">
                    {ownerInitials}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                  by <strong className="text-foreground">@{owner.username}</strong>
                </span>
              </Link>
            )}
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span><strong className="text-foreground font-black">{items.length}</strong> comic{items.length !== 1 ? 's' : ''}</span>
              {starCount > 0 && (
                <span className="flex items-center gap-1">
                  <Star size={10} className="text-amber-500/70" />
                  <strong className="text-foreground font-black">{starCount}</strong> starred
                </span>
              )}
              <span>Updated {formatDate(list.updated_at ?? list.created_at)}</span>
            </div>
          </div>

          {/* Status breakdown */}
          {Object.keys(statusCounts).length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(statusCounts).map(([status, count]) => {
                const meta = statusMeta[status]
                if (!meta) return null
                return (
                  <span key={status} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-muted border border-border text-muted-foreground">
                    {meta.emoji} {meta.label} · {count as number}
                  </span>
                )
              })}
            </div>
          )}
        </div>
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
        <div className="text-center py-16 rounded-2xl border border-dashed border-border space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto">
            <BookOpen size={22} className="text-muted-foreground opacity-40" />
          </div>
          <p className="text-sm text-muted-foreground">
            {isOwner ? 'Use the search above to add comics to this list.' : 'This list has no comics yet.'}
          </p>
          {isOwner && (
            <Link href="/browse">
              <Button size="sm" className="gap-1.5"><Radar size={13} /> Browse Comics</Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item: any) => {
            const rec        = item.recommendations
            if (!rec) return null
            const typeStyle  = typeColors[rec.type] ?? 'bg-muted text-muted-foreground border-border'
            const smeta = statusMeta[item.status]
            const coverSrc   = proxyCover(rec.cover_url)


            return (
              <Link key={item.id} href={`/comic/${rec.id}`}
                className="group flex gap-4 p-4 rounded-2xl border border-border bg-card hover:border-primary/40 hover:shadow-md transition-all duration-200">
                <div className="w-14 h-20 rounded-xl overflow-hidden bg-muted shrink-0 shadow-sm">
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
                <div className="flex-1 min-w-0 space-y-2 py-0.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-black text-sm line-clamp-1 group-hover:text-primary transition-colors">{rec.title}</p>
                    {rec.upvotes > 0 && (
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground shrink-0">
                        <ThumbsUp size={10} /> {rec.upvotes}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize ${typeStyle}`}>{rec.type}</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border border-border bg-muted text-muted-foreground capitalize">{rec.status}</span>
                    {smeta && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-muted border border-border text-muted-foreground">
                        {smeta.emoji} {smeta.label}
                      </span>
                    )}
                  </div>
                  {rec.genres?.slice(0, 2).map((g: string) => (
                    <span key={g} className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted border border-border text-muted-foreground mr-1">{g}</span>
                  ))}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </>
  )
}
