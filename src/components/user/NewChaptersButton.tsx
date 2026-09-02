'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { BookMarked, Check, ExternalLink, Loader2, BookOpen } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

interface ComicUpdate {
  list_id:           string
  recommendation_id: string
  status:            string
  title:             string
  cover_url:         string | null
  chapter_count:     number
  progress_chapter:  number | null
  source_url:        string | null
  source_label:      string | null
}

/**
 * Persistent "new chapters available" indicator, sitting next to
 * NotificationBell rather than replacing it. Deliberately NOT
 * notification-driven — the count comes from /api/reading-progress/updates,
 * which compares chapter_count against progress_chapter directly. That
 * means swiping away or dismissing a notification has no effect on this
 * count; it only goes down when a comic is actually marked as read, here
 * or anywhere else in the app.
 */
export function NewChaptersButton({ userId }: { userId: string }) {
  const [updates, setUpdates]     = useState<ComicUpdate[]>([])
  const [loading, setLoading]     = useState(true)
  const [open,    setOpen]        = useState(false)
  const [markingId, setMarkingId] = useState<string | null>(null)
  const supabase = createClient()

  const fetchUpdates = useCallback(async () => {
    try {
      const res  = await fetch('/api/reading-progress/updates')
      const data = await res.json()
      setUpdates(data.updates ?? [])
    } catch {
      /* silent — this is a nice-to-have indicator, not critical path */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUpdates()
  }, [fetchUpdates])

  useEffect(() => {
    const channel = supabase.channel(`new_chapters_${userId}_${Date.now()}`)
    channel
      .on('postgres_changes', {
        event:  'INSERT',
        schema: 'public',
        table:  'notifications',
        filter: `user_id=eq.${userId}`,
      }, (payload: any) => {
        if (payload.new?.type === 'chapter_update') fetchUpdates()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId, fetchUpdates, supabase])

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (next) fetchUpdates()
  }

  const handleMarkRead = async (update: ComicUpdate) => {
    setMarkingId(update.recommendation_id)
    try {
      const res = await fetch(`/api/reading-progress/${update.recommendation_id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          list_id:          update.list_id,
          status:           update.status,
          progress_chapter: update.chapter_count,
        }),
      })
      if (!res.ok) throw new Error()
      setUpdates(prev => prev.filter(u => u.recommendation_id !== update.recommendation_id))
      toast.success(`Marked as read — ch. ${update.chapter_count}`)
    } catch {
      toast.error('Failed to update progress')
    } finally {
      setMarkingId(null)
    }
  }

  const count = updates.length

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <button
          className="relative h-8 w-8 flex items-center justify-center rounded-lg hover:bg-accent transition-colors outline-none"
          aria-label="Comics with new chapters"
        >
          <BookMarked size={16} />
          {count > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
              {count > 9 ? '9+' : count}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 rounded-xl p-2 max-h-[70vh] overflow-y-auto">
        <p className="px-2 py-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          {count > 0 ? `${count} comic${count !== 1 ? 's' : ''} with new chapters` : 'New chapters'}
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 size={16} className="animate-spin text-muted-foreground" />
          </div>
        ) : count === 0 ? (
          <p className="px-2 py-4 text-center text-xs text-muted-foreground">You're all caught up.</p>
        ) : (
          <div className="space-y-1">
            {updates.map(update => {
              const isMarking = markingId === update.recommendation_id
              return (
                <div
                  key={update.recommendation_id}
                  className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted/60 transition-colors"
                >
                  <Link
                    href={`/comic/${update.recommendation_id}`}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2.5 min-w-0 flex-1"
                  >
                    <div className="w-9 h-12 rounded-md overflow-hidden bg-muted shrink-0">
                      {update.cover_url ? (
                        <img
                          src={`/api/image-proxy?url=${encodeURIComponent(update.cover_url)}`}
                          alt={update.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <BookOpen size={12} className="text-muted-foreground opacity-40" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold truncate">{update.title}</p>
                      <p className="text-[11px] text-muted-foreground">
                        Ch. {update.chapter_count}
                        {update.progress_chapter != null && (
                          <span className="opacity-60"> · you're at {update.progress_chapter}</span>
                        )}
                      </p>
                      {update.source_url && (
                        <a
                          href={update.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="inline-flex items-center gap-0.5 text-[10px] text-primary hover:opacity-80 transition-opacity mt-0.5"
                        >
                          <ExternalLink size={9} />
                          {update.source_label ?? 'Read'}
                        </a>
                      )}
                    </div>
                  </Link>

                  <button
                    onClick={() => handleMarkRead(update)}
                    disabled={isMarking}
                    title="Mark as read"
                    className={cn(
                      'shrink-0 h-7 w-7 rounded-full border border-border/60 flex items-center justify-center transition-colors',
                      'text-muted-foreground hover:text-emerald-600 hover:border-emerald-500/40 hover:bg-emerald-500/10'
                    )}
                  >
                    {isMarking ? <Loader2 size={12} className="animate-spin" /> : <Check size={13} />}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}