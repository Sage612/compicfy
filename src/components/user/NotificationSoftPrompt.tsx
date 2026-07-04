'use client'

import { useEffect, useState } from 'react'
import { Bell, X } from 'lucide-react'
import { useNotificationPermission } from '@/lib/hooks/useNotificationPermission'

// sessionStorage, not localStorage — this makes the prompt reappear on each
// new browser session until the user actually enables notifications, rather
// than being dismissed forever after a single "Not now" click.
const SESSION_DISMISS_KEY = 'compicfy_push_prompt_dismissed_session'

export function NotificationSoftPrompt() {
  const [visible, setVisible] = useState(false)
  const { permission, subscribing, error, subscribe } = useNotificationPermission()

  useEffect(() => {
    if (permission === 'denied') return // browser-level block — requestPermission() can't re-ask, no point showing
    if (permission !== 'default') return // already granted or unsupported
    const dismissedThisSession = sessionStorage.getItem(SESSION_DISMISS_KEY)
    if (dismissedThisSession) return

    const timer = setTimeout(() => setVisible(true), 4000) // small delay after page load
    return () => clearTimeout(timer)
  }, [permission])

  const dismiss = () => {
    sessionStorage.setItem(SESSION_DISMISS_KEY, '1')
    setVisible(false)
  }

  const handleEnable = async () => {
    const ok = await subscribe()
    if (ok) setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed left-4 right-4 bottom-24 z-[70] sm:left-auto sm:right-4 sm:bottom-4 sm:max-w-sm rounded-xl border border-border bg-card shadow-lg p-4 flex gap-3 animate-in slide-in-from-bottom-4">
      <div className="shrink-0 w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
        <Bell size={16} className="text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">Stay in the loop</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Get notified when someone comments, follows you, or your recs get approved.
        </p>
        {error && <p className="text-xs text-destructive mt-1">{error}</p>}
        <div className="flex gap-2 mt-3">
          <button
            onClick={handleEnable}
            disabled={subscribing}
            className="text-xs font-medium bg-primary text-primary-foreground rounded-lg px-3 py-1.5 hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {subscribing ? 'Enabling…' : 'Enable'}
          </button>
          <button
            onClick={dismiss}
            className="text-xs font-medium text-muted-foreground hover:text-foreground rounded-lg px-3 py-1.5 transition-colors"
          >
            Not now
          </button>
        </div>
      </div>
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="shrink-0 text-muted-foreground hover:text-foreground"
      >
        <X size={14} />
      </button>
    </div>
  )
}
