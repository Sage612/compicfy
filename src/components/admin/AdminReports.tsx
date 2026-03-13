// ── AdminReports ─────────────────────────────────────────────────────────────
'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { CheckCircle, XCircle, Loader2, Flag } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { formatDate } from '@/lib/utils/format'

const FILTERS = [
  { value: 'pending',   label: '⏳ Pending'   },
  { value: 'resolved',  label: '✅ Resolved'  },
  { value: 'dismissed', label: '❌ Dismissed' },
]

const CONTENT_TYPE_COLORS: Record<string, string> = {
  recommendation: 'bg-violet-500/10 text-violet-600 border-violet-500/20',
  review:         'bg-amber-500/10  text-amber-600  border-amber-500/20',
  user:           'bg-blue-500/10   text-blue-600   border-blue-500/20',
}

const REASON_COLORS: Record<string, string> = {
  spam:         'bg-zinc-500/10    text-zinc-600    border-zinc-500/20',
  inappropriate:'bg-red-500/10     text-red-600     border-red-500/20',
  misinformation:'bg-amber-500/10  text-amber-600   border-amber-500/20',
  piracy:       'bg-rose-500/10    text-rose-600    border-rose-500/20',
}

export function AdminReports() {
  const [reports, setReports] = useState<any[]>([])
  const [filter, setFilter] = useState('pending')
  const [loading, setLoading] = useState(true)
  const [resolutionNotes, setResolutionNotes] = useState<Record<string, string>>({})
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchReports = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/reports?filter=${filter}`)
      const data = await res.json()
      setReports(data.reports ?? [])
    } catch { toast.error('Failed to fetch reports') }
    finally { setLoading(false) }
  }, [filter])

  useEffect(() => { fetchReports() }, [fetchReports])

  const handleResolve = async (id: string, status: 'resolved' | 'dismissed') => {
    setActionLoading(`${id}-${status}`)
    try {
      const res = await fetch(`/api/admin/reports/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, resolution_note: resolutionNotes[id] ?? '' }),
      })
      if (!res.ok) throw new Error()
      toast.success(`Report ${status}`)
      setReports(prev => prev.filter(r => r.id !== id))
    } catch { toast.error('Failed to update report') }
    finally { setActionLoading(null) }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-1.5 flex-wrap">
        {FILTERS.map(({ value, label }) => (
          <button key={value} onClick={() => setFilter(value)}
            className={cn('px-3 py-1.5 rounded-full text-xs font-semibold border transition-all',
              filter === value ? 'bg-primary text-primary-foreground border-primary shadow-sm' : 'border-border text-muted-foreground hover:border-primary'
            )}>{label}</button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-muted-foreground" /></div>
      ) : reports.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border border-dashed border-border">
          <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3"><Flag size={20} className="text-muted-foreground opacity-40" /></div>
          <p className="text-sm text-muted-foreground">No {filter} reports</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <div key={report.id} className="p-4 rounded-2xl border border-border bg-card space-y-3 hover:border-primary/30 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize', CONTENT_TYPE_COLORS[report.content_type] ?? 'bg-muted text-muted-foreground border-border')}>{report.content_type}</span>
                    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize', REASON_COLORS[report.reason] ?? 'bg-muted text-muted-foreground border-border')}>{report.reason}</span>
                    <span className="text-xs text-muted-foreground">{formatDate(report.created_at)}</span>
                  </div>
                  {report.details && <p className="text-sm text-muted-foreground">{report.details}</p>}
                  <p className="text-xs text-muted-foreground">Reported by @{report.profiles?.username ?? 'unknown'}</p>
                </div>
              </div>

              {filter === 'pending' && (
                <div className="space-y-2">
                  <Textarea value={resolutionNotes[report.id] ?? ''} onChange={e => setResolutionNotes(prev => ({ ...prev, [report.id]: e.target.value }))} placeholder="Resolution note (optional)..." rows={2} className="resize-none text-sm" />
                  <div className="flex gap-2">
                    <Button size="sm" className="gap-1.5 bg-emerald-500 hover:bg-emerald-600" onClick={() => handleResolve(report.id, 'resolved')} disabled={!!actionLoading}>
                      {actionLoading === `${report.id}-resolved` ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={13} />} Resolve
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleResolve(report.id, 'dismissed')} disabled={!!actionLoading} className="gap-1.5">
                      <XCircle size={13} /> Dismiss
                    </Button>
                  </div>
                </div>
              )}
              {report.resolution_note && <p className="text-xs text-muted-foreground italic">Resolution: {report.resolution_note}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}