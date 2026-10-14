// src/lib/profile/getShrineExtras.ts
//
// Two small server-side loaders for the shrine profile:
//   getParty        the "Character shrine" (favorite_characters table)
//   getOtherShrines the "Walk the hall" list (people this profile follows)
//
// Both fail soft: if a table is missing or a query errors you simply get an
// empty list and that section does not render.

import type { createClient } from '@/lib/supabase/server'
import type { JournalItem } from '@/lib/profile/getProfileExtras'

type Supa = Awaited<ReturnType<typeof createClient>>

function one<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null
  return Array.isArray(v) ? (v[0] ?? null) : v
}

export interface PartyMember {
  id:          string
  name:        string
  tagline:     string | null
  imageUrl:    string | null
  bondLevel:   number
  seriesTitle: string | null
  seriesCover: string | null
  createdAt:   string
}

export async function getParty(supabase: Supa, profileId: string): Promise<PartyMember[]> {
  // favorite_characters is new, so it is not in database.types.ts until you
  // regenerate the types; hence the `as any`.
  const { data } = await (supabase as any)
    .from('favorite_characters')
    .select('id, name, tagline, image_url, bond_level, created_at, recommendations(id, title, cover_url)')
    .eq('user_id', profileId)
    .order('position', { ascending: true })
    .order('created_at', { ascending: true })
    .limit(6)

  return ((data ?? []) as any[]).map(r => {
    const rec = one<any>(r.recommendations)
    return {
      id:          r.id,
      name:        r.name,
      tagline:     r.tagline ?? null,
      imageUrl:    r.image_url ?? null,
      bondLevel:   r.bond_level ?? 1,
      seriesTitle: rec?.title ?? null,
      seriesCover: rec?.cover_url ?? null,
      createdAt:   r.created_at,
    }
  })
}

export interface ShrinePerson {
  id:          string
  username:    string
  displayName: string
  avatarUrl:   string | null
  href:        string
}

export async function getOtherShrines(supabase: Supa, profileId: string): Promise<ShrinePerson[]> {
  const { data: rows } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', profileId)
    .order('created_at', { ascending: false })
    .limit(8)

  const ids = (rows ?? []).map(r => r.following_id)
  if (ids.length === 0) return []

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url, is_banned, user_type')
    .in('id', ids)

  const byId = new Map((profiles ?? []).map(p => [p.id, p]))
  const people: ShrinePerson[] = []
  for (const id of ids) {
    const p = byId.get(id)
    if (!p || p.is_banned) continue
    people.push({
      id:          p.id,
      username:    p.username,
      displayName: p.display_name || p.username,
      avatarUrl:   p.avatar_url ?? null,
      href:        p.user_type === 'creator' ? `/creator/${p.username}` : `/profile/${p.username}`,
    })
    if (people.length === 6) break
  }
  return people
}

/* ── Activity feed ─────────────────────────────────────────────
   One merged, newest-first timeline built from data that already exists:
   journal entries, stamped quotes, finished series (public lists only) and
   new party members. Nothing extra is stored. */

export interface ActivityEvent {
  id:        string
  kind:      'journal' | 'quote' | 'finished' | 'bond'
  at:        string
  title:     string
  body:      string | null
  isSpoiler: boolean
  moodEmoji: string | null
  likeCount: number
  replyCount: number
  comicTitle: string | null
  coverUrl:   string | null
  /** Set only for journal entries, so the owner can delete them. */
  journalId:  string | null
}

export async function getActivityEvents(
  supabase: Supa,
  profileId: string,
  journal: JournalItem[],
  party: PartyMember[],
): Promise<ActivityEvent[]> {
  const events: ActivityEvent[] = []

  for (const j of journal) {
    events.push({
      id: `j-${j.id}`, kind: 'journal', at: j.createdAt,
      title: j.comicTitle && j.chapterLabel ? `Logged ${j.chapterLabel} of ${j.comicTitle}` : 'Journaled a session',
      body: j.content, isSpoiler: j.isSpoiler, moodEmoji: j.moodEmoji,
      likeCount: j.likeCount, replyCount: j.replyCount,
      comicTitle: j.comicTitle, coverUrl: j.coverUrl, journalId: j.id,
    })
  }

  for (const m of party) {
    events.push({
      id: `b-${m.id}`, kind: 'bond', at: m.createdAt,
      title: `Bonded with ${m.name}`,
      body: m.tagline ?? `Bond level ${m.bondLevel}`,
      isSpoiler: false, moodEmoji: null, likeCount: 0, replyCount: 0,
      comicTitle: m.seriesTitle, coverUrl: m.seriesCover, journalId: null,
    })
  }

  const [quotesRes, listsRes] = await Promise.all([
    (supabase as any)
      .from('pinned_quotes')
      .select('id, quote_text, stamp_count, created_at, recommendations(id, title, cover_url)')
      .eq('user_id', profileId)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase.from('reading_lists').select('id').eq('user_id', profileId).eq('is_public', true),
  ])

  for (const q of (quotesRes?.data ?? []) as any[]) {
    const rec = one<any>(q.recommendations)
    events.push({
      id: `q-${q.id}`, kind: 'quote', at: q.created_at,
      title: 'Stamped a line', body: `\u201C${q.quote_text}\u201D`,
      isSpoiler: false, moodEmoji: null, likeCount: q.stamp_count ?? 0, replyCount: 0,
      comicTitle: rec?.title ?? null, coverUrl: rec?.cover_url ?? null, journalId: null,
    })
  }

  // Finished series: public lists only, so private reading stays private.
  const listIds = ((listsRes?.data ?? []) as any[]).map(l => l.id)
  if (listIds.length > 0) {
    const { data: done } = await supabase
      .from('reading_list_items')
      .select('id, last_read_at, updated_at, added_at, recommendations(id, title, cover_url, content_rating)')
      .in('list_id', listIds)
      .eq('status', 'completed')
      .order('last_read_at', { ascending: false, nullsFirst: false })
      .limit(8)

    for (const d of (done ?? []) as any[]) {
      const rec = one<any>(d.recommendations)
      const at = d.last_read_at ?? d.updated_at ?? d.added_at
      if (!rec || !at || rec.content_rating === 'adult' || rec.content_rating === 'mature') continue
      events.push({
        id: `f-${d.id}`, kind: 'finished', at,
        title: `Finished ${rec.title}`, body: null,
        isSpoiler: false, moodEmoji: null, likeCount: 0, replyCount: 0,
        comicTitle: rec.title, coverUrl: rec.cover_url ?? null, journalId: null,
      })
    }
  }

  events.sort((x, y) => new Date(y.at).getTime() - new Date(x.at).getTime())
  return events.slice(0, 40)
}