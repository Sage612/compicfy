'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { PenLine, X, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DraftRec {
  id:    string
  title: string
}

const SESSION_KEY = 'compicfy_nudge_dismissed'

export function IncompleteRecNudge() {
  const [drafts,  setDrafts]  = useState<DraftRec[]>([])
  const [visible, setVisible] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY)) { setLoading(false); return }

    const fetchDrafts = async () => {
      try {
        const res  = await fetch('/api/recommendations/drafts')
        const data = await res.json()
        const list: DraftRec[] = data.drafts ?? []
        if (list.length > 0) {
          setDrafts(list)
          setVisible(true)
        }
      } catch {
        // Non-critical — fail silently
      } finally {
        setLoading(false)
      }
    }

    fetchDrafts()
  }, [])

  const dismiss = () => {
    sessionStorage.setItem(SESSION_KEY, '1')
    setVisible(false)
  }

  if (loading || !visible || drafts.length === 0) return null

  return (
    <div className={cn(
      'flex items-start gap-3 px-4 py-3 rounded-2xl border',
      'border-amber-500/25 bg-amber-500/5'
    )}>
      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shrink-0 shadow-sm mt-0.5">
        <PenLine size={14} className="text-white" />
      </div>

      <div className="flex-1 min-w-0 space-y-1">
        <p className="text-sm font-black text-amber-600 leading-tight">
          {drafts.length === 1
            ? '1 recommendation is missing your take'
            : `${drafts.length} recommendations are missing your take`}
        </p>
        <p className="text-xs text-muted-foreground leading-snug">
          The "why do you recommend it?" field is empty.
          Recs with a personal reason get <span className="font-semibold text-foreground">3× more votes</span> — takes 30 seconds.
        </p>

        <div className="flex flex-wrap gap-2 pt-1">
          {drafts.slice(0, 3).map(draft => (
            <Link
              key={draft.id}
              href={`/dashboard/recommendations/${draft.id}/edit`}
              className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 hover:underline"
            >
              {draft.title.length > 28 ? draft.title.slice(0, 28) + '…' : draft.title}
              <ChevronRight size={11} />
            </Link>
          ))}
          {drafts.length > 3 && (
            <Link
              href="/dashboard/recommendations"
              className="text-xs font-semibold text-amber-600 hover:underline"
            >
              +{drafts.length - 3} more
            </Link>
          )}
        </div>
      </div>

      <button
        onClick={dismiss}
        className="text-muted-foreground hover:text-foreground transition-colors shrink-0 mt-0.5"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  )
}