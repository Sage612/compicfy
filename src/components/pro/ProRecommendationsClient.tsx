'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Plus, BookOpen, Clock, CheckCircle, XCircle,
  ThumbsUp, ThumbsDown, MessageSquare, Bookmark,
  Search, Pencil, Trash2, Loader2, Crown, Radar,
} from 'lucide-react'
import { formatDate } from '@/lib/utils/format'
import { cn } from '@/lib/utils'
import { AppealButton } from '@/components/user/AppealButton'
import { PinButton } from '@/components/recommendations/PinButton'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

type Rec = {
  id:               string
  title:            string
  type:             string
  cover_url:        string | null
  is_approved:      boolean
  rejection_reason: string | null
  appeal_status:    'none' | 'pending' | 'approved' | 'rejected' | null
  upvotes:          number
  downvotes:        number
  review_count:     number
  save_count:       number
  created_at:       string
  updated_at:       string
}

const TYPE_COLORS: Record<string, string> = {
  manga:   'bg-rose-500/10   text-rose-500   border-rose-500/20',
  manhwa:  'bg-violet-500/10 text-violet-500 border-violet-500/20',
  manhua:  'bg-amber-500/10  text-amber-500  border-amber-500/20',
  webtoon: 'bg-teal-500/10   text-teal-500   border-teal-500/20',
  comic:   'bg-blue-500/10   text-blue-500   border-blue-500/20',
}

const FILTER_TABS = [
  { key: 'all',      label: 'All'      },
  { key: 'approved', label: 'Approved' },
  { key: 'pending',  label: 'Pending'  },
  { key: 'rejected', label: 'Rejected' },
] as const

type FilterKey = typeof FILTER_TABS[number]['key']

function getStatus(rec: Rec) {
  if (rec.is_approved)      return { label: 'Approved',       icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-500/10 border-emerald-500/20', key: 'approved' }
  if (rec.rejection_reason) return { label: 'Rejected',       icon: XCircle,     color: 'text-red-500',     bg: 'bg-red-500/10 border-red-500/20',           key: 'rejected' }
  return                         { label: 'Pending Review', icon: Clock,       color: 'text-amber-500',   bg: 'bg-amber-500/10 border-amber-500/20',       key: 'pending'  }
}

interface Props {
  initialRecs: Rec[]
}

export default function ProRecommendationsClient({ initialRecs }: Props) {
  const router   = useRouter()
  const supabase = createClient()

  const [recs,       setRecs]       = useState(initialRecs)
  const [filter,     setFilter]     = useState<FilterKey>('all')
  const [search,     setSearch]     = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [pinnedId,   setPinnedId]   = useState<string | null>(null)

  // Fetch the current pinned rec ID on mount
  useEffect(() => {
    const fetchPinned = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await (supabase as any)
        .from('profiles')
        .select('pinned_recommendation_id')
        .eq('id', user.id)
        .single()
      setPinnedId(data?.pinned_recommendation_id ?? null)
    }
    fetchPinned()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = useCallback(async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/recommendations/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setRecs(prev => prev.filter(r => r.id !== id))
      if (pinnedId === id) setPinnedId(null)
      toast.success('Recommendation deleted')
    } catch {
      toast.error('Failed to delete')
    } finally {
      setDeletingId(null)
    }
  }, [pinnedId])

  const visible = recs.filter(rec => {
    const matchesFilter = filter === 'all' || getStatus(rec).key === filter
    const matchesSearch = search.trim() === '' || rec.title.toLowerCase().includes(search.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const counts = {
    all:      recs.length,
    approved: recs.filter(r => r.is_approved).length,
    pending:  recs.filter(r => !r.is_approved && !r.rejection_reason).length,
    rejected: recs.filter(r => !!r.rejection_reason).length,
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20 shrink-0">
            <BookOpen size={16} className="text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-black tracking-tight leading-tight truncate">My Recommendations</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Crown size={11} className="text-amber-500 fill-amber-500" />
              <span className="text-xs text-amber-600 font-semibold">Unlimited · Pro</span>
            </div>
          </div>
        </div>
        <Link href="/pro/recommendations/new" className="shrink-0">
          <Button className="gap-2 bg-gradient-to-r from-primary to-violet-500 hover:opacity-90 border-0 shadow-md shadow-primary/20">
            <Plus size={15} />
            Add New
          </Button>
        </Link>
      </div>

      {/* Search + filter */}
      {recs.length > 0 && (
        <div className="space-y-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search your recommendations…"
              className="pl-9 h-10 bg-card"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs">✕</button>
            )}
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {FILTER_TABS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border',
                  filter === key
                    ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                    : 'bg-card text-muted-foreground border-border hover:border-amber-500/30 hover:text-foreground'
                )}
              >
                {label}
                <span className={cn(
                  'inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-black',
                  filter === key ? 'bg-amber-500 text-white' : 'bg-muted text-muted-foreground'
                )}>
                  {counts[key]}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Empty — no recs */}
      {recs.length === 0 && (
        <div className="relative overflow-hidden text-center py-20 rounded-2xl border border-dashed border-border bg-card">
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-amber-500/5 blur-2xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-violet-500/5 blur-2xl pointer-events-none" />
          <div className="relative w-28 h-28 mx-auto mb-6">
            <div className="absolute top-0 left-2 w-16 h-22 rounded-xl border-2 border-border bg-muted/60 rotate-[-8deg]" />
            <div className="absolute top-2 left-5 w-16 h-22 rounded-xl border-2 border-border bg-muted/80 rotate-[-3deg]" />
            <div className="absolute top-4 left-8 w-16 h-22 rounded-xl border-2 border-amber-500/30 bg-card flex items-center justify-center shadow-lg">
              <BookOpen size={20} className="text-amber-500/50" />
            </div>
          </div>
          <h3 className="font-black text-xl mb-2">No recommendations yet</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto leading-relaxed">
            As a Pro member you have unlimited monthly submissions. Start sharing great comics.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/pro/recommendations/new">
              <Button className="gap-2 bg-gradient-to-r from-primary to-violet-500 border-0 shadow-md shadow-primary/20 hover:opacity-90">
                <BookOpen size={14} />Submit a Recommendation
              </Button>
            </Link>
            <Link href="/browse">
              <Button variant="outline" className="gap-2 hover:border-amber-500/40 hover:text-amber-600 transition-colors">
                <Radar size={14} />Browse Comics
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* No results for search/filter */}
      {recs.length > 0 && visible.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 rounded-2xl border border-dashed border-border bg-card text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-muted/40 flex items-center justify-center">
            <Search size={20} className="text-muted-foreground opacity-50" />
          </div>
          <h3 className="font-black text-sm">No matches found</h3>
          <p className="text-xs text-muted-foreground">Try a different search term or filter</p>
          <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setFilter('all') }} className="text-xs">
            Clear filters
          </Button>
        </div>
      )}

      {/* Cards */}
      {visible.length > 0 && (
        <div className="space-y-3">
          {visible.map(rec => {
            const status       = getStatus(rec)
            const StatusIcon   = status.icon
            const typeStyle    = TYPE_COLORS[rec.type] ?? 'bg-muted text-muted-foreground border-border'
            const isDeleting   = deletingId === rec.id
            const isThisPinned = pinnedId === rec.id

            return (
              <div
                key={rec.id}
                className={cn(
                  'group flex gap-4 p-4 rounded-2xl border bg-card hover:shadow-md transition-all duration-200',
                  isThisPinned
                    ? 'border-amber-500/40 hover:border-amber-500/60'
                    : 'border-border hover:border-amber-500/30'
                )}
              >
                {/* Cover */}
                <div className="w-14 h-20 rounded-xl overflow-hidden bg-muted shrink-0 shadow-sm">
                  {rec.cover_url
                    ? <img src={rec.cover_url} alt={rec.title} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center"><BookOpen size={16} className="text-muted-foreground opacity-40" /></div>
                  }
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-black truncate text-sm leading-snug group-hover:text-amber-600 transition-colors">
                        {rec.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize ${typeStyle}`}>
                          {rec.type}
                        </span>
                        <span className="text-xs text-muted-foreground">{formatDate(rec.created_at)}</span>
                        {rec.updated_at !== rec.created_at && (
                          <span className="text-[10px] text-muted-foreground/60 italic">edited</span>
                        )}
                        {isThisPinned && (
                          <span className="text-[10px] text-amber-600 font-bold">📌 Pinned</span>
                        )}
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border shrink-0 ${status.bg} ${status.color}`}>
                      <StatusIcon size={11} />
                      <span className="hidden xs:inline">{status.label}</span>
                    </span>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1"><ThumbsUp      size={11} className="text-emerald-500" />{rec.upvotes}</span>
                    <span className="flex items-center gap-1"><ThumbsDown    size={11} className="text-red-400"     />{rec.downvotes}</span>
                    <span className="flex items-center gap-1"><MessageSquare size={11} className="text-blue-400"    />{rec.review_count}</span>
                    <span className="flex items-center gap-1"><Bookmark      size={11} className="text-violet-400"  />{rec.save_count}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-0.5 flex-wrap md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    <Link href={`/pro/recommendations/${rec.id}/edit`}>
                      <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5 hover:border-amber-500/40 hover:text-amber-600">
                        <Pencil size={11} />Edit
                      </Button>
                    </Link>
                    <Button
                      variant="outline" size="sm"
                      onClick={() => handleDelete(rec.id, rec.title)}
                      disabled={isDeleting}
                      className="h-7 text-xs gap-1.5 hover:border-destructive/40 hover:text-destructive"
                    >
                      {isDeleting ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                      {isDeleting ? 'Deleting…' : 'Delete'}
                    </Button>
                    {rec.is_approved && (
                      <>
                        <Link href={`/comic/${rec.id}`}>
                          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground">
                            View →
                          </Button>
                        </Link>
                        {/* Pin button — approved recs only */}
                        <PinButton
                          recommendationId={rec.id}
                          isPinned={isThisPinned}
                          size="xs"
                          onPinChange={(newPinnedId) => setPinnedId(newPinnedId)}
                        />
                      </>
                    )}
                  </div>

                  {/* Rejection + appeal */}
                  {rec.rejection_reason && (
                    <div className="space-y-1.5 pt-1">
                      <p className="text-xs text-red-500 bg-red-500/5 border border-red-500/10 rounded-lg px-2.5 py-1.5 leading-relaxed">
                        Reason: {rec.rejection_reason}
                      </p>
                      {(!rec.appeal_status || rec.appeal_status === 'none') && <AppealButton recommendationId={rec.id} />}
                      {rec.appeal_status === 'pending'  && <span className="text-xs text-amber-500">🚩 Appeal pending review</span>}
                      {rec.appeal_status === 'approved' && <span className="text-xs text-emerald-500">✅ Appeal approved</span>}
                      {rec.appeal_status === 'rejected' && <span className="text-xs text-muted-foreground">Appeal rejected</span>}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}