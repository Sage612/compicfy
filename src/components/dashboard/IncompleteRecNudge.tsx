'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { PenLine, X, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
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
  const [isPro,   setIsPro]   = useState(false)

  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && sessionStorage.getItem(SESSION_KEY)) {
        setLoading(false)
        return
      }
    } catch {}

    const run = async () => {
      try {
        // Check pro status so we can build the correct edit link
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (user) {
          const { data: profile } = await (supabase as any)
            .from('profiles')
            .select('is_pro, pro_expires_at, role')
            .eq('id', user.id)
            .single()

          if (profile) {
            setIsPro(
              profile.role === 'admin' ||
              (profile.is_pro &&
                (!profile.pro_expires_at || new Date(profile.pro_expires_at) > new Date()))
            )
          }
        }

        const res = await fetch('/api/recommendations/drafts', { cache: 'no-store' })
        if (!res.ok) return

        const data = await res.json()
        const list: DraftRec[] = data.drafts ?? []

        if (list.length > 0) {
          setDrafts(list)
          setVisible(true)
        }
      } catch (err) {
        console.warn('[IncompleteRecNudge] failed:', err)
      } finally {
        setLoading(false)
      }
    }

    run()
  }, [])

  const dismiss = () => {
    try { sessionStorage.setItem(SESSION_KEY, '1') } catch {}
    setVisible(false)
  }

  // Edit route depends on whether user is pro or not
  const editHref = (id: string) =>
    isPro
      ? `/pro/reader/dashboard/recommendations/${id}/edit`
      : `/reader/dashboard/recommendations/${id}/edit`

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
          The &quot;why do you recommend it?&quot; field is empty.
          Recs with a personal reason get{' '}
          <span className="font-semibold text-foreground">far more votes</span>, takes 30 seconds.
        </p>

        <div className="flex flex-wrap gap-2 pt-1">
          {drafts.slice(0, 3).map(draft => (
            <Link
              key={draft.id}
              href={editHref(draft.id)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 hover:underline"
            >
              {draft.title.length > 28 ? draft.title.slice(0, 28) + '…' : draft.title}
              <ChevronRight size={11} />
            </Link>
          ))}
          {drafts.length > 3 && (
            <Link
              href={isPro ? '/pro/reader/dashboard/recommendations' : '/reader/dashboard/recommendations'}
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