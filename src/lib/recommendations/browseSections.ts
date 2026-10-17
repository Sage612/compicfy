import type { SupabaseClient } from '@supabase/supabase-js'
import type { Recommendation } from '@/types/app.types'
import { scopeByRating, queryLatestUpdated } from '@/lib/recommendations/browseQueries'

export const SECTION_SLUGS = [
  'updated', 'trending', 'new', 'favourites', 'featured', 'hidden-gems', 'for-you', 'genre',
] as const
export type SectionSlug = (typeof SECTION_SLUGS)[number]

export function isSectionSlug(v: string): v is SectionSlug {
  return (SECTION_SLUGS as readonly string[]).includes(v)
}

export const SECTION_META: Record<SectionSlug, { title: string; blurb: string }> = {
  'updated':     { title: 'Latest updates',       blurb: 'Comics with the most recent new chapters.' },
  'trending':    { title: 'Trending today',       blurb: 'What the community is voting for right now.' },
  'new':         { title: 'New this week',        blurb: 'Freshly approved in the last seven days.' },
  'favourites':  { title: 'Community favourites', blurb: 'The highest scored comics, all time.' },
  'featured':    { title: 'Editor’s picks',       blurb: 'Hand-picked by the team.' },
  'hidden-gems': { title: 'Hidden gems',          blurb: 'Comics people keep saving that few have found.' },
  'for-you':     { title: 'You might like',       blurb: 'Matched to what you vote for and save.' },
  'genre':       { title: 'Genre',                blurb: '' },
}

export const SECTION_PAGE_SIZE = 24

interface Opts {
  adult:  boolean
  page:   number
  userId: string | null
  genre?: string
}

/** One query per slug. Returns null for an unknown slug / missing genre. */
export async function fetchSection(
  s: SupabaseClient,
  slug: SectionSlug,
  { adult, page, userId, genre }: Opts,
): Promise<{ items: Recommendation[]; total: number } | null> {
  const limit  = SECTION_PAGE_SIZE
  const offset = (page - 1) * limit

  const base = () =>
    scopeByRating(
      s.from('recommendations').select('*', { count: 'exact' }).eq('is_approved', true).eq('is_draft', false) as any,
      adult,
    ) as any

  const run = async (q: any) => {
    const { data, count } = await q.range(offset, offset + limit - 1)
    return { items: (data as Recommendation[]) ?? [], total: count ?? 0 }
  }

  switch (slug) {
    case 'updated':
      return queryLatestUpdated(s, { adult, limit, offset })

    case 'trending':
      return run(base().order('daily_votes', { ascending: false }))

    case 'new': {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      return run(
        base()
          .not('reviewed_at', 'is', null)
          .gte('reviewed_at', since)
          .order('score', { ascending: false }),
      )
    }

    case 'favourites':
      return run(base().order('score', { ascending: false }))

    case 'featured':
      return run(base().eq('is_featured', true).order('featured_at', { ascending: false }))

    case 'hidden-gems':
      return run(base().order('save_count', { ascending: false }))

    case 'genre':
      if (!genre) return null
      return run(base().contains('genres', [genre]).order('score', { ascending: false }))

    case 'for-you': {
      const { data } = await (s as any).rpc('get_personalized_recommendations', {
        p_user_id:         userId,
        p_exclude_id:      null,
        p_limit:           48,
        p_content_ratings: adult ? ['mature', 'adult'] : ['all_ages', 'teen'],
      })
      let items = (data as Recommendation[]) ?? []
      if (userId) items = items.filter(r => (r as any).user_id !== userId)
      return { items: items.slice(offset, offset + limit), total: items.length }
    }
  }
}