'use client'

// src/components/comic-detail/TrackingProvider.tsx
//
// One shared brain for everything tracking-related on the comic page: the big
// action bar, the "how did it feel?" strip, the progress section with its scrub
// bar, the read-next button and the track sheet all read and change the same
// state, so a tap in one place is instantly reflected in the others.
//
// Taps are optimistic (the UI moves first), then confirmed by the server.
// Several quick +1 taps are coalesced into one request and one event.

import {
  createContext, useCallback, useContext, useMemo, useRef, useState,
  type ReactNode,
} from 'react'
import { BookOpen } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { AuthPromptModal } from '@/components/ui/auth-prompt-modal'
import { addMoment, trackProgress, undoTracking } from '@/lib/tracking/actions'
import { RESUME_FROM_STATUSES } from '@/lib/tracking/constants'
import { TRACKING_STATUS_META, type TrackingStatusValue } from '@/lib/utils/constants'
import type { MomentPoint, TrackActionResult } from '@/lib/tracking/types'
import { TrackSheet, type SheetRow } from './TrackSheet'

export interface TrackingSnapshot {
  status:     string | null
  subStatus:  string | null
  chapter:    number | null
  lastReadAt: string | null
}

/** The just-logged chapter, shown as the "how did it feel?" strip. */
export interface ActiveMoment {
  nonce:     number
  eventId:   string | null
  chapter:   number | null
  mood:      string | null
  noteSaved: boolean
}

interface TrackingContextValue {
  recommendationId: string
  title:            string
  totalChapters:    number | null
  comicStatus:      string
  signedIn:         boolean

  snapshot:  TrackingSnapshot
  tracked:   boolean
  busy:      boolean
  rating:    number | null
  moments:   MomentPoint[]
  moment:    ActiveMoment | null

  plusOne:          () => void
  startReading:     () => void
  setChapter:       (n: number) => void
  setStatus:        (status: string, opts?: { subStatus?: string | null }) => void
  setSubStatus:     (subStatus: string | null) => void
  saveMood:         (mood: string) => Promise<void>
  saveNote:         (input: { note: string; spoiler: boolean; mood?: string | null; onEvent?: boolean }) => Promise<boolean>
  undo:             () => Promise<void>
  dismissMoment:    () => void
  setRating:        (n: number) => void

  sheetOpen:        boolean
  openSheet:        () => void
  closeSheet:       () => void
  /** true if signed in; otherwise opens the sign-in prompt and returns false */
  requireAuth:      () => boolean
}

const TrackingContext = createContext<TrackingContextValue | null>(null)

export function useTracking(): TrackingContextValue {
  const ctx = useContext(TrackingContext)
  if (!ctx) throw new Error('useTracking must be used inside <TrackingProvider>')
  return ctx
}

interface Props {
  recommendationId: string
  title:            string
  totalChapters:    number | null
  comicStatus:      string
  signedIn:         boolean
  initial:          TrackingSnapshot
  initialRating:    number | null
  initialMoments:   MomentPoint[]
  /** Rows for the "more" section of the sheet (list, collection, bake, report…).
   *  Rendered on the server by the page and passed through. */
  sheetRows:        SheetRow[]
  children:         ReactNode
}

function autoStatus(status: string | null): string | null {
  return status === null || RESUME_FROM_STATUSES.includes(status) ? 'reading' : status
}

export function TrackingProvider({
  recommendationId, title, totalChapters, comicStatus, signedIn,
  initial, initialRating, initialMoments, sheetRows, children,
}: Props) {
  const router = useRouter()

  const [snapshot, setSnapshot] = useState<TrackingSnapshot>(initial)
  const [rating,   setRatingState] = useState<number | null>(initialRating)
  const [moments,  setMoments]  = useState<MomentPoint[]>(initialMoments)
  const [moment,   setMoment]   = useState<ActiveMoment | null>(null)
  const [pending,  setPending]  = useState(0)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [authOpen,  setAuthOpen]  = useState(false)

  const confirmed      = useRef<TrackingSnapshot>(initial)
  const chain          = useRef<Promise<void>>(Promise.resolve())
  const queuedDelta    = useRef(0)
  const flushScheduled = useRef(false)
  const nonce          = useRef(0)

  const tracked = snapshot.status !== null

  /* ── plumbing ── */

  // Run tasks one after another so two quick actions never race each other.
  const enqueue = useCallback((task: () => Promise<void>) => {
    setPending(p => p + 1)
    const run = async () => {
      try { await task() } finally { setPending(p => p - 1) }
    }
    chain.current = chain.current.then(run, run)
  }, [])

  const requireAuth = useCallback(() => {
    if (signedIn) return true
    setAuthOpen(true)
    return false
  }, [signedIn])

  const applyServer = useCallback((res: Extract<TrackActionResult, { ok: true }>) => {
    const next: TrackingSnapshot = {
      status:     res.status,
      subStatus:  res.subStatus,
      chapter:    res.chapter,
      lastReadAt: res.lastReadAt,
    }
    confirmed.current = next
    // If more taps are already waiting, keep the optimistic numbers on screen.
    if (queuedDelta.current === 0 && !flushScheduled.current) setSnapshot(next)
  }, [])

  const rollback = useCallback((error: string) => {
    queuedDelta.current = 0
    setSnapshot(confirmed.current)
    toast.error(error)
  }, [])

  const showMoment = useCallback((eventId: string | null, chapter: number | null) => {
    nonce.current += 1
    setMoment({ nonce: nonce.current, eventId, chapter, mood: null, noteSaved: false })
  }, [])

  /* ── chapter ── */

  const plusOne = useCallback(() => {
    if (!requireAuth()) return

    queuedDelta.current += 1
    setSnapshot(s => {
      const nextStatus = autoStatus(s.status)
      return {
        status:     nextStatus,
        subStatus:  nextStatus !== s.status ? null : s.subStatus,
        chapter:    (s.chapter ?? 0) + 1,
        lastReadAt: new Date().toISOString(),
      }
    })

    if (flushScheduled.current) return
    flushScheduled.current = true
    enqueue(async () => {
      flushScheduled.current = false
      const delta = queuedDelta.current
      queuedDelta.current = 0
      if (delta <= 0) return

      const res = await trackProgress({ recommendationId, delta })
      if (!res.ok) { rollback(res.error); return }
      applyServer(res)
      if (res.changed) showMoment(res.eventId, res.chapter)
    })
  }, [applyServer, enqueue, recommendationId, requireAuth, rollback, showMoment])

  const setChapter = useCallback((n: number) => {
    if (!requireAuth()) return
    const target = Math.max(0, Math.round(n))
    if (target === (confirmed.current.chapter ?? null) && snapshot.chapter === target) return

    setSnapshot(s => {
      const nextStatus = autoStatus(s.status)
      return {
        status:     nextStatus,
        subStatus:  nextStatus !== s.status ? null : s.subStatus,
        chapter:    target,
        lastReadAt: new Date().toISOString(),
      }
    })
    enqueue(async () => {
      const res = await trackProgress({ recommendationId, chapter: target })
      if (!res.ok) { rollback(res.error); return }
      applyServer(res)
      if (res.changed) showMoment(res.eventId, res.chapter)
    })
  }, [applyServer, enqueue, recommendationId, requireAuth, rollback, showMoment, snapshot.chapter])

  /* ── status ── */

  const changeStatus = useCallback((status: string, subStatus: string | null, announce: boolean) => {
    if (!requireAuth()) return
    setSnapshot(s => ({
      ...s,
      status,
      subStatus,
      lastReadAt: status === 'reading' ? new Date().toISOString() : s.lastReadAt,
    }))
    enqueue(async () => {
      const res = await trackProgress({ recommendationId, status, subStatus })
      if (!res.ok) { rollback(res.error); return }
      applyServer(res)
      if (announce && res.changed) {
        const meta = TRACKING_STATUS_META[status as TrackingStatusValue]
        if (meta) toast.success(`${meta.emoji} ${meta.label}`)
      }
    })
  }, [applyServer, enqueue, recommendationId, requireAuth, rollback])

  const setStatus = useCallback(
    (status: string, opts?: { subStatus?: string | null }) => {
      if (status === snapshot.status && opts === undefined) return
      changeStatus(status, opts?.subStatus ?? null, true)
    },
    [changeStatus, snapshot.status],
  )

  const setSubStatus = useCallback(
    (subStatus: string | null) => {
      if (!snapshot.status) return
      changeStatus(snapshot.status, subStatus, false)
    },
    [changeStatus, snapshot.status],
  )

  const startReading = useCallback(() => {
    changeStatus('reading', null, true)
  }, [changeStatus])

  /* ── mood + one-liner ── */

  const saveMood = useCallback(async (mood: string) => {
    const current = moment
    if (!current) return
    setMoment({ ...current, mood })
    setMoments(ms => [
      ...ms.filter(m => m.id !== (current.eventId ?? 'local')),
      { id: current.eventId ?? 'local', chapter: current.chapter, mood, createdAt: new Date().toISOString() },
    ])
    const res = await addMoment({ recommendationId, eventId: current.eventId, mood })
    if (!res.ok) toast.error(res.error)
  }, [moment, recommendationId])

  const saveNote = useCallback(async (input: { note: string; spoiler: boolean; mood?: string | null; onEvent?: boolean }) => {
    const note = input.note.trim()
    if (!note && !input.mood) return false
    const eventId = input.onEvent ? moment?.eventId ?? null : null

    const res = await addMoment({
      recommendationId,
      eventId,
      mood:      input.mood ?? moment?.mood ?? null,
      note:      note || null,
      isSpoiler: input.spoiler,
    })
    if (!res.ok) { toast.error(res.error); return false }

    if (input.mood) {
      setMoments(ms => [
        ...ms,
        { id: res.eventId ?? `local-${Date.now()}`, chapter: snapshot.chapter, mood: input.mood!, createdAt: new Date().toISOString() },
      ])
    }
    if (input.onEvent && moment) setMoment({ ...moment, noteSaved: true, mood: input.mood ?? moment.mood })
    toast.success(note ? 'Saved to your memory wall' : 'Saved')
    return true
  }, [moment, recommendationId, snapshot.chapter])

  const dismissMoment = useCallback(() => setMoment(null), [])

  const undo = useCallback(async () => {
    const current = moment
    if (!current?.eventId) { setMoment(null); return }
    setMoment(null)
    const res = await undoTracking(current.eventId)
    if (!res.ok) { toast.error(res.error); return }
    const next: TrackingSnapshot = {
      status:     res.status,
      subStatus:  res.subStatus,
      chapter:    res.chapter,
      lastReadAt: confirmed.current.lastReadAt,
    }
    confirmed.current = next
    setSnapshot(next)
    setMoments(ms => ms.filter(m => m.id !== current.eventId))
    toast('Undone')
  }, [moment])

  /* ── rating ── */

  const setRating = useCallback((n: number) => {
    setRatingState(n)
    router.refresh()   // re-draw the ratings histogram and reviews with the new rating
  }, [router])

  /* ── sheet ── */

  const openSheet = useCallback(() => {
    if (!requireAuth()) return
    setSheetOpen(true)
  }, [requireAuth])
  const closeSheet = useCallback(() => setSheetOpen(false), [])

  const value = useMemo<TrackingContextValue>(() => ({
    recommendationId, title, totalChapters, comicStatus, signedIn,
    snapshot, tracked, busy: pending > 0, rating, moments, moment,
    plusOne, startReading, setChapter, setStatus, setSubStatus,
    saveMood, saveNote, undo, dismissMoment, setRating,
    sheetOpen, openSheet, closeSheet, requireAuth,
  }), [
    recommendationId, title, totalChapters, comicStatus, signedIn,
    snapshot, tracked, pending, rating, moments, moment,
    plusOne, startReading, setChapter, setStatus, setSubStatus,
    saveMood, saveNote, undo, dismissMoment, setRating,
    sheetOpen, openSheet, closeSheet, requireAuth,
  ])

  return (
    <TrackingContext.Provider value={value}>
      {children}

      <TrackSheet rows={sheetRows} />

      <AuthPromptModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        config={{
          action:     'track your reading',
          comicTitle: title,
          icon:       <BookOpen size={24} className="text-primary" />,
        }}
      />
    </TrackingContext.Provider>
  )
}