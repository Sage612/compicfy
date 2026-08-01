'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import {
  CheckCircle, XCircle, Loader2, Flag,
  BookOpen, MessageSquare, User, ExternalLink,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { formatDate } from '@/lib/utils/format'
import Link from 'next/link'

function proxyCover(url: string | null | undefined): string {
  if (!url) return "" // Returning an empty string satisfies the 'string' requirement
  if (url.startsWith('data:')) return url
  if (url.startsWith('/')) return url
  if (url.includes('/api/image-proxy')) return url

  return `/api/image-proxy?url=${encodeURIComponent(url)}`
}


const FILTERS = [
  { value: 'pending',   label: '⏳ Pending'   },
  { value: 'resolved',  label: '✅ Resolved'  },
  { value: 'dismissed', label: '❌ Dismissed' },
]

const ENTITY_TYPE_COLORS: Record<string, string> = {
  recommendation: 'bg-violet-500/10 text-violet-600 border-violet-500/20',
  review:         'bg-amber-500/10  text-amber-600  border-amber-500/20',
  user:           'bg-blue-500/10   text-blue-600   border-blue-500/20',
  comment:        'bg-teal-500/10   text-teal-600   border-teal-500/20',
}

const REASON_COLORS: Record<string, string> = {
  wrong_info:      'bg-amber-500/10  text-amber-600  border-amber-500/20',
  duplicate:       'bg-blue-500/10   text-blue-600   border-blue-500/20',
  spam:            'bg-zinc-500/10   text-zinc-600   border-zinc-500/20',
  inappropriate:   'bg-red-500/10    text-red-600    border-red-500/20',
  wrong_platform:  'bg-violet-500/10 text-violet-600 border-violet-500/20',
  broken_links:    'bg-orange-500/10 text-orange-600 border-orange-500/20',
  other:           'bg-muted         text-muted-foreground border-border',
}

const ENTITY_ICONS: Record<string, React.ElementType> = {
  recommendation: BookOpen,
  review:         MessageSquare,
  user:           User,
  comment:        MessageSquare,
}

export function AdminReports() {
  const [reports,         setReports]         = useState<any[]>([])
  const [filter,          setFilter]          = useState('pending')
  const [loading,         setLoading]         = useState(true)
  const [resolutionNotes, setResolutionNotes] = useState<Record<string, string>>({})
  const [actionLoading,   setActionLoading]   = useState<string | null>(null)

  const fetchReports = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch(`/api/admin/reports?filter=${filter}`)
      const data = await res.json()
      setReports(data.reports ?? [])
    } catch {
      toast.error('Failed to fetch reports')
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => { fetchReports() }, [fetchReports])

  const handleAction = async (id: string, status: 'resolved' | 'dismissed') => {
    setActionLoading(`${id}-${status}`)
    try {
      const res = await fetch(`/api/admin/reports/${id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          status,
          resolution_note: resolutionNotes[id]?.trim() || null,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Failed to update report')
      }

      toast.success(`Report ${status}`)
      setReports(prev => prev.filter(r => r.id !== id))
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to update report')
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div className="space-y-4">

      {/* Filter tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {FILTERS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-semibold border transition-all',
              filter === value
                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                : 'border-border text-muted-foreground hover:border-primary'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={24} className="animate-spin text-muted-foreground" />
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border border-dashed border-border">
          <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
            <Flag size={20} className="text-muted-foreground opacity-40" />
          </div>
          <p className="text-sm text-muted-foreground">No {filter} reports</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => {
            const EntityIcon = ENTITY_ICONS[report.entity_type] ?? Flag
            const content    = report.content

            return (
              <div
                key={report.id}
                className="p-4 rounded-2xl border border-border bg-card space-y-4 hover:border-primary/30 transition-colors"
              >
                {/* ── Header row ── */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2 flex-1 min-w-0">
                    {/* Type + reason badges */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={cn(
                        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize',
                        ENTITY_TYPE_COLORS[report.entity_type] ?? 'bg-muted text-muted-foreground border-border'
                      )}>
                        <EntityIcon size={9} />
                        {report.entity_type}
                      </span>
                      <span className={cn(
                        'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize',
                        REASON_COLORS[report.reason] ?? 'bg-muted text-muted-foreground border-border'
                      )}>
                        {report.reason}
                      </span>
                      <span className="text-xs text-muted-foreground">{formatDate(report.created_at)}</span>
                    </div>

                    {/* Reporter */}
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="font-semibold">Reported by:</span>
                      {report.reporter
                        ? <Link href={`/profile/${report.reporter.username}`} className="text-primary hover:underline font-semibold" target="_blank">
                            @{report.reporter.username}
                          </Link>
                        : <span>unknown</span>
                      }
                    </div>

                    {/* Reporter's reason/details */}
                    {report.details && (
                      <div className="p-3 rounded-xl bg-muted/50 border border-border">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                          Reporter's explanation
                        </p>
                        <p className="text-sm text-foreground leading-relaxed">{report.details}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Reported content preview ── */}
                {content && (
                  <div className="rounded-xl border border-border bg-muted/30 overflow-hidden">
                    <div className="px-3 py-2 border-b border-border bg-muted/50">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Reported {report.entity_type}
                      </p>
                    </div>
                    <div className="p-3 space-y-1.5">

                      {/* Recommendation */}
                      {report.entity_type === 'recommendation' && (
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-14 rounded-lg overflow-hidden bg-muted shrink-0">
                            {content.cover_url
                              ? <img src={proxyCover(content.cover_url)} alt={content.title} className="w-full h-full object-cover" />
                              : <div className="w-full h-full flex items-center justify-center"><BookOpen size={12} className="text-muted-foreground opacity-40" /></div>
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold truncate">{content.title}</p>
                            <p className="text-xs text-muted-foreground capitalize">{content.type}</p>
                            {content.profiles?.username && (
                              <p className="text-xs text-muted-foreground">by @{content.profiles.username}</p>
                            )}
                          </div>
                          <Link
                            href={`/comic/${content.id}`}
                            target="_blank"
                            className="shrink-0 text-muted-foreground hover:text-primary transition-colors"
                          >
                            <ExternalLink size={14} />
                          </Link>
                        </div>
                      )}

                      {/* Review */}
                      {report.entity_type === 'review' && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            {content.profiles?.username && (
                              <p className="text-xs text-muted-foreground font-semibold">
                                by @{content.profiles.username}
                              </p>
                            )}
                            {content.rating && (
                              <span className="text-xs font-bold text-amber-500">★ {content.rating}/5</span>
                            )}
                          </div>
                          <p className="text-sm text-foreground leading-relaxed line-clamp-4">
                            {content.content}
                          </p>
                        </div>
                      )}

                      {/* User */}
                      {report.entity_type === 'user' && (
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-muted overflow-hidden shrink-0">
                            {content.avatar_url
                              ? <img src={content.avatar_url} alt={content.username} className="w-full h-full object-cover" />
                              : <div className="w-full h-full flex items-center justify-center"><User size={14} className="text-muted-foreground opacity-40" /></div>
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold">@{content.username}</p>
                            {content.display_name && (
                              <p className="text-xs text-muted-foreground">{content.display_name}</p>
                            )}
                          </div>
                          <Link
                            href={`/profile/${content.username}`}
                            target="_blank"
                            className="shrink-0 text-muted-foreground hover:text-primary transition-colors"
                          >
                            <ExternalLink size={14} />
                          </Link>
                        </div>
                      )}

                    </div>
                  </div>
                )}

                {/* ── Previously resolved note ── */}
                {report.resolution_note && filter !== 'pending' && (
                  <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 mb-1">
                      Resolution note
                    </p>
                    <p className="text-xs text-muted-foreground italic">{report.resolution_note}</p>
                  </div>
                )}

                {/* ── Actions — pending only ── */}
                {filter === 'pending' && (
                  <div className="space-y-2 pt-1 border-t border-border">
                    <Textarea
                      value={resolutionNotes[report.id] ?? ''}
                      onChange={e => setResolutionNotes(prev => ({ ...prev, [report.id]: e.target.value }))}
                      placeholder="Add a resolution note (optional) — e.g. 'Content removed', 'User warned'…"
                      rows={2}
                      className="resize-none text-sm"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="gap-1.5 bg-emerald-500 hover:bg-emerald-600 border-0 text-white"
                        onClick={() => handleAction(report.id, 'resolved')}
                        disabled={!!actionLoading}
                      >
                        {actionLoading === `${report.id}-resolved`
                          ? <Loader2 size={13} className="animate-spin" />
                          : <CheckCircle size={13} />
                        }
                        Resolve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        onClick={() => handleAction(report.id, 'dismissed')}
                        disabled={!!actionLoading}
                      >
                        {actionLoading === `${report.id}-dismissed`
                          ? <Loader2 size={13} className="animate-spin" />
                          : <XCircle size={13} />
                        }
                        Dismiss
                      </Button>
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