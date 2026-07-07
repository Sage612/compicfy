'use client'

import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'

const POLL_INTERVAL_MS = 15000

export function MaintenancePoller() {
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    const checkStatus = async () => {
      setChecking(true)
      try {
        const res = await fetch('/api/maintenance-status', { cache: 'no-store' })
        const data = await res.json()
        if (!data.maintenance_mode) {
          // Full reload so middleware + the server component both re-run
          // and correctly resolve to the real site, not a cached page.
          window.location.href = '/'
        }
      } catch {
        // stay put, try again next interval
      } finally {
        setChecking(false)
      }
    }

    const interval = setInterval(checkStatus, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [])

  const handleManualRetry = () => {
    window.location.href = '/'
  }

  return (
    <button
      onClick={handleManualRetry}
      className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
    >
      <RefreshCw size={14} />
      Check now
    </button>
  )
}