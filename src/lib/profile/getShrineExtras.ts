// src/lib/profile/getShrineExtras.ts
//
// Two small server-side loaders for the shrine profile:
//   getParty        the "Character shrine" (favorite_characters table)
//   getOtherShrines the "Walk the hall" list (people this profile follows)
//
// Both fail soft: if a table is missing or a query errors you simply get an
// empty list and that section does not render.

import type { createClient } from '@/lib/supabase/server'

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
}

export async function getParty(supabase: Supa, profileId: string): Promise<PartyMember[]> {
  // favorite_characters is new, so it is not in database.types.ts until you
  // regenerate the types; hence the `as any`.
  const { data } = await (supabase as any)
    .from('favorite_characters')
    .select('id, name, tagline, image_url, bond_level, recommendations(id, title, cover_url)')
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