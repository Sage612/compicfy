'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, Power } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export function MaintenanceToggle() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [enabled, setEnabled] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/admin/maintenance')
        if (!res.ok) throw new Error()
        const data = await res.json()
        setEnabled(!!data.maintenance_mode)
        setMessage(data.maintenance_message ?? '')
      } catch {
        toast.error('Could not load maintenance status')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleToggle = async () => {
    const next = !enabled
    if (next && !confirm('This will take the entire site offline for everyone except admins. Continue?')) {
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/admin/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maintenance_mode: next, maintenance_message: message }),
      })
      if (!res.ok) throw new Error()
      setEnabled(next)
      toast.success(next ? 'Maintenance mode enabled' : 'Maintenance mode disabled')
    } catch {
      toast.error('Failed to update maintenance mode')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-4 rounded-2xl border border-border bg-card animate-pulse h-24" />
    )
  }

  return (
    <div className={cn(
      'p-4 rounded-2xl border space-y-3 transition-colors',
      enabled ? 'border-red-500/40 bg-red-500/5' : 'border-border bg-card'
    )}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn(
            'w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
            enabled ? 'bg-red-500/15' : 'bg-muted'
          )}>
            <Power size={16} className={enabled ? 'text-red-500' : 'text-muted-foreground'} />
          </div>
          <div className="min-w-0">
            <p className="font-black text-sm">Maintenance Mode</p>
            <p className="text-xs text-muted-foreground truncate">
              {enabled ? 'Site is offline for non-admins' : 'Site is live'}
            </p>
          </div>
        </div>

        <button
          onClick={handleToggle}
          disabled={saving}
          className={cn(
            'shrink-0 w-12 h-7 rounded-full transition-colors relative disabled:opacity-60',
            enabled ? 'bg-red-500' : 'bg-muted-foreground/30'
          )}
          aria-label="Toggle maintenance mode"
        >
          <span className={cn(
            'absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition-transform shadow',
            enabled && 'translate-x-5'
          )} />
        </button>
      </div>

      {enabled && (
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20">
          <AlertTriangle size={13} className="text-red-500 shrink-0 mt-0.5" />
          <p className="text-[11px] text-red-700 dark:text-red-400 leading-relaxed">
            Admins and moderators can still browse normally. Everyone else is redirected to the maintenance page.
          </p>
        </div>
      )}
    </div>
  )
}