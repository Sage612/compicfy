'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { timeAgo } from '@/lib/utils/format'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { PinButton } from '@/components/recommendations/PinButton'
import { AppealButton } from '@/components/user/AppealButton'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { createClient } from '@/lib/supabase/client'
import { PeakHourModal } from '@/components/recommendations/PeakHourModal'
import { LimitReachedModal } from '@/components/recommendations/LimitReachedModal'

type FilterKey = 'all' | 'approved' | 'pending' | 'rejected' | 'drafts'

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
  // Kept so existing callers still compile. The look is now uniform; this is ignored.
  accentColor?:  'amber' | 'primary' | 'teal'
  // Header copy so the same list serves readers/curators and creators.
  title?:        string
  eyebrow?:      string
  backHref?:     string
}

export function RecsClient({ initialRecs, userId, newRecHref, editBasePath, isPro, title = 'Recommendations', eyebrow = 'Curator', backHref }: Props) {
  const supabase = createClient()

  const [recs,          setRecs]          = useState<Rec[]>(initialRecs)
  const [filter,        setFilter]        = useState<FilterKey>('all')
  const [search,        setSearch]        = useState('')
  const [deletingId,    setDeletingId]    = useState<string | null>(null)
  const [pinnedId,      setPinnedId]      = useState<string | null>(null)
  const [submittingId,  setSubmittingId]  = useState<string | null>(null)

  const [blockedDraft, setBlockedDraft] = useState<{ id: string; title: string } | null>(null)
  const [peakHourModal, setPeakHourModal] = useState<{ open: boolean; messageType: 'peak_spike' | 'peak_cap' }>({ open: false, messageType: 'peak_spike' })
  const [limitModal, setLimitModal] = useState<{ open: boolean; limitType: 'daily' | 'monthly' }>({ open: false, limitType: 'daily' })

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    const matchFilter = filter === 'all' ? !rec.is_draft : getStatus(rec) === filter
    const matchSearch = !search.trim() || rec.title.toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

  const handleDelete = useCallback(async (id: string, title: string, isDraft: boolean) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return
    setDeletingId(id)
    try {
      if (isDraft) {
        const res = await fetch('/api/recommendations/drafts', {
          method: 'DELETE', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ draft_id: id }),
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
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft_id: id }),
      })
      const json = await res.json()

      if (res.status === 202 && json.peak_hour) {
        setBlockedDraft({ id, title })
        setPeakHourModal({ open: true, messageType: json.message === 'peak_cap' ? 'peak_cap' : 'peak_spike' })
        return
      }
      // Promoting a draft is subject to the same personal limits as a fresh submission.
      if (res.status === 403) { setBlockedDraft({ id, title }); setLimitModal({ open: true, limitType: 'monthly' }); return }
      if (res.status === 429) { setBlockedDraft({ id, title }); setLimitModal({ open: true, limitType: 'daily' }); return }

      if (!res.ok) throw new Error(json.error)

      setRecs(prev => prev.map(r => r.id === id ? { ...r, is_draft: false, draft_saved_at: null } : r))
      toast.success(`"${title}" submitted successfully`)
      setFilter('pending')
    } catch {
      toast.error('Failed to submit draft')
    } finally {
      setSubmittingId(null)
    }
  }, [])

  const FILTER_TABS: { key: FilterKey; label: string }[] = [
    { key: 'all',      label: 'All'      },
    { key: 'approved', label: 'Approved' },
    { key: 'pending',  label: 'Pending'  },
    { key: 'rejected', label: 'Rejected' },
    { key: 'drafts',   label: 'Drafts'   },
  ]

  const subtitle = [
    `${counts.all} total`,
    counts.approved > 0 && `${counts.approved} live`,
    counts.pending  > 0 && `${counts.pending} pending`,
    counts.rejected > 0 && `${counts.rejected} rejected`,
    counts.drafts   > 0 && `${counts.drafts} draft${counts.drafts !== 1 ? 's' : ''}`,
  ].filter(Boolean).join(' · ')

  // Default: the dashboard root, i.e. editBasePath minus its last segment.
  const resolvedBackHref = backHref ?? (editBasePath.replace(/\/[^/]+$/, '') || '/')

  return (
    <div className="space-y-8">

      <PageHeader
        eyebrow={eyebrow}
        title={title}
        subtitle={subtitle}
        backHref={resolvedBackHref}
        backLabel="Dashboard"
        isPro={isPro}
        actions={<Link href={newRecHref}><Button size="sm">New</Button></Link>}
      />

      {!recs.length ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-xl border border-dashed border-border space-y-4 text-center">
          <div>
            <p className="font-dashboard-serif text-lg text-foreground">No recommendations yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              {isPro ? 'You have unlimited submissions on Pro.' : 'Share a comic you love with the community.'}
            </p>
          </div>
          <Link href={newRecHref}><Button size="sm">Submit your first</Button></Link>
        </div>
      ) : (
        <div className="space-y-5">
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search your recommendations…"
            className="h-10 bg-card"
          />

          <div className="flex gap-1.5 flex-wrap">
            {FILTER_TABS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs border transition-colors',
                  filter === key
                    ? 'bg-foreground text-background border-foreground'
                    : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
                )}
              >
                {label} <span className="opacity-60 tabular-nums">{counts[key]}</span>
              </button>
            ))}
          </div>

          {visible.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 rounded-xl border border-dashed border-border text-center space-y-2">
              {filter === 'drafts' ? (
                <>
                  <p className="font-dashboard-serif text-lg text-foreground">No drafts saved</p>
                  <p className="text-sm text-muted-foreground">Drafts appear here during peak hours.</p>
                </>
              ) : (
                <>
                  <p className="font-dashboard-serif text-lg text-foreground">No matches</p>
                  <button
                    onClick={() => { setSearch(''); setFilter('all') }}
                    className="text-xs text-foreground underline underline-offset-4 hover:text-muted-foreground"
                  >
                    Clear filters
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {visible.map(rec => {
                const status       = getStatus(rec)
                const isDeleting   = deletingId  === rec.id
                const isSubmitting = submittingId === rec.id
                const isPinned     = pinnedId === rec.id
                const isEdited     = rec.updated_at !== rec.created_at
                const coverSrc     = proxyCover(rec.cover_url)
                const isDraft      = rec.is_draft

                const statusLabel =
                  isDraft ? `Draft · saved ${timeAgo(rec.draft_saved_at ?? rec.created_at)}` :
                  status === 'approved' ? 'Live' :
                  status === 'pending'  ? 'Pending review' : 'Rejected'

                return (
                  <div key={rec.id} className={cn('rounded-xl border bg-card overflow-hidden', isPinned ? 'border-foreground/40' : 'border-border')}>
                    <div className="flex gap-3 p-3">
                      <div className="w-14 h-20 rounded-md overflow-hidden bg-muted shrink-0">
                        {coverSrc && <img src={coverSrc} alt={rec.title} className="w-full h-full object-cover" />}
                      </div>

                      <div className="flex-1 min-w-0 space-y-1.5 py-0.5">
                        <p className="text-[11px] uppercase tracking-widest text-muted-foreground/70">
                          <span className={cn(status === 'rejected' && !isDraft && 'text-destructive')}>{statusLabel}</span>
                          {isPinned && !isDraft && ' · Pinned'}
                        </p>
                        <p className="font-dashboard-serif text-base text-foreground leading-snug">{rec.title}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {rec.type} · {timeAgo(rec.created_at)}
                          {isEdited && !isDraft && <span className="italic"> · edited</span>}
                        </p>
                        {!isDraft && (
                          <p className="text-xs text-muted-foreground tabular-nums">
                            {rec.upvotes} up · {rec.downvotes} down · {rec.view_count ?? 0} views · {rec.save_count ?? 0} saves · {rec.review_count ?? 0} reviews
                          </p>
                        )}
                      </div>
                    </div>

                    {status === 'rejected' && rec.rejection_reason && !isDraft && (
                      <div className="mx-3 mb-3 px-3 py-2 rounded-lg border border-border space-y-1.5">
                        <p className="text-xs text-muted-foreground leading-relaxed">Reason: {rec.rejection_reason}</p>
                        {(!rec.appeal_status || rec.appeal_status === 'none') && <AppealButton recommendationId={rec.id} />}
                        {rec.appeal_status === 'pending'  && <span className="text-[11px] text-muted-foreground">Appeal pending review</span>}
                        {rec.appeal_status === 'approved' && <span className="text-[11px] text-foreground">Appeal approved</span>}
                        {rec.appeal_status === 'rejected' && <span className="text-[11px] text-muted-foreground">Appeal rejected</span>}
                      </div>
                    )}

                    <div className="flex items-center gap-1.5 px-3 pb-3">
                      {isDraft ? (
                        <>
                          <Button size="sm" onClick={() => handleSubmitDraft(rec.id, rec.title)} disabled={isSubmitting} className="flex-1 h-8 text-xs">
                            {isSubmitting ? 'Submitting…' : 'Submit now'}
                          </Button>
                          <Link href={`${editBasePath}/${rec.id}/edit`} className="shrink-0">
                            <Button variant="outline" size="sm" className="h-8 text-xs">Edit</Button>
                          </Link>
                          <Button variant="outline" size="sm" onClick={() => handleDelete(rec.id, rec.title, true)} disabled={isDeleting}
                            className="h-8 text-xs hover:border-destructive/40 hover:text-destructive shrink-0">
                            {isDeleting ? 'Deleting…' : 'Delete'}
                          </Button>
                        </>
                      ) : (
                        <>
                          <Link href={`${editBasePath}/${rec.id}/edit`} className="flex-1">
                            <Button variant="outline" size="sm" className="h-8 text-xs w-full">Edit</Button>
                          </Link>
                          {status === 'approved' && (
                            <Link href={`/comic/${rec.id}`} className="flex-1">
                              <Button variant="outline" size="sm" className="h-8 text-xs w-full">View</Button>
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
                          <Button variant="outline" size="sm" onClick={() => handleDelete(rec.id, rec.title, false)} disabled={isDeleting}
                            className="h-8 text-xs hover:border-destructive/40 hover:text-destructive shrink-0">
                            {isDeleting ? 'Deleting…' : 'Delete'}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      <PeakHourModal
        isOpen={peakHourModal.open}
        onClose={() => setPeakHourModal(p => ({ ...p, open: false }))}
        messageType={peakHourModal.messageType}
        onSaveDraft={async () => { setPeakHourModal(p => ({ ...p, open: false })) }}
      />

      <LimitReachedModal
        isOpen={limitModal.open}
        onClose={() => setLimitModal(m => ({ ...m, open: false }))}
        limitType={limitModal.limitType}
        alreadyDraft
        onSaveDraft={async () => {}}
      />
    </div>
  )
}
