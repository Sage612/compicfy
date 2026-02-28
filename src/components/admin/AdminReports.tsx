'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { CheckCircle, XCircle, Loader2, Flag } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { formatDate } from '@/lib/utils/format'

const FILTERS = [
  { value: 'pending', label: '⏳ Pending' },
  { value: 'resolved', label: '✅ Resolved' },
  { value: 'dismissed', label: '❌ Dismissed' },
]

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
    } catch {
      toast.error('Failed to fetch reports')
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => { fetchReports() }, [fetchReports])

  const handleResolve = async (id: string, status: 'resolved' | 'dismissed') => {
    setActionLoading(`${id}-${status}`)
    try {
      const res = await fetch(`/api/admin/reports/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, resolution_note: resolutionNotes[id] ?? '' }),
      })
      if (!res.ok) throw new Error()
      toast.success(`Report ${status}`)
      setReports(prev => prev.filter(r => r.id !== id))
    } catch {
      toast.error('Failed to update report')
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-1.5">
        {FILTERS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
              filter === value
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border text-muted-foreground hover:border-primary'
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
      ) : reports.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Flag size={36} className="mx-auto mb-3 opacity-30" />
          <p>No {filter} reports</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <div key={report.id} className="p-4 rounded-xl border border-border bg-card space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" className="text-xs capitalize">
                      {report.content_type}
                    </Badge>
                    <Badge variant="outline" className="text-xs capitalize">
                      {report.reason}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(report.created_at)}
                    </span>
                  </div>
                  {report.details && (
                    <p className="text-sm text-muted-foreground">{report.details}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Reported by @{report.profiles?.username ?? 'unknown'}
                  </p>
                </div>
              </div>

              {filter === 'pending' && (
                <div className="space-y-2">
                  <Textarea
                    value={resolutionNotes[report.id] ?? ''}
                    onChange={(e) => setResolutionNotes(prev => ({ ...prev, [report.id]: e.target.value }))}
                    placeholder="Resolution note (optional)..."
                    rows={2}
                    className="resize-none text-sm"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="gap-1.5 bg-green-500 hover:bg-green-600"
                      onClick={() => handleResolve(report.id, 'resolved')}
                      disabled={!!actionLoading}
                    >
                      {actionLoading === `${report.id}-resolved` ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={13} />}
                      Resolve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleResolve(report.id, 'dismissed')}
                      disabled={!!actionLoading}
                      className="gap-1.5"
                    >
                      <XCircle size={13} />
                      Dismiss
                    </Button>
                  </div>
                </div>
              )}

              {report.resolution_note && (
                <p className="text-xs text-muted-foreground italic">
                  Resolution: {report.resolution_note}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}