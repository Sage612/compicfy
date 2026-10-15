// src/lib/tracking/core.ts
//
// THE one tracking write path.
//
// Everything that changes "where I am in a comic" goes through applyTracking:
//   - the comic page (one-tap +1, scrub bar, status chips, mood/one-liner)
//   - the dashboard chapter updater / "mark as read" buttons, through the
//     /api/reading-progress/[comicId] route, which now just calls this
//
// One call keeps three things in step so they can never drift apart:
//   1. reading_list_items   the single source of truth for progress. The lists,
//                           the dashboard AND the profile's "Currently obsessed"
//                           all read it (reading_progress is only a legacy fallback)
//   2. tracking_events      the history the feed / ribbon / friends read
//   3. journal_entries      the profile memory wall (only when there is a one-liner)
//
// Steps 2-3 are best effort: if one of them fails, tracking itself still
// succeeds. tracking_events in particular may not exist yet (see
// supabase/migrations/20261014_tracking_events.sql), and that is fine.
//
// This file is NOT a 'use server' file. It takes a Supabase client so it can be
// used from server actions and from route handlers alike. Auth is the caller's
// job: pass the signed-in user's id and a client carrying their session, so the
// owner-only RLS policies stay the real gatekeeper.

import { revalidatePath } from 'next/cache'
import type { createClient } from '@/lib/supabase/server'
import {
  TRACKING_STATUSES,
  TRACKING_SUB_STATUS_CUSTOM_MAX_LENGTH,
} from '@/lib/utils/constants'
import {
  DEFAULT_LIST_NAME,
  MAX_CHAPTER,
  MOOD_EMOJIS,
  NOTE_MAX_LENGTH,
  RESUME_FROM_STATUSES,
} from './constants'
import type {
  MomentActionResult,
  TrackActionResult,
  TrackInput,
  UndoActionResult,
} from './types'

type Supa = Awaited<ReturnType<typeof createClient>>

export type TrackCoreResult =
  | (Extract<TrackActionResult, { ok: true }> & { item: Record<string, any> })
  | Extract<TrackActionResult, { ok: false }>

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const VALID_STATUSES = new Set<string>(TRACKING_STATUSES.map(s => s.value))
const ITEM_COLUMNS = 'id, list_id, status, sub_status, progress_chapter, notes, last_read_at, updated_at'

const fail = (error: string) => ({ ok: false as const, error })

function clean(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t ? t.slice(0, max) : null
}

function int(v: unknown, min: number, max: number): number | null {
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(n)) return null
  const r = Math.round(n)
  return r < min || r > max ? null : r
}

/** Table or schema-cache misses mean the migration has not been run yet. */
function isMissingTable(error: any): boolean {
  const code = error?.code
  const msg  = String(error?.message ?? '')
  return code === '42P01' || code === 'PGRST205' || /does not exist|schema cache/i.test(msg)
}

/* ────────────────────────────────────────────────────────────── */
/*  Which list does this comic live in?                            */
/* ────────────────────────────────────────────────────────────── */

interface ListLookup {
  listId:      string
  item:        Record<string, any> | null
  createdList: boolean
}

async function resolveList(
  db: any,
  userId: string,
  recId: string,
  preferredListId: string | null,
): Promise<ListLookup | { error: string }> {
  const { data: lists } = await db.from('reading_lists').select('id').eq('user_id', userId)
  const listIds: string[] = (lists ?? []).map((l: any) => l.id)

  // The caller named a list (dashboard flows do): it must be theirs.
  if (preferredListId) {
    if (!listIds.includes(preferredListId)) return { error: 'List not found' }
    const { data: item } = await db
      .from('reading_list_items')
      .select(ITEM_COLUMNS)
      .eq('list_id', preferredListId)
      .eq('recommendation_id', recId)
      .maybeSingle()
    return { listId: preferredListId, item: item ?? null, createdList: false }
  }

  if (listIds.length > 0) {
    // Already tracked somewhere? Use the entry touched most recently
    // (same rule the GET route uses to read it back).
    const { data: existing } = await db
      .from('reading_list_items')
      .select(ITEM_COLUMNS)
      .eq('recommendation_id', recId)
      .in('list_id', listIds)
      .order('updated_at', { ascending: false, nullsFirst: false })
      .limit(1)
    if (existing?.[0]) {
      return { listId: existing[0].list_id as string, item: existing[0], createdList: false }
    }

    // Not tracked yet: drop it in the list they used last.
    const { data: recent } = await db
      .from('reading_list_items')
      .select('list_id')
      .in('list_id', listIds)
      .order('updated_at', { ascending: false, nullsFirst: false })
      .limit(1)
    return { listId: (recent?.[0]?.list_id as string | undefined) ?? listIds[0], item: null, createdList: false }
  }

  // No lists at all: make one quietly instead of blocking them behind a
  // "create a list first" wall.
  const { data: created, error } = await db
    .from('reading_lists')
    .insert({ user_id: userId, name: DEFAULT_LIST_NAME, is_public: false })
    .select('id')
    .single()
  if (error || !created) return { error: 'Could not set up your library.' }
  return { listId: created.id as string, item: null, createdList: true }
}

/* ────────────────────────────────────────────────────────────── */
/*  The write path                                                 */
/* ────────────────────────────────────────────────────────────── */

export async function applyTracking(
  supabase: Supa,
  userId: string,
  input: TrackInput,
): Promise<TrackCoreResult> {
  const db = supabase as any

  const recId = typeof input.recommendationId === 'string' ? input.recommendationId : ''
  if (!UUID.test(recId)) return fail('Unknown comic.')

  // ── Validate ──
  let chapterInput: number | null | undefined
  if (input.chapter !== undefined) {
    if (input.chapter === null) {
      chapterInput = null
    } else {
      const n = int(input.chapter, 0, MAX_CHAPTER)
      if (n === null) return fail('Chapter must be a whole number.')
      chapterInput = n
    }
  }

  let delta = 0
  if (input.delta !== undefined) {
    const d = int(input.delta, -MAX_CHAPTER, MAX_CHAPTER)
    if (d === null) return fail('That step is not valid.')
    delta = d
  }

  if (input.status !== undefined && !VALID_STATUSES.has(input.status)) return fail('Unknown status.')
  if (input.statusIfNew !== undefined && !VALID_STATUSES.has(input.statusIfNew)) return fail('Unknown status.')

  const subStatusInput = input.subStatus === undefined
    ? undefined
    : clean(input.subStatus, TRACKING_SUB_STATUS_CUSTOM_MAX_LENGTH)
  const privateNote = input.privateNote === undefined ? undefined : clean(input.privateNote, 500)
  const mood        = input.mood && MOOD_EMOJIS.includes(input.mood) ? input.mood : null
  const note        = clean(input.note, NOTE_MAX_LENGTH)
  const visibility  = input.visibility === 'private' ? 'private' : 'public'

  // ── The comic ──
  const { data: rec } = await db
    .from('recommendations')
    .select('id, chapter_count')
    .eq('id', recId)
    .maybeSingle()
  if (!rec) return fail('Comic not found.')

  // ── Where it lives ──
  const found = await resolveList(db, userId, recId, input.listId ?? null)
  if ('error' in found) return fail(found.error)
  const { listId, item, createdList } = found

  const chapterBefore = (item?.progress_chapter ?? null) as number | null
  const statusBefore  = (item?.status ?? null) as string | null
  const subBefore     = (item?.sub_status ?? null) as string | null

  const nothingAsked =
    chapterInput === undefined && delta === 0 && input.status === undefined &&
    input.statusIfNew === undefined && subStatusInput === undefined && privateNote === undefined && !mood && !note
  if (nothingAsked) return fail('Nothing to log.')

  // ── Work out the new state ──
  let chapterAfter = chapterBefore
  if (chapterInput !== undefined) chapterAfter = chapterInput
  else if (delta !== 0) chapterAfter = Math.max(0, Math.min(MAX_CHAPTER, (chapterBefore ?? 0) + delta))

  let statusAfter = statusBefore
  if (input.status !== undefined) {
    statusAfter = input.status
  } else if (!item) {
    // First time tracking: a chapter, a mood or a note all mean "I'm reading this".
    statusAfter = input.statusIfNew ?? 'reading'
  } else if (
    chapterAfter !== null &&
    chapterAfter > (chapterBefore ?? 0) &&
    (statusBefore === null || RESUME_FROM_STATUSES.includes(statusBefore))
  ) {
    statusAfter = 'reading'   // logging a chapter resumes a paused / planned / dropped comic
  }

  let subAfter = subBefore
  if (subStatusInput !== undefined) subAfter = subStatusInput
  else if (statusAfter !== statusBefore) subAfter = null   // the old sub-status belonged to the old status

  const chapterChanged = chapterAfter !== chapterBefore
  const statusChanged  = statusAfter !== statusBefore
  const subChanged     = subAfter !== subBefore
  const noteChanged    = privateNote !== undefined && privateNote !== ((item?.notes ?? null) as string | null)
  const changed        = !item || chapterChanged || statusChanged || subChanged || noteChanged

  const now = new Date().toISOString()

  // ── 1. reading_list_items (the source of truth) ──
  let saved: Record<string, any> | null = item
  if (changed) {
    const lastReadAt =
      chapterChanged || (statusChanged && statusAfter === 'reading')
        ? now
        : ((item?.last_read_at ?? null) as string | null)

    if (item) {
      const patch: Record<string, any> = {
        status:           statusAfter,
        sub_status:       subAfter,
        progress_chapter: chapterAfter,
        updated_at:       now,
      }
      if (lastReadAt && lastReadAt !== item.last_read_at) patch.last_read_at = lastReadAt
      if (privateNote !== undefined) patch.notes = privateNote

      const { data, error } = await db
        .from('reading_list_items')
        .update(patch)
        .eq('id', item.id)
        .select('*')
        .single()
      if (error) return fail(error.message ?? 'Could not update your progress.')
      saved = data
    } else {
      const { data, error } = await db
        .from('reading_list_items')
        .insert({
          list_id:           listId,
          recommendation_id: recId,
          status:            statusAfter,
          sub_status:        subAfter,
          progress_chapter:  chapterAfter,
          last_read_at:      lastReadAt,
          ...(privateNote !== undefined ? { notes: privateNote } : {}),
        })
        .select('*')
        .single()
      if (error) return fail(error.message ?? 'Could not add this comic.')
      saved = data
    }
  }

  // ── 3. tracking_events ── best effort
  let eventType: 'progress' | 'status' | 'moment' | null = null
  if (chapterChanged && chapterAfter !== null) eventType = 'progress'
  else if (!item || statusChanged || subChanged) eventType = 'status'
  else if (mood || note) eventType = 'moment'

  let eventId: string | null = null
  if (eventType) {
    try {
      const { data, error } = await db
        .from('tracking_events')
        .insert({
          user_id:           userId,
          recommendation_id: recId,
          event_type:        eventType,
          chapter:           chapterAfter,
          from_chapter:      chapterBefore,
          status:            statusAfter,
          from_status:       statusBefore,
          sub_status:        subAfter,
          from_sub_status:   subBefore,
          mood,
          note,
          is_spoiler:        !!(input.isSpoiler && note),
          visibility,
        })
        .select('id')
        .single()
      if (error) {
        if (!isMissingTable(error)) console.error('[tracking] event insert failed', error.message)
      } else {
        eventId = (data?.id as string | undefined) ?? null
      }
    } catch (e) {
      console.error('[tracking] event insert threw', e)
    }
  }

  // ── 4. journal_entries (profile memory wall) ── best effort
  let journalEntryId: string | null = null
  if (note && visibility === 'public') {
    try {
      const { data, error } = await db
        .from('journal_entries')
        .insert({
          user_id:           userId,
          recommendation_id: recId,
          chapter_label:     chapterAfter !== null ? `Ch. ${chapterAfter}` : null,
          content:           note,
          mood_emoji:        mood,
          is_spoiler:        !!input.isSpoiler,
        })
        .select('id')
        .single()
      if (error) {
        console.error('[tracking] journal insert failed', error.message)
      } else {
        journalEntryId = (data?.id as string | undefined) ?? null
        if (journalEntryId && eventId) {
          await db.from('tracking_events').update({ journal_entry_id: journalEntryId }).eq('id', eventId)
        }
      }
    } catch (e) {
      console.error('[tracking] journal insert threw', e)
    }
  }

  await refreshPages(db, userId, recId)

  return {
    ok:             true,
    listId,
    createdList,
    eventId,
    journalEntryId,
    chapter:        chapterAfter,
    status:         statusAfter,
    subStatus:      subAfter,
    lastReadAt:     (saved?.last_read_at ?? null) as string | null,
    changed,
    item:           saved ?? {},
  }
}

/* ────────────────────────────────────────────────────────────── */
/*  Add a mood / one-liner to an event that already exists         */
/* ────────────────────────────────────────────────────────────── */

export async function attachMoment(
  supabase: Supa,
  userId: string,
  input: { eventId: string; mood?: string | null; note?: string | null; isSpoiler?: boolean },
): Promise<MomentActionResult> {
  const db = supabase as any
  if (!UUID.test(input.eventId ?? '')) return fail('That entry is gone.')

  const mood = input.mood && MOOD_EMOJIS.includes(input.mood) ? input.mood : null
  const note = clean(input.note, NOTE_MAX_LENGTH)
  if (!mood && !note) return fail('Pick a mood or write a line.')

  const { data: ev, error: evErr } = await db
    .from('tracking_events')
    .select('id, recommendation_id, chapter, journal_entry_id, visibility, mood, note')
    .eq('id', input.eventId)
    .eq('user_id', userId)
    .maybeSingle()
  if (evErr || !ev) return fail('That entry is gone.')

  const patch: Record<string, any> = {}
  if (mood) patch.mood = mood
  if (note) {
    patch.note       = note
    patch.is_spoiler = !!input.isSpoiler
  }
  const { error: upErr } = await db.from('tracking_events').update(patch).eq('id', ev.id)
  if (upErr) return fail('Could not save that.')

  // Keep the memory wall in step.
  let journalEntryId: string | null = (ev.journal_entry_id as string | null) ?? null
  try {
    if (note && ev.visibility === 'public') {
      if (journalEntryId) {
        await db
          .from('journal_entries')
          .update({
            content:     note,
            mood_emoji:  mood ?? ev.mood ?? null,
            is_spoiler:  !!input.isSpoiler,
          })
          .eq('id', journalEntryId)
          .eq('user_id', userId)
      } else {
        const { data: j } = await db
          .from('journal_entries')
          .insert({
            user_id:           userId,
            recommendation_id: ev.recommendation_id,
            chapter_label:     ev.chapter !== null && ev.chapter !== undefined ? `Ch. ${ev.chapter}` : null,
            content:           note,
            mood_emoji:        mood ?? ev.mood ?? null,
            is_spoiler:        !!input.isSpoiler,
          })
          .select('id')
          .single()
        journalEntryId = (j?.id as string | undefined) ?? null
        if (journalEntryId) {
          await db.from('tracking_events').update({ journal_entry_id: journalEntryId }).eq('id', ev.id)
        }
      }
    } else if (mood && journalEntryId) {
      await db.from('journal_entries').update({ mood_emoji: mood }).eq('id', journalEntryId).eq('user_id', userId)
    }
  } catch (e) {
    console.error('[tracking] journal sync failed', e)
  }

  await refreshPages(db, userId, ev.recommendation_id as string)
  return { ok: true, eventId: ev.id as string, journalEntryId }
}

/* ────────────────────────────────────────────────────────────── */
/*  Undo the last tracking event                                   */
/* ────────────────────────────────────────────────────────────── */

export async function undoEvent(
  supabase: Supa,
  userId: string,
  eventId: string,
): Promise<UndoActionResult> {
  const db = supabase as any
  if (!UUID.test(eventId ?? '')) return fail('Nothing to undo.')

  const { data: ev } = await db
    .from('tracking_events')
    .select('*')
    .eq('id', eventId)
    .eq('user_id', userId)
    .maybeSingle()
  if (!ev) return fail('Nothing to undo.')

  const { data: lists } = await db.from('reading_lists').select('id').eq('user_id', userId)
  const listIds: string[] = (lists ?? []).map((l: any) => l.id)
  if (listIds.length === 0) return fail('Nothing to undo.')

  const { data: items } = await db
    .from('reading_list_items')
    .select('id, list_id, status, sub_status, progress_chapter')
    .eq('recommendation_id', ev.recommendation_id)
    .in('list_id', listIds)
    .order('updated_at', { ascending: false, nullsFirst: false })
    .limit(1)
  const item = items?.[0]
  if (!item) return fail('Nothing to undo.')

  // Only undo if nothing moved on since: never stomp a newer change.
  if (ev.event_type === 'progress' && item.progress_chapter !== ev.chapter) {
    return fail('You have moved on since then, so there is nothing to undo.')
  }
  if (ev.event_type === 'status' && item.status !== ev.status) {
    return fail('You have moved on since then, so there is nothing to undo.')
  }

  const now = new Date().toISOString()
  const createdByThisEvent = ev.from_status === null && ev.from_chapter === null
  let removedItem = false

  if (createdByThisEvent) {
    const { error } = await db.from('reading_list_items').delete().eq('id', item.id)
    if (error) return fail('Could not undo that.')
    removedItem = true
  } else {
    const { error } = await db
      .from('reading_list_items')
      .update({
        status:           ev.from_status ?? item.status,
        sub_status:       ev.from_sub_status ?? null,
        progress_chapter: ev.event_type === 'progress' ? ev.from_chapter : item.progress_chapter,
        updated_at:       now,
      })
      .eq('id', item.id)
    if (error) return fail('Could not undo that.')
  }

  const restoredStatus = removedItem ? null : ((ev.from_status ?? item.status) as string | null)

  if (ev.journal_entry_id) {
    try {
      await db.from('journal_entries').delete().eq('id', ev.journal_entry_id).eq('user_id', userId)
    } catch (e) {
      console.error('[tracking] journal undo failed', e)
    }
  }
  await db.from('tracking_events').delete().eq('id', ev.id).eq('user_id', userId)

  await refreshPages(db, userId, ev.recommendation_id as string)

  return {
    ok:          true,
    chapter:     removedItem ? null : (ev.event_type === 'progress' ? (ev.from_chapter as number | null) : (item.progress_chapter as number | null)),
    status:      restoredStatus,
    subStatus:   removedItem ? null : ((ev.from_sub_status as string | null) ?? null),
    removedItem,
  }
}

/* ────────────────────────────────────────────────────────────── */

async function refreshPages(db: any, userId: string, recId: string) {
  try {
    revalidatePath(`/comic/${recId}`)
    const { data: p } = await db.from('profiles').select('username').eq('id', userId).maybeSingle()
    if (p?.username) revalidatePath(`/profile/${p.username}`)
  } catch {
    // revalidation is a nicety, never a reason to fail a log
  }
}