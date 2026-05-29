'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Plus, BookOpen, Clock, CheckCircle, XCircle,
  ThumbsUp, ThumbsDown, MessageSquare, Bookmark,
  Search, Pencil, Trash2, Loader2, Crown, Radar, ArrowRight
} from 'lucide-react'
import { formatDate } from '@/lib/utils/format'
import { cn } from '@/lib/utils'
import { AppealButton } from '@/components/user/AppealButton'
import { PinButton } from '@/components/recommendations/PinButton'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

type Rec = {
  id: string; title: string; type: string; cover_url: string | null
  is_approved: boolean; rejection_reason: string | null
  appeal_status: 'none' | 'pending' | 'approved' | 'rejected' | null
  upvotes: number; downvotes: number; review_count: number; save_count: number
  created_at: string; updated_at: string
}

const TYPE_COLORS: Record<string, string> = {
  manga:   'bg-rose-500/10   text-rose-500   border-rose-500/20',
  manhwa:  'bg-violet-500/10 text-violet-500 border-violet-500/20',
  manhua:  'bg-amber-500/10  text-amber-500  border-amber-500/20',
  webtoon: 'bg-teal-500/10   text-teal-500   border-teal-500/20',
  comic:   'bg-blue-500/10   text-blue-500   border-blue-500/20',
}

const TABS = [
  { key: 'all', label: 'All' }, { key: 'approved', label: 'Approved' },
  { key: 'pending', label: 'Pending' }, { key: 'rejected', label: 'Rejected' },
] as const
type FilterKey = typeof TABS[number]['key']

function getStatus(rec: Rec) {
  if (rec.is_approved)      return { label: 'Approved',     icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-500/10 border-emerald-500/20', key: 'approved' }
  if (rec.rejection_reason) return { label: 'Rejected',     icon: XCircle,     color: 'text-red-500',     bg: 'bg-red-500/10 border-red-500/20',           key: 'rejected' }
  return                         { label: 'Pending Review', icon: Clock,       color: 'text-amber-500',   bg: 'bg-amber-500/10 border-amber-500/20',       key: 'pending' }
}

interface Props {
  initialRecs: Rec[]
  basePath?:   string
}

export default function ProRecommendationsClient({
  initialRecs,
  basePath = '/pro/reader/dashboard/recommendations',
}: Props) {
  const supabase = createClient()
  const [recs,       setRecs]       = useState(initialRecs)
  const [filter,     setFilter]     = useState<FilterKey>('all')
  const [search,     setSearch]     = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [pinnedId,   setPinnedId]   = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await (supabase as any).from('profiles').select('pinned_recommendation_id').eq('id', user.id).single()
      setPinnedId(data?.pinned_recommendation_id ?? null)
    }
    load()
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
    } catch { toast.error('Failed to delete') }
    finally  { setDeletingId(null) }
  }, [pinnedId])

  const visible = recs.filter(rec => {
    const mf = filter === 'all' || getStatus(rec).key === filter
    const ms = search.trim() === '' || rec.title.toLowerCase().includes(search.toLowerCase())
    return mf && ms
  })

  const counts = {
    all: recs.length,
    approved: recs.filter(r => r.is_approved).length,
    pending:  recs.filter(r => !r.is_approved && !r.rejection_reason).length,
    rejected: recs.filter(r => !!r.rejection_reason).length,
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto px-1 py-2">
      {/* ── HEADER BLOCK ── */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/10 to-purple-600/5 border border-purple-500/20 flex items-center justify-center shrink-0 shadow-sm">
            <BookOpen size={18} className="text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-black tracking-tight leading-none mb-1.5">My Recommendations</h1>
            <div className="flex items-center gap-1.5">
              <Crown size={12} className="text-amber-500 fill-amber-500" />
              <span className="text-xs text-amber-600 font-bold tracking-wide uppercase text-[10px]">Unlimited · Pro Status</span>
            </div>
          </div>
        </div>
        <Link href={`${basePath}/new`} className="shrink-0">
          <Button size="sm" className="gap-1.5 h-9 text-xs font-bold bg-gradient-to-r from-primary to-violet-500 hover:opacity-95 shadow-sm">
            <Plus size={14} /> Add New
          </Button>
        </Link>
      </div>

      {/* ── SEARCH & FILTER PILLS CONTROLS ── */}
      {recs.length > 0 && (
        <div className="space-y-3">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              placeholder="Search recommendations..." 
              className="pl-9 h-10 bg-card rounded-xl border-border focus-visible:ring-primary/20" 
            />
            {search && (
              <button 
                onClick={() => setSearch('')} 
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs p-1"
              >
                ✕
              </button>
            )}
          </div>
          <div className="flex gap-1.5 flex-wrap overflow-x-auto pb-0.5 scrollbar-none">
            {TABS.map(({ key, label }) => {
              const isActive = filter === key
              return (
                <button 
                  key={key} 
                  onClick={() => setFilter(key)}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border',
                    isActive 
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm' 
                      : 'bg-card text-muted-foreground border-border hover:bg-muted/50'
                  )}
                >
                  {label}
                  <span className={cn(
                    'inline-flex items-center justify-center px-1.5 py-0.5 rounded-md text-[10px] font-black min-w-[16px]',
                    isActive ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground border border-border/40'
                  )}>
                    {counts[key]}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ── EMPTY BLOCK ── */}
      {recs.length === 0 && (
        <div className="text-center py-20 rounded-2xl border border-dashed border-border bg-card space-y-4 shadow-sm">
          <BookOpen size={36} className="text-muted-foreground/30 mx-auto" />
          <div>
            <h3 className="font-black text-lg tracking-tight">No recommendations yet</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto leading-relaxed">Unlimited monthly submissions on Pro. Start sharing your favorite series updates.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-2 pt-1">
            <Link href={`${basePath}/new`}>
              <Button size="sm" className="gap-1.5 bg-gradient-to-r from-primary to-violet-500 border-0 hover:opacity-90 font-bold text-xs">
                <BookOpen size={13} /> Submit a Rec
              </Button>
            </Link>
            <Link href="/browse">
              <Button size="sm" variant="outline" className="gap-1.5 font-bold text-xs rounded-xl">
                <Radar size={13} /> Browse Comics
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* ── FILTER NO MATCHES ── */}
      {recs.length > 0 && visible.length === 0 && (
        <div className="text-center py-16 rounded-2xl border border-dashed border-border bg-card space-y-3 shadow-sm">
          <Search size={26} className="text-muted-foreground/30 mx-auto" />
          <p className="font-black text-sm">No match criteria found</p>
          <Button variant="ghost" size="sm" className="text-xs font-bold" onClick={() => { setSearch(''); setFilter('all') }}>
            Clear active filters
          </Button>
        </div>
      )}

      {/* ── RECOMMENDS LIST (Image 2 High Density Card Layout) ── */}
      {visible.length > 0 && (
        <div className="grid grid-cols-1 gap-3.5">
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
                  'group relative rounded-2xl border bg-card transition-all duration-200 overflow-hidden shadow-2xs',
                  isThisPinned ? 'border-amber-500/40 bg-amber-500/[0.01]' : 'border-border hover:border-primary/30 hover:shadow-sm'
                )}
              >
                <div className="flex gap-4 p-3.5">
                  {/* Left Column: Fixed Art Cover Ratio Layout */}
                  <div className="w-20 h-26 sm:w-24 sm:h-32 rounded-xl overflow-hidden bg-muted shrink-0 shadow-sm relative border border-border/30">
                    {rec.cover_url ? (
                      <img src={rec.cover_url} alt={rec.title} className="w-full h-full object-cover group-hover:scale-[1.01] transition-transform duration-200" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpen size={16} className="text-muted-foreground opacity-30" />
                      </div>
                    )}
                  </div>

                  {/* Right Column: High Density Details Layer */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                    
                    {/* Upper Text Layout Blocks */}
                    <div className="space-y-1 relative pr-6">
                      {/* Pinned Upper Right Corner Badge Icon Indicators */}
                      <div className="absolute top-0 right-0 flex items-center gap-1.5">
                        {isThisPinned && <span className="text-xs select-none">📌</span>}
                        <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors', status.bg, status.color)}>
                          <StatusIcon size={9} /> {status.label}
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className="font-black text-base truncate tracking-tight text-foreground pr-24 leading-tight">
                        {rec.title}
                      </h3>
                      
                      {/* Subtitle Tags Info Row */}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                        <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold border uppercase tracking-wider', typeStyle)}>
                          {rec.type}
                        </span>
                        <span className="text-muted-foreground/40">•</span>
                        <span className="text-[11px] font-medium">{formatDate(rec.created_at)}</span>
                      </div>
                    </div>

                    {/* Middle Block: Interactive Feedback Metrics Strips (New Addition) */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 my-2.5 text-xs text-muted-foreground border-y border-border/40 py-2">
                      <span className="flex items-center gap-1">
                        <ThumbsUp size={13} className="text-emerald-500/80" /> 
                        <strong className="text-foreground font-black text-[11px]">{rec.upvotes}</strong>
                      </span>
                      <span className="flex items-center gap-1">
                        <ThumbsDown size={13} className="text-red-400/80" /> 
                        <strong className="text-foreground font-black text-[11px]">{rec.downvotes}</strong>
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare size={13} className="text-blue-400/80" /> 
                        <strong className="text-foreground font-black text-[11px]">{rec.review_count}</strong>
                      </span>
                      <span className="flex items-center gap-1">
                        <Bookmark size={13} className="text-violet-400/80" /> 
                        <strong className="text-foreground font-black text-[11px]">{rec.save_count}</strong>
                      </span>
                    </div>

                    {/* Bottom Action Row Group Blocks */}
                    <div className="flex items-center justify-between gap-2 pt-0.5">
                      <div className="flex items-center gap-1.5">
                        <Link href={`${basePath}/${rec.id}/edit`}>
                          <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs font-semibold gap-1 rounded-lg hover:border-amber-500/40 hover:text-amber-600 transition-colors">
                            <Pencil size={11} /> Edit
                          </Button>
                        </Link>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleDelete(rec.id, rec.title)} 
                          disabled={isDeleting}
                          className="h-7 px-2.5 text-xs font-semibold gap-1 rounded-lg hover:border-destructive/30 hover:text-destructive transition-colors"
                        >
                          {isDeleting ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                          {isDeleting ? '…' : 'Delete'}
                        </Button>
                      </div>

                      {rec.is_approved && (
                        <div className="flex items-center gap-1">
                          <Link href={`/comic/${rec.id}`}>
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-primary font-black hover:text-primary/80 gap-0.5">
                              View <ArrowRight size={12} className="mt-0.5" />
                            </Button>
                          </Link>
                          <PinButton recommendationId={rec.id} isPinned={isThisPinned} size="xs" onPinChange={setPinnedId} />
                        </div>
                      )}
                    </div>

                  </div>
                </div>

                {/* Lower Error/Rejection Block Accordions */}
                {rec.rejection_reason && (
                  <div className="px-3.5 pb-3.5 space-y-2 border-t border-border/20 bg-muted/[0.02] pt-2.5">
                    <p className="text-xs text-red-500 bg-red-500/5 border border-red-500/10 rounded-xl px-3 py-2 leading-relaxed">
                      <strong className="font-bold">Reason:</strong> {rec.rejection_reason}
                    </p>
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      {(!rec.appeal_status || rec.appeal_status === 'none') && <AppealButton recommendationId={rec.id} />}
                      {rec.appeal_status === 'pending'  && <span className="text-xs text-amber-500 font-medium">🚩 Appeal status remains pending review</span>}
                      {rec.appeal_status === 'approved' && <span className="text-xs text-emerald-500 font-medium">✅ Appeal has been successfully approved</span>}
                      {rec.appeal_status === 'rejected' && <span className="text-xs text-muted-foreground font-medium">Appeal rejected</span>}
                    </div>
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
