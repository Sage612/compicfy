'use server'

// src/lib/tracking/actions.ts
//
// Server actions the comic page calls. Each one checks that someone is signed
// in, then hands off to core.ts (the single write path). They return
// { ok: true, ... } or { ok: false, error } so the UI can show a message
// without try/catch.

import { createClient } from '@/lib/supabase/server'
import { applyTracking, attachMoment, undoEvent } from './core'
import type {
  MomentActionResult,
  TrackActionResult,
  TrackInput,
  UndoActionResult,
} from './types'

const SIGN_IN = 'Please sign in.'

async function authed() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user ? { supabase, userId: user.id } : null
}

/** One call for every tracking change: +1, jump to a chapter, change status,
 *  leave a mood or a one-liner. See TrackInput. */
export async function trackProgress(input: TrackInput): Promise<TrackActionResult> {
  const a = await authed()
  if (!a) return { ok: false, error: SIGN_IN }

  const res = await applyTracking(a.supabase, a.userId, input)
  if (!res.ok) return res

  // Strip the raw list-item row: the client only needs these fields.
  const { item: _item, ...slim } = res
  return slim
}

/** Add a mood or a one-liner. With an eventId it decorates that event (the
 *  strip that appears after a one-tap +1); without one it logs a standalone
 *  moment on the comic. */
export async function addMoment(input: {
  recommendationId: string
  eventId?:         string | null
  mood?:            string | null
  note?:            string | null
  isSpoiler?:       boolean
}): Promise<MomentActionResult> {
  const a = await authed()
  if (!a) return { ok: false, error: SIGN_IN }

  if (input.eventId) {
    const res = await attachMoment(a.supabase, a.userId, {
      eventId:   input.eventId,
      mood:      input.mood,
      note:      input.note,
      isSpoiler: input.isSpoiler,
    })
    // The event can be missing if tracking_events is not deployed yet:
    // fall through and log it as a fresh moment instead of losing the line.
    if (res.ok) return res
  }

  const res = await applyTracking(a.supabase, a.userId, {
    recommendationId: input.recommendationId,
    mood:             input.mood,
    note:             input.note,
    isSpoiler:        input.isSpoiler,
  })
  if (!res.ok) return res
  return { ok: true, eventId: res.eventId, journalEntryId: res.journalEntryId }
}

/** Take back the last tracking event (the Undo on the "logged" strip). */
export async function undoTracking(eventId: string): Promise<UndoActionResult> {
  const a = await authed()
  if (!a) return { ok: false, error: SIGN_IN }
  return undoEvent(a.supabase, a.userId, eventId)
}