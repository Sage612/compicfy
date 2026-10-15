// src/lib/tracking/queries.ts
//
// Read helpers for the comic page. Server-side only (they take the server
// Supabase client). Every one fails soft: a missing table or a query error
// gives you an empty answer, never a broken page.

import type { createClient } from '@/lib/supabase/server'
import type {
  FriendEvent,
  MomentPoint,
  MyTracking,
  RatingBreakdown,
} from './types'

type Supa = Awaited<ReturnType<typeof createClient>>

const EMPTY_TRACKING: MyTracking = {
  listId: null, status: null, subStatus: null, chapter: null, lastReadAt: null,
}

/** The viewer's own entry for this comic (same rule the GET route uses:
 *  the most recently touched entry across their lists). */
export async function getMyTracking(supabase: Supa, userId: string, recId: string): Promise<MyTracking> {
  try {
    const db = supabase as any
    const { data: lists } = await db.from('reading_lists').select('id').eq('user_id', userId)
    const listIds: string[] = (lists ?? []).map((l: any) => l.id)
    if (listIds.length === 0) return EMPTY_TRACKING

    const { data } = await db
      .from('reading_list_items')
      .select('list_id, status, sub_status, progress_chapter, last_read_at')
      .eq('recommendation_id', recId)
      .in('list_id', listIds)
      .order('updated_at', { ascending: false, nullsFirst: false })
      .limit(1)

    const row = data?.[0]
    if (!row) return EMPTY_TRACKING
    return {
      listId:     row.list_id ?? null,
      status:     row.status ?? null,
      subStatus:  row.sub_status ?? null,
      chapter:    row.progress_chapter ?? null,
      lastReadAt: row.last_read_at ?? null,
    }
  } catch {
    return EMPTY_TRACKING
  }
}

/** The viewer's mood dots for this comic, oldest first (the progress ribbon). */
export async function getMyMoments(supabase: Supa, userId: string, recId: string): Promise<MomentPoint[]> {
  try {
    const { data, error } = await (supabase as any)
      .from('tracking_events')
      .select('id, chapter, mood, created_at')
      .eq('user_id', userId)
      .eq('recommendation_id', recId)
      .not('mood', 'is', null)
      .order('created_at', { ascending: true })
      .limit(80)
    if (error) return []
    return ((data ?? []) as any[]).map(r => ({
      id:        r.id as string,
      chapter:   (r.chapter ?? null) as number | null,
      mood:      r.mood as string,
      createdAt: r.created_at as string,
    }))
  } catch {
    return []
  }
}

/** Star counts for the ratings histogram, from the approved ratings on reviews.
 *  Capped at 5000 rows; swap for an aggregate RPC if a comic ever gets more. */
export async function getRatingBreakdown(supabase: Supa, recId: string): Promise<RatingBreakdown> {
  const counts = [0, 0, 0, 0, 0]
  try {
    const { data, error } = await (supabase as any)
      .from('reviews')
      .select('rating')
      .eq('recommendation_id', recId)
      .eq('is_approved', true)
      .not('rating', 'is', null)
      .limit(5000)
    if (error) throw error

    let sum = 0
    let total = 0
    for (const r of (data ?? []) as { rating: number | null }[]) {
      const n = Math.round(Number(r.rating))
      if (n >= 1 && n <= 5) {
        counts[n - 1] += 1
        sum += n
        total += 1
      }
    }
    return { counts, total, average: total > 0 ? Math.round((sum / total) * 10) / 10 : null }
  } catch {
    return { counts, total: 0, average: null }
  }
}

export interface FriendActivity {
  followsAnyone: boolean
  events:        FriendEvent[]
}

/** What the people you follow have logged on this comic, newest first. */
export async function getFriendActivity(supabase: Supa, userId: string, recId: string): Promise<FriendActivity> {
  try {
    const db = supabase as any
    const { data: follows } = await db.from('follows').select('following_id').eq('follower_id', userId)
    const ids: string[] = (follows ?? []).map((f: any) => f.following_id)
    if (ids.length === 0) return { followsAnyone: false, events: [] }

    const { data, error } = await db
      .from('tracking_events')
      .select('id, user_id, event_type, chapter, status, sub_status, mood, note, is_spoiler, created_at, profiles(username, display_name, avatar_url, is_banned)')
      .eq('recommendation_id', recId)
      .eq('visibility', 'public')
      .in('user_id', ids)
      .order('created_at', { ascending: false })
      .limit(40)
    if (error) return { followsAnyone: true, events: [] }

    const events: FriendEvent[] = []
    for (const r of (data ?? []) as any[]) {
      const p = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles
      if (!p || p.is_banned) continue
      events.push({
        id:          r.id,
        userId:      r.user_id,
        username:    p.username,
        displayName: p.display_name || p.username,
        avatarUrl:   p.avatar_url ?? null,
        eventType:   r.event_type,
        chapter:     r.chapter ?? null,
        status:      r.status ?? null,
        subStatus:   r.sub_status ?? null,
        mood:        r.mood ?? null,
        note:        r.note ?? null,
        isSpoiler:   !!r.is_spoiler,
        createdAt:   r.created_at,
      })
      if (events.length >= 15) break
    }
    return { followsAnyone: true, events }
  } catch {
    return { followsAnyone: false, events: [] }
  }
}