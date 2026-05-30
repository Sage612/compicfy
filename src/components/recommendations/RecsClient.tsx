'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  BookOpen, Plus, Eye, ThumbsUp, ThumbsDown,
  Clock, CheckCircle2, XCircle, Pencil, Trash2,
  Search, Bookmark, MessageSquare, Loader2, ArrowRight
} from 'lucide-react'
import { timeAgo } from '@/lib/utils/format'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { PinButton } from '@/components/recommendations/PinButton'
import { AppealButton } from '@/components/user/AppealButton'
import { createClient } from '@/lib/supabase/client'

type FilterKey = 'all' | 'approved' | 'pending' | 'rejected'

const TYPE_COLORS: Record<string, string> = {
  manga:   'bg-rose-500/10   text-rose-500   border-rose-500/20',
  manhwa:  'bg-violet-500/10 text-violet-500 border-violet-500/20',
  manhua:  'bg-amber-500/10  text-amber-500  border-amber-500/20',
  webtoon: 'bg-teal-500/10   text-teal-500   border-teal-500/20',
  comic:   'bg-blue-500/10   text-blue-500   border-blue-500/20',
}

interface RecsClientProps {
  initialRecs: any[]
  userId: string
  newRecHref: string
  baseEditHref: string
  isPro: boolean
  accentColor?: 'primary' | 'amber' | 'teal'
}

export function RecsClient({
  initialRecs,
  userId,
  newRecHref,
  baseEditHref,
  isPro,
  accentColor = 'primary',
}: RecsClientProps) {
  const router = useRouter()
  const supabase = createClient()

  const [recs, setRecs] = useState<any[]>(initialRecs)
  const [filter, setFilter] = useState<FilterKey>('all')
  const [search, setSearch] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [pinnedId, setPinnedId] = useState<string | null>(null)

  useEffect(() => {
    setRecs(initialRecs)
  }, [initialRecs])

  useEffect(() => {
    async function fetchPinned() {
      const { data, error } = await supabase
        .from('profiles')
        .select('pinned_recommendation_id')
        .eq('id', userId)
        .single()

      if (!error && data) {
        setPinnedId((data as any).pinned_recommendation_id)
      }
    }
    fetchPinned()
  }, [userId, supabase])

  const handleDelete = useCallback(async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return

    setDeletingId(id)
    try {
      const res = await fetch(`/api/recommendations/${id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Failed to delete')
      }

      setRecs(prev => prev.filter(r => r.id !== id))
      if (pinnedId === id) setPinnedId(null)
      toast.success('Deleted successfully')
      router.refresh()
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Failed to delete recommendation')
    } finally {
      setDeletingId(null)
    }
  }, [pinnedId, router])

  const filteredRecs = recs.filter(rec => {
    const isApproved = rec.is_approved
    const isRejected = !rec.is_approved && !!rec.rejection_reason
    const isPending = !isApproved && !isRejected

    let status: FilterKey = 'pending'
    if (isApproved) status = 'approved'
    if (isRejected) status = 'rejected'

    const matchesFilter = filter === 'all' || status === filter
    const matchesSearch = rec.title.toLowerCase().includes(search.toLowerCase())

    return matchesFilter && matchesSearch
  })

  const counts = {
    all: recs.length,
    approved: recs.filter(r => r.is_approved).length,
    pending: recs.filter(r => !r.is_approved && !r.rejection_reason).length,
    rejected: recs.filter(r => !r.is_approved && !!r.rejection_reason).length,
  }

  // Accent mapping variables
  const accentButtonClass = 
    accentColor === 'amber' ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-95 text-white border-0' :
    accentColor === 'teal' ? 'bg-teal-600 hover:bg-teal-700 text-white' :
    'bg-primary hover:bg-primary/90 text-primary-foreground'

  const activeTabClass =
    accentColor === 'amber' ? 'bg-amber-500 text-white border-amber-500 shadow-xs' :
    accentColor === 'teal' ? 'bg-teal-600 text-white border-teal-600 shadow-xs' :
    'bg-primary text-primary-foreground border-primary shadow-xs'

  const cardHoverBorderClass =
    accentColor === 'amber' ? 'hover:border-amber-500/30' :
    accentColor === 'teal' ? 'hover:border-teal-500/30' :
    'hover:border-primary/30'

  return (
    <div className="space-y-6 max-w-5xl mx-auto px-1 py-2">
      {/* ── HEADER CONTAINER ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border",
            accentColor === 'amber' ? 'bg-amber-500/10 border-amber-500/20 text-amber-600' :
            accentColor === 'teal' ? 'bg-teal-500/10 border-teal-500/20 text-teal-600' :
            'bg-primary/10 border-primary/20 text-primary'
          )}>
            <BookOpen size={18} />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight leading-none mb-1.5">
              {accentColor === 'teal' ? 'My Works' : 'My Recommendations'}
            </h1>
            <p className="text-xs text-muted-foreground font-medium">
              {recs.length} total · {isPro ? 'Unlimited Pro Status' : 'Standard Tier'}
            </p>
          </div>
        </div>
        <Link href={newRecHref}>
          <Button size="sm" className={cn("gap-1.5 h-9 text-xs font-bold shadow-xs rounded-xl", accentButtonClass)}>
            <Plus size={14} /> {accentColor === 'teal' ? 'Submit New Work' : 'Submit New'}
          </Button>
        </Link>
      </div>

      {/* ── INTERACTIVE CONTROLS ── */}
      {recs.length > 0 && (
        <div className="space-y-3">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={accentColor === 'teal' ? "Search your works..." : "Search recommendations..."}
              className="pl-9 h-10 bg-card rounded-xl border-border focus-visible:ring-primary/10"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs p-1">
                ✕
              </button>
            )}
          </div>

          {/* Filtering row tabs layout configurations */}
          <div className="flex gap-1.5 flex-wrap overflow-x-auto pb-0.5 scrollbar-none">
            {([
              { key: 'all', label: 'All' },
              { key: 'approved', label: 'Approved' },
              { key: 'pending', label: 'Pending' },
              { key: 'rejected', label: 'Rejected' }
            ] as const).map(({ key, label }) => {
              const isActive = filter === key
              return (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border shrink-0',
                    isActive 
                      ? activeTabClass
                      : 'bg-card text-muted-foreground border-border hover:bg-muted/50'
                  )}
                >
                  {label}
                  <span className={cn(
                    'inline-flex items-center justify-center px-1.5 py-0.5 rounded-md text-[10px] font-black min-w-[16px]',
                    isActive ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground border border-border/40'
                  )}>
                    {counts[key]}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ── EMPTY VIEWS ── */}
      {recs.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 rounded-2xl border border-dashed border-border text-center bg-card space-y-4 shadow-2xs">
          <div className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center border",
            accentColor === 'amber' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' :
            accentColor === 'teal' ? 'bg-teal-500/10 border-teal-500/20 text-teal-500' :
            'bg-primary/10 border-primary/20 text-primary'
          )}>
            <BookOpen size={20} />
          </div>
          <div>
            <p className="font-black text-sm">{accentColor === 'teal' ? 'No works added yet' : 'No recommendations yet'}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {isPro ? 'You have unlimited tracking submissions on Pro' : 'Share your choices with the community'}
            </p>
          </div>
          <Link href={newRecHref}>
            <Button size="sm" className={cn("gap-1.5 font-bold text-xs rounded-xl", accentButtonClass)}>
              <Plus size={13} /> {accentColor === 'teal' ? 'Submit your first work' : 'Submit your first'}
            </Button>
          </Link>
        </div>
      )}

      {/* ── FILTER OVERFLOW FALLBACKS ── */}
      {recs.length > 0 && filteredRecs.length === 0 && (
        <div className="text-center py-16 rounded-2xl border border-dashed border-border bg-card space-y-3 shadow-2xs">
          <Search size={22} className="text-muted-foreground/30 mx-auto" />
          <p className="font-black text-xs text-muted-foreground">No matches fit your filter query criteria</p>
          <Button variant="ghost" size="sm" className="text-xs font-bold h-8" onClick={() => { setSearch(''); setFilter('all') }}>
            Clear active filters
          </Button>
        </div>
      )}

      {/* ── HIGH DENSITY LIST GRID ── */}
      {filteredRecs.length > 0 && (
        <div className="grid grid-cols-1 gap-3.5">
          {filteredRecs.map(rec => {
            const isApproved = rec.is_approved
            const isRejected = !rec.is_approved && !!rec.rejection_reason
            const isPending = !isApproved && !isRejected
            const isPinned = pinnedId === rec.id
            const typeStyle = TYPE_COLORS[rec.type] ?? 'bg-muted/40 text-muted-foreground border-border'

            let statusLabel = 'Pending'
            if (isApproved) statusLabel = 'Live'
            if (isRejected) statusLabel = 'Rejected'

            return (
              <div
                key={rec.id}
                className={cn(
                  "group relative rounded-2xl border bg-card transition-all duration-200 overflow-hidden shadow-2xs",
                  isPinned ? "border-amber-500/40 bg-amber-500/[0.01]" : cn("border-border hover:shadow-sm", cardHoverBorderClass)
                )}
              >
                <div className="flex gap-4 p-3.5">
                  {/* Left Frame Cover Thumbnail Layout */}
                  <div className="w-20 h-26 sm:w-24 sm:h-32 rounded-xl overflow-hidden bg-muted shrink-0 shadow-sm relative border border-border/30">
                    {rec.cover_url ? (
                      <img src={rec.cover_url} alt={rec.title} className="w-full h-full object-cover group-hover:scale-[1.01] transition-transform duration-200" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpen size={16} className="text-muted-foreground opacity-30" />
                      </div>
                    )}
                  </div>

                  {/* Right Column Layout Frame details */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                    
                    {/* Top Row Context Content */}
                    <div className="space-y-1 relative pr-6">
                      
                      {/* Corner Pinned Floating Badge Controls */}
                      <div className="absolute top-0 right-0 flex items-center gap-1.5">
                        {isPinned && <span className="text-xs select-none" title="Pinned to profile">📌</span>}
                        <span className={cn(
                          'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors',
                          isApproved ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                          isPending ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
                          'bg-red-500/10 text-red-600 border-red-500/20'
                        )}>
                          {isApproved ? <CheckCircle2 size={9} /> : isPending ? <Clock size={9} /> : <XCircle size={9} />}
                          {statusLabel}
                        </span>
                      </div>

                      {/* Main Data Item Title */}
                      <h3 className="font-black text-base truncate tracking-tight text-foreground pr-24 leading-tight">
                        {rec.title}
                      </h3>

                      {/* Genre Metadata Badge Lines */}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                        <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold border uppercase tracking-wider', typeStyle)}>
                          {rec.type}
                        </span>
                        <span className="text-muted-foreground/40">•</span>
                        <span className="text-[11px] font-medium">{timeAgo(rec.created_at)}</span>
                      </div>
                    </div>

                    {/* Middle Interactive Grid Analytics Strip */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 my-2.5 text-xs text-muted-foreground border-y border-border/40 py-2">
                      <span className="flex items-center gap-1">
                        <ThumbsUp size={13} className="text-emerald-500/80" />
                        <strong className="text-foreground font-black text-[11px]">{rec.upvotes ?? 0}</strong>
                      </span>
                      <span className="flex items-center gap-1">
                        <ThumbsDown size={13} className="text-red-400/80" />
                        <strong className="text-foreground font-black text-[11px]">{rec.downvotes ?? 0}</strong>
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare size={13} className="text-blue-400/80" />
                        <strong className="text-foreground font-black text-[11px]">{rec.review_count ?? 0}</strong>
                      </span>
                      <span className="flex items-center gap-1">
                        <Bookmark size={13} className="text-violet-400/80" />
                        <strong className="text-foreground font-black text-[11px]">{rec.save_count ?? 0}</strong>
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye size={13} className="text-indigo-400/80" />
                        <strong className="text-foreground font-black text-[11px]">{rec.view_count ?? 0}</strong>
                      </span>
                    </div>

                    {/* Bottom Utility Execution Actions Blocks */}
                    <div className="flex items-center justify-between gap-2 pt-0.5">
                      <div className="flex items-center gap-1.5">
                        <Link href={`${baseEditHref}/${rec.id}/edit`}>
                          <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs font-semibold gap-1 rounded-lg hover:border-amber-500/40 hover:text-amber-600 transition-colors">
                            <Pencil size={11} /> Edit
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(rec.id, rec.title)}
                          disabled={deletingId === rec.id}
                          className="h-7 px-2.5 text-xs font-semibold gap-1 rounded-lg hover:border-destructive/30 hover:text-destructive transition-colors"
                        >
                          {deletingId === rec.id ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                          {deletingId === rec.id ? '…' : 'Delete'}
                        </Button>
                      </div>

                      {isApproved && (
                        <div className="flex items-center gap-1.5">
                          <Link href={`/comic/${rec.id}`}>
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-primary font-black hover:text-primary/80 gap-0.5">
                              View <ArrowRight size={12} className="mt-0.5" />
                            </Button>
                          </Link>
                          <PinButton
                            recommendationId={rec.id}
                            isPinned={isPinned}
                            size="xs"
                            onPinChange={newPinnedId => setPinnedId(newPinnedId)}
                          />
                        </div>
                      )}
                    </div>

                  </div>
                </div>

                {/* Lower Collapsible Action Error Disclaimers */}
                {isRejected && rec.rejection_reason && (
                  <div className="px-3.5 pb-3.5 space-y-2 border-t border-border/20 bg-muted/[0.02] pt-2.5">
                    <p className="text-xs text-red-500 bg-red-500/5 border border-red-500/10 rounded-xl px-3 py-2 leading-relaxed">
                      <strong className="font-bold">Reason:</strong> {rec.rejection_reason}
                    </p>
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      {(!rec.appeal_status || rec.appeal_status === 'none') && (
                        <AppealButton recommendationId={rec.id} />
                      )}
                      {rec.appeal_status === 'pending' && <span className="text-xs text-amber-500 font-medium">🚩 Appeal status remains pending review</span>}
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
