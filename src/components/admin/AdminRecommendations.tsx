'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import {
  CheckCircle, XCircle, Star, StarOff,
  Loader2, BookOpen, ChevronDown, ChevronUp,
  Pencil, Eye, Trash2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/utils/format'
import Link from 'next/link'


const FILTERS = [
  { value: 'pending', label: 'Pending', color: 'text-yellow-500' },
  { value: 'approved', label: 'Approved', color: 'text-green-500' },
  { value: 'rejected', label: 'Rejected', color: 'text-destructive' },
  { value: 'featured', label: 'Featured ⭐', color: 'text-primary' },
  { value: 'appeals', label: 'Appeals 🚩', color: 'text-orange-500' },
]

const TYPES = ['manga', 'manhwa', 'manhua', 'webtoon', 'comic', 'other']
const STATUSES = ['ongoing', 'completed', 'hiatus', 'cancelled']
const CONTENT_RATINGS = ['all_ages', 'teen', 'mature', 'adult']
const PLATFORMS = ['Webtoon', 'Tapas', 'MangaPlus', 'Viz', 'Crunchyroll', 'Lezhin', 'Toomics', 'Other']

export function AdminRecommendations() {
  const [recs, setRecs] = useState<any[]>([])
  const [filter, setFilter] = useState('pending')
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<Record<string, any>>({})

  const fetchRecs = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/recommendations?filter=${filter}`)
      const data = await res.json()
      setRecs(data.recommendations ?? [])
    } catch {
      toast.error('Failed to fetch')
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => { fetchRecs() }, [fetchRecs])

  const handleAction = async (id: string, action: string, extra: Record<string, any> = {}) => {
    setActionLoading(`${id}-${action}`)
    try {
      const res = await fetch(`/api/admin/recommendations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      })
      if (!res.ok) throw new Error()
      toast.success(`✅ ${action} successful`)
      setRecs(prev => prev.filter(r => r.id !== id))
      setExpandedId(null)
      setRejectReason('')
    } catch {
      toast.error(`Failed to ${action}`)
    } finally {
      setActionLoading(null)
    }
  }

  const handleEdit = async (id: string) => {
    setActionLoading(`${id}-edit`)
    try {
      const res = await fetch(`/api/admin/recommendations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData),
      })
      if (!res.ok) throw new Error()
      toast.success('Recommendation updated!')
      setEditingId(null)
      fetchRecs()
    } catch {
      toast.error('Failed to update')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async (id: string) => {
    setActionLoading(`${id}-delete`)
    try {
      const res = await fetch(`/api/admin/recommendations/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error()
      toast.success('Recommendation deleted')
      setRecs(prev => prev.filter(r => r.id !== id))
    } catch {
      toast.error('Failed to delete recommendation')
    } finally {
      setActionLoading(null)
    }
  }

  const startEdit = (rec: any) => {
    setEditingId(rec.id)
    setEditData({
      title: rec.title ?? '',
      description: rec.description ?? '',
      type: rec.type ?? 'manga',
      status: rec.status ?? 'ongoing',
      author: rec.author ?? '',
      artist: rec.artist ?? '',
      publisher: rec.publisher ?? '',
      cover_url: rec.cover_url ?? '',
      why_recommend: rec.why_recommend ?? '',
      content_rating: rec.content_rating ?? 'all_ages',
      chapter_count: rec.chapter_count ?? '',
      year_released: rec.year_released ?? '',
      genres: rec.genres ?? [],
      official_platforms: rec.official_platforms ?? [],
    })
  }

  const toggleArrayItem = (field: string, value: string) => {
    setEditData(d => {
      const arr: string[] = d[field] ?? []
      return {
        ...d,
        [field]: arr.includes(value) ? arr.filter((v: string) => v !== value) : [...arr, value],
      }
    })
  }

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {FILTERS.map(({ value, label, color }) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
              filter === value
                ? 'bg-primary text-primary-foreground border-primary'
                : `border-border ${color} hover:border-primary`
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 size={24} className="animate-spin text-muted-foreground" />
        </div>
      ) : recs.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <BookOpen size={36} className="mx-auto mb-3 opacity-30" />
          <p>No {filter} recommendations</p>
        </div>
      ) : (
        <div className="space-y-3">
          {recs.map((rec) => {
            const isExpanded = expandedId === rec.id
            const isEditing = editingId === rec.id
            const profile = rec.profiles

            return (
              <div key={rec.id} className="rounded-xl border border-border bg-card overflow-hidden">
                {/* Main row */}
                <div className="flex gap-4 p-4">
                  {/* Cover */}
                  <div className="w-12 h-16 rounded-lg overflow-hidden bg-muted shrink-0">
                    {rec.cover_url ? (
                      <img src={rec.cover_url} alt={rec.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpen size={14} className="text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-sm truncate">{rec.title}</h3>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          <Badge variant="secondary" className="text-xs capitalize">{rec.type}</Badge>
                          <Badge variant="outline" className="text-xs capitalize">{rec.status}</Badge>
                          {rec.is_featured && <Badge className="text-xs bg-yellow-500/10 text-yellow-600 border-yellow-500/20">⭐ Featured</Badge>}
                          {rec.appeal_status === 'pending' && <Badge className="text-xs bg-orange-500/10 text-orange-600 border-orange-500/20">🚩 Appeal</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          by @{profile?.display_name || profile?.username} · {formatDate(rec.created_at)}
                        </p>
                        {rec.rejection_reason && (
                          <p className="text-xs text-destructive mt-1">
                            Rejected: {rec.rejection_reason}
                          </p>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1 shrink-0">
                        <Link href={`/comic/${rec.id}`} target="_blank">
                          <Button variant="ghost" size="icon" className="h-7 w-7" title="View">
                            <Eye size={13} />
                          </Button>
                        </Link>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => isEditing ? setEditingId(null) : startEdit(rec)}
                          title="Edit"
                        >
                          <Pencil size={13} />
                        </Button>

                        {!rec.is_approved && !rec.rejection_reason && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-green-500 hover:text-green-500"
                            onClick={() => handleAction(rec.id, 'approve')}
                            disabled={!!actionLoading}
                            title="Approve"
                          >
                            {actionLoading === `${rec.id}-approve` ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={13} />}
                          </Button>
                        )}

                        {rec.is_featured ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-yellow-500 hover:text-yellow-500"
                            onClick={() => handleAction(rec.id, 'unfeature')}
                            title="Unfeature"
                          >
                            <StarOff size={13} />
                          </Button>
                        ) : rec.is_approved && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-yellow-500 hover:text-yellow-500"
                            onClick={() => handleAction(rec.id, 'feature')}
                            title="Feature"
                          >
                            <Star size={13} />
                          </Button>
                        )}

                        {/* Delete with confirmation */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          title="Delete"
                          disabled={!!actionLoading}
                          onClick={() => {
                            if (window.confirm(`Permanently delete "${rec.title}"? This cannot be undone.`)) {
                              handleDelete(rec.id)
                            }
                          }}
                        >
                          {actionLoading === `${rec.id}-delete`
                            ? <Loader2 size={13} className="animate-spin" />
                            : <Trash2 size={13} />
                          }
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => setExpandedId(isExpanded ? null : rec.id)}
                        >
                          {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Full edit form */}
                {isEditing && (
                  <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Edit Recommendation</p>

                    {/* Title + Cover */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <Input
                        value={editData.title ?? ''}
                        onChange={(e) => setEditData(d => ({ ...d, title: e.target.value }))}
                        placeholder="Title"
                        className="text-sm"
                      />
                      <Input
                        value={editData.cover_url ?? ''}
                        onChange={(e) => setEditData(d => ({ ...d, cover_url: e.target.value }))}
                        placeholder="Cover URL"
                        className="text-sm"
                      />
                    </div>

                    {/* Description */}
                    <Textarea
                      value={editData.description ?? ''}
                      onChange={(e) => setEditData(d => ({ ...d, description: e.target.value }))}
                      placeholder="Description"
                      rows={3}
                      className="resize-none text-sm"
                    />

                    {/* Why recommend */}
                    <Textarea
                      value={editData.why_recommend ?? ''}
                      onChange={(e) => setEditData(d => ({ ...d, why_recommend: e.target.value }))}
                      placeholder="Why recommend..."
                      rows={2}
                      className="resize-none text-sm"
                    />

                    {/* Author / Artist / Publisher */}
                    <div className="grid grid-cols-3 gap-2">
                      <Input
                        value={editData.author ?? ''}
                        onChange={(e) => setEditData(d => ({ ...d, author: e.target.value }))}
                        placeholder="Author"
                        className="text-sm"
                      />
                      <Input
                        value={editData.artist ?? ''}
                        onChange={(e) => setEditData(d => ({ ...d, artist: e.target.value }))}
                        placeholder="Artist"
                        className="text-sm"
                      />
                      <Input
                        value={editData.publisher ?? ''}
                        onChange={(e) => setEditData(d => ({ ...d, publisher: e.target.value }))}
                        placeholder="Publisher"
                        className="text-sm"
                      />
                    </div>

                    {/* Chapter count + Year */}
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="number"
                        value={editData.chapter_count ?? ''}
                        onChange={(e) => setEditData(d => ({ ...d, chapter_count: e.target.value ? Number(e.target.value) : null }))}
                        placeholder="Chapter count"
                        className="text-sm"
                      />
                      <Input
                        type="number"
                        value={editData.year_released ?? ''}
                        onChange={(e) => setEditData(d => ({ ...d, year_released: e.target.value ? Number(e.target.value) : null }))}
                        placeholder="Year released"
                        className="text-sm"
                      />
                    </div>

                    {/* Type */}
                    <div className="space-y-1.5">
                      <p className="text-xs text-muted-foreground font-medium">Type</p>
                      <div className="flex flex-wrap gap-1.5">
                        {TYPES.map(t => (
                          <button
                            key={t}
                            onClick={() => setEditData(d => ({ ...d, type: t }))}
                            className={cn(
                              'px-2.5 py-1 rounded-full text-xs border capitalize transition-colors',
                              editData.type === t
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'border-border text-muted-foreground hover:border-primary'
                            )}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Status */}
                    <div className="space-y-1.5">
                      <p className="text-xs text-muted-foreground font-medium">Status</p>
                      <div className="flex flex-wrap gap-1.5">
                        {STATUSES.map(s => (
                          <button
                            key={s}
                            onClick={() => setEditData(d => ({ ...d, status: s }))}
                            className={cn(
                              'px-2.5 py-1 rounded-full text-xs border capitalize transition-colors',
                              editData.status === s
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'border-border text-muted-foreground hover:border-primary'
                            )}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Content Rating */}
                    <div className="space-y-1.5">
                      <p className="text-xs text-muted-foreground font-medium">Content Rating</p>
                      <div className="flex flex-wrap gap-1.5">
                        {CONTENT_RATINGS.map(r => (
                          <button
                            key={r}
                            onClick={() => setEditData(d => ({ ...d, content_rating: r }))}
                            className={cn(
                              'px-2.5 py-1 rounded-full text-xs border capitalize transition-colors',
                              editData.content_rating === r
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'border-border text-muted-foreground hover:border-primary'
                            )}
                          >
                            {r.replace('_', ' ')}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Platforms */}
                    <div className="space-y-1.5">
                      <p className="text-xs text-muted-foreground font-medium">Platforms</p>
                      <div className="flex flex-wrap gap-1.5">
                        {PLATFORMS.map(p => (
                          <button
                            key={p}
                            onClick={() => toggleArrayItem('official_platforms', p)}
                            className={cn(
                              'px-2.5 py-1 rounded-full text-xs border transition-colors',
                              (editData.official_platforms ?? []).includes(p)
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'border-border text-muted-foreground hover:border-primary'
                            )}
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2 justify-end pt-1">
                      <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>Cancel</Button>
                      <Button size="sm" onClick={() => handleEdit(rec.id)} disabled={!!actionLoading} className="gap-2">
                        {actionLoading === `${rec.id}-edit` ? <Loader2 size={13} className="animate-spin" /> : null}
                        Save Changes
                      </Button>
                    </div>
                  </div>
                )}

                {/* Expanded: reject / appeal */}
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-3 border-t border-border pt-4">
                    <p className="text-xs text-muted-foreground line-clamp-3">{rec.description}</p>

                    {/* Reject form */}
                    {!rec.rejection_reason && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Reject with Reason</p>
                        <Textarea
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          placeholder="Explain why this is being rejected..."
                          rows={2}
                          className="resize-none text-sm"
                        />
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleAction(rec.id, 'reject', { reason: rejectReason })}
                          disabled={!rejectReason.trim() || !!actionLoading}
                          className="gap-2"
                        >
                          {actionLoading === `${rec.id}-reject` ? <Loader2 size={13} className="animate-spin" /> : <XCircle size={13} />}
                          Reject
                        </Button>
                      </div>
                    )}

                    {/* Appeal resolution */}
                    {rec.appeal_status === 'pending' && rec.appeal_text && (
                      <div className="space-y-2 p-3 rounded-lg bg-orange-500/5 border border-orange-500/20">
                        <p className="text-xs font-semibold text-orange-600">Appeal Message</p>
                        <p className="text-sm">{rec.appeal_text}</p>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="gap-1.5 bg-green-500 hover:bg-green-600"
                            onClick={() => handleAction(rec.id, 'resolve_appeal', { appeal_status: 'approved' })}
                            disabled={!!actionLoading}
                          >
                            <CheckCircle size={13} /> Approve Appeal
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleAction(rec.id, 'resolve_appeal', { appeal_status: 'rejected' })}
                            disabled={!!actionLoading}
                          >
                            <XCircle size={13} /> Reject Appeal
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}