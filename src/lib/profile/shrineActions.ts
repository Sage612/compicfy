'use server'

// src/lib/profile/shrineActions.ts
//
// Server actions behind the profile "data entry" screens: log a session,
// journal, pin a quote, manage the character party. Each action:
//   1. needs a signed-in user (otherwise it returns an error, nothing runs)
//   2. validates and trims its input
//   3. writes through the user's own Supabase session, so the owner-only RLS
//      policies on these tables are the real gatekeeper
//   4. revalidates the user's profile page
//
// Every action returns { ok: true } or { ok: false, error } so the UI can show
// a toast without try/catch.

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { applyTracking } from '@/lib/tracking/core'

export type ActionResult = { ok: true; notice?: string } | { ok: false; error: string }

const fail = (error: string): ActionResult => ({ ok: false, error })

const MOODS = ['😭', '😍', '🤯', '🧐', '😴', '🔥']
const MAX_PARTY = 6

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

async function authed() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: p } = await supabase.from('profiles').select('username').eq('id', user.id).maybeSingle()
  return { db: supabase as any, userId: user.id, username: (p as any)?.username as string | undefined }
}

type Auth = NonNullable<Awaited<ReturnType<typeof authed>>>

function refresh(a: Auth) {
  if (a.username) revalidatePath(`/profile/${a.username}`)
}

/* ── Log a session / journal entry ─────────────────────────── */

export interface LogInput {
  recommendationId: string | null
  chapter:          number | null
  minutes:          number | null
  note:             string | null
  moodEmoji:        string | null
  isSpoiler:        boolean
  finished?:        boolean
}

export async function logSession(input: LogInput): Promise<ActionResult> {
  const a = await authed()
  if (!a) return fail('Please sign in.')

  const recId   = clean(input.recommendationId, 64)
  const chapter = input.chapter === null || input.chapter === undefined ? null : int(input.chapter, 0, 20000)
  const minutes = input.minutes === null || input.minutes === undefined ? null : int(input.minutes, 1, 720)
  const note    = clean(input.note, 1500)
  const mood    = input.moodEmoji && MOODS.includes(input.moodEmoji) ? input.moodEmoji : null

  if (input.chapter !== null && input.chapter !== undefined && chapter === null) return fail('Chapter must be a whole number.')
  if (input.minutes !== null && input.minutes !== undefined && minutes === null) return fail('Minutes must be between 1 and 720.')
  if ((chapter !== null || minutes !== null) && !recId) return fail('Pick the series you read.')
  if (chapter === null && minutes === null && !note) return fail('Add a chapter, a time or a note.')

  // 1. Reading session (private raw data; only aggregates are public).
  if (minutes !== null) {
    const ended   = new Date()
    const started = new Date(ended.getTime() - minutes * 60_000)
    const { error } = await a.db.from('reading_sessions').insert({
      user_id: a.userId,
      recommendation_id: recId,
      started_at: started.toISOString(),
      ended_at: ended.toISOString(),
    })
    if (error) return fail('Could not save the session.')
  }

  // 2. Chapter progress, through the one shared tracking write path. It updates
  //    the reading list (the source of truth the profile's "Currently obsessed"
  //    reads), records a history event for the friends feed, and picks or creates
  //    a list if the series is not tracked yet. Finishing is always the reader's
  //    explicit choice (never inferred from a chapter number: nobody knows the
  //    final chapter of an ongoing series).
  //    The long-form note stays below as a journal entry; only the mood goes to
  //    the event so nothing is saved twice.
  if (chapter !== null && recId) {
    const res = await applyTracking(a.db, a.userId, {
      recommendationId: recId,
      chapter,
      status: input.finished ? 'completed' : undefined,
      mood,
    })
    if (!res.ok) return fail(res.error || 'Could not update your reading list.')
  }

  // 3. Journal entry (the memory wall).
  if (note) {
    const { error } = await a.db.from('journal_entries').insert({
      user_id: a.userId,
      recommendation_id: recId,
      chapter_label: chapter !== null ? `Ch. ${chapter}` : null,
      content: note,
      mood_emoji: mood,
      is_spoiler: !!input.isSpoiler,
    })
    if (error) return fail('Could not save your note.')
  }

  refresh(a)
  revalidatePath('/', 'layout') // reading list pages live elsewhere in the app; refresh them too
  return { ok: true }
}

export async function deleteJournalEntry(id: string): Promise<ActionResult> {
  const a = await authed()
  if (!a) return fail('Please sign in.')
  const { error } = await a.db.from('journal_entries').delete().eq('id', id).eq('user_id', a.userId)
  if (error) return fail('Could not delete that entry.')
  refresh(a)
  return { ok: true }
}

/* ── Pinned moment ─────────────────────────────────────────── */

export async function pinQuote(input: {
  text: string
  recommendationId: string | null
  chapterLabel: string | null
}): Promise<ActionResult> {
  const a = await authed()
  if (!a) return fail('Please sign in.')

  const text = clean(input.text, 280)
  if (!text || text.length < 3) return fail('Write the line you want to pin.')

  // Only one pinned moment at a time.
  await a.db.from('pinned_quotes').update({ is_pinned: false }).eq('user_id', a.userId).eq('is_pinned', true)

  const { error } = await a.db.from('pinned_quotes').insert({
    user_id: a.userId,
    recommendation_id: clean(input.recommendationId, 64),
    chapter_label: clean(input.chapterLabel, 40),
    quote_text: text,
    is_pinned: true,
  })
  if (error) return fail('Could not pin that moment.')
  refresh(a)
  return { ok: true }
}

export async function unpinQuote(): Promise<ActionResult> {
  const a = await authed()
  if (!a) return fail('Please sign in.')
  const { error } = await a.db.from('pinned_quotes').update({ is_pinned: false }).eq('user_id', a.userId).eq('is_pinned', true)
  if (error) return fail('Could not unpin.')
  refresh(a)
  return { ok: true }
}

/* ── Character party ───────────────────────────────────────── */

export async function addCharacter(input: {
  name: string
  tagline: string | null
  recommendationId: string | null
  imageUrl: string | null
  bondLevel: number
}): Promise<ActionResult> {
  const a = await authed()
  if (!a) return fail('Please sign in.')

  const name = clean(input.name, 80)
  if (!name) return fail('Give your character a name.')

  const bond = int(input.bondLevel, 1, 20)
  if (bond === null) return fail('Bond level must be between 1 and 20.')

  const image = clean(input.imageUrl, 500)
  if (image && !/^https?:\/\//i.test(image)) return fail('Portrait must be a web link starting with http.')

  const { count } = await a.db.from('favorite_characters').select('*', { count: 'exact', head: true }).eq('user_id', a.userId)
  if ((count ?? 0) >= MAX_PARTY) return fail(`Your party is full (${MAX_PARTY} characters).`)

  const { error } = await a.db.from('favorite_characters').insert({
    user_id: a.userId,
    name,
    tagline: clean(input.tagline, 160),
    recommendation_id: clean(input.recommendationId, 64),
    image_url: image,
    bond_level: bond,
    position: count ?? 0,
  })
  if (error) return fail('Could not add that character.')
  refresh(a)
  return { ok: true }
}

export async function updateCharacterBond(id: string, bondLevel: number): Promise<ActionResult> {
  const a = await authed()
  if (!a) return fail('Please sign in.')
  const bond = int(bondLevel, 1, 20)
  if (bond === null) return fail('Bond level must be between 1 and 20.')
  const { error } = await a.db.from('favorite_characters').update({ bond_level: bond }).eq('id', id).eq('user_id', a.userId)
  if (error) return fail('Could not update the bond.')
  refresh(a)
  return { ok: true }
}

export async function removeCharacter(id: string): Promise<ActionResult> {
  const a = await authed()
  if (!a) return fail('Please sign in.')
  const { error } = await a.db.from('favorite_characters').delete().eq('id', id).eq('user_id', a.userId)
  if (error) return fail('Could not remove that character.')
  refresh(a)
  return { ok: true }
}

/* ── Likes on journal entries ──────────────────────────────── */

export type LikeResult = { ok: true; liked: boolean } | { ok: false; error: string }

export async function toggleJournalLike(journalId: string): Promise<LikeResult> {
  const a = await authed()
  if (!a) return { ok: false, error: 'Sign in to like entries.' }
  const id = clean(journalId, 64)
  if (!id) return { ok: false, error: 'Missing entry.' }

  const { data: existing, error: readErr } = await a.db
    .from('journal_likes').select('journal_id').eq('journal_id', id).eq('user_id', a.userId).maybeSingle()
  if (readErr) return { ok: false, error: 'Could not update your like.' }

  if (existing) {
    const { error } = await a.db.from('journal_likes').delete().eq('journal_id', id).eq('user_id', a.userId)
    if (error) return { ok: false, error: 'Could not update your like.' }
    return { ok: true, liked: false }
  }
  const { error } = await a.db.from('journal_likes').insert({ journal_id: id, user_id: a.userId })
  if (error && error.code !== '23505') return { ok: false, error: 'Could not update your like.' }
  return { ok: true, liked: true }
}