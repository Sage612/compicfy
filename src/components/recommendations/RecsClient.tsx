'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  BookOpen, Plus, Eye, ThumbsUp, ThumbsDown,
  Clock, CheckCircle2, XCircle, Pencil, Trash2,
  Search, Bookmark, MessageSquare, Loader2, Pin,
  FileText, Send,
} from 'lucide-react'
import { timeAgo } from '@/lib/utils/format'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { PinButton } from '@/components/recommendations/PinButton'
import { AppealButton } from '@/components/user/AppealButton'
import { createClient } from '@/lib/supabase/client'
import { PeakHourModal } from '@/components/recommendations/PeakHourModal'
import { LimitReachedModal } from '@/components/recommendations/LimitReachedModal'

type FilterKey = 'all' | 'approved' | 'pending' | 'rejected' | 'drafts'

const TYPE_COLORS: Record<string, string> = {
  manga:   'bg-rose-500/10  text-rose-500  border-rose-500/20',
  manhwa:  'bg-teal-500/10  text-teal-500  border-teal-500/20',
  manhua:  'bg-amber-500/10 text-amber-500 border-amber-500/20',
  webtoon: 'bg-teal-500/10  text-teal-500  border-teal-500/20',
  comic:   'bg-blue-500/10  text-blue-500  border-blue-500/20',
}

function proxyCover(url: string | null | undefined): string | null {
  if (!url) return null
  if (url.startsWith('/')) return url
  if (url.includes('/api/image-proxy')) return url
  return `/api/image-proxy?url=${encodeURIComponent(url)}`
}

interface Rec {
  id:               string
  title:            string
  cover_url:        string | null
  type:             string
  is_approved:      boolean
  is_draft:         boolean
  draft_saved_at:   string | null
  upvotes:          number
  downvotes:        number
  view_count:       number
  review_count:     number
  save_count:       number
  created_at:       string
  updated_at:       string
  rejection_reason: string | null
  appeal_status:    string | null
}

interface Props {
  initialRecs:   Rec[]
  userId:        string
  newRecHref:    string
  editBasePath:  string
  isPro:         boolean
  accentColor?:  'amber' | 'primary' | 'teal'
}

export function RecsClient({
  initialRecs,
  userId,
  newRecHref,
  editBasePath,
  isPro,
  accentColor = 'amber',
}: Props) {
  const router   = useRouter()
  const supabase = createClient()

  const [recs,          setRecs]          = useState<Rec[]>(initialRecs)
  const [filter,        setFilter]        = useState<FilterKey>('all')
  const [search,        setSearch]        = useState('')
  const [deletingId,    setDeletingId]    = useState<string | null>(null)
  const [pinnedId,      setPinnedId]      = useState<string | null>(null)
  const [submittingId,  setSubmittingId]  = useState<string | null>(null)

  // Which draft is currently blocked, so retrying after a limit resets
  // or promoting once traffic eases can target the right one.
  const [blockedDraft, setBlockedDraft] = useState<{ id: string; title: string } | null>(null)
  const [peakHourModal, setPeakHourModal] = useState<{
    open:        boolean
    messageType: 'peak_spike' | 'peak_cap'
  }>({ open: false, messageType: 'peak_spike' })
  const [limitModal, setLimitModal] = useState<{
    open:      boolean
    limitType: 'daily' | 'monthly'
  }>({ open: false, limitType: 'daily' })

  useEffect(() => {
    const fetchPinned = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('profiles')
        .select('pinned_recommendation_id')
        .eq('id', user.id)
        .single() as { data: any }
      setPinnedId(data?.pinned_recommendation_id ?? null)
    }
    fetchPinned()
  }, [])

  const getStatus = (rec: Rec): FilterKey => {
    if (rec.is_draft)         return 'drafts'
    if (rec.is_approved)      return 'approved'
    if (rec.rejection_reason) return 'rejected'
    return 'pending'
  }

  const counts = {
    all:      recs.filter(r => !r.is_draft).length,
    approved: recs.filter(r => r.is_approved && !r.is_draft).length,
    pending:  recs.filter(r => !r.is_approved && !r.rejection_reason && !r.is_draft).length,
    rejected: recs.filter(r => !!r.rejection_reason && !r.is_draft).length,
    drafts:   recs.filter(r => r.is_draft).length,
  }

  const visible = recs.filter(rec => {
    const matchFilter =
      filter === 'all'
        ? !rec.is_draft
        : getStatus(rec) === filter
    const matchSearch = !search.trim() || rec.title.toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

  const handleDelete = useCallback(async (id: string, title: string, isDraft: boolean) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return
    setDeletingId(id)
    try {
      if (isDraft) {
        const res = await fetch('/api/recommendations/drafts', {
          method:  'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ draft_id: id }),
        })
        if (!res.ok) throw new Error()
      } else {
        const res = await fetch(`/api/recommendations/${id}`, { method: 'DELETE' })
        if (!res.ok) throw new Error()
      }
      setRecs(prev => prev.filter(r => r.id !== id))
      if (pinnedId === id) setPinnedId(null)
      toast.success(isDraft ? 'Draft deleted' : 'Recommendation deleted')
    } catch {
      toast.error('Failed to delete')
    } finally {
      setDeletingId(null)
    }
  }, [pinnedId])

  const handleSubmitDraft = useCallback(async (id: string, title: string) => {
    setSubmittingId(id)
    try {
      const res  = await fetch('/api/recommendations/drafts', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ draft_id: id }),
      })
      const json = await res.json()

      // Site-wide peak hour — same modal already used on the main submit form.
      // The draft itself is untouched either way, so nothing to lose here.
      if (res.status === 202 && json.peak_hour) {
        setBlockedDraft({ id, title })
        setPeakHourModal({
          open:        true,
          messageType: json.message === 'peak_cap' ? 'peak_cap' : 'peak_spike',
        })
        return
      }

      // FIX: promoting a draft used to skip the user's own monthly/daily
      // limit entirely — only the site-wide peak-hour cap was checked. That
      // let someone hit their personal limit, get routed here by the
      // limit-reached modal to save a draft, then immediately resubmit that
      // same draft and bypass the very limit they'd just been blocked by.
      // The API route now enforces the same checks a fresh submission
      // would, so this handles the resulting 403 (monthly) / 429 (daily)
      // the same way the main form does.
      if (res.status === 403) {
        setBlockedDraft({ id, title })
        setLimitModal({ open: true, limitType: 'monthly' })
        return
      }
      if (res.status === 429) {
        setBlockedDraft({ id, title })
        setLimitModal({ open: true, limitType: 'daily' })
        return
      }

      if (!res.ok) throw new Error(json.error)

      // Promote in local state
      setRecs(prev => prev.map(r =>
        r.id === id ? { ...r, is_draft: false, draft_saved_at: null } : r
      ))
      toast.success(`"${title}" submitted successfully!`)
      setFilter('pending')
    } catch {
      toast.error('Failed to submit draft')
    } finally {
      setSubmittingId(null)
    }
  }, [])

  const accent = {
    amber: {
      header:  'bg-amber-500/10 text-amber-500',
      button:  'bg-gradient-to-r from-amber-400 to-orange-500 border-0 text-white hover:opacity-90',
      tab:     'bg-amber-500/10 text-amber-600 border-amber-500/30',
      tabDot:  'bg-amber-500 text-white',
      hover:   'hover:border-amber-500/30',
      edit:    'hover:border-amber-500/40 hover:text-amber-600',
      pinned:  'border-amber-500/40 bg-amber-500/5',
      pro:     'text-amber-600 font-semibold',
      draft:   'border-amber-500/20 bg-amber-500/5',
    },
    teal: {
      header:  'bg-teal-500/10 text-teal-500',
      button:  'bg-teal-500 hover:bg-teal-600 border-0 text-white',
      tab:     'bg-teal-500/10 text-teal-600 border-teal-500/30',
      tabDot:  'bg-teal-500 text-white',
      hover:   'hover:border-teal-500/30',
      edit:    'hover:border-teal-500/40 hover:text-teal-600',
      pinned:  'border-teal-500/40 bg-teal-500/5',
      pro:     'text-teal-600 font-semibold',
      draft:   'border-teal-500/20 bg-teal-500/5',
    },
    primary: {
      header:  'bg-primary/10 text-primary',
      button:  'bg-primary hover:bg-primary/90 border-0 text-primary-foreground',
      tab:     'bg-primary/10 text-primary border-primary/30',
      tabDot:  'bg-primary text-primary-foreground',
      hover:   'hover:border-primary/30',
      edit:    'hover:border-primary/40 hover:text-primary',
      pinned:  'border-primary/40 bg-primary/5',
      pro:     'text-primary font-semibold',
      draft:   'border-primary/20 bg-primary/5',
    },
  }[accentColor]

  const FILTER_TABS: { key: FilterKey; label: string }[] = [
    { key: 'all',      label: 'All'      },
    { key: 'approved', label: 'Approved' },
    { key: 'pending',  label: 'Pending'  },
    { key: 'rejected', label: 'Rejected' },
    { key: 'drafts',   label: 'Drafts'   },
  ]

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {isPro && (
            <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', accent.header)}>
              <BookOpen size={17} />
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black tracking-tight truncate">My Recommendations</h1>
              {isPro && (
                <span className={cn('text-[10px] font-black px-1.5 py-0.5 rounded-full border shrink-0', accent.tab)}>
                  PRO
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap mt-0.5">
              <span>{counts.all} total</span>
              {counts.approved > 0 && (
                <><span className="w-1 h-1 rounded-full bg-muted-foreground/30 shrink-0" />
                <span className="text-emerald-500 font-semibold">{counts.approved} live</span></>
              )}
              {counts.pending > 0 && (
                <><span className="w-1 h-1 rounded-full bg-muted-foreground/30 shrink-0" />
                <span className="text-amber-500 font-semibold">{counts.pending} pending</span></>
              )}
              {counts.rejected > 0 && (
                <><span className="w-1 h-1 rounded-full bg-muted-foreground/30 shrink-0" />
                <span className="text-red-500 font-semibold">{counts.rejected} rejected</span></>
              )}
              {counts.drafts > 0 && (
                <><span className="w-1 h-1 rounded-full bg-muted-foreground/30 shrink-0" />
                <span className="text-muted-foreground font-semibold">{counts.drafts} draft{counts.drafts !== 1 ? 's' : ''}</span></>
              )}
            </div>
          </div>
        </div>
        <Link href={newRecHref} className="shrink-0">
          <Button size="sm" className={cn('gap-1.5', accent.button)}>
            <Plus size={13} />New
          </Button>
        </Link>
      </div>

      {/* Empty state */}
      {!recs.length ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-2xl border border-dashed border-border space-y-4 text-center">
          <div className={cn('w-14 h-14 rounded-2xl flex items-center justify-center', accent.header)}>
            <BookOpen size={24} />
          </div>
          <div>
            <p className="font-black text-sm">No recommendations yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              {isPro ? 'You have unlimited submissions on Pro.' : 'Share a comic you love with the community.'}
            </p>
          </div>
          <Link href={newRecHref}>
            <Button size="sm" className={cn('gap-1.5', accent.button)}>
              <Plus size={13} />Submit your first
            </Button>
          </Link>
        </div>
      ) : (
        <>
          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search your recommendations…"
              className="pl-9 h-10 bg-card"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
              >✕</button>
            )}
          </div>

          {/* Filter tabs */}
          <div className="flex gap-1.5 flex-wrap">
            {FILTER_TABS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all',
                  filter === key
                    ? key === 'drafts'
                      ? 'bg-muted text-muted-foreground border-border'
                      : accent.tab
                    : 'bg-card text-muted-foreground border-border hover:text-foreground'
                )}
              >
                {key === 'drafts' && <FileText size={11} />}
                {label}
                <span className={cn(
                  'inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-black',
                  filter === key
                    ? key === 'drafts' ? 'bg-muted-foreground/20 text-muted-foreground' : accent.tabDot
                    : 'bg-muted text-muted-foreground'
                )}>
                  {counts[key]}
                </span>
              </button>
            ))}
          </div>

          {/* No results */}
          {visible.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 rounded-2xl border border-dashed border-border text-center space-y-2">
              {filter === 'drafts' ? (
                <>
                  <FileText size={20} className="text-muted-foreground opacity-40" />
                  <p className="font-black text-sm">No drafts saved</p>
                  <p className="text-xs text-muted-foreground">Drafts appear here during peak hours</p>
                </>
              ) : (
                <>
                  <Search size={20} className="text-muted-foreground opacity-40" />
                  <p className="font-black text-sm">No matches</p>
                  <button
                    onClick={() => { setSearch(''); setFilter('all') }}
                    className="text-xs text-primary hover:underline"
                  >
                    Clear filters
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {visible.map(rec => {
                const status      = getStatus(rec)
                const typeStyle   = TYPE_COLORS[rec.type] ?? 'bg-muted text-muted-foreground border-border'
                const isDeleting  = deletingId  === rec.id
                const isSubmitting= submittingId === rec.id
                const isPinned    = pinnedId === rec.id
                const isEdited    = rec.updated_at !== rec.created_at
                const coverSrc    = proxyCover(rec.cover_url)
                const isDraft     = rec.is_draft

                return (
                  <div
                    key={rec.id}
                    className={cn(
                      'rounded-2xl border bg-card transition-colors overflow-hidden',
                      isDraft   ? accent.draft  :
                      isPinned  ? accent.pinned :
                      `border-border ${accent.hover}`
                    )}
                  >
                    {/* Draft banner */}
                    {isDraft && (
                      <div className="flex items-center gap-1.5 px-3 pt-2.5 pb-0">
                        <FileText size={10} className="text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">
                          Draft · saved {timeAgo(rec.draft_saved_at ?? rec.created_at)}
                        </span>
                      </div>
                    )}

                    {/* Top row */}
                    <div className="flex gap-3 p-3">
                      {/* Cover */}
                      <div className="relative w-14 h-20 rounded-xl overflow-hidden bg-muted shrink-0">
                        {coverSrc ? (
                          <img src={coverSrc} alt={rec.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <BookOpen size={16} className="text-muted-foreground opacity-40" />
                          </div>
                        )}
                        {/* Status dot — only for non-drafts */}
                        {!isDraft && (
                          <div className={cn(
                            'absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center',
                            status === 'approved' ? 'bg-emerald-500' :
                            status === 'pending'  ? 'bg-amber-500'   : 'bg-red-500'
                          )}>
                            {status === 'approved'
                              ? <CheckCircle2 size={11} className="text-white" />
                              : status === 'pending'
                              ? <Clock size={11} className="text-white" />
                              : <XCircle size={11} className="text-white" />
                            }
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0 space-y-1.5 py-0.5">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-black text-sm leading-snug">{rec.title}</p>
                          {isPinned && !isDraft && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-black bg-amber-500/10 text-amber-600 border border-amber-500/20 shrink-0">
                              <Pin size={8} />Pinned
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={cn('inline-flex px-1.5 py-0.5 rounded-md text-[9px] font-bold border capitalize', typeStyle)}>
                            {rec.type}
                          </span>
                          <span className="text-[9px] text-muted-foreground">
                            {timeAgo(rec.created_at)}
                            {isEdited && !isDraft && <span className="italic ml-1 opacity-60">· edited</span>}
                          </span>
                        </div>

                        {!isDraft && (
                          <div className="flex items-center gap-2.5 text-[10px] text-muted-foreground flex-wrap">
                            <span className="flex items-center gap-0.5">
                              <ThumbsUp size={9} className="text-emerald-500" />{rec.upvotes}
                            </span>
                            <span className="flex items-center gap-0.5">
                              <ThumbsDown size={9} className="text-red-400" />{rec.downvotes}
                            </span>
                            <span className="flex items-center gap-0.5">
                              <Eye size={9} className="text-blue-400" />{rec.view_count ?? 0}
                            </span>
                            <span className="flex items-center gap-0.5">
                              <Bookmark size={9} className="text-violet-400" />{rec.save_count ?? 0}
                            </span>
                            <span className="flex items-center gap-0.5">
                              <MessageSquare size={9} className="text-amber-400" />{rec.review_count ?? 0}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Rejection reason */}
                    {status === 'rejected' && rec.rejection_reason && (
                      <div className="mx-3 mb-2 px-3 py-2 rounded-xl bg-red-500/5 border border-red-500/15 space-y-1.5">
                        <p className="text-[11px] text-red-500 leading-relaxed">
                          Reason: {rec.rejection_reason}
                        </p>
                        {(!rec.appeal_status || rec.appeal_status === 'none') && (
                          <AppealButton recommendationId={rec.id} />
                        )}
                        {rec.appeal_status === 'pending' && (
                          <span className="text-[10px] text-amber-500 font-semibold">🚩 Appeal pending review</span>
                        )}
                        {rec.appeal_status === 'approved' && (
                          <span className="text-[10px] text-emerald-500 font-semibold">✅ Appeal approved</span>
                        )}
                        {rec.appeal_status === 'rejected' && (
                          <span className="text-[10px] text-muted-foreground">Appeal rejected</span>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 px-3 pb-3">
                      {isDraft ? (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleSubmitDraft(rec.id, rec.title)}
                            disabled={isSubmitting}
                            className="flex-1 h-8 text-xs gap-1 bg-primary hover:bg-primary/90 border-0 text-primary-foreground"
                          >
                            {isSubmitting
                              ? <Loader2 size={11} className="animate-spin" />
                              : <Send size={11} />
                            }
                            {isSubmitting ? 'Submitting…' : 'Submit Now'}
                          </Button>
                          <Link href={`${editBasePath}/${rec.id}/edit`} className="shrink-0">
                            <Button variant="outline" size="sm" className={cn('h-8 text-xs gap-1', accent.edit)}>
                              <Pencil size={11} />Edit
                            </Button>
                          </Link>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(rec.id, rec.title, true)}
                            disabled={isDeleting}
                            className="h-8 text-xs gap-1 hover:border-destructive/40 hover:text-destructive shrink-0"
                          >
                            {isDeleting ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                          </Button>
                        </>
                      ) : (
                        <>
                          <Link href={`${editBasePath}/${rec.id}/edit`} className="flex-1">
                            <Button variant="outline" size="sm" className={cn('h-8 text-xs gap-1 w-full', accent.edit)}>
                              <Pencil size={11} />Edit
                            </Button>
                          </Link>
                          {status === 'approved' && (
                            <Link href={`/comic/${rec.id}`} className="flex-1">
                              <Button variant="outline" size="sm" className="h-8 text-xs gap-1 w-full hover:border-primary/40 hover:text-primary">
                                <Eye size={11} />View
                              </Button>
                            </Link>
                          )}
                          {status === 'approved' && (
                            <PinButton
                              key={`pin-${rec.id}-${pinnedId ?? 'none'}`}
                              recommendationId={rec.id}
                              isPinned={isPinned}
                              size="xs"
                              onPinChange={newPinnedId => setPinnedId(newPinnedId)}
                            />
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(rec.id, rec.title, false)}
                            disabled={isDeleting}
                            className="h-8 text-xs gap-1 hover:border-destructive/40 hover:text-destructive shrink-0"
                          >
                            {isDeleting ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      <PeakHourModal
        isOpen={peakHourModal.open}
        onClose={() => setPeakHourModal(p => ({ ...p, open: false }))}
        messageType={peakHourModal.messageType}
        onSaveDraft={async () => {
          // The draft this came from is already saved — nothing further to do.
          setPeakHourModal(p => ({ ...p, open: false }))
        }}
      />

      <LimitReachedModal
        isOpen={limitModal.open}
        onClose={() => setLimitModal(m => ({ ...m, open: false }))}
        limitType={limitModal.limitType}
        alreadyDraft
        onSaveDraft={async () => {
        }}
      />
    </div>
  )
}